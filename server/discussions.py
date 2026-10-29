"""Threaded member comments and private media attached to comments."""
import base64,json,re,secrets,time
import shared
MAX_BYTES=20*1024*1024

def init(c):
    c.executescript('''
    CREATE TABLE IF NOT EXISTS comment_threads(id TEXT PRIMARY KEY,parent TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS comment_media(id TEXT PRIMARY KEY,comment_id TEXT NOT NULL,mime TEXT NOT NULL,name TEXT NOT NULL,data BLOB NOT NULL);
    CREATE INDEX IF NOT EXISTS media_comment ON comment_media(comment_id);
    CREATE TRIGGER IF NOT EXISTS remove_comment_media AFTER DELETE ON comments BEGIN
      DELETE FROM comment_media WHERE comment_id=OLD.id;
      DELETE FROM comment_threads WHERE id=OLD.id;
      UPDATE comment_threads SET parent='' WHERE parent=OLD.id;
      DELETE FROM relations WHERE target='Comments:'||OLD.id;
    END;
    ''')

def enrich(c,rows):
    if not c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='comment_threads'").fetchone():return [dict(r,parent='',attachments=[]) for r in rows]
    parents=dict(c.execute('SELECT id,parent FROM comment_threads'))
    media={}
    for r in c.execute('SELECT id,comment_id,mime,name FROM comment_media'):
        media.setdefault(r['comment_id'],[]).append({'id':r['id'],'mime':r['mime'],'name':r['name'],'url':'/api/media/'+r['id']})
    return [dict(r,parent=parents.get(r['id'],''),attachments=media.get(r['id'],[])) for r in rows]

def detect(blob):
    if blob.startswith(b'\x89PNG\r\n\x1a\n'):return 'image/png'
    if blob.startswith(b'\xff\xd8\xff'):return 'image/jpeg'
    if blob.startswith((b'GIF87a',b'GIF89a')):return 'image/gif'
    if blob.startswith(b'RIFF') and blob[8:12]==b'WEBP':return 'image/webp'
    if len(blob)>12 and blob[4:8]==b'ftyp' and blob[8:12] in (b'isom',b'iso2',b'mp41',b'mp42',b'avc1',b'M4V ',b'qt  '):return 'video/mp4'
    if blob.startswith(b'\x1a\x45\xdf\xa3') and b'webm' in blob[:4096]:return 'video/webm'
    raise shared.Problem(400,'Use PNG, JPEG, GIF, WebP, MP4 or WebM files.')

def update(c,user,data):
    # Ownership is checked before any mutation; edits retain thread position and votes.
    cid=shared.text(data,'id',100,True)
    row=c.execute('SELECT * FROM comments WHERE id=?',(cid,)).fetchone()
    if not row or row['uid']!=user['uid']:raise shared.Problem(403,'You can edit only your own comments.')
    kind,_,rid=row['target'].partition(':');shared.record(c,kind,rid)
    body=shared.text(data,'body',12000)
    if data.get('originalBody')!=row['body']:raise shared.Problem(409,'This comment changed. Refresh before editing again.')
    remove=data.get('removeAttachments',[])
    if not isinstance(remove,list) or any(not isinstance(mid,str) for mid in remove):raise shared.Problem(400,'Invalid attachments.')
    attachments={r['id'] for r in c.execute('SELECT id FROM comment_media WHERE comment_id=?',(cid,))}
    if not set(remove)<=attachments:raise shared.Problem(400,'Attachment does not belong to this comment.')
    if not body and not (attachments-set(remove)):raise shared.Problem(400,'Write a comment or keep an attachment.')
    # Replace old copies in Activity too, so edited text is not left behind there.
    c.execute('UPDATE activity SET detail=? WHERE uid=? AND kind=? AND target=? AND type=? AND detail=?',(body,row['uid'],kind,rid,'Comments',row['body']))
    c.execute('UPDATE comments SET body=? WHERE id=?',(body,cid))
    for mid in remove:c.execute('DELETE FROM comment_media WHERE id=? AND comment_id=?',(mid,cid))
    return cid

def create(c,user,data):
    if data.get('op')=='edit':return update(c,user,data)
    target=shared.text(data,'target',180,True);body=shared.text(data,'body',12000)
    kind,_,rid=target.partition(':');shared.record(c,kind,rid)
    parent=shared.text(data,'parent',100)
    files=data.get('attachments',[])
    if not isinstance(files,list) or len(files)>3:raise shared.Problem(400,'Attach up to three files.')
    if (parent or files) and kind!='Governance':raise shared.Problem(400,'Threads and attachments are available in rule discussions.')
    if not body and not files:raise shared.Problem(400,'Write a comment or attach a file.')
    if parent:
        p=c.execute('SELECT target FROM comments WHERE id=?',(parent,)).fetchone()
        if not p or p['target']!=target:raise shared.Problem(400,'Reply must belong to this discussion.')
    if c.execute('SELECT COUNT(*) FROM comments WHERE uid=? AND created>?',(user['uid'],time.time()-60)).fetchone()[0]>=15:raise shared.Problem(429,'Please wait a minute before adding more comments.')
    prepared=[];total=0
    for f in files:
        if not isinstance(f,dict):raise shared.Problem(400,'Invalid attachment.')
        name=shared.text(f,'name',160,True)
        encoded=f.get('data')
        if not isinstance(encoded,str) or len(encoded)>28*1024*1024:raise shared.Problem(413,'Attachments must total 20 MB or less.')
        try:blob=base64.b64decode(encoded,validate=True)
        except (ValueError,TypeError):raise shared.Problem(400,'Invalid attachment data.')
        total+=len(blob)
        if not blob or total>MAX_BYTES:raise shared.Problem(413,'Attachments must total 20 MB or less.')
        prepared.append((secrets.token_hex(16),detect(blob),name,blob))
    used=c.execute('SELECT COALESCE(SUM(length(m.data)),0) FROM comment_media m JOIN comments c ON c.id=m.comment_id WHERE c.uid=?',(user['uid'],)).fetchone()[0]
    if used+total>200*1024*1024:raise shared.Problem(413,'Your attachment storage limit is 200 MB.')
    cid=secrets.token_hex(12)
    c.execute('INSERT INTO comments VALUES(?,?,?,?,?)',(cid,user['uid'],target,body,time.time()))
    c.execute('INSERT INTO comment_threads VALUES(?,?)',(cid,parent))
    for mid,mime,name,blob in prepared:c.execute('INSERT INTO comment_media VALUES(?,?,?,?,?)',(mid,cid,mime,name,blob))
    shared.event(c,user['uid'],kind,rid,'Comments','replied' if parent else 'commented',body)
    return cid

def vote(c,user,data):
    cid=shared.text(data,'id',100,True);value=data.get('value')
    if type(value) is not int or value not in (-1,0,1):raise shared.Problem(400,'Invalid comment vote.')
    r=c.execute('SELECT target FROM comments WHERE id=?',(cid,)).fetchone()
    if not r:raise shared.Problem(404,'Comment not found.')
    kind,_,rid=r['target'].partition(':')
    if kind!='Governance':raise shared.Problem(400,'Comment voting is for rule discussions.')
    shared.record(c,kind,rid)
    target='Comments:'+cid
    if value:c.execute('INSERT INTO relations VALUES(?,?,?,?) ON CONFLICT(uid,kind,target) DO UPDATE SET payload=excluded.payload',(user['uid'],'comment_vote',target,json.dumps({'value':value})))
    else:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(user['uid'],'comment_vote',target))

def media(c,user,mid):
    if not user:raise shared.Problem(401,'Sign in to view attachments.')
    r=c.execute('SELECT m.*,c.target FROM comment_media m JOIN comments c ON c.id=m.comment_id WHERE m.id=?',(mid,)).fetchone()
    if not r:raise shared.Problem(404,'Attachment not found.')
    kind,_,rid=r['target'].partition(':');shared.record(c,kind,rid)
    return r

def send_media(handler,row):
    data=row['data'];start=0;end=len(data)-1;status=200
    requested=handler.headers.get('Range')
    if requested:
        match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested)
        if not match or not any(match.groups()):return handler.send(416,{'error':'Invalid range'})
        if match[1]:start=int(match[1]);end=min(end,int(match[2])) if match[2] else end
        else:start=max(0,len(data)-int(match[2]))
        if start>end or start>=len(data):return handler.send(416,{'error':'Invalid range'})
        status=206
    handler.send_response(status)
    for k,v in {'Content-Type':row['mime'],'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox",'Accept-Ranges':'bytes','Content-Length':str(end-start+1),'Content-Disposition':'inline'}.items():handler.send_header(k,v)
    if status==206:handler.send_header('Content-Range',f'bytes {start}-{end}/{len(data)}')
    handler.end_headers();handler.wfile.write(data[start:end+1])
