import unittest
from test_security import SharedTests,m
class History(SharedTests):
 def setUp(self):
  super().setUp()
  with m.db() as c:c.execute('DELETE FROM records');c.execute('DELETE FROM post_history');c.execute('DELETE FROM comments')
  code,r=self.req('/api/shared',{'op':'save','kind':'Governance','fields':{'title':'Example','summary':'proposal body','category':'Rules'}});self.assertEqual(code,200);self.rid=r['id'];self.target='Governance:'+self.rid
 def history(self):return self.req('/api/post-history?kind=Governance&id='+self.rid)[1]['events']
 def test_vote_edit_delete_metadata(self):
  for vote in ['agree','disagree','remove']:
   self.assertEqual(self.req('/api/shared',{'op':'ballot','kind':'Governance','id':self.rid,'revision':1,'choice':vote})[0],200)
  self.assertEqual(self.req('/api/comments',{'target':self.target,'body':'private old words'})[0],200)
  cid=self.req('/api/comments?target='+self.target)[1]['comments'][0]['id']
  self.assertEqual(self.req('/api/comments',{'op':'edit','id':cid,'body':'private new words','originalBody':'private old words'})[0],200)
  self.assertEqual(self.req('/api/delete',{'kind':'Comments','id':cid})[0],200)
  events=self.history();actions=[r['action'] for r in events]
  self.assertIn('changed vote from agree to disagree',actions);self.assertIn('changed vote from disagree to none',actions)
  self.assertIn('edited a comment',actions);self.assertIn('deleted a comment',actions)
  self.assertNotIn('private',str(events));self.assertNotIn('proposal body',str(events))
 def test_auth_and_failure_no_events(self):
  self.assertEqual(self.req('/api/post-history?kind=Governance&id='+self.rid,user='guest')[0],401)
  before=len(self.history());self.assertEqual(self.req('/api/shared',{'op':'ballot','kind':'Governance','id':self.rid,'revision':99,'choice':'agree'})[0],409);self.assertEqual(len(self.history()),before)
if __name__=='__main__':unittest.main()
