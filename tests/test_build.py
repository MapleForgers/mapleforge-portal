import json,re,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class BuildTests(unittest.TestCase):
 def test_clean_shell_and_output_guard(self):
  subprocess.run([sys.executable,'build.py'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
  html=(ROOT/'dist/portal1/index.html').read_text()
  self.assertEqual(json.loads(re.search(r'<script[^>]+id="seed"[^>]*>(.*?)</script>',html,re.S).group(1)),[])
  self.assertIn('const peopleSeeds=[];',html)
  self.assertIn('const governanceSeeds=[];',html)
  stale=ROOT/'dist/obsolete.txt';stale.write_text('stale')
  subprocess.run([sys.executable,'build.py'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL);self.assertFalse(stale.exists())
  with tempfile.TemporaryDirectory() as folder:
   marker=Path(folder)/'keep.txt';marker.write_text('keep')
   for args in (['--output',folder],['--content-dir',folder]):
    result=subprocess.run([sys.executable,'build.py',*args],cwd=ROOT,capture_output=True);self.assertNotEqual(result.returncode,0)
   self.assertEqual(marker.read_text(),'keep')
