import sys,unittest,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import chat,shared
class ChatTests(unittest.TestCase):
 def setUp(self):
  chat.PEOPLE.clear();chat.MESSAGES.clear();self.a={'uid':'a','name':'Alice'};self.b={'uid':'b','name':'Bob'}
 def test_join_required_and_read_only(self):
  with self.assertRaises(shared.Problem):chat.change(self.a,{'op':'message','body':'hello'})
  self.assertFalse(chat.read('a')['joined']);self.assertEqual(chat.PEOPLE,{})
 def test_nickname_and_attribution(self):
  chat.change(self.a,{'op':'join','nick':'alice'})
  with self.assertRaises(shared.Problem):chat.change(self.b,{'op':'join','nick':'ALICE'})
  with self.assertRaises(shared.Problem):chat.change(self.b,{'op':'join','nick':'system'})
  chat.change(self.a,{'op':'nick','nick':'test'})
  r=chat.change(self.a,{'op':'message','body':'<img src=x onerror=alert(1)>'})
  self.assertEqual(r['messages'][-1]['account'],'Alice');self.assertEqual(r['messages'][-1]['nick'],'test')
 def test_presence_and_leave(self):
  chat.change(self.a,{'op':'join','nick':'a'});chat.PEOPLE['a']['seen']=0
  self.assertEqual(chat.read('b')['users'],[])
  chat.change(self.a,{'op':'join','nick':'a'});chat.change(self.a,{'op':'leave'})
  self.assertFalse(chat.read('a')['joined'])
 def test_cheers_and_topic(self):
  for u in [self.a,self.b]:chat.change(u,{'op':'join','nick':u['uid']})
  r=chat.change(self.a,{'op':'cheer','nick':'b'});self.assertEqual(r['users'][1]['cheers'],1)
  with self.assertRaises(shared.Problem):chat.change(self.a,{'op':'cheer','nick':'b'})
  self.assertEqual(chat.change(self.a,{'op':'topic','body':'Build stuff'})['topic'],'Build stuff')
 def test_history_bounded(self):
  chat.change(self.a,{'op':'join','nick':'a'})
  for i in range(220):chat.change(self.a,{'op':'message','body':str(i)})
  self.assertEqual(len(chat.read('b')['messages']),200)
if __name__=='__main__':unittest.main()

class MessageEdits(unittest.TestCase):
 def setUp(self):
  chat.PEOPLE.clear();chat.MESSAGES.clear();chat.MEDIA.clear()
  self.a={'uid':'a','name':'Alice'};self.b={'uid':'b','name':'Bob'}
  chat.change(self.a,{'op':'join','nick':'Alice'})
 def test_owner_edits_and_stale_version(self):
  r=chat.change(self.a,{'op':'message','body':'hello'});m=r['messages'][-1]
  self.assertTrue(m['canEdit']);self.assertFalse(chat.read('b')['messages'][-1]['canEdit'])
  with self.assertRaises(shared.Problem):chat.change(self.b,{'op':'edit','id':m['id'],'revision':1,'body':'hijacked'})
  r=chat.change(self.a,{'op':'edit','id':m['id'],'revision':1,'body':'updated'})
  self.assertEqual(r['messages'][-1]['body'],'updated')
  with self.assertRaises(shared.Problem):chat.change(self.a,{'op':'delete','id':m['id'],'revision':1})
  chat.change(self.a,{'op':'leave'})
  chat.change(self.a,{'op':'delete','id':m['id'],'revision':2})
  self.assertFalse(any(x['id']==m['id'] for x in chat.read('a')['messages']))
 def test_image_only_and_media_cleanup(self):
  import base64
  pic={'name':'x.png','data':base64.b64encode(b'\x89PNG\r\n\x1a\n'+b'0'*20).decode()}
  r=chat.change(self.a,{'op':'message','body':'','images':[pic]});m=r['messages'][-1];mid=m['images'][0]['id']
  self.assertEqual(chat.media(self.b,mid)['mime'],'image/png')
  with self.assertRaises(shared.Problem):chat.media(None,mid)
  with self.assertRaises(shared.Problem):chat.change(self.b,{'op':'delete','id':m['id'],'revision':1})
  chat.change(self.a,{'op':'delete','id':m['id'],'revision':1});self.assertNotIn(mid,chat.MEDIA)
  r=chat.change(self.a,{'op':'message','body':'','images':[pic]});mid=r['messages'][-1]['images'][0]['id']
  for i in range(201):chat.change(self.a,{'op':'message','body':'later'})
  self.assertNotIn(mid,chat.MEDIA)
