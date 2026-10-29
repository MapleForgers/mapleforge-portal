"""Public, section-scoped Perspectives comments. Independent of portal accounts/data."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from contextlib import closing
from urllib.parse import urlsplit, parse_qs
from collections import OrderedDict, deque
import hashlib, json, os, re, secrets, sqlite3, threading, time, unicodedata

DB = os.environ.get('PERSPECTIVES_DB', '/var/lib/mapleforge-perspectives/comments.sqlite3')
ORIGIN = os.environ.get('PERSPECTIVES_ORIGIN', 'https://maple-forge.ca')
REGISTRY = Path(os.environ.get('PERSPECTIVES_THREADS', str(Path(__file__).with_name('perspectives_threads.json'))))
THREADS = json.loads(REGISTRY.read_text())
ENDPOINT = '/perspeviera/comments-api'
EDIT_WINDOW_MS = 2 * 60 * 60 * 1000
LIMITS = OrderedDict()
LOCK = threading.Lock()

class Problem(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

def db():
    conn = sqlite3.connect(DB, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    return conn

def init():
    with closing(db()) as conn:
        conn.executescript('''PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY, page TEXT NOT NULL, section TEXT NOT NULL,
          parent TEXT REFERENCES comments(id), name TEXT NOT NULL,
          body TEXT NOT NULL, created REAL NOT NULL,
          request_id TEXT UNIQUE NOT NULL, payload_hash TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS comments_section ON comments(page,section,created);
        ''')
        columns = {r['name'] for r in conn.execute('PRAGMA table_info(comments)')}
        for name, definition in [('owner_hash', 'TEXT'), ('editable_until', 'REAL'), ('edited', 'REAL'), ('deleted', 'INTEGER NOT NULL DEFAULT 0')]:
            if name not in columns:
                conn.execute('ALTER TABLE comments ADD COLUMN '+name+' '+definition)
        conn.commit()

def check_thread(page, section=None):
    if page not in THREADS or (section is not None and section not in THREADS[page]):
        raise Problem(404, 'This discussion is not available.')

def clean(value, limit, label):
    if not isinstance(value, str):
        raise Problem(400, 'Please enter '+label+'.')
    value = unicodedata.normalize('NFC', value.strip())
    if not 1 <= len(value) <= limit or any(unicodedata.category(c) in ('Cc', 'Cs') and c not in '\n\t' for c in value):
        raise Problem(400, 'Please enter '+label+' within '+str(limit)+' characters.')
    return value

def snapshot(conn, page, section):
    check_thread(page, section)
    return [dict(row) for row in conn.execute(
        'SELECT id,parent,name,body,created,edited,deleted FROM comments WHERE page=? AND section=? ORDER BY created,id', (page, section))]

def add(conn, data):
    page, section = data.get('page'), data.get('section')
    if not isinstance(page, str) or not isinstance(section, str):
        raise Problem(400, 'Choose a discussion.')
    check_thread(page, section)
    name = clean(data.get('name'), 60, 'a name')
    if '\n' in name or '\t' in name:
        raise Problem(400, 'Please keep your name on one line.')
    body = clean(data.get('body'), 4000, 'a comment')
    parent = data.get('parent') or None
    if parent is not None and (not isinstance(parent, str) or not re.fullmatch(r'[a-f0-9]{24}', parent)):
        raise Problem(400, 'Choose a valid reply.')
    request_id = data.get('requestId')
    if not isinstance(request_id, str) or not re.fullmatch(r'[a-f0-9-]{32,36}', request_id):
        raise Problem(400, 'Please reload the page and try again.')
    token = data.get('ownerToken')
    if token is not None and (not isinstance(token, str) or not re.fullmatch(r'[a-f0-9]{64}', token)):
        raise Problem(400, 'Please reload the page and try again.')
    owner_hash = hashlib.sha256(token.encode()).hexdigest() if token else None
    payload_hash = hashlib.sha256(json.dumps([page, section, parent, name, body] + ([owner_hash] if owner_hash else []), ensure_ascii=False).encode()).hexdigest()
    previous = conn.execute('SELECT id,payload_hash FROM comments WHERE request_id=?', (request_id,)).fetchone()
    if previous:
        if previous['payload_hash'] != payload_hash:
            raise Problem(409, 'This request has already been used. Please try again.')
        return previous['id']
    if parent:
        ancestor, depth = parent, 0
        while ancestor:
            row = conn.execute('SELECT page,section,parent FROM comments WHERE id=?', (ancestor,)).fetchone()
            if not row or row['page'] != page or row['section'] != section:
                raise Problem(400, 'Replies must belong to this same section.')
            depth += 1
            if depth > 8:
                raise Problem(400, 'Please reply higher up or start a new comment.')
            ancestor = row['parent']
    if conn.execute('SELECT count(*) FROM comments WHERE page=? AND section=?', (page, section)).fetchone()[0] >= 500:
        raise Problem(429, 'This section has reached its comment limit.')
    if conn.execute('SELECT count(*) FROM comments').fetchone()[0] >= 20000:
        raise Problem(429, 'Comments are full for now. Please contact mandd.')
    cid = secrets.token_hex(12)
    now = time.time()*1000
    conn.execute('INSERT INTO comments (id,page,section,parent,name,body,created,request_id,payload_hash,owner_hash,editable_until) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
                 (cid, page, section, parent, name, body, now, request_id, payload_hash, owner_hash, now+EDIT_WINDOW_MS if owner_hash else None))
    return cid

def change(conn, data):
    cid, token = data.get('id'), data.get('ownerToken')
    if not isinstance(cid, str) or not re.fullmatch(r'[a-f0-9]{24}', cid):
        raise Problem(400, 'Choose a valid comment.')
    row = conn.execute('SELECT owner_hash,editable_until,deleted FROM comments WHERE id=?', (cid,)).fetchone()
    if (not row or not row['owner_hash'] or not isinstance(token, str)
            or not re.fullmatch(r'[a-f0-9]{64}', token)
            or not secrets.compare_digest(row['owner_hash'], hashlib.sha256(token.encode()).hexdigest())):
        raise Problem(403, 'Only the session that posted this comment can change it.')
    if time.time()*1000 >= row['editable_until']:
        raise Problem(403, 'The editing window for this comment has ended.')
    if data['action'] == 'delete':
        # Keep the thread position so replies are not removed with their parent.
        conn.execute("UPDATE comments SET name='',body='',deleted=1,edited=NULL WHERE id=?", (cid,))
    elif data['action'] == 'edit':
        if row['deleted']:
            raise Problem(409, 'This comment has already been deleted.')
        body = clean(data.get('body'), 4000, 'a comment')
        conn.execute('UPDATE comments SET body=?,edited=? WHERE id=?', (body, time.time()*1000, cid))
    else:
        raise Problem(400, 'Unknown comment action.')
    return cid

def permit(key):
    now = time.monotonic()
    with LOCK:
        q = LIMITS.setdefault(key, deque()); LIMITS.move_to_end(key)
        while q and q[0] < now-60: q.popleft()
        if len(q) >= 8: return False
        q.append(now)
        while len(LIMITS) > 4096: LIMITS.popitem(last=False)
    return True

class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup(); self.connection.settimeout(15)
    def log_message(self, *args): pass
    def send(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path != ENDPOINT: return self.send(404, {'error':'Not found.'})
        try:
            query = parse_qs(url.query)
            page = query.get('page', [''])[0]
            section = query.get('section', [None])[0]
            check_thread(page, section)
            with closing(db()) as conn:
                if section is not None: result = {'comments': snapshot(conn, page, section)}
                else: result = {'counts': {r['section']: r['n'] for r in conn.execute('SELECT section,count(*) n FROM comments WHERE page=? AND deleted=0 GROUP BY section', (page,))}}
            self.send(200, result)
        except Problem as e: self.send(e.status, {'error':e.message})
        except sqlite3.Error: self.send(503, {'error':'Comments are temporarily unavailable. Please try again.'})
    def do_POST(self):
        if self.path != ENDPOINT: return self.send(404, {'error':'Not found.'})
        if self.headers.get('Origin') != ORIGIN or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.send(403, {'error':'Please post through the Perspectives page.'})
        try:
            n = int(self.headers.get('Content-Length', '0'))
            if not 0 < n <= 32768: raise Problem(413, 'Comment is too large.')
            if not permit(self.headers.get('X-Real-IP', self.client_address[0])):
                raise Problem(429, 'Please wait a minute before posting again.')
            data = json.loads(self.rfile.read(n))
            if not isinstance(data, dict): raise Problem(400, 'Invalid comment.')
            with closing(db()) as conn:
                conn.execute('BEGIN IMMEDIATE')
                action = data.get('action', 'add')
                if action == 'add': cid = add(conn, data)
                elif action in ('edit', 'delete'): cid = change(conn, data)
                else: raise Problem(400, 'Unknown comment action.')
                row = conn.execute('SELECT editable_until FROM comments WHERE id=?', (cid,)).fetchone()
                conn.commit()
            self.send(200, {'ok':True, 'id':cid, 'editableUntil':row['editable_until']})
        except Problem as e: self.send(e.status, {'error':e.message})
        except (ValueError, TypeError, UnicodeError): self.send(400, {'error':'Invalid comment.'})
        except sqlite3.Error: self.send(503, {'error':'Comments are busy. Your draft is still here. Please try again.'})

if __name__ == '__main__':
    init()
    ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('PERSPECTIVES_PORT', '8784'))), Handler).serve_forever()
