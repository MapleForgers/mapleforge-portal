import unittest,json,base64
from test_chat import chat,shared

class ChatReplies(unittest.TestCase):
 def setUp(self):
  chat.PEOPLE.clear();chat.MESSAGES.clear();chat.MEDIA.clear()
  self.a={'uid':'a','name':'Alice'};self.b={'uid':'b','name':'Bob'}
  for u in [self.a,self.b]:chat.change(u,{'op':'join','nick':u['name']})
  self.parent=chat.change(self.a,{'op':'message','body':'Original message'})['messages'][-1]
 def send(self,user,**data):return chat.change(user,data)
 def test_reply_tracks_edit_and_does_not_retain_deleted_text(self):
  response=self.send(self.b,op='message',body='A reply',replyTo=self.parent['id'])
  self.assertEqual(response['messages'][-1]['reply']['body'],'Original message')
  self.send(self.a,op='edit',id=self.parent['id'],revision=1,body='Corrected message')
  self.assertEqual(chat.read('b')['messages'][-1]['reply']['body'],'Corrected message')
  self.send(self.a,op='delete',id=self.parent['id'],revision=2)
  response=chat.read('b');self.assertTrue(response['messages'][-1]['reply']['unavailable'])
  self.assertNotIn('Corrected message',json.dumps(response))
 def test_missing_system_and_invalid_reply_targets(self):
  system=next(m for m in chat.MESSAGES if m['kind']=='system')
  for target in [system['id'],999999,True,'1']:
   with self.assertRaises(shared.Problem):self.send(self.b,op='message',body='reply',replyTo=target)
 def test_reactions_are_per_member_toggle_and_do_not_conflict_with_edits(self):
  for user in [self.a,self.b]:self.send(user,op='react',id=self.parent['id'],emoji='❤️')
  m=chat.read('b')['messages'][-1];self.assertEqual(m['reactions'],[{'emoji':'❤️','count':2,'mine':True}]);self.assertEqual(m['revision'],1)
  self.send(self.a,op='react',id=self.parent['id'],emoji='❤️')
  self.assertFalse(chat.read('a')['messages'][-1]['reactions'][0]['mine'])
  self.assertEqual(chat.read('b')['messages'][-1]['reactions'][0]['count'],1)
  self.send(self.a,op='edit',id=self.parent['id'],revision=1,body='Still editable')
  self.assertNotIn('uid',json.dumps(chat.read('b')))
 def test_reaction_requires_join_and_valid_target(self):
  self.send(self.b,op='leave')
  with self.assertRaises(shared.Problem):self.send(self.b,op='react',id=self.parent['id'],emoji='👍')
  for emoji in ['<script>','🔥',None,[]]:
   with self.assertRaises(shared.Problem):self.send(self.a,op='react',id=self.parent['id'],emoji=emoji)
  self.send(self.a,op='delete',id=self.parent['id'],revision=1)
  with self.assertRaises(shared.Problem):self.send(self.a,op='react',id=self.parent['id'],emoji='👎')
 def test_extended_reactions_toggle_per_member(self):
  for emoji in ['😂','🎉','🍁','🦫','🛶','❄️','🍯','🏒','snowshoe','lantern']:
   self.send(self.a,op='react',id=self.parent['id'],emoji=emoji)
   self.send(self.b,op='react',id=self.parent['id'],emoji=emoji)
   self.send(self.a,op='react',id=self.parent['id'],emoji=emoji)
  reactions=chat.read('a')['messages'][-1]['reactions']
  self.assertEqual(len(reactions),10)
  self.assertTrue(all(r['count']==1 and not r['mine'] for r in reactions))
 def test_picture_only_reply_and_expired_parent(self):
  pic={'name':'picture.png','data':base64.b64encode(b'\x89PNG\r\n\x1a\n'+b'0'*20).decode()}
  m=self.send(self.b,op='message',body='',images=[pic],replyTo=self.parent['id'])['messages'][-1]
  self.assertEqual(m['replyTo'],self.parent['id']);self.assertEqual(len(m['images']),1)
  for i in range(199):self.send(self.a,op='message',body=str(i))
  self.assertTrue(chat.read('a')['messages'][0]['reply']['unavailable'])
