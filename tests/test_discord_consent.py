from test_security import SharedTests, m
import shared

class DiscordConsentTests(SharedTests):
 def setUp(self):
  super().setUp()
  with m.db() as c:
   c.execute('DELETE FROM discord_consent');c.execute('DELETE FROM discord_consent_history')
 def save(self,**overrides):
  data=dict(op='discord_consent',version=shared.CONSENT_VERSION,existing=False,future=False)
  data.update(overrides)
  return self.req('/api/shared',data)
 def test_default_deny_and_private_choices(self):
  choice=self.req('/api/shared')[1]['discordConsent']
  self.assertFalse(choice['answered']);self.assertFalse(choice['existing']);self.assertFalse(choice['future'])
  self.assertEqual(self.save(existing=True)[0],200)
  self.assertTrue(self.req('/api/shared')[1]['discordConsent']['existing'])
  self.assertFalse(self.req('/api/shared',user='bob')[1]['discordConsent']['answered'])
  with m.db() as c:
   self.assertTrue(shared.may_import_discord(c,'alice'))
   self.assertFalse(shared.may_import_discord(c,'alice',False))
   self.assertFalse(shared.may_import_discord(c,'unknown'))
 def test_decline_does_not_block_portal_and_withdrawal_is_recorded(self):
  self.save(existing=True,future=True);self.save()
  self.assertEqual(self.req('/api/shared')[0],200)
  with m.db() as c:
   self.assertFalse(shared.may_import_discord(c,'alice'))
   self.assertEqual(c.execute('SELECT count(*) FROM discord_consent_history WHERE uid=?',('alice',)).fetchone()[0],2)
 def test_strict_validation_identity_and_version(self):
  for changes in ({'version':'old'},{'existing':'true'},{'future':1}):
   self.assertIn(self.save(**changes)[0],(400,409))
  self.save(uid='bob',existing=True)
  self.assertFalse(self.req('/api/shared',user='bob')[1]['discordConsent']['answered'])
  self.assertEqual(self.req('/api/shared',dict(op='discord_consent',version=shared.CONSENT_VERSION,existing=True,future=True),user='guest')[0],401)
 def test_new_version_requires_fresh_choice(self):
  self.save(existing=True,future=True)
  with m.db() as c:
   c.execute("UPDATE discord_consent SET version='old'")
   self.assertFalse(shared.may_import_discord(c,'alice'))
 def test_account_deletion_removes_choices_and_history(self):
  self.save()
  self.assertEqual(self.req('/api/delete',dict(kind='Account',confirmation='DELETE'))[0],200)
  with m.db() as c:
   for table in ('discord_consent','discord_consent_history'):
    self.assertEqual(c.execute('SELECT count(*) FROM '+table+' WHERE uid=?',('alice',)).fetchone()[0],0)
