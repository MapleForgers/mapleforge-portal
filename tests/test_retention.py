import json,tempfile
from pathlib import Path
from test_security import SharedTests,m
import retention,shared,privacy
class RetentionTests(SharedTests):
 def setUp(self):
  super().setUp()
  self.tmp=tempfile.TemporaryDirectory();self.people=Path(self.tmp.name)/'people.json'
  self.source='https://discord.com/channels/1562193716423430334/1562193717484593156/'
  with m.db() as c:
   c.execute('CREATE TABLE IF NOT EXISTS import_retention(key TEXT PRIMARY KEY,hidden_since REAL NOT NULL)')
   for table in ('records','discord_import_authors','discord_consent','import_retention'):c.execute('DELETE FROM '+table)
   for mid,uid in [('111','alice'),('222','bob')]:c.execute('INSERT INTO discord_import_authors VALUES(?,?,?,?)',(mid,uid,'1562193717484593156',shared.now()))
   p={'title':'PRIVATE TITLE','source':self.source+'111','discussion':[{'source':self.source+'111','role':'Original proposal','text':'PRIVATE ALICE'},{'source':self.source+'222','text':'PRIVATE BOB'}]}
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('r','Ideas','imported',json.dumps(p)))
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('native','Ideas','alice',json.dumps({'title':'NATIVE'})))
  self.people.write_text(json.dumps([{'id':'p','name':'PRIVATE PROFILE','source':self.source+'111'}]))
 def tearDown(self):self.tmp.cleanup()
 def scan(self,t):
  with m.db() as c:return retention.expire(c,self.people,t)
 def consent(self,uid,allow=True):
  with m.db() as c:shared.mutate(c,{'uid':uid},{'op':'discord_consent','version':shared.CONSENT_VERSION,'existing':allow,'future':False},{})
 def test_deadline_does_not_reset_and_counts_survive(self):
  self.scan(0);self.scan(10*86400)
  with m.db() as c:self.assertIn('PRIVATE TITLE',c.execute("SELECT payload FROM records WHERE id='r'").fetchone()[0])
  self.scan(30*86400)
  with m.db() as c:
   p=json.loads(c.execute("SELECT payload FROM records WHERE id='r'").fetchone()[0]);self.assertNotIn('PRIVATE',json.dumps(p));self.assertEqual(p['expiredReplyCount'],1)
   self.assertEqual(c.execute('SELECT count(*) FROM discord_import_authors').fetchone()[0],0)
   self.assertIn('NATIVE',c.execute("SELECT payload FROM records WHERE id='native'").fetchone()[0])
   row=c.execute("SELECT * FROM records WHERE id='r'").fetchone();self.assertEqual(shared.placeholder(row,p)['withheldReplyCount'],1)
  self.assertNotIn('PRIVATE',self.people.read_text())
 def test_visible_parent_kept_but_unconsented_reply_expires(self):
  self.consent('alice');self.scan(0);self.scan(30*86400)
  with m.db() as c:
   p=c.execute("SELECT payload FROM records WHERE id='r'").fetchone()[0];self.assertIn('PRIVATE ALICE',p);self.assertNotIn('PRIVATE BOB',p)
  self.assertIn('PRIVATE PROFILE',self.people.read_text())
 def test_withdrawal_starts_hidden_period(self):
  self.consent('alice');self.scan(0);self.scan(30*86400);self.consent('alice',False);self.scan(31*86400);self.scan(32*86400)
  with m.db() as c:self.assertIn('PRIVATE TITLE',c.execute("SELECT payload FROM records WHERE id='r'").fetchone()[0])
  self.scan(61*86400)
  with m.db() as c:self.assertNotIn('PRIVATE TITLE',c.execute("SELECT payload FROM records WHERE id='r'").fetchone()[0])
 def test_account_removal_deletes_author_mappings_only_for_owner(self):
  with m.db() as c:
   privacy.remove(c,'alice',{'kind':'Account','confirmation':'DELETE'})
   self.assertIsNone(c.execute("SELECT * FROM discord_import_authors WHERE uid='alice'").fetchone())
   self.assertIsNotNone(c.execute("SELECT * FROM discord_import_authors WHERE uid='bob'").fetchone())
