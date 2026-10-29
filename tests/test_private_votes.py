from test_post_history import History
import json
class PrivateVotes(History):
 def vote(self,choice='agree',visibility='private',kind='Governance',rid=None):
  return self.req('/api/shared',dict(op='ballot',kind=kind,id=rid or self.rid,revision=1,choice=choice,visibility=visibility))
 def test_private_identity_and_switching(self):
  self.assertEqual(self.vote()[0],400)
  self.assertEqual(self.vote(visibility='public')[0],200)
  from test_security import m
  with m.db() as c:c.execute("UPDATE relations SET payload=json_set(payload,'$.visibility','private') WHERE target=?",(self.target,))
  bob=self.req('/api/shared',user='bob')[1]
  ballot=next(r for r in bob['relations'] if r['target']==self.target)
  self.assertIsNone(ballot['uid']);self.assertEqual(ballot['name'],'Hidden voter');self.assertEqual(ballot['data']['choice'],'agree')
  # An already cast private ballot stays anonymous; past public activity is unchanged.
  alice=self.req('/api/shared')[1]
  self.assertEqual(next(r for r in alice['relations'] if r['target']==self.target)['uid'],'alice')
  self.assertEqual(self.vote('disagree','public')[0],200)
  ballots=[r for r in self.req('/api/shared',user='bob')[1]['relations'] if r['target']==self.target]
  self.assertEqual(len(ballots),1);self.assertEqual(ballots[0]['name'],'Alice');self.assertEqual(ballots[0]['data']['choice'],'disagree')
  self.assertEqual(self.vote('disagree','private')[0],400)
  self.assertEqual(self.history()[0]['author'],'Hidden voter')
  self.assertEqual(self.vote('remove','public')[0],200)
  self.assertEqual(self.history()[0]['author'],'Alice')
  self.assertFalse([r for r in self.req('/api/shared',user='bob')[1]['relations'] if r['target']==self.target])
 def test_proposals_category(self):
  code,r=self.req('/api/shared',{'op':'save','kind':'Governance','fields':{'title':'General proposal','summary':'Try a new approach','category':'Proposals'}})
  self.assertEqual(code,200)
 def test_invalid_visibility_and_revision(self):
  self.assertEqual(self.vote(visibility='invalid')[0],400)
  self.assertEqual(self.req('/api/shared',dict(op='ballot',kind='Governance',id=self.rid,revision=99,choice='agree',visibility='private'))[0],409)
 def test_feature_legacy_support_replaced(self):
  code,r=self.req('/api/shared',{'op':'save','kind':'Features','fields':{'title':'Demo feature','body':'Try this feature','area':'General','kind':'Feature'}})
  self.assertEqual(code,200);rid=r['id']
  self.assertEqual(self.req('/api/shared',dict(op='relation',kind='Features',id=rid,relation='vote',enabled=True))[0],200)
  self.assertEqual(self.vote('disagree','public','Features',rid)[0],200)
  votes=[r for r in self.req('/api/shared',user='bob')[1]['relations'] if r['target']=='Features:'+rid]
  self.assertEqual(len(votes),1);self.assertEqual(votes[0]['data']['choice'],'disagree');self.assertEqual(votes[0]['uid'],'alice')
