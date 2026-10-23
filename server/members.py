"""MapleForge member identity and shared community content. Standard library only."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from pathlib import Path
import os, json, sqlite3, secrets, hashlib, time, threading, unicodedata
import shared, privacy
from collections import deque

ORIGIN='https://maple-forge.ca'
CONFIG=json.loads(Path(os.environ.get('MEMBER_CONFIG','/etc/mapleforge/discord.json')).read_text())
# OAuth access tokens stay in process memory only. Restart requires fresh sign-in.
MEMBERSHIP = {}
MEMBERSHIP_LOCK = threading.Lock()
MEMBERSHIP_TTL = 300
WRITE_LOCK=threading.Lock()
WRITE_ATTEMPTS={}
def permit_write(uid):
    with WRITE_LOCK:
        now=time.monotonic()
        for key in list(WRITE_ATTEMPTS):
            if not WRITE_ATTEMPTS[key] or WRITE_ATTEMPTS[key][-1]<=now-60:WRITE_ATTEMPTS.pop(key,None)
        attempts=WRITE_ATTEMPTS.setdefault(uid,deque())
        while attempts and attempts[0]<=now-60:attempts.popleft()
        if len(attempts)>=60:return False
        attempts.append(now);return True


def name_key(name):
    return ' '.join(unicodedata.normalize('NFKC', name).casefold().split())
def valid_name(c, name, uid):
    key=name_key(name)
    if not key or any(unicodedata.category(ch).startswith('C') and ch!='\u200d' for ch in name):return False
    if key in {'admin','administrator','moderator','staff','system','mapleforge','mapleforge admin'}:return False
    return not any(key in (name_key(row['name']),name_key(row['username'])) for row in c.execute('SELECT name,username FROM users WHERE id<>?',(uid,)))

DB=os.environ.get('MEMBER_DB','/var/lib/mapleforge/members.sqlite3')
class Connection(sqlite3.Connection):
    def __exit__(self,*args):
        try:return super().__exit__(*args)
        finally:self.close()
def db():
    c=sqlite3.connect(DB,timeout=15,factory=Connection);c.row_factory=sqlite3.Row;return c
def init():
    with db() as c:
        c.executescript('''PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL,name TEXT NOT NULL,profile TEXT NOT NULL DEFAULT '{}');
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT,csrf TEXT,expires REAL);
        CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY,browser TEXT,expires REAL);
        CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,uid TEXT,title TEXT,body TEXT,category TEXT,created REAL);
        CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,uid TEXT,target TEXT,body TEXT,created REAL);
        ''')
        c.executescript('CREATE INDEX IF NOT EXISTS comments_target ON comments(target); CREATE INDEX IF NOT EXISTS comments_uid_created ON comments(uid,created);')
        shared.init(c)
        c.executescript('CREATE TABLE IF NOT EXISTS content_version(id INTEGER PRIMARY KEY,value INTEGER NOT NULL); INSERT OR IGNORE INTO content_version VALUES(1,0);')
        # Triggers cover all mutations, including bookmarks and administrator imports.
        for table in ('users','posts','comments','records','relations','preferences','member_details','member_locations','activity','discord_consent','discord_import_authors'):
            for action in ('INSERT','UPDATE','DELETE'):
                c.execute(f'CREATE TRIGGER IF NOT EXISTS version_{table}_{action} AFTER {action} ON {table} BEGIN UPDATE content_version SET value=value+1 WHERE id=1; END')
        if 'details' not in {row['name'] for row in c.execute('PRAGMA table_info(posts)')}:
            c.execute("ALTER TABLE posts ADD COLUMN details TEXT NOT NULL DEFAULT '{}'")
        if 'archived' not in {row['name'] for row in c.execute('PRAGMA table_info(posts)')}:
            c.execute('ALTER TABLE posts ADD COLUMN archived INTEGER NOT NULL DEFAULT 0')
def digest(v):return hashlib.sha256(v.encode()).hexdigest()
def discord(path,token=None,data=None):
    headers={'User-Agent':'MapleForge/1.0'}
    if token:headers['Authorization']='Bearer '+token
    if data:headers['Content-Type']='application/x-www-form-urlencoded'
    req=Request('https://discord.com/api/'+path,headers=headers,data=urlencode(data).encode() if data else None)
    with urlopen(req,timeout=15) as r:return json.load(r)
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass # Authorization codes and cookies must not enter logs.
    def send(self,status,data=None,headers=None):
        body=json.dumps(data).encode() if data is not None else b''
        self.send_response(status)
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.send_header('Cache-Control','no-store');self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def cookie(self,key):
        try:return SimpleCookie(self.headers.get('Cookie',''))[key].value
        except Exception:return ''
    def session(self):
        key=digest(self.cookie('__Host-mapleforge_member'))
        with db() as c:user=c.execute('SELECT sessions.*,users.username,users.name,users.profile FROM sessions JOIN users ON users.id=sessions.uid WHERE token=? AND expires>?',(key,time.time())).fetchone()
        if not user:return None
        with MEMBERSHIP_LOCK:
            proof=MEMBERSHIP.get(key)
            proof=dict(proof) if proof else None
        if proof and proof['expires']>time.time():
            if time.time()-proof['checked']<MEMBERSHIP_TTL:return user
            try:
                member=discord('v10/users/@me/guilds/'+CONFIG['guild_id']+'/member',proof['access'])
                if not member.get('pending'):
                    with MEMBERSHIP_LOCK:
                        current=MEMBERSHIP.get(key)
                        if current and current['access']==proof['access']:
                            current['checked']=time.time();return user
                    return None
            except HTTPError as e:
                if e.code not in (401,403,404):raise
        with MEMBERSHIP_LOCK:MEMBERSHIP.pop(key,None)
        with db() as c:c.execute('DELETE FROM sessions WHERE token=?',(key,))
        return None
    def signin_failed(self,reason):
        return self.send(303,headers={'Location':'/portal1/?signin='+reason})
    def do_GET(self):
        try:self.get()
        except (HTTPError,TimeoutError,OSError,ValueError,KeyError,sqlite3.Error):
            if urlparse(self.path).path.startswith('/auth/'):self.signin_failed('unavailable')
            else:self.send(503,{'error':'The service is temporarily unavailable. Please try again.'})
    def get(self):
        path=urlparse(self.path).path
        if path=='/auth/discord':
            state=secrets.token_urlsafe(32);browser=secrets.token_urlsafe(32)
            with db() as c:
                c.execute('DELETE FROM oauth WHERE expires<?',(time.time(),))
                c.execute('INSERT INTO oauth VALUES(?,?,?)',(digest(state),digest(browser),time.time()+600))
            url='https://discord.com/oauth2/authorize?'+urlencode({'client_id':CONFIG['client_id'],'redirect_uri':CONFIG['redirect_uri'],'response_type':'code','scope':'identify guilds.members.read','state':state})
            return self.send(303,headers={'Location':url,'Set-Cookie':'mapleforge_oauth='+browser+'; Path=/auth/; Max-Age=600; Secure; HttpOnly; SameSite=Lax'})
        if path=='/auth/discord/callback':
            q=parse_qs(urlparse(self.path).query);state=q.get('state',[''])[0]
            with db() as c:
                pending=c.execute('SELECT * FROM oauth WHERE state=?',(digest(state),)).fetchone()
                c.execute('DELETE FROM oauth WHERE state=?',(digest(state),))
            if not pending or pending['expires']<time.time() or not secrets.compare_digest(pending['browser'],digest(self.cookie('mapleforge_oauth'))):return self.signin_failed('expired')
            if q.get('error'):return self.send(303,headers={'Location':'/portal1/'})
            if q.get('iss',['https://discord.com'])[0]!='https://discord.com':return self.signin_failed('expired')
            tokens=discord('oauth2/token',data={'client_id':CONFIG['client_id'],'client_secret':CONFIG['client_secret'],'grant_type':'authorization_code','code':q.get('code',[''])[0],'redirect_uri':CONFIG['redirect_uri']})
            access=tokens['access_token'];u=discord('v10/users/@me',access)
            try:member=discord('v10/users/@me/guilds/'+CONFIG['guild_id']+'/member',access)
            except HTTPError as e:
                if e.code in (403,404):return self.signin_failed('membership')
                raise
            if member.get('pending'):return self.signin_failed('screening')
            # Retain only the access token in memory for periodic membership checks; never the refresh token.
            name=member.get('nick') or u.get('global_name') or u['username'];token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32)
            with db() as c:
                c.execute('BEGIN IMMEDIATE')
                if not valid_name(c,name,u['id']):name=u['username']
                if not valid_name(c,name,u['id']):name='Member '+u['id']
                c.execute('INSERT INTO users(id,username,name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username',(u['id'],u['username'],name))
                c.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
                c.execute('INSERT INTO sessions VALUES(?,?,?,?)',(digest(token),u['id'],csrf,time.time()+86400))
            with MEMBERSHIP_LOCK:
                for key in list(MEMBERSHIP):
                    if MEMBERSHIP[key]['expires']<=time.time():MEMBERSHIP.pop(key,None)
                MEMBERSHIP[digest(token)]={'access':access,'checked':time.time(),'expires':time.time()+min(86400,int(tokens.get('expires_in',86400)))}
            return self.send(303,headers={'Location':'/portal1/','Set-Cookie':'__Host-mapleforge_member='+token+'; Path=/; Max-Age=86400; Secure; HttpOnly; SameSite=Lax'})
        user=self.session()
        if path=='/api/me':return self.send(200,{'user':{'id':user['uid'],'username':user['username'],'name':user['name'],'profile':json.loads(user['profile'])} if user else None,'csrf':user['csrf'] if user else None})
        if path in ('/api/shared','/api/community','/api/comments','/api/my-content','/api/version') and not user:return self.send(401,{'error':'Sign in with Discord to view member content.'})
        if path=='/api/version':
            with db() as c:
                shared.flush_map_activity(c)
                return self.send(200,{'version':shared.revision(c)})
        if path=='/api/my-content':
            with db() as c:return self.send(200,{'items':privacy.owned(c,user['uid'])})
        if path=='/api/shared':
            with db() as c:return self.send(200,shared.snapshot(c,user,CONFIG))
        if path=='/api/community':
            with db() as c:
                posts=[dict(x) for x in c.execute('SELECT posts.*,users.name AS author FROM posts JOIN users ON uid=users.id WHERE posts.archived=0 ORDER BY created DESC')]
                profiles=[{'id':x['id'],'name':x['name'],'username':x['username'],**json.loads(x['profile'])} for x in c.execute('SELECT * FROM users')]
            for post in posts:post['details']=json.loads(post.get('details') or '{}')
            return self.send(200,{'posts':posts,'profiles':profiles})
        if path=='/api/comments':
            target=parse_qs(urlparse(self.path).query).get('target',[''])[0]
            with db() as c:
                section,_,item=target.partition(':')
                try:shared.record(c,section,item)
                except shared.Problem:return self.send(404,{'error':shared.WAITING})
                rows=[dict(x) for x in c.execute('SELECT comments.*,users.name AS author FROM comments JOIN users ON uid=users.id WHERE target=? ORDER BY created',(target,))]
            return self.send(200,{'comments':rows})
        return self.send(404,{'error':'Not found'})
    def do_POST(self):
        try:user=self.session()
        except (HTTPError,TimeoutError,OSError,ValueError,KeyError,sqlite3.Error):return self.send(503,{'error':'Membership could not be verified. Please try again shortly.'})
        if not user:return self.send(401,{'error':'Sign in with Discord to contribute.'})
        if self.headers.get('Origin')!=ORIGIN or not secrets.compare_digest(self.headers.get('X-CSRF-Token',''),user['csrf']):return self.send(403,{'error':'Refresh the portal and try again.'})
        if not permit_write(user['uid']):return self.send(429,{'error':'Too many changes. Please wait a minute.'},{'Retry-After':'60'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<=32768:return self.send(413,{'error':'Request too large.'})
            data=json.loads(self.rfile.read(n));path=urlparse(self.path).path
            if not isinstance(data,dict):raise ValueError()
            def field(key,limit,required=True):
                val=data.get(key,'')
                if not isinstance(val,str) or len(val.strip())>limit or (required and not val.strip()):raise ValueError()
                return val.strip()
            with db() as c:
                c.execute('BEGIN IMMEDIATE')
                if path=='/api/delete':
                    privacy.remove(c,user['uid'],data)
                    c.commit()
                    if data.get('kind')=='Account':
                        with MEMBERSHIP_LOCK:MEMBERSHIP.pop(user['token'],None)
                    return self.send(200,{'ok':True})
                if path=='/api/shared':
                    result=shared.mutate(c,user,data,CONFIG)
                    c.commit()
                    return self.send(200,{'ok':True,**result})
                if path=='/api/logout':

                    with MEMBERSHIP_LOCK:MEMBERSHIP.pop(user['token'],None)
                    c.execute('DELETE FROM sessions WHERE token=?',(user['token'],));return self.send(200,{'ok':True}, {'Set-Cookie':'__Host-mapleforge_member=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax'})
                if path=='/api/profile':
                    name=field('name',80);profile=json.loads(user['profile'])
                    if any(unicodedata.category(ch).startswith('C') and ch!='\u200d' for ch in name):return self.send(400,{'error':'Display names cannot contain control or hidden characters.'})
                    if not valid_name(c,name,user['uid']):return self.send(409,{'error':'Choose a different display name. This name is reserved or already used.'})
                    for key,limit in [('category',80),('summary',2000),('services',2000)]:
                        if key in data:profile[key]=field(key,limit,False)
                    c.execute('UPDATE users SET name=?,profile=? WHERE id=?',(name,json.dumps(profile),user['uid']))
                    shared.event(c,user['uid'],'People & skills',user['uid'],'Profiles','updated their profile')
                elif path=='/api/posts':
                    title=field('title',120);body=field('body',8000);category=field('category',80);pid=field('id',100,False)
                    if category not in shared.IDEA_CATEGORIES:raise shared.Problem(400,'Choose an idea category.')
                    if pid:
                        row=c.execute('SELECT uid,details FROM posts WHERE id=? AND archived=0',(pid,)).fetchone()
                        if not row or row['uid']!=user['uid']:return self.send(403,{'error':'You can edit only your own posts.'})
                        details=json.loads(row['details'] or '{}')
                        for key in ('problem','audience','difference','resources','firstStep','reference'):
                            if key in data:details[key]=field(key,2000,False)
                        c.execute('UPDATE posts SET title=?,body=?,category=?,details=? WHERE id=?',(title,body,category,json.dumps(details),pid))
                    else:
                        pid='live-'+secrets.token_hex(12)
                        details={key:field(key,2000,False) for key in ('problem','audience','difference','resources','firstStep','reference')}
                        c.execute('INSERT INTO posts(id,uid,title,body,category,created,details) VALUES(?,?,?,?,?,?,?)',(pid,user['uid'],title,body,category,time.time(),json.dumps(details)))
                    shared.event(c,user['uid'],'Ideas',pid,'Posts','saved an idea')
                elif path=='/api/comments':
                    target=field('target',180);body=field('body',4000)
                    section,separator,target_id=target.partition(':')
                    if not separator or section not in shared.KINDS:raise ValueError()
                    shared.record(c,section,target_id)
                    recent=c.execute('SELECT COUNT(*) FROM comments WHERE uid=? AND created>?',(user['uid'],time.time()-60)).fetchone()[0]
                    if recent>=15:return self.send(429,{'error':'Please wait a minute before adding more comments.'})
                    c.execute('INSERT INTO comments VALUES(?,?,?,?,?)',(secrets.token_hex(12),user['uid'],target,body,time.time()))
                    shared.event(c,user['uid'],section,target_id,'Comments','commented',body)
                else:return self.send(404,{'error':'Not found'})
            return self.send(200,{'ok':True})
        except shared.Problem as e:return self.send(e.status,{'error':e.message})
        except sqlite3.Error:return self.send(503,{'error':'The save did not complete. Please retry.'})
        except (ValueError,TypeError,json.JSONDecodeError):return self.send(400,{'error':'Check the fields and try again.'})
if __name__=='__main__':
    init();ThreadingHTTPServer(('127.0.0.1',8782),Handler).serve_forever()
