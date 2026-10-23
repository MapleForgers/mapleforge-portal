import unittest,sqlite3,sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import shared
class MapTests(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:');self.c.row_factory=sqlite3.Row;shared.init(self.c)
  self.user={'uid':'alice'}
 def tearDown(self):self.c.close()
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
 def test_activity_waits_and_combines_saved_edits(self):
  from unittest.mock import patch
  with patch.object(shared.time,'time',return_value=1000):self.save()
  with patch.object(shared.time,'time',return_value=1050):self.save(label='New label')
  with patch.object(shared.time,'time',return_value=1169):shared.flush_map_activity(self.c)
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM activity').fetchone()[0],0)
  with patch.object(shared.time,'time',return_value=1170):shared.flush_map_activity(self.c)
  row=self.c.execute('SELECT * FROM activity').fetchone()
  self.assertEqual(row['action'],'added their map pin');self.assertEqual(row['detail'],'')
  with patch.object(shared.time,'time',return_value=1200):self.save(label='New label')
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM pending_map_activity').fetchone()[0],0)
  with patch.object(shared.time,'time',return_value=1300):self.save(flags=['CA'])
  with patch.object(shared.time,'time',return_value=1420):shared.flush_map_activity(self.c)
  self.assertEqual(self.c.execute('SELECT action FROM activity ORDER BY id DESC').fetchone()[0],'updated their map pin')
 def test_quick_add_remove_leaves_no_activity(self):
  self.save();shared.mutate(self.c,self.user,{'op':'map_pin','remove':True},{})
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM pending_map_activity').fetchone()[0],0)

 def test_chosen_pin_is_coarsened_on_server(self):
  # Server coarsening also protects clients that bypass the editor.
  self.save(lat=45.51234,lng=-73.56789)
  row=self.c.execute('SELECT lat,lng FROM member_locations').fetchone()
  self.assertEqual(tuple(row),(45.51,-73.57))
