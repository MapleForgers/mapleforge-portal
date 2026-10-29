"""Independent, public, non-binding nickname voting trial. No portal data access."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from pathlib import Path
from collections import deque, OrderedDict
import os, json, sqlite3, secrets, hashlib, time, unicodedata, threading

DB=os.environ.get('TRIAL_DB','/var/lib/mapleforge-trial/trial.sqlite3')
ORIGIN=os.environ.get('TRIAL_ORIGIN','https://maple-forge.ca')
COOKIE='__Secure-mapleforge_trial'
CATEGORIES={'Rules','Structure','Agreements','Features','Projects','Proposals'}
LIMITS=OrderedDict();LOCK=threading.Lock()
class Problem(Exception):
 def __init__(self,status,message):self.status=status;self.message=message

def db():
 c=sqlite3.connect(DB,timeout=10);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c

def init():
 with db() as c:
  c.executescript('''PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT UNIQUE NOT NULL,token_hash TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,category TEXT NOT NULL,created REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,post TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,uid TEXT NOT NULL REFERENCES users(id),parent TEXT REFERENCES comments(id) ON DELETE CASCADE,body TEXT NOT NULL,created REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS votes(post TEXT REFERENCES posts(id) ON DELETE CASCADE,uid TEXT REFERENCES users(id),choice TEXT NOT NULL,visibility TEXT NOT NULL,PRIMARY KEY(post,uid));
  CREATE TABLE IF NOT EXISTS comment_votes(comment TEXT REFERENCES comments(id) ON DELETE CASCADE,uid TEXT REFERENCES users(id),value INTEGER NOT NULL,PRIMARY KEY(comment,uid));
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,post TEXT REFERENCES posts(id) ON DELETE CASCADE,author TEXT NOT NULL,action TEXT NOT NULL,created REAL NOT NULL);
  CREATE INDEX IF NOT EXISTS comments_post ON comments(post);
  CREATE INDEX IF NOT EXISTS events_post ON events(post);
  ''')

def digest(s):return hashlib.sha256(s.encode()).hexdigest()
def identity(c,cookie):
 try:
  cookies=SimpleCookie();cookies.load(cookie);t=cookies.get(COOKIE)
  return c.execute('SELECT id,name FROM users WHERE token_hash=?',(digest(t.value),)).fetchone() if t else None
 except Exception:return None

def text(d,key,limit):
 value=d.get(key)
 if not isinstance(value,str) or not 1<=len(value.strip())<=limit:raise Problem(400,'Please check '+key+'.')
 return value.strip()
def event(c,post,name,action):
 c.execute('INSERT INTO events(post,author,action,created) VALUES(?,?,?,?)',(post,name,action,time.time()*1000))
 c.execute('DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT -1 OFFSET 20000)')
def require_post(c,p):
 r=c.execute('SELECT * FROM posts WHERE id=?',(p,)).fetchone()
 if not r:raise Problem(404,'This proposal is no longer available.')
 return r

def snapshot(c,user):
 uid=user['id'] if user else None
 votes={};comments={};events={}
 for v in c.execute('SELECT v.*,u.name FROM votes v JOIN users u ON u.id=v.uid'):
  votes.setdefault(v['post'],[]).append(dict(choice=v['choice'],visibility=v['visibility'],name=v['name'] if v['visibility']=='public' else 'Hidden voter',own=v['uid']==uid))
 cv={};own_cv={}
 for v in c.execute('SELECT * FROM comment_votes'):
  cv[v['comment']]=cv.get(v['comment'],0)+v['value']
  if v['uid']==uid:own_cv[v['comment']]=v['value']
 for r in c.execute('SELECT c.*,u.name FROM comments c JOIN users u ON u.id=c.uid ORDER BY c.created'):
  comments.setdefault(r['post'],[]).append(dict(id=r['id'],author=r['name'],parent=r['parent'],body=r['body'],created=r['created'],score=cv.get(r['id'],0),ownVote=own_cv.get(r['id'],0)))
 for r in c.execute('SELECT * FROM events ORDER BY id DESC LIMIT 2000'):
  events.setdefault(r['post'],[]).append({k:r[k] for k in ('author','action','created')})
 posts=[]
 for r in c.execute('SELECT p.*,u.name FROM posts p JOIN users u ON u.id=p.uid ORDER BY p.created DESC'):
  vs=votes.get(r['id'],[])
  posts.append(dict(id=r['id'],title=r['title'],summary=r['body'][:220]+('…' if len(r['body'])>220 else ''),detail=r['body'],category=r['category'],created=r['created'],author=r['name'],comments=comments.get(r['id'],[]),votes=vs,events=events.get(r['id'],[]),yes=sum(v['choice']=='agree' for v in vs),no=sum(v['choice']=='disagree' for v in vs),abstain=sum(v['choice']=='abstain' for v in vs)))
 return dict(user={'name':user['name']} if user else None,posts=posts)

def mutate(c,user,d):
 op=d.get('op');token=None
 if op=='join':
  if user:return {},None
  name=unicodedata.normalize('NFKC',text(d,'name',24));key=name.casefold()
  if not 1<=len(name)<=24 or any(not (ch.isalnum() or ch in '_-') for ch in name):raise Problem(400,'Use 1 to 24 letters, numbers, underscores or hyphens.')
  if key in {'admin','administrator','moderator','system','hidden-voter'}:raise Problem(400,'Please choose another nickname.')
  if c.execute('SELECT 1 FROM users WHERE name_key=?',(key,)).fetchone():raise Problem(409,'That nickname is already in use. Choose another, or return in the browser where you joined.')
  if c.execute('SELECT count(*) FROM users').fetchone()[0]>=5000:raise Problem(429,'The trial is full for now.')
  token=secrets.token_urlsafe(32)
  c.execute('INSERT INTO users VALUES(?,?,?,?)',(secrets.token_hex(16),name,key,digest(token)))
  return {},token
 if not user:raise Problem(401,'Enter a nickname to join the trial first.')
 uid=user['id'];name=user['name']
 if op=='post':
  title=text(d,'title',160);body=text(d,'body',6000);category=d.get('category')
  if category not in CATEGORIES:raise Problem(400,'Choose a category.')
  if c.execute('SELECT count(*) FROM posts').fetchone()[0]>=500:raise Problem(429,'The trial board is full for now.')
  pid=secrets.token_hex(12);c.execute('INSERT INTO posts VALUES(?,?,?,?,?,?)',(pid,uid,title,body,category,time.time()*1000));event(c,pid,name,'created a proposal');return {'id':pid},None
 pid=text(d,'post',100);require_post(c,pid)
 if op=='vote':
  choice=d.get('choice');visibility=d.get('visibility')
  if choice not in ('agree','disagree','abstain','remove') or (visibility!='public' and choice!='remove'):raise Problem(400,'Choose a valid vote and visibility.')
  old=c.execute('SELECT * FROM votes WHERE post=? AND uid=?',(pid,uid)).fetchone()
  if choice=='remove':c.execute('DELETE FROM votes WHERE post=? AND uid=?',(pid,uid))
  else:c.execute('INSERT INTO votes VALUES(?,?,?,?) ON CONFLICT(post,uid) DO UPDATE SET choice=excluded.choice,visibility=excluded.visibility',(pid,uid,choice,visibility))
  if choice!='remove' or old:
   hidden=visibility=='private' or bool(old and old['visibility']=='private')
   event(c,pid,'Hidden voter' if hidden else name,'withdrew a vote' if choice=='remove' else 'cast a vote' if hidden else 'voted '+choice)
 elif op=='comment':
  body=text(d,'body',6000);parent=d.get('parent') or None
  if parent:
   row=c.execute('SELECT post FROM comments WHERE id=?',(parent,)).fetchone()
   if not row or row['post']!=pid:raise Problem(400,'Reply to a comment in this proposal.')
   depth=0;ancestor=parent
   while ancestor:
    depth+=1
    if depth>=12:raise Problem(400,'This thread is deep enough. Reply higher up or start a new comment.')
    ancestor=c.execute('SELECT parent FROM comments WHERE id=?',(ancestor,)).fetchone()['parent']
  if c.execute('SELECT count(*) FROM comments').fetchone()[0]>=10000:raise Problem(429,'The trial comment limit has been reached.')
  c.execute('INSERT INTO comments VALUES(?,?,?,?,?,?)',(secrets.token_hex(12),pid,uid,parent,body,time.time()*1000));event(c,pid,name,'replied to a comment' if parent else 'added a comment')
 elif op=='comment_vote':
  cid=text(d,'comment',100);value=d.get('value');r=c.execute('SELECT post FROM comments WHERE id=?',(cid,)).fetchone()
  if not r or r['post']!=pid or type(value) is not int or value not in (-1,0,1):raise Problem(400,'Invalid comment vote.')
  if value:c.execute('INSERT INTO comment_votes VALUES(?,?,?) ON CONFLICT(comment,uid) DO UPDATE SET value=excluded.value',(cid,uid,value))
  else:c.execute('DELETE FROM comment_votes WHERE comment=? AND uid=?',(cid,uid))
  event(c,pid,name,'updated a comment vote')
 else:raise Problem(400,'Unknown trial action.')
 return {},None

def permit(key,limit):
 now=time.monotonic()
 with LOCK:
  q=LIMITS.setdefault(key,deque());LIMITS.move_to_end(key)
  while q and q[0]<now-60:q.popleft()
  if len(q)>=limit:return False
  q.append(now)
  while len(LIMITS)>4096:LIMITS.popitem(last=False)
  return True

class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def send(self,status,data,cookie=None):
  body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(body)))
  if cookie:self.send_header('Set-Cookie',f'{COOKIE}={cookie}; Path=/voting_trial/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict')
  self.end_headers();self.wfile.write(body)
 def do_GET(self):
  if self.path.split('?')[0]!='/voting_trial/api':return self.send(404,{'error':'Not found'})
  c=db()
  try:return self.send(200,snapshot(c,identity(c,self.headers.get('Cookie',''))))
  finally:c.close()
 def do_POST(self):
  if self.path!='/voting_trial/api':return self.send(404,{'error':'Not found'})
  if self.headers.get('Origin')!=ORIGIN or self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.send(403,{'error':'Please use the trial page to make changes.'})
  c=None
  try:
   n=int(self.headers.get('Content-Length','0'))
   if not 0<n<=32768:raise Problem(413,'Request too large.')
   d=json.loads(self.rfile.read(n))
   if not isinstance(d,dict):raise Problem(400,'Invalid request.')
   c=db();c.execute('BEGIN IMMEDIATE');user=identity(c,self.headers.get('Cookie',''))
   # Nginx overwrites this header; this service listens only on loopback.
   key=('user',user['id']) if user else ('visitor',self.headers.get('X-Real-IP',self.client_address[0]))
   if not permit(key,30 if user else 8):raise Problem(429,'Please wait a minute before trying again.')
   result,token=mutate(c,user,d);c.commit();return self.send(200,dict(ok=True,**result),token)
  except Problem as e:return self.send(e.status,{'error':e.message})
  except (ValueError,TypeError):return self.send(400,{'error':'Invalid request.'})
  except sqlite3.IntegrityError:return self.send(409,{'error':'That name or entry changed. Please try again.'})
  except sqlite3.Error:return self.send(503,{'error':'The trial is busy. Please try again.'})
  finally:
   if c:c.close()

if __name__=='__main__':
 init();ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('TRIAL_PORT','8783'))),Handler).serve_forever()
