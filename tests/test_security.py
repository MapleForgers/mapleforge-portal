import unittest,time,io,importlib.util,os,json,hashlib,hmac
from unittest.mock import patch
from urllib.error import HTTPError
from pathlib import Path
import sys,tempfile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
tmp=tempfile.TemporaryDirectory()
os.environ['MEMBER_CONFIG']=tmp.name+'/config.json'
os.environ['MEMBER_DB']=tmp.name+'/db.sqlite'
Path(os.environ['MEMBER_CONFIG']).write_text('{"guild_id":"test","admin_ids":[]}')
from cryptography.fernet import Fernet
os.environ['MEMBER_SESSION_KEY']=tmp.name+'/session.key'
Path(os.environ['MEMBER_SESSION_KEY']).write_bytes(Fernet.generate_key())
import members as m
m.init()
class SharedTests(unittest.TestCase):
 def setUp(self):
  m.MEMBERSHIP.clear();m.WRITE_ATTEMPTS.clear()
  with m.db() as c:
   for t in ['users','sessions']:c.execute('DELETE FROM '+t)
   for uid in ['alice','bob']:
    c.execute('INSERT INTO users(id,username,name) VALUES(?,?,?)',(uid,uid,uid.title()))
    c.execute('INSERT INTO sessions VALUES(?,?,?,?)',(m.digest(uid),uid,'csrf-'+uid,time.time()+3600))
    m.MEMBERSHIP[m.digest(uid)]={'access':'test-only','checked':time.time(),'expires':time.time()+3600}
 def req(self,path,data=None,user='alice'):
  h=object.__new__(m.Handler);h.path=path;h.headers={'Cookie':'__Host-mapleforge_member='+user,'Origin':m.ORIGIN,'X-CSRF-Token':'csrf-'+user};out=[];h.send=lambda code,data=None,headers=None:out.append((code,data))
  if data is None:h.get()
  else:
   raw=json.dumps(data).encode();h.headers['Content-Length']=str(len(raw));h.rfile=io.BytesIO(raw);h.do_POST()
  return out[0]

class SecurityTests(SharedTests):
 def test_private_reads_require_member(self):
  for p in ['/api/shared','/api/community','/api/comments?target=Ideas:x']:
   self.assertEqual(self.req(p,user='guest')[0],401)
  self.assertIsNone(self.req('/api/me',user='guest')[1]['user'])
 def test_names(self):
  for name in ['Bob',' BOB ','Ｂｏｂ','Admin','a\u200bdmin','moderator']:
   self.assertEqual(self.req('/api/profile',{'name':name})[0],400 if '\u200b' in name else 409,name)
  self.assertEqual(self.req('/api/profile',{'name':'Alice New'})[0],200)
 def test_membership_removal(self):
  m.CONFIG['guild_id']='test';m.MEMBERSHIP[m.digest('alice')]['checked']=time.time()-301
  with patch.object(m,'discord',side_effect=HTTPError('test',404,'gone',{},None)):
   self.assertEqual(self.req('/api/shared')[0],401)
  self.assertNotIn(m.digest('alice'),m.MEMBERSHIP)
 def test_membership_recheck_success(self):
  m.CONFIG['guild_id']='test';m.MEMBERSHIP[m.digest('alice')]['checked']=time.time()-301
  with patch.object(m,'discord',return_value={'pending':False}) as call:
   self.assertEqual(self.req('/api/shared')[0],200)
   self.assertEqual(self.req('/api/shared')[0],200)
   self.assertEqual(call.call_count,1)
 def test_membership_failure_closed(self):
  m.CONFIG['guild_id']='test';m.MEMBERSHIP[m.digest('alice')]['checked']=time.time()-301
  with patch.object(m,'discord',side_effect=TimeoutError()):
   self.assertEqual(self.req('/api/profile',{'name':'Changed'})[0],503)
  self.assertLess(m.MEMBERSHIP[m.digest('alice')]['checked'],time.time()-300)
 def test_restart_requires_login(self):
  m.MEMBERSHIP.clear();m.WRITE_ATTEMPTS.clear();self.assertEqual(self.req('/api/shared')[0],401)
class GateTests(unittest.TestCase):
 def setUp(self):
  os.environ['GATE_CONFIG']=tmp.name+'/gate.json'
  self.config={'cookie_key':'ab'*32,'salt':'cd'*16,'password_hash':'ef'*32}
  Path(os.environ['GATE_CONFIG']).write_text(json.dumps(self.config))
  spec=importlib.util.spec_from_file_location('gate_test',ROOT/'server/gate.py');self.g=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.g)
 def test_cookie_invalidated_after_password_change(self):
  g=self.g;expiry=int(time.time()+100);old=g.token(expiry)
  self.assertTrue(g.allowed('__Host-mapleforge_preview='+old))
  g.KEY=hmac.new(bytes.fromhex(self.config['cookie_key']),b'different-password-hash',hashlib.sha256).digest()
  self.assertFalse(g.allowed('__Host-mapleforge_preview='+old))
 def test_global_rate_limit_before_hash(self):
  g=self.g
  for _ in range(6):self.assertTrue(g.permit_attempt())
  h=object.__new__(g.Handler);h.path='/preview-access';h.client_address=('local',0);h.headers={'Content-Length':'10'};h.rfile=io.BytesIO(b'password=x');out=[];h.respond=lambda code,*a,**kw:out.append(code)
  with patch.object(g,'password_ok') as hashing:h.do_POST();hashing.assert_not_called()
  self.assertEqual(out,[429])
if __name__=='__main__':unittest.main()
