import unittest,json,base64
from test_security import SharedTests,m
class RuleCommentAPI(SharedTests):
 def setUp(self):
  super().setUp()
  with m.db() as c:
   for t in ('comments','records','activity','relations'):c.execute('DELETE FROM '+t)
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('rule','Governance','alice',json.dumps({'title':'Rule','summary':'Propose','category':'Rules'})))
 def test_comment_upload_reply_vote_and_delete(self):
  data={'target':'Governance:rule','body':'**Hello**','attachments':[{'name':'example.png','data':base64.b64encode(b'\x89PNG\r\n\x1a\n'+b'0'*20).decode()}]}
  self.assertEqual(self.req('/api/comments',data)[0],200)
  comment=self.req('/api/comments?target=Governance:rule')[1]['comments'][0]
  self.assertEqual(len(comment['attachments']),1)
  self.assertEqual(self.req('/api/comments',{'target':'Governance:rule','body':'Reply','parent':comment['id']},user='bob')[0],200)
  self.assertEqual(self.req('/api/comment-vote',{'id':comment['id'],'value':1},user='bob')[0],200)
  snapshot=self.req('/api/shared')[1]
  self.assertTrue(any(c.get('parent')==comment['id'] for c in snapshot['comments']))
  self.assertTrue(any(r['kind']=='comment_vote' for r in snapshot['relations']))
  self.assertEqual(self.req('/api/delete',{'kind':'Comments','id':comment['id']})[0],200)
  with m.db() as c:self.assertEqual(c.execute('select count(*) from comment_media').fetchone()[0],0)
 def test_anonymous_attachment_and_vote(self):
  self.assertEqual(self.req('/api/media/not-real',user='guest')[0],401)
  self.assertEqual(self.req('/api/comment-vote',{'id':'missing','value':1},user='guest')[0],401)
 def test_invalid_upload_rolls_back(self):
  self.assertEqual(self.req('/api/comments',{'target':'Governance:rule','body':'Text','attachments':[{'name':'bad.png','data':base64.b64encode(b'<html>unsafe</html>').decode()}]})[0],400)
  self.assertEqual(self.req('/api/comments?target=Governance:rule')[1]['comments'],[])
if __name__=='__main__':unittest.main()
