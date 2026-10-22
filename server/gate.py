"""MapleForge password-only preview gate. No member accounts or tracking."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from urllib.parse import parse_qs
from pathlib import Path
import hashlib,hmac,json,os,time,threading

CONFIG=json.loads(Path(os.environ.get('GATE_CONFIG','/etc/mapleforge/gate.json')).read_text())
# Password changes automatically invalidate previously issued preview cookies.
KEY=hmac.new(bytes.fromhex(CONFIG['cookie_key']),CONFIG['password_hash'].encode(),hashlib.sha256).digest()
ATTEMPT_LOCK=threading.Lock()
ATTEMPTS=[]
HASH_SLOTS=threading.BoundedSemaphore(2)
def permit_attempt():
    with ATTEMPT_LOCK:
        now=time.monotonic()
        ATTEMPTS[:]=[t for t in ATTEMPTS if now-t<60]
        if len(ATTEMPTS)>=20:return False
        ATTEMPTS.append(now)
        return True
TTL=30*24*60*60

def token(expiry):
    value=str(expiry)
    return value+'.'+hmac.new(KEY,value.encode(),hashlib.sha256).hexdigest()

def allowed(header):
    try:
        cookies=SimpleCookie(header);value=cookies['mapleforge_preview'].value
        expiry=int(value.split('.')[0])
        return time.time()<expiry<=time.time()+TTL+60 and hmac.compare_digest(value,token(expiry))
    except (KeyError,ValueError,TypeError):return False

def password_ok(password):
    candidate=hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(CONFIG['salt']),200000).hex()
    return hmac.compare_digest(candidate,CONFIG['password_hash'])

PAGE='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Step inside · MapleForge</title><style>*{box-sizing:border-box}body{margin:0;background:#faf9f4;color:#203c32;font:17px/1.5 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:min(100%,390px)}img{width:42px}h1{font-size:30px;margin:14px 0 8px}p{color:#57695f}label{display:block;font-weight:600;margin:24px 0 8px}input{font:inherit;width:100%;padding:12px;border:1px solid #9aaa9f;border-radius:8px}button{font:inherit;font-weight:650;background:#b7482b;color:white;border:0;border-radius:8px;padding:12px 20px;width:100%;margin-top:14px;cursor:pointer}a{color:inherit}small{display:block;margin-top:18px;color:#66766c}.error{color:#a32f21}</style><main><a href="/" aria-label="MapleForge home"><img src="/maple-leaf.svg" alt="Canadian maple leaf"></a><h1>A little word gets you in.</h1><p>Got the community password? Come take a look around.</p>ERROR<form method="post" action="/preview-access"><label for="password">Shared password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="256"><button type="submit">Explore Prototype →</button></form><small>No username. No account. Just our work in progress.<br>We’ll remember this browser for 30 days.</small></main></html>'''

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def respond(self,status,body=b'',headers=None):
        self.send_response(status)
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        if self.command!='HEAD':self.wfile.write(body)
    def do_GET(self):
        if self.path=='/check':return self.respond(204 if allowed(self.headers.get('Cookie','')) else 401)
        if self.path.split('?')[0]!='/preview-access':return self.respond(404)
        if allowed(self.headers.get('Cookie','')):return self.respond(303,headers={'Location':'/portal1/'})
        self.respond(200,PAGE.replace('ERROR','').encode(),{'Content-Type':'text/html; charset=utf-8'})
    def do_HEAD(self):self.do_GET()
    def do_POST(self):
        if self.path!='/preview-access':return self.respond(404)
        if self.headers.get('Origin') not in (None,'https://maple-forge.ca'):return self.respond(403)
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:return self.respond(400)
        if not 0<length<=4096:return self.respond(413)
        if not permit_attempt():return self.respond(429,b'Too many attempts. Please wait a minute.',{'Retry-After':'60'})
        fields=parse_qs(self.rfile.read(length).decode('utf-8',errors='replace'))
        password=fields.get('password',[''])[0]
        if not HASH_SLOTS.acquire(blocking=False):return self.respond(429,b'Please try again shortly.',{'Retry-After':'5'})
        try:valid=len(password)<=256 and password_ok(password)
        finally:HASH_SLOTS.release()
        if not valid:
            return self.respond(200,PAGE.replace('ERROR','<p class="error" role="alert">That’s not the word. Give it another try.</p>').encode(),{'Content-Type':'text/html; charset=utf-8'})
        cookie='mapleforge_preview='+token(int(time.time())+TTL)+'; Path=/; Max-Age='+str(TTL)+'; Secure; HttpOnly; SameSite=Lax'
        self.respond(303,headers={'Location':'/portal1/','Set-Cookie':cookie})

if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',8781),Handler).serve_forever()
