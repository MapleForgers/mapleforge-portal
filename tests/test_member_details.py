from test_security import SharedTests
class MemberDetailsTests(SharedTests):
 def setUp(self):
  super().setUp()
  with __import__('test_security').m.db() as c:c.execute('DELETE FROM member_details')
 def save(self,user='alice',**extra):
  data={'op':'member_details','consent':True,'fields':{'firstName':'Example','email':'example@example.com','skills':'Testing','hours':3}};data.update(extra)
  return self.req('/api/shared',data,user)
 def test_shared_read_owner_only_edit(self):
  self.assertEqual(self.save(uid='bob')[0],200)
  rows=self.req('/api/shared',user='bob')[1]['memberDetails'];self.assertEqual(len(rows),1);self.assertEqual(rows[0]['uid'],'alice')
  self.save(user='bob',uid='alice')
  self.assertEqual(len(self.req('/api/shared')[1]['memberDetails']),2)
  self.req('/api/shared',{'op':'member_details','remove':True,'uid':'alice'},'bob')
  rows=self.req('/api/shared')[1]['memberDetails'];self.assertEqual([r['uid'] for r in rows],['alice'])
  self.assertEqual(self.req('/api/shared',user='guest')[0],401)
 def test_validation_and_no_activity_disclosure(self):
  self.assertEqual(self.save(consent=False)[0],400)
  for fields in [{'hours':169},{'hours':True},{'linkedin':'javascript:alert(1)'},{'province':'unknown'},{'skills':'x'*2001}]:
   self.assertEqual(self.save(fields=fields)[0],400)
  self.assertEqual(self.save()[0],200)
  self.assertNotIn('example@example.com',str(self.req('/api/shared')[1]['activity']))
