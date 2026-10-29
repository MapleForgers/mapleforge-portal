"""Per-post event metadata. Never stores message bodies or previous content."""
import json,time
import shared

def init(c):
 c.executescript('''CREATE TABLE IF NOT EXISTS post_history(id INTEGER PRIMARY KEY AUTOINCREMENT,target TEXT NOT NULL,uid TEXT,action TEXT NOT NULL,created REAL NOT NULL);
 CREATE INDEX IF NOT EXISTS post_history_target ON post_history(target,id);
 CREATE TRIGGER IF NOT EXISTS history_forget_member AFTER DELETE ON users BEGIN UPDATE post_history SET uid=NULL WHERE uid=OLD.id; END;
 CREATE TRIGGER IF NOT EXISTS history_remove_record AFTER DELETE ON records BEGIN DELETE FROM post_history WHERE target=OLD.kind||':'||OLD.id; END;
 CREATE TRIGGER IF NOT EXISTS history_remove_post AFTER DELETE ON posts BEGIN DELETE FROM post_history WHERE target='Ideas:'||OLD.id; END;''')

def before(c,path,data):
 # Capture identifiers and previous vote choices only, never previous text.
 rid=str(data.get('id',''));kind=data.get('kind','');op=data.get('op','')
 if path in ('/api/comments','/api/comment-vote') or (path=='/api/delete' and kind=='Comments'):
  if path=='/api/comments' and op!='edit':return {'target':data.get('target',''),'action':'replied to a comment' if data.get('parent') else 'added a comment'}
  r=c.execute('SELECT target FROM comments WHERE id=?',(rid,)).fetchone()
  if not r:return None
  if path=='/api/delete':return {'target':r['target'],'action':'deleted a comment'}
  if path=='/api/comments':return {'target':r['target'],'action':'edited a comment'}
  return {'target':r['target'],'vote_kind':'comment_vote','vote_target':'Comments:'+rid,'choice':str(data.get('value',0)),'label':'comment vote'}
 if path in ('/api/shared','/api/proposals'):
  if op=='ballot' and kind=='Features':rid=shared.canonical(c,rid)
  target=str(kind)+':'+rid
  if op=='save':return {'target':target,'kind':kind,'new':not rid,'action':'edited the post (proposal votes reset)' if rid and kind=='Governance' else 'edited the post' if rid else 'created the post'}
  if op=='ballot':return {'target':target,'vote_kind':'ballot','vote_target':target,'choice':data.get('choice'),'label':'vote','visibility':data.get('visibility','public')}
  if op=='relation' and data.get('relation') in ('vote','follow','join'):
   relation=data['relation'];return {'target':target,'vote_kind':relation,'vote_target':target,'choice':'1' if data.get('enabled') else '0','label':{'vote':'support','follow':'following','join':'participation'}[relation]}
 if path=='/api/posts':return {'target':'Ideas:'+rid,'action':'edited the post'} if rid else None
 return None

def previous(c,user,event):
 if event and event.get('vote_kind'):
  r=c.execute('SELECT payload FROM relations WHERE uid=? AND kind=? AND target=?',(user['uid'],event['vote_kind'],event['vote_target'])).fetchone()
  if not r and event['vote_kind']=='vote' and event['vote_target'].startswith('Features:'):
   target='Features:'+shared.canonical(c,event['vote_target'].split(':',1)[1])
   r=c.execute("SELECT payload FROM relations WHERE uid=? AND kind='ballot' AND target=?",(user['uid'],target)).fetchone()
  p=json.loads(r['payload']) if r else {}
  event['old_visibility']=p.get('visibility','public')
  event['old']=str(p.get('choice',p.get('value','1' if r else '0')))
 return event

def after(c,user,event,result=None):
 if not event:return
 target=event['target'];action=event.get('action')
 if event.get('new'):
  if not result or not result.get('id'):return
  target=event['kind']+':'+result['id']
 if event.get('vote_kind'):
  old=event.get('old','0');new=str(event.get('choice','0'))
  if (old==new and event.get('old_visibility')==event.get('visibility',event.get('old_visibility'))) or (old=='0' and new=='remove'):return
  labels={'0':'none','remove':'none','1':'upvote','-1':'downvote','agree':'agree','disagree':'disagree','abstain':'abstain'}
  if event['vote_kind'] in ('follow','join','vote'):
   action=('added ' if new=='1' else 'withdrew ')+event['label']
  else:action='changed '+event['label']+' from '+labels.get(old,'none')+' to '+labels.get(new,'none')
 if event.get('vote_kind')=='ballot' and event.get('old')==str(event.get('choice')):action='changed vote visibility to '+event.get('visibility','public')
 if not target or not action:return
 c.execute('INSERT INTO post_history(target,uid,action,created) VALUES(?,?,?,?)',(target,'hidden-voter' if event.get('visibility')=='private' or event.get('old_visibility')=='private' else user['uid'],action,time.time()))

def read(c,user,kind,rid,before_id=0):
 if not user:raise shared.Problem(401,'Sign in to view post activity.')
 shared.record(c,kind,rid)
 rows=c.execute('SELECT h.id,h.action,h.created,CASE WHEN h.uid=\'hidden-voter\' THEN \'Hidden voter\' ELSE COALESCE(u.name,\'Former member\') END AS author FROM post_history h LEFT JOIN users u ON u.id=h.uid WHERE h.target=? AND (?=0 OR h.id<?) ORDER BY h.id DESC LIMIT 51',(kind+':'+rid,before_id,before_id)).fetchall()
 more=len(rows)>50;rows=rows[:50]
 return {'events':[dict(r) for r in rows],'next':rows[-1]['id'] if more else None}
