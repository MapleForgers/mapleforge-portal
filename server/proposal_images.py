"""Authenticated images attached atomically to member proposals."""
import base64,json,secrets
import shared,discussions
LIMIT=10*1024*1024

def init(c):
 c.executescript('''CREATE TABLE IF NOT EXISTS proposal_images(id TEXT PRIMARY KEY,record_id TEXT NOT NULL,uid TEXT NOT NULL,mime TEXT NOT NULL,name TEXT NOT NULL,data BLOB NOT NULL);
 CREATE TRIGGER IF NOT EXISTS delete_proposal_images AFTER DELETE ON records BEGIN DELETE FROM proposal_images WHERE record_id=OLD.id; END;''')

def save(c,user,data,config):
 if data.get('op')!='save' or data.get('kind') not in ('Governance','Features'):raise shared.Problem(400,'Choose a proposal or feature request.')
 files=data.get('attachments',[]);remove=data.get('removeImages',[])
 if not isinstance(files,list) or len(files)>3 or not isinstance(remove,list) or any(not isinstance(x,str) for x in remove):raise shared.Problem(400,'Attach up to three pictures.')
 prepared=[];total=0
 for f in files:
  if not isinstance(f,dict):raise shared.Problem(400,'Invalid picture.')
  name=shared.text(f,'name',160,True);encoded=f.get('data')
  if not isinstance(encoded,str) or len(encoded)>14*1024*1024:raise shared.Problem(413,'Pictures must total 10 MB or less.')
  try:blob=base64.b64decode(encoded,validate=True)
  except (ValueError,TypeError):raise shared.Problem(400,'Invalid picture data.')
  total+=len(blob)
  if not blob or total>LIMIT:raise shared.Problem(413,'Pictures must total 10 MB or less.')
  mime=discussions.detect(blob)
  if not mime.startswith('image/'):raise shared.Problem(400,'Use PNG, JPEG, GIF or WebP pictures.')
  prepared.append((secrets.token_hex(16),mime,name,blob))
 existing=list(c.execute('SELECT id,length(data) AS size FROM proposal_images WHERE record_id=?',(str(data.get('id','')),)))
 if not set(remove)<={r['id'] for r in existing}:raise shared.Problem(400,'That picture does not belong to this proposal.')
 if len(existing)-len(set(remove))+len(prepared)>3:raise shared.Problem(400,'Keep up to three pictures per proposal.')
 if sum(r['size'] for r in existing if r['id'] not in remove)+total>LIMIT:raise shared.Problem(413,'Pictures must total 10 MB or less.')
 used=c.execute('SELECT COALESCE(SUM(length(data)),0) FROM proposal_images WHERE uid=?',(user['uid'],)).fetchone()[0]
 if used+total>200*1024*1024:raise shared.Problem(413,'Your proposal picture storage limit is 200 MB.')
 result=shared.mutate(c,user,data,config,allow_empty_body=bool(len(existing)-len(set(remove))+len(prepared)));rid=result['id']
 for mid in remove:c.execute('DELETE FROM proposal_images WHERE id=? AND record_id=?',(mid,rid))
 for mid,mime,name,blob in prepared:c.execute('INSERT INTO proposal_images VALUES(?,?,?,?,?,?)',(mid,rid,user['uid'],mime,name,blob))
 row=c.execute('SELECT payload FROM records WHERE id=?',(rid,)).fetchone();payload=json.loads(row['payload'])
 payload['images']=[{'id':r['id'],'name':r['name'],'url':'/api/proposal-images/'+r['id']} for r in c.execute('SELECT id,name FROM proposal_images WHERE record_id=?',(rid,))]
 c.execute('UPDATE records SET payload=? WHERE id=?',(json.dumps(payload),rid))
 return result

def media(c,user,mid):
 if not user:raise shared.Problem(401,'Sign in to view proposal pictures.')
 r=c.execute('SELECT m.*,r.kind FROM proposal_images m JOIN records r ON r.id=m.record_id WHERE m.id=?',(mid,)).fetchone()
 if not r:raise shared.Problem(404,'Picture not found.')
 shared.record(c,r['kind'],r['record_id']);return r
