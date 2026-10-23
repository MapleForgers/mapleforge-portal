import importlib.util,tempfile,unittest,os
from pathlib import Path
spec=importlib.util.spec_from_file_location('expiry',Path(__file__).resolve().parents[1]/'ops/expire_backups.py');expiry=importlib.util.module_from_spec(spec);spec.loader.exec_module(expiry)
class BackupExpiryTests(unittest.TestCase):
 def test_age_and_symlink_boundary(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)/'backups';root.mkdir();outside=Path(tmp)/'active';outside.write_text('keep')
   recent=root/'recent';recent.mkdir();(recent/'db').write_text('keep')
   old=root/'old';old.mkdir();(old/'db').write_text('expire')
   link=root/'link';link.symlink_to(outside)
   now=40*86400
   for p in (old,link):os.utime(p,(1,1),follow_symlinks=False)
   os.utime(recent,(now,now))
   self.assertEqual(expiry.expire(root,now),2)
   self.assertTrue(recent.exists());self.assertTrue(outside.exists());self.assertFalse(old.exists())
