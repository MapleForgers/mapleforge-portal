import unittest,sqlite3,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import shared
class MapTests(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:');self.c.row_factory=sqlite3.Row;shared.init(self.c)
  self.user={'uid':'alice'}
 def save(self,**kw):
  data={'op':'map_pin','lat':45.5,'lng':-73.5,'label':'Montréal, Québec','consent':True,'flags':['CA','CA-QC']};data.update(kw)
  return shared.mutate(self.c,self.user,data,{})
 def test_owned_upsert_and_remove(self):
  self.save(uid='bob');self.save(label='Québec')
  rows=list(self.c.execute('SELECT * FROM member_locations'));self.assertEqual(len(rows),1);self.assertEqual(rows[0]['uid'],'alice');self.assertEqual(rows[0]['label'],'Québec')
  shared.mutate(self.c,{'uid':'bob'},{'op':'map_pin','remove':True,'uid':'alice'},{});self.assertEqual(self.c.execute('SELECT COUNT(*) FROM member_locations').fetchone()[0],1)
  shared.mutate(self.c,self.user,{'op':'map_pin','remove':True},{});self.assertEqual(self.c.execute('SELECT COUNT(*) FROM member_locations').fetchone()[0],0)
 def test_rejects_invalid_or_unconsented_pins(self):
  for fields in [{'consent':False},{'lat':float('nan')},{'lng':181},{'lat':True},{'label':''},{'flags':['CA']*4},{'flags':['<script>']},{'flags':['CA-XX']}]:
   with self.subTest(fields=fields),self.assertRaises(shared.Problem):self.save(**fields)
