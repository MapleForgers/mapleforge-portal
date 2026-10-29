import unittest,sys,sqlite3,json,base64
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import shared,discussions
class Discussions(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:');self.c.row_factory=sqlite3.Row
  self.c.executescript('CREATE TABLE comments(id TEXT PRIMARY KEY,uid TEXT,target TEXT,body TEXT,created REAL);')
  shared.init(self.c);discussions.init(self.c)
  self.c.execute('INSERT INTO records VALUES(?,?,?,?,?)',('rule','Governance','one',json.dumps({'title':'Rule','summary':'Test','category':'Rules'}),1))
  self.u={'uid':'one'}
 def create(self,**kwargs):return discussions.create(self.c,self.u,dict(target='Governance:rule',body='Hello',**kwargs))
 def test_threads_and_votes(self):
  parent=self.create();reply=self.create(parent=parent)
  discussions.vote(self.c,self.u,{'id':reply,'value':1});discussions.vote(self.c,self.u,{'id':reply,'value':-1})
  self.assertEqual(self.c.execute('select count(*) from relations').fetchone()[0],1)
  self.assertEqual(json.loads(self.c.execute('select payload from relations').fetchone()[0])['value'],-1)
  discussions.vote(self.c,self.u,{'id':reply,'value':0});self.assertEqual(self.c.execute('select count(*) from relations').fetchone()[0],0)
  self.c.execute('DELETE FROM comments WHERE id=?',(parent,));self.assertEqual(self.c.execute('select parent from comment_threads where id=?',(reply,)).fetchone()[0],'')
 def test_cross_discussion_reply_rejected(self):
  self.c.execute('INSERT INTO comments VALUES(?,?,?,?,?)',('other','one','Governance:other','Hi',1))
  with self.assertRaises(shared.Problem):self.create(parent='other')
 def test_media_auth_delete_and_type(self):
  cid=self.create(attachments=[{'name':'pic.png','data':base64.b64encode(b'\x89PNG\r\n\x1a\n'+b'a'*10).decode()}])
  row=discussions.enrich(self.c,[dict(self.c.execute('select * from comments where id=?',(cid,)).fetchone())])[0]
  mid=row['attachments'][0]['id']
  with self.assertRaises(shared.Problem):discussions.media(self.c,None,mid)
  self.assertEqual(discussions.media(self.c,self.u,mid)['mime'],'image/png')
  self.c.execute('delete from comments where id=?',(cid,));self.assertEqual(self.c.execute('select count(*) from comment_media').fetchone()[0],0)
  with self.assertRaises(shared.Problem):self.create(attachments=[{'name':'x.png','data':base64.b64encode(b'<script>alert(1)</script>').decode()}])
 def test_hidden_record_cannot_expose_media(self):
  cid=self.create(attachments=[{'name':'a.gif','data':base64.b64encode(b'GIF89a123').decode()}]);mid=self.c.execute('select id from comment_media').fetchone()[0]
  self.c.execute("update records set uid='imported'")
  with self.assertRaises(shared.Problem):discussions.media(self.c,self.u,mid)
 def test_invalid_votes(self):
  cid=self.create()
  for value in (True,2,'1'):
   with self.assertRaises(shared.Problem):discussions.vote(self.c,self.u,{'id':cid,'value':value})
 def test_owner_edit_preserves_thread_and_updates_activity(self):
  cid=self.create();reply=self.create(parent=cid)
  discussions.create(self.c,self.u,{'op':'edit','id':cid,'body':'Revised','originalBody':'Hello'})
  self.assertEqual(self.c.execute('select body from comments where id=?',(cid,)).fetchone()[0],'Revised')
  self.assertEqual(self.c.execute('select parent from comment_threads where id=?',(reply,)).fetchone()[0],cid)
  self.assertFalse(self.c.execute("select 1 from activity where detail='Hello'").fetchone())
  with self.assertRaises(shared.Problem):discussions.update(self.c,self.u,{'id':cid,'body':'Stale','originalBody':'Hello'})
 def test_other_member_cannot_edit_or_delete(self):
  import privacy
  cid=self.create()
  with self.assertRaises(shared.Problem):discussions.update(self.c,{'uid':'other'},{'id':cid,'body':'No','originalBody':'Hello'})
  with self.assertRaises(shared.Problem):privacy.remove(self.c,'other',{'kind':'Comments','id':cid})
  with self.assertRaises(shared.Problem):privacy.remove(self.c,'other',{'kind':'Governance','id':'rule'})
  self.assertEqual(self.c.execute('select body from comments where id=?',(cid,)).fetchone()[0],'Hello')
 def test_edit_attachment_removal_is_scoped(self):
  cid=self.create(attachments=[{'name':'pic.gif','data':base64.b64encode(b'GIF89a123').decode()}])
  mid=self.c.execute('select id from comment_media where comment_id=?',(cid,)).fetchone()[0]
  with self.assertRaises(shared.Problem):discussions.update(self.c,self.u,{'id':cid,'body':'','originalBody':'Hello','removeAttachments':[mid]})
  with self.assertRaises(shared.Problem):discussions.update(self.c,self.u,{'id':cid,'body':'Changed','originalBody':'Hello','removeAttachments':['someone-elses']})
  discussions.update(self.c,self.u,{'id':cid,'body':'Changed','originalBody':'Hello','removeAttachments':[mid]})
  self.assertEqual(self.c.execute('select count(*) from comment_media').fetchone()[0],0)
if __name__=='__main__':unittest.main()
