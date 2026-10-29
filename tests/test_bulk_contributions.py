import json
from test_security import SharedTests,m

class BulkContributionsTests(SharedTests):
 def test_requires_confirmation_and_preserves_other_members_and_account(self):
  with m.db() as c:
   for table in ('posts','records','comments','activity','relations'):c.execute('DELETE FROM '+table)
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('mine','Skills exchange','alice',json.dumps({'title':'My offer'})))
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('theirs','Skills exchange','bob',json.dumps({'title':'Their offer'})))
  self.assertEqual(self.req('/api/delete',{'kind':'Contributions'})[0],400)
  with m.db() as c:self.assertIsNotNone(c.execute("SELECT id FROM records WHERE id='mine'").fetchone())
  self.assertEqual(self.req('/api/delete',{'kind':'Contributions','confirmation':'REMOVE','uid':'bob'})[0],200)
  with m.db() as c:
   self.assertIsNone(c.execute("SELECT id FROM records WHERE id='mine'").fetchone())
   self.assertIsNotNone(c.execute("SELECT id FROM records WHERE id='theirs'").fetchone())
   self.assertIsNotNone(c.execute("SELECT id FROM users WHERE id='alice'").fetchone())
  self.assertEqual(self.req('/api/shared')[0],200)
