import time
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import urlparse,parse_qs
from test_security import SharedTests,m

class PersistentSessions(SharedTests):
 def save(self):m.persist_proof(m.digest('alice'),m.MEMBERSHIP[m.digest('alice')])
 def test_restart_rechecks_membership_and_keeps_login(self):
  self.save()
  with m.db() as c:self.assertNotIn('test-only',c.execute('SELECT access FROM session_proofs').fetchone()[0])
  m.MEMBERSHIP.clear()
  with patch.object(m,'discord',return_value={'pending':False}) as call:
   self.assertEqual(self.req('/api/shared')[0],200)
   self.assertEqual(call.call_count,1)
 def test_restart_does_not_bypass_removed_membership(self):
  self.save();m.MEMBERSHIP.clear()
  with patch.object(m,'discord',side_effect=HTTPError('test',404,'gone',{},None)):
   self.assertEqual(self.req('/api/shared')[0],401)
  with m.db() as c:self.assertEqual(c.execute('SELECT count(*) FROM session_proofs').fetchone()[0],0)
 def test_logout_removes_encrypted_proof(self):
  self.save();self.assertEqual(self.req('/api/logout',{})[0],200)
  with m.db() as c:self.assertEqual(c.execute('SELECT count(*) FROM session_proofs').fetchone()[0],0)
 def test_repeat_authorization_uses_none_and_state(self):
  h=object.__new__(m.Handler);h.path='/auth/discord';h.headers={};out=[]
  h.send=lambda code,data=None,headers=None:out.append(headers)
  with patch.dict(m.CONFIG,{'client_id':'test','redirect_uri':'https://maple-forge.ca/auth/callback'}):h.get()
  query=parse_qs(urlparse(out[0]['Location']).query)
  self.assertEqual(query['prompt'],['none']);self.assertTrue(query['state'][0])
