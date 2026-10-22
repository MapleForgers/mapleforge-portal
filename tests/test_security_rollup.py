import io,json,time,threading,sqlite3
from unittest.mock import patch
from test_security import SharedTests,m,GateTests
class RollupTests(SharedTests):
 def setUp(self):
  super().setUp()
  with m.db() as c:
   for table in ('posts','records','comments','activity','relations','member_details','member_locations','pending_map_activity','preferences'):c.execute('DELETE FROM '+table)
 def test_unrelated_member_is_not_locked_by_discord(self):
  entered=threading.Event();release=threading.Event();out=[]
  m.MEMBERSHIP[m.digest('alice')]['checked']=0
  def slow(*a):entered.set();release.wait(2);return {'pending':False}
  with patch.object(m,'discord',side_effect=slow):
   worker=threading.Thread(target=lambda:out.append(self.req('/api/me')));worker.start();self.assertTrue(entered.wait(1))
   try:
    start=time.monotonic();self.assertEqual(self.req('/api/me',user='bob')[0],200);self.assertLess(time.monotonic()-start,.5)
   finally:release.set();worker.join(2)
 def test_csrf_rejection(self):
  for headers in [{'Origin':'https://other.invalid','X-CSRF-Token':'csrf-alice'},{'Origin':m.ORIGIN,'X-CSRF-Token':'wrong'}]:
   h=object.__new__(m.Handler);h.path='/api/profile';h.headers={'Cookie':'__Host-mapleforge_member=alice',**headers};out=[];h.send=lambda code,*a:out.append(code);h.do_POST();self.assertEqual(out,[403])
 def test_rate_limit_is_per_member_and_covers_preferences(self):
  for _ in range(60):self.assertTrue(m.permit_write('alice'))
  self.assertFalse(m.permit_write('alice'));self.assertTrue(m.permit_write('bob'))
  self.assertEqual(self.req('/api/shared',{'op':'preferences','preferences':{}})[0],429)
 def test_font_sizes_old_and_new(self):
  for size in (14,15,16,17,18,19,20,22):self.assertEqual(self.req('/api/shared',{'op':'preferences','preferences':{'menuFontSize':size,'theme':'forest'}})[0],200)
 def test_get_database_error_is_503(self):
  h=object.__new__(m.Handler);h.path='/api/shared';h.get=lambda:(_ for _ in ()).throw(sqlite3.OperationalError());out=[];h.send=lambda code,*a:out.append(code);h.do_GET();self.assertEqual(out,[503])
 def test_emoji_name(self):self.assertEqual(self.req('/api/profile',{'name':'👩‍💻 Dev'})[0],200)
 def test_record_permissions(self):
  with m.db() as c:c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('feature','Features','alice',json.dumps({'title':'Example'})))
  for data in [{'op':'save','fields':{'title':'Changed'}},{'op':'organize'},{'op':'release','notes':'test'},{'op':'status','status':'Complete'}]:
   self.assertEqual(self.req('/api/shared',dict(data,kind='Features',id='feature'),user='bob')[0],403)
 def test_delete_scrubs_comment_and_activity_bookmark(self):
  self.req('/api/posts',{'title':'Test','body':'Test','category':'Community & care'})
  pid=self.req('/api/community')[1]['posts'][0]['id']
  self.req('/api/comments',{'target':'Ideas:'+pid,'body':'private test body'})
  snap=self.req('/api/shared')[1];cid=snap['comments'][0]['id'];eid=next(x['id'] for x in snap['activity'] if x['type']=='Comments')
  self.req('/api/shared',{'op':'bookmark','kind':'Activity','id':eid,'enabled':True},user='bob')
  self.assertEqual(self.req('/api/delete',{'kind':'Comments','id':cid},user='bob')[0],403)
  self.assertEqual(self.req('/api/delete',{'kind':'Comments','id':cid})[0],200)
  self.assertNotIn('private test body',json.dumps(self.req('/api/shared',user='bob')[1]))
  self.assertEqual(self.req('/api/delete',{'kind':'Ideas','id':pid},user='bob')[0],403)
  self.assertEqual(self.req('/api/delete',{'kind':'Account','confirmation':'DELETE'})[0],200)
  self.assertEqual(self.req('/api/shared')[0],401)
  with m.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM posts').fetchone()[0],0)
class GateRollupTests(GateTests):
 def test_malformed_cookie(self):self.assertFalse(self.g.allowed('x=1; foo@bar=2'))
 def test_one_client_does_not_block_another(self):
  for _ in range(6):self.assertTrue(self.g.permit_attempt('one'))
  self.assertFalse(self.g.permit_attempt('one'));self.assertTrue(self.g.permit_attempt('two'))

class MoreRollupTests(SharedTests):
 def setUp(self):
  super().setUp()
  with m.db() as c:
   for table in ('posts','records','comments','activity','relations'):c.execute('DELETE FROM '+table)
 def test_post_owner_and_comment_throttle(self):
  self.req('/api/posts',{'title':'Example','body':'Body','category':'Community & care'})
  pid=self.req('/api/community')[1]['posts'][0]['id']
  self.assertEqual(self.req('/api/posts',{'id':pid,'title':'Stolen','body':'Other','category':'Community & care'},user='bob')[0],403)
  for _ in range(15):self.assertEqual(self.req('/api/comments',{'target':'Ideas:'+pid,'body':'Test'})[0],200)
  self.assertEqual(self.req('/api/comments',{'target':'Ideas:'+pid,'body':'Test'})[0],429)
 def test_revision_covers_private_writes_and_rollback(self):
  before=self.req('/api/version')[1]['version']
  self.req('/api/shared',{'op':'preferences','preferences':{'theme':'forest'}})
  after=self.req('/api/version')[1]['version'];self.assertGreater(after,before)
  self.assertEqual(self.req('/api/version',user='guest')[0],401)
  try:
   with m.db() as c:
    c.execute("UPDATE users SET name='Rollback' WHERE id='alice'");raise ValueError()
  except ValueError:pass
  self.assertEqual(self.req('/api/version')[1]['version'],after)
 def test_private_metadata_is_not_returned(self):
  with m.db() as c:c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('example','Ideas','import',json.dumps({'title':'Example','source':'secret-url','discussion':[{'text':'Allowed text','author':'Example','channel':'private-channel','id':'private-id','attachments':['secret-file']}]})))
  result=self.req('/api/shared')[1];self.assertIn('Allowed text',json.dumps(result))
  for secret in ('secret-url','private-channel','private-id','secret-file'):self.assertNotIn(secret,json.dumps(result))
 def test_duplicate_votes_and_history_cap(self):
  with m.db() as c:
   for id,parent in [('one',''),('two','one'),('three','two')]:c.execute('INSERT INTO records VALUES(?,?,?,?,1)',(id,'Features','alice',json.dumps({'title':id,'duplicateOf':parent,'history':[{}]*30})))
  for id in ('one','two','three'):self.assertEqual(self.req('/api/shared',{'op':'relation','kind':'Features','id':id,'relation':'vote','enabled':True})[0],200)
  with m.db() as c:self.assertEqual(c.execute("SELECT COUNT(*) FROM relations WHERE kind='vote'").fetchone()[0],1)
  self.req('/api/shared',{'op':'status','kind':'Features','id':'one','status':'Planned'})
  record=next(r for r in self.req('/api/shared')[1]['records'] if r['id']=='one');self.assertEqual(len(record['history']),20)
 def test_categories_and_legacy_saved_rejected(self):
  self.assertEqual(self.req('/api/posts',{'title':'Example','body':'Text','category':'Unknown'})[0],400)
  self.assertEqual(self.req('/api/shared',{'op':'save','kind':'Governance','fields':{'title':'Example','summary':'Test','category':'Unknown'}})[0],400)
 def test_account_delete_preserves_other_member(self):
  for user in ('alice','bob'):self.req('/api/posts',{'title':user,'body':'Text','category':'Community & care'},user=user)
  self.req('/api/delete',{'kind':'Account','confirmation':'DELETE'})
  self.assertEqual([p['title'] for p in self.req('/api/community',user='bob')[1]['posts']],['bob'])
