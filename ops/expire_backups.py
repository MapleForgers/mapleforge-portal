"""Expire server recovery backups within 30 days, preserving active data.

Run hourly. Entries become eligible at 29 days, leaving scheduling margin.
Only direct children of /var/backups/mapleforge are eligible. Symlinks are
unlinked, never traversed. A restore must reapply current consent records
before reopening the portal; old consent is not authorization.
"""
from pathlib import Path
import shutil,time
ROOT=Path('/var/backups/mapleforge')
def expire(root=ROOT,now=None):
    cutoff=(time.time() if now is None else now)-29*86400
    count=0
    for entry in root.iterdir():
        if entry.lstat().st_mtime>cutoff:continue
        if entry.is_symlink() or entry.is_file():entry.unlink()
        elif entry.is_dir():shutil.rmtree(entry)
        count+=1
    return count
if __name__=='__main__':print('Expired backup entries:',expire())
