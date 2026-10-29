import sys,tempfile,unittest,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import voting_trial as t
class Trial(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();t.DB=self.tmp.name+'/trial.sqlite';t.init();self.c=t.db()
 def tearDown(self):self.c.close();self.tmp.cleanup()
 def join(self,name):
  _,token=t.mutate(self.c,None,{'op':'join','name':name});return t.identity(self.c,t.COOKIE+'='+token),token
 def test_empty_identity_and_shared_content(self):
  self.assertEqual(t.snapshot(self.c,None)['posts'],[])
  alice,token=self.join('Alice');bob,_=self.join('Bob')
  with self.assertRaises(t.Problem):self.join('ALICE')
  self.assertIsNone(t.identity(self.c,t.COOKIE+'=Alice'))
  self.assertEqual(t.identity(self.c,t.COOKIE+'='+token)['name'],'Alice')
  result,_=t.mutate(self.c,alice,dict(op='post',title='Try agreement',body='Content',category='Proposals'));pid=result['id']
  self.assertEqual(len(t.snapshot(self.c,bob)['posts']),1)
  with self.assertRaises(t.Problem):t.mutate(self.c,alice,dict(op='vote',post=pid,choice='agree',visibility='private'))
  # Previously cast private votes remain anonymous after the option is removed.
  self.c.execute('INSERT INTO votes VALUES(?,?,?,?)',(pid,alice['id'],'agree','private'))
  snap=t.snapshot(self.c,bob)['posts'][0]
  self.assertEqual(snap['yes'],1);self.assertEqual(snap['votes'],[{'choice':'agree','visibility':'private','name':'Hidden voter','own':False}])
  t.mutate(self.c,alice,dict(op='vote',post=pid,choice='disagree',visibility='public'))
  snap=t.snapshot(self.c,bob)['posts'][0];self.assertEqual(snap['yes'],0);self.assertEqual(snap['no'],1);self.assertEqual(len(snap['votes']),1);self.assertEqual(snap['votes'][0]['name'],'Alice')
  t.mutate(self.c,bob,dict(op='comment',post=pid,body='A reply'))
  comment=t.snapshot(self.c,alice)['posts'][0]['comments'][0]
  t.mutate(self.c,alice,dict(op='comment',post=pid,parent=comment['id'],body='Nested reply'))
  t.mutate(self.c,alice,dict(op='comment_vote',post=pid,comment=comment['id'],value=1))
  self.assertEqual(t.snapshot(self.c,bob)['posts'][0]['comments'][0]['score'],1)
  self.c.commit();self.c.close();self.c=t.db();self.assertEqual(len(t.snapshot(self.c,None)['posts']),1)
 def test_guards(self):
  with self.assertRaises(t.Problem):t.mutate(self.c,None,dict(op='post',title='No account'))
  for name in ['admin','<script>','two names']:
   with self.assertRaises(t.Problem):self.join(name)
  alice,_=self.join('Alice');p,_=t.mutate(self.c,alice,dict(op='post',title='A',body='B',category='Rules'))
  with self.assertRaises(t.Problem):t.mutate(self.c,alice,dict(op='vote',post=p['id'],choice='agree',visibility='invalid'))
  with self.assertRaises(t.Problem):t.mutate(self.c,alice,dict(op='comment',post=p['id'],parent='missing',body='bad'))
if __name__=='__main__':unittest.main()
