import unittest,base64,json
from test_security import SharedTests,m
class ProposalImages(SharedTests):
 def setUp(self):
  super().setUp()
  with m.db() as c:c.execute('DELETE FROM records');c.execute('DELETE FROM proposal_images')
 def data(self,kind='Governance'):
  return {'op':'save','kind':kind,'fields':{'title':'Pictures','summary':'A proposal','category':'Projects','body':'A feature','kind':'Feature','area':'Portal'},'attachments':[{'name':'picture.png','data':base64.b64encode(b'\x89PNG\r\n\x1a\n'+b'0'*20).decode()}]}
 def test_save_preserve_remove_delete(self):
  code,res=self.req('/api/proposals',self.data());self.assertEqual(code,200);rid=res['id'];record=next(r for r in self.req('/api/shared')[1]['records'] if r['id']==rid);self.assertEqual(len(record['images']),1)
  mid=record['images'][0]['id'];d=self.data();d.update(id=rid,revision=record['revision'],attachments=[],removeImages=[mid]);self.assertEqual(self.req('/api/proposals',d,user='bob')[0],403)
  self.assertEqual(self.req('/api/proposals',d)[0],200)
  with m.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM proposal_images').fetchone()[0],0)
  code,res=self.req('/api/proposals',self.data('Features'));self.assertEqual(code,200);self.assertEqual(self.req('/api/delete',{'kind':'Features','id':res['id']})[0],200)
  with m.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM proposal_images').fetchone()[0],0)
 def test_picture_only(self):
  for kind in ['Governance','Features']:
   d=self.data(kind);d['fields'].update(title='',summary='',body='')
   code,r=self.req('/api/proposals',d);self.assertEqual(code,200)
   item=next(x for x in self.req('/api/shared')[1]['records'] if x['id']==r['id'])
   self.assertEqual(item['title'],'Picture post')
   d.update(id=r['id'],revision=item['revision'],attachments=[],removeImages=[item['images'][0]['id']])
   self.assertEqual(self.req('/api/proposals',d)[0],400)
 def test_invalid_is_atomic_and_anonymous_denied(self):
  d=self.data();d['attachments'][0]['data']=base64.b64encode(b'<script>bad</script>').decode();self.assertEqual(self.req('/api/proposals',d)[0],400)
  with m.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM records').fetchone()[0],0)
  self.assertEqual(self.req('/api/proposals',self.data(),user='guest')[0],401)
  self.assertEqual(self.req('/api/proposal-images/missing',user='guest')[0],401)
if __name__=='__main__':unittest.main()
