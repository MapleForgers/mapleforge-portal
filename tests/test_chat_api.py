import unittest,io,json
from test_security import SharedTests,m
import chat
class ChatAPI(SharedTests):
 def setUp(self):
  super().setUp();chat.PEOPLE.clear();chat.MESSAGES.clear()
 def test_authentication_and_join(self):
  self.assertEqual(self.req('/api/chat',user='guest')[0],401)
  self.assertEqual(self.req('/api/chat',{'op':'join','nick':'guest'},user='guest')[0],401)
  self.assertEqual(self.req('/api/chat',{'op':'message','body':'hello'})[0],403)
  self.assertEqual(self.req('/api/chat',{'op':'join','nick':'alice'})[0],200)
  self.assertEqual(self.req('/api/chat',{'op':'message','body':'hello'})[0],200)
  self.assertEqual(self.req('/api/chat',user='bob')[1]['messages'][-1]['account'],'Alice')
 def test_csrf(self):
  h=object.__new__(m.Handler);h.path='/api/chat';raw=json.dumps({'op':'join','nick':'alice'}).encode();h.headers={'Cookie':'__Host-mapleforge_member=alice','Origin':'https://other.example','X-CSRF-Token':'csrf-alice','Content-Length':str(len(raw))};h.rfile=io.BytesIO(raw);out=[];h.send=lambda code,*args:out.append(code);h.do_POST();self.assertEqual(out,[403]);self.assertEqual(chat.PEOPLE,{})
 def test_projects(self):
  self.assertEqual(self.req('/api/shared',{'op':'save','kind':'Governance','fields':{'title':'New project','summary':'Build together','category':'Projects'}})[0],200)
if __name__=='__main__':unittest.main()
