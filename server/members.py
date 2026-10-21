"""MapleForge member identity and shared community content. Standard library only."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from pathlib import Path
import os, json, sqlite3, secrets, hashlib, time

ORIGIN='https://maple-forge.ca'
CONFIG=json.loads(Path(os.environ.get('MEMBER_CONFIG','/etc/mapleforge/discord.json')).read_text())
DB=os.environ.get('MEMBER_DB','/var/lib/mapleforge/members.sqlite3')
def db():
    c=sqlite3.connect(DB,timeout=15);c.row_factory=sqlite3.Row;return c
def init():
    with db() as c:
        c.executescript('''PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL,name TEXT NOT NULL,profile TEXT NOT NULL DEFAULT '{}');
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT,csrf TEXT,expires REAL);
        CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY,browser TEXT,expires REAL);
        CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,uid TEXT,title TEXT,body TEXT,category TEXT,created REAL);
        CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,uid TEXT,target TEXT,body TEXT,created REAL);
        ''')
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
        with db() as c:return c.execute('SELECT sessions.*,users.username,users.name,users.profile FROM sessions JOIN users ON users.id=sessions.uid WHERE token=? AND expires>?',(digest(self.cookie('mapleforge_member')),time.time())).fetchone()
    def do_GET(self):
        try:self.get()
        except (HTTPError,TimeoutError,OSError,ValueError,KeyError):self.send(502,{'error':'Discord could not complete sign-in. Please try again.'})
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
            if not pending or pending['expires']<time.time() or not secrets.compare_digest(pending['browser'],digest(self.cookie('mapleforge_oauth'))):return self.send(400,{'error':'Sign-in expired. Return to the portal and try again.'})
            if q.get('error'):return self.send(303,headers={'Location':'/portal1/'})
            if q.get('iss',['https://discord.com'])[0]!='https://discord.com':return self.send(400,{'error':'Invalid sign-in issuer.'})
            tokens=discord('oauth2/token',data={'client_id':CONFIG['client_id'],'client_secret':CONFIG['client_secret'],'grant_type':'authorization_code','code':q.get('code',[''])[0],'redirect_uri':CONFIG['redirect_uri']})
            access=tokens['access_token'];u=discord('v10/users/@me',access)
            try:member=discord('v10/users/@me/guilds/'+CONFIG['guild_id']+'/member',access)
            except HTTPError as e:
                if e.code in (403,404):return self.send(403,{'error':'Sign-in is for MapleForge Discord members. Join the community, then try again.'})
                raise
            if member.get('pending'):return self.send(403,{'error':'Please complete MapleForge membership screening in Discord first.'})
            # Access and refresh tokens are not retained. A fresh Discord check is required after 24 hours.
            name=member.get('nick') or u.get('global_name') or u['username'];token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32)
            with db() as c:
                c.execute('INSERT INTO users(id,username,name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username',(u['id'],u['username'],name))
                c.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
                c.execute('INSERT INTO sessions VALUES(?,?,?,?)',(digest(token),u['id'],csrf,time.time()+86400))
            return self.send(303,headers={'Location':'/portal1/','Set-Cookie':'mapleforge_member='+token+'; Path=/; Max-Age=86400; Secure; HttpOnly; SameSite=Lax'})
        user=self.session()
        if path=='/api/me':return self.send(200,{'user':{'id':user['uid'],'username':user['username'],'name':user['name'],'profile':json.loads(user['profile'])} if user else None,'csrf':user['csrf'] if user else None})
        if path=='/api/community':
            with db() as c:
                posts=[dict(x) for x in c.execute('SELECT posts.*,users.name AS author FROM posts JOIN users ON uid=users.id WHERE posts.archived=0 ORDER BY created DESC')]
                profiles=[{'id':x['id'],'name':x['name'],'username':x['username'],**json.loads(x['profile'])} for x in c.execute('SELECT * FROM users')]
            return self.send(200,{'posts':posts,'profiles':profiles})
        if path=='/api/comments':
            target=parse_qs(urlparse(self.path).query).get('target',[''])[0]
            with db() as c:rows=[dict(x) for x in c.execute('SELECT comments.*,users.name AS author FROM comments JOIN users ON uid=users.id WHERE target=? ORDER BY created',(target,))]
            return self.send(200,{'comments':rows})
        return self.send(404,{'error':'Not found'})
    def do_POST(self):
        user=self.session()
        if not user:return self.send(401,{'error':'Sign in with Discord to contribute.'})
        if self.headers.get('Origin')!=ORIGIN or not secrets.compare_digest(self.headers.get('X-CSRF-Token',''),user['csrf']):return self.send(403,{'error':'Refresh the portal and try again.'})
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
                if path=='/api/logout':
                    c.execute('DELETE FROM sessions WHERE token=?',(user['token'],));return self.send(200,{'ok':True}, {'Set-Cookie':'mapleforge_member=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax'})
                if path=='/api/profile':
                    name=field('name',80);profile={'category':field('category',80),'summary':field('summary',2000,False),'services':field('services',2000,False)}
                    c.execute('UPDATE users SET name=?,profile=? WHERE id=?',(name,json.dumps(profile),user['uid']))
                elif path=='/api/posts':
                    title=field('title',120);body=field('body',8000);category=field('category',80);pid=field('id',100,False)
                    if pid:
                        row=c.execute('SELECT uid FROM posts WHERE id=? AND archived=0',(pid,)).fetchone()
                        if not row or row['uid']!=user['uid']:return self.send(403,{'error':'You can edit only your own posts.'})
                        c.execute('UPDATE posts SET title=?,body=?,category=? WHERE id=?',(title,body,category,pid))
                    else:c.execute('INSERT INTO posts(id,uid,title,body,category,created) VALUES(?,?,?,?,?,?)',('live-'+secrets.token_hex(12),user['uid'],title,body,category,time.time()))
                elif path=='/api/comments':
                    target=field('target',180);body=field('body',4000)
                    recent=c.execute('SELECT COUNT(*) FROM comments WHERE uid=? AND created>?',(user['uid'],time.time()-60)).fetchone()[0]
                    if recent>=15:return self.send(429,{'error':'Please wait a minute before adding more comments.'})
                    c.execute('INSERT INTO comments VALUES(?,?,?,?,?)',(secrets.token_hex(12),user['uid'],target,body,time.time()))
                else:return self.send(404,{'error':'Not found'})
            return self.send(200,{'ok':True})
        except (ValueError,TypeError,json.JSONDecodeError):return self.send(400,{'error':'Check the fields and try again.'})
if __name__=='__main__':
    init();ThreadingHTTPServer(('127.0.0.1',8782),Handler).serve_forever()
