import json, tempfile, os
from unittest.mock import patch
from test_security import SharedTests,m
import shared

class ImportVisibilityTests(SharedTests):
 def setUp(self):
  super().setUp()
  self.channel='1562193717484593156'
  self.url='https://discord.com/channels/1562193716423430334/'+self.channel+'/'
  with m.db() as c:
   for table in ('records','comments','activity','relations','discord_consent','discord_consent_history','discord_import_authors'):c.execute('DELETE FROM '+table)
   p={'title':'PRIVATE TITLE','summary':'PRIVATE TEXT','source':self.url+'111','category':'Community & care','discussion':[{'source':self.url+'111','role':'Original proposal','text':'ALICE TEXT','author':'Alice'},{'source':self.url+'222','role':'Follow-up','text':'BOB TEXT','author':'Bob'}]}
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('import-test','Ideas','imported',json.dumps(p)))
   c.execute('INSERT INTO records VALUES(?,?,?,?,1)',('native-test','Ideas','alice',json.dumps({'title':'Native post'})))
   c.execute('INSERT INTO comments VALUES(?,?,?,?,?)',('comment-test','bob','Ideas:import-test','PRIVATE COMMENT',1))
   c.execute('INSERT INTO activity(uid,kind,target,type,action,detail,created) VALUES(?,?,?,?,?,?,?)',('alice','Ideas','import-test','Posts','commented','PRIVATE ACTIVITY',1))
 def consent(self,user='alice',existing=True,future=False):
  return self.req('/api/shared',dict(op='discord_consent',version=shared.CONSENT_VERSION,existing=existing,future=future),user)
 def link(self,mid,uid,channel=None):
  with m.db() as c:c.execute('INSERT INTO discord_import_authors VALUES(?,?,?,?)',(mid,uid,channel or self.channel,shared.now()))
 def test_default_placeholder_and_direct_access_no_leak(self):
  data=self.req('/api/shared')[1];raw=json.dumps(data)
  for secret in ('PRIVATE TITLE','PRIVATE TEXT','ALICE TEXT','BOB TEXT','PRIVATE COMMENT','PRIVATE ACTIVITY'):self.assertNotIn(secret,raw)
  self.assertIn('Native post',raw)
  stub=next(r for r in data['records'] if r['id']=='import-test')
  self.assertTrue(stub['consentHidden']);self.assertEqual(stub['withheldReplyCount'],1)
  self.assertEqual(self.req('/api/comments?target=Ideas:import-test')[0],404)
  self.assertEqual(self.req('/api/comments',dict(target='Ideas:import-test',body='test'))[0],404)
 def test_verified_ids_required_and_per_reply_consent(self):
  self.consent();self.assertNotIn('PRIVATE TEXT',json.dumps(self.req('/api/shared')[1]))
  self.link('111','alice');self.link('222','bob')
  raw=json.dumps(self.req('/api/shared')[1]);self.assertIn('PRIVATE TEXT',raw);self.assertIn('ALICE TEXT',raw);self.assertNotIn('BOB TEXT',raw)
  self.consent('bob');self.assertIn('BOB TEXT',json.dumps(self.req('/api/shared')[1]))
  before=self.req('/api/version')[1]['version'];self.consent(existing=False)
  self.assertGreater(self.req('/api/version')[1]['version'],before)
  self.assertNotIn('PRIVATE TEXT',json.dumps(self.req('/api/shared')[1]))
 def test_wrong_channel_and_future_choice_do_not_authorize_existing(self):
  self.link('111','alice','wrong');self.consent();self.assertNotIn('PRIVATE TEXT',json.dumps(self.req('/api/shared')[1]))
  with m.db() as c:c.execute('UPDATE discord_import_authors SET channel_id=?',(self.channel,))
  self.consent(existing=False,future=True);self.assertNotIn('PRIVATE TEXT',json.dumps(self.req('/api/shared')[1]))
 def test_profile_and_bookmarked_activity_are_hidden(self):
  with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as f:
   json.dump([{'id':'person-test','name':'PRIVATE PERSON','summary':'PRIVATE BIO','sources':[{'url':self.url+'111'}]}],f);f.flush()
   with patch.dict(os.environ,IMPORTED_PEOPLE=f.name):
    with m.db() as c:
     event=c.execute('SELECT id FROM activity').fetchone()[0]
     c.execute('INSERT INTO relations VALUES(?,?,?,?)',('alice','saved','Activity:event-'+str(event),json.dumps({'item':{'body':'PRIVATE COPY'}})))
     c.execute('INSERT INTO relations VALUES(?,?,?,?)',('alice','saved','People:person-test',json.dumps({'title':'PRIVATE PERSON'})))
    raw=json.dumps(self.req('/api/shared')[1]);self.assertNotIn('PRIVATE',raw)
    self.link('111','alice');self.consent()
    self.assertIn('PRIVATE BIO',json.dumps(self.req('/api/shared')[1]))
