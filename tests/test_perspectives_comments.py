import sys, tempfile, unittest, uuid, sqlite3
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import perspectives_comments as p

class Comments(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();p.DB=self.tmp.name+'/comments.sqlite3';p.init();self.c=p.db()
 def tearDown(self):self.c.close();self.tmp.cleanup()
 def comment(self,**changes):
  data=dict(page='history',section='apache',name='Any name 🦊',body='A comment',parent=None,requestId=str(uuid.uuid4()));data.update(changes)
  return data
 def test_persistence_thread_isolation_and_retry(self):
  data=self.comment();cid=p.add(self.c,data)
  self.assertEqual(cid,p.add(self.c,data))
  reply=p.add(self.c,self.comment(parent=cid,name='Someone else',body='A reply'))
  self.c.commit();self.c.close();self.c=p.db()
  rows=p.snapshot(self.c,'history','apache');self.assertEqual(len(rows),2);self.assertEqual(rows[1]['parent'],cid)
  self.assertEqual(p.snapshot(self.c,'history','amul'),[])
  with self.assertRaises(p.Problem):p.add(self.c,self.comment(parent=cid,section='amul'))
  with self.assertRaises(p.Problem):p.add(self.c,{**data,'body':'Changed payload'})
 def test_invalid_input_and_depth(self):
  for changes in [dict(name=' '),dict(body=''),dict(body='x'*4001),dict(name='x'*61),dict(page='portal'),dict(section='unknown'),dict(parent='bad'),dict(requestId='bad')]:
   with self.assertRaises(p.Problem):p.add(self.c,self.comment(**changes))
  parent=p.add(self.c,self.comment())
  for _ in range(8):parent=p.add(self.c,self.comment(parent=parent))
  with self.assertRaises(p.Problem):p.add(self.c,self.comment(parent=parent))
 def test_html_is_plain_text(self):
  p.add(self.c,self.comment(name='<b>name</b>',body='<script>alert(1)</script>'))
  row=p.snapshot(self.c,'history','apache')[0]
  self.assertEqual(row['body'],'<script>alert(1)</script>')
  self.assertNotIn('request_id',row)

 def test_only_posting_session_can_edit_delete(self):
  token='a'*64;other='b'*64
  cid=p.add(self.c,self.comment(ownerToken=token))
  for candidate in [None,other,'bad']:
   for action in ['edit','delete']:
    with self.assertRaises(p.Problem) as denied:
     p.change(self.c,dict(action=action,id=cid,ownerToken=candidate,body='Intrusion'))
    self.assertEqual(denied.exception.status,403)
  p.change(self.c,dict(action='edit',id=cid,ownerToken=token,body='My corrected comment'))
  row=p.snapshot(self.c,'history','apache')[0]
  self.assertEqual(row['body'],'My corrected comment');self.assertTrue(row['edited'])
  self.assertNotIn('owner_hash',row);self.assertNotIn('editable_until',row)
  reply=p.add(self.c,self.comment(parent=cid,ownerToken=other,body='Someone else replies'))
  p.change(self.c,dict(action='delete',id=cid,ownerToken=token))
  rows={r['id']:r for r in p.snapshot(self.c,'history','apache')}
  self.assertEqual(rows[cid]['body'],'');self.assertEqual(rows[cid]['name'],'');self.assertEqual(rows[cid]['deleted'],1)
  self.assertEqual(rows[reply]['body'],'Someone else replies');self.assertEqual(rows[reply]['parent'],cid)
  p.change(self.c,dict(action='delete',id=cid,ownerToken=token))
  with self.assertRaises(p.Problem):p.change(self.c,dict(action='edit',id=cid,ownerToken=token,body='Restore'))
 def test_expiry_and_legacy_comments_are_locked(self):
  token='c'*64;cid=p.add(self.c,self.comment(ownerToken=token))
  self.c.execute('UPDATE comments SET editable_until=0 WHERE id=?',(cid,))
  for action in ['edit','delete']:
   with self.assertRaises(p.Problem) as denied:p.change(self.c,dict(action=action,id=cid,ownerToken=token,body='Too late'))
   self.assertEqual(denied.exception.status,403)
  legacy=p.add(self.c,self.comment())
  with self.assertRaises(p.Problem):p.change(self.c,dict(action='delete',id=legacy,ownerToken=token))
 def test_retry_does_not_extend_window_or_restore_content(self):
  data=self.comment(ownerToken='d'*64);cid=p.add(self.c,data)
  expiry=self.c.execute('SELECT editable_until FROM comments WHERE id=?',(cid,)).fetchone()[0]
  p.change(self.c,dict(action='edit',id=cid,ownerToken=data['ownerToken'],body='Corrected'))
  self.assertEqual(p.add(self.c,data),cid)
  self.assertEqual(p.snapshot(self.c,'history','apache')[0]['body'],'Corrected')
  self.assertEqual(self.c.execute('SELECT editable_until FROM comments WHERE id=?',(cid,)).fetchone()[0],expiry)
 def test_migration_preserves_existing_comments(self):
  self.c.close()
  Path(p.DB).unlink()
  with sqlite3.connect(p.DB) as old:
   old.execute('CREATE TABLE comments (id TEXT PRIMARY KEY,page TEXT NOT NULL,section TEXT NOT NULL,parent TEXT REFERENCES comments(id),name TEXT NOT NULL,body TEXT NOT NULL,created REAL NOT NULL,request_id TEXT UNIQUE NOT NULL,payload_hash TEXT NOT NULL)')
   old.execute('INSERT INTO comments VALUES(?,?,?,?,?,?,?,?,?)',('e'*24,'history','apache',None,'Existing author','Keep this',1,str(uuid.uuid4()),'hash'))
  p.init();p.init();self.c=p.db()
  row=p.snapshot(self.c,'history','apache')[0]
  self.assertEqual(row['body'],'Keep this');self.assertEqual(row['deleted'],0)
  with self.assertRaises(p.Problem):p.change(self.c,dict(action='delete',id=row['id'],ownerToken='e'*64))

if __name__=='__main__':unittest.main()
