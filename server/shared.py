"""Transactional shared boards. Identity always comes from the authenticated session."""
import json, time, secrets
from datetime import datetime, timezone
KINDS={'Ideas','Features','Tasks','Governance','Skills exchange','Resource sharing','Framework'}
class Problem(Exception):
    def __init__(self,status,message):self.status=status;self.message=message

def init(c):
    c.executescript('''
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,uid TEXT NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS relations(uid TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(uid,kind,target));
    CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,type TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS preferences(uid TEXT PRIMARY KEY,payload TEXT NOT NULL);
    ''')
def now():return datetime.now(timezone.utc).isoformat()
def event(c,uid,kind,target,type,action,detail=''):
    c.execute('INSERT INTO activity(uid,kind,target,type,action,detail,created) VALUES(?,?,?,?,?,?,?)',(uid,kind,target,type,action,detail[:4000],time.time()))
def record(c,kind,id):
    r=c.execute('SELECT * FROM records WHERE id=? AND kind=?',(id,kind)).fetchone()
    if r:return {**json.loads(r['payload']),'id':r['id'],'uid':r['uid'],'revision':r['revision'],'board':r['kind']}
    if kind=='Ideas':
        p=c.execute('SELECT * FROM posts WHERE id=? AND archived=0',(id,)).fetchone()
        if p:return dict(p)
    raise Problem(404,'This item no longer exists. Refresh the page.')
def canonical(c,id):
    seen=set()
    while id:
        if id in seen:raise Problem(400,'Duplicate links cannot form a loop.')
        seen.add(id);r=record(c,'Features',id)
        if not r.get('duplicateOf'):return id
        id=r['duplicateOf']
def allowed(r,user,config):return user['uid'] in config.get('admin_ids',[]) or r['uid']==user['uid']
def text(data,k,limit=4000,required=False):
    v=data.get(k,'')
    if not isinstance(v,str) or len(v.strip())>limit or (required and not v.strip()):raise Problem(400,'Please check '+k+'.')
    return v.strip()
def snapshot(c,user,config):
    uid=user['uid'] if user else '';names={r['id']:r['name'] for r in c.execute('SELECT id,name FROM users')}
    records=[]
    for row in c.execute('SELECT * FROM records'):
        r={**json.loads(row['payload']),'id':row['id'],'uid':row['uid'],'revision':row['revision'],'board':row['kind']}
        r['author']=names.get(row['uid'],r.get('author','Community'))
        r['canEdit']=bool(user and allowed(r,user,config));records.append(r)
    relations=[dict(r) for r in c.execute('SELECT * FROM relations') if r['kind'] not in ('saved','follow') or r['uid']==uid]
    for r in relations:r['data']=json.loads(r.pop('payload'));r['name']=names.get(r['uid'],'Member')
    valid={r['board']+':'+r['id'] for r in records}
    valid.update('Ideas:'+r['id'] for r in c.execute('SELECT id FROM posts WHERE archived=0'))
    comments=[dict(r) for r in c.execute('SELECT comments.*,users.name AS author FROM comments JOIN users ON users.id=uid ORDER BY created') if r['target'] in valid]
    titles={r['id']:r.get('title','Item') for r in records};titles.update({r['id']:r['title'] for r in c.execute('SELECT id,title FROM posts WHERE archived=0')})
    activity=[]
    for r in c.execute('SELECT * FROM activity ORDER BY id DESC LIMIT 2000'):
        activity.append({'id':'event-'+str(r['id']),'date':datetime.fromtimestamp(r['created'],timezone.utc).isoformat(),'actor':names.get(r['uid'],'Member'),'type':r['type'],'section':r['kind'],'target':r['target'],'title':titles.get(r['target'],names.get(r['target'],'Community')),'action':r['action'],'detail':r['detail']})
    p=c.execute('SELECT payload FROM preferences WHERE uid=?',(uid,)).fetchone()
    return {'records':records,'relations':relations,'comments':comments,'activity':activity,'preferences':json.loads(p[0]) if p else None,'admin':uid in config.get('admin_ids',[])}
def mutate(c,user,data,config):
    uid=user['uid'];op=text(data,'op',40,True);kind=text(data,'kind',30);id=text(data,'id',100)
    if op=='preferences':
        p=data.get('preferences');valid={}
        if not isinstance(p,dict):raise Problem(400,'Invalid preferences.')
        for k,choices in {'theme':['forest','maple','night','plain'],'layout':['feed','cards','list','board'],'density':['compact','balanced','roomy'],'fontScale':[100,115,130,150],'sort':['original','votes','newest','alphabetical','author','comments']}.items():
            if k in p:
                if p[k] not in choices:raise Problem(400,'Invalid preference.')
                valid[k]=p[k]
        c.execute('INSERT INTO preferences VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET payload=excluded.payload',(uid,json.dumps(valid)));return {}
    if op=='bookmark':
        enabled=data.get('enabled')
        if type(enabled) is not bool or kind not in KINDS|{'Comments','People'} or not id:raise Problem(400,'Invalid bookmark.')
        payload={}
        if enabled:
            if kind=='Comments':
                comment=c.execute('SELECT target FROM comments WHERE id=?',(id,)).fetchone()
                if not comment:raise Problem(404,'Comment no longer available.')
                parent_kind,_,parent_id=comment['target'].partition(':');record(c,parent_kind,parent_id)
            elif kind=='People':
                # Imported profile IDs are external content. Store only a personal display label.
                payload={'title':text(data,'title',160,True)}
            else:record(c,kind,id)
            payload['savedAt']=time.time()
            c.execute('INSERT INTO relations VALUES(?,?,?,?) ON CONFLICT(uid,kind,target) DO NOTHING',(uid,'saved',kind+':'+id,json.dumps(payload)))
        else:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(uid,'saved',kind+':'+id))
        return {}
    if kind not in KINDS:raise Problem(400,'Unknown board.')
    if op=='save':
        if kind in ('Ideas','Framework'):raise Problem(400,'Use the corresponding idea or framework page.')
        old=record(c,kind,id) if id else None
        if old and not allowed(old,user,config):raise Problem(403,'Only the author or a community maintainer can edit this item.')
        if old and data.get('revision')!=old['revision']:raise Problem(409,'Someone updated this item. Refresh it before saving your changes.')
        f=data.get('fields',{})
        if not isinstance(f,dict):raise Problem(400,'Invalid fields.')
        p={**(old or {}),'title':text(f,'title',160,True)}
        if kind=='Tasks':
            for k,limit in [('description',4000),('type',80),('priority',30),('status',40),('assignee',100),('due',10),('followUp',10)]:p[k]=text(f,k,limit,k in ('description','type','priority','status'))
            if p['status'] not in ['To do','In progress','Needs review','Blocked','Done'] or p['priority'] not in ['Urgent','High','Normal','Low']:raise Problem(400,'Invalid task status or priority.')
            for k in ('due','followUp'):
                if p[k]:
                    try:datetime.strptime(p[k],'%Y-%m-%d')
                    except ValueError:raise Problem(400,'Invalid date.')
            p['source']='Community task'
        elif kind in ('Skills exchange','Resource sharing'):
            for k,limit in [('body',4000),('category',80),('type',30),('availability',200),('location',160),('terms',30),('status',30)]:p[k]=text(f,k,limit,k in ('body','category','type','terms','status'))
            if p['type'] not in ['Offer','Request'] or p['terms'] not in (['Discuss together','Volunteer','Paid','Skill swap'] if kind=='Skills exchange' else ['Discuss together','Free to use','Rental','Swap']) or p['status'] not in ['Open','Paused','Completed']:raise Problem(400,'Invalid listing type, terms or status.')
        elif kind=='Features':
            for k,limit in [('body',4000),('kind',30),('area',100),('audience',100)]:p[k]=text(f,k,limit,k in ('body','kind','area'))
            p.setdefault('status','Open');p.setdefault('tags',[]);p.setdefault('group','');p.setdefault('history',[]);p['scope']='Shared community request'
        else:
            p['summary']=text(f,'summary',4000,True);p['category']=text(f,'category',80,True);p.setdefault('status','For discussion')
        p.setdefault('created',now());id=id or 'shared-'+secrets.token_hex(12)
        for key in ('id','uid','revision','canEdit'):p.pop(key,None)
        c.execute('INSERT INTO records(id,kind,uid,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=records.revision+1',(id,kind,uid,json.dumps(p)))
        event(c,uid,kind,id,'Organization' if old else 'Posts','updated an item' if old else 'created an item');return {'id':id}
    r=record(c,kind,id)
    if op=='relation':
        relation=text(data,'relation',30,True);enabled=data.get('enabled')
        if type(enabled) is not bool or relation not in ('vote','join','follow','saved'):raise Problem(400,'Invalid action.')
        if relation=='join' and kind!='Ideas':raise Problem(400,'Join is for ideas.')
        target=kind+':'+id;payload={}
        if relation=='vote' and kind=='Features':
            root=canonical(c,id);family=[x['id'] for x in c.execute("SELECT id FROM records WHERE kind='Features'") if canonical(c,x['id'])==root]
            for fid in family:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(uid,'vote','Features:'+fid))
            target='Features:'+root
        if relation=='join':payload={'role':text(data,'role',100) or 'Joined the discussion','capacity':text(data,'capacity',100)}
        if enabled:c.execute('INSERT INTO relations VALUES(?,?,?,?) ON CONFLICT(uid,kind,target) DO UPDATE SET payload=excluded.payload',(uid,relation,target,json.dumps(payload)))
        else:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(uid,relation,target))
        if relation not in ('saved','follow'):event(c,uid,kind,id,{'vote':'Votes','join':'Membership'}[relation],('added support' if enabled else 'withdrew support') if relation=='vote' else ('joined or updated their contribution' if enabled else 'left the idea'))
        return {}
    if op=='status':
        if not allowed(r,user,config) and not(kind=='Tasks' and r.get('assignee')==uid):raise Problem(403,'Only the author, assigned member, or a maintainer can change this status.')
        status=text(data,'status',40,True)
        stages={'Ideas':['Idea','Challenge','Refine','Vote','Scope & build','Review'],'Tasks':['To do','In progress','Needs review','Blocked','Done'],'Features':['Open','Under review','Planned','In progress','Complete','Closed']}
        if status not in stages.get(kind,[]):raise Problem(400,'Invalid status.')
        if kind=='Ideas' and id.startswith('live-'):
            existing=c.execute('SELECT 1 FROM records WHERE id=?',(id,)).fetchone()
            if not existing:c.execute('INSERT INTO records(id,kind,uid,payload) VALUES(?,?,?,?)',(id,kind,r['uid'],json.dumps({'title':r['title']})))
        r['status']=status
    elif op in ('organize','release'):
        if kind!='Features' or uid not in config.get('admin_ids',[]):raise Problem(403,'A community maintainer manages feature organization and releases.')
        if op=='organize':
            target=text(data,'duplicate',100)
            if target and canonical(c,target)==id:raise Problem(400,'Choose an independent feature, not a circular duplicate.')
            r['group']=text(data,'group',80);r['tags']=list(dict.fromkeys(t.strip() for t in text(data,'tags',240).split(',') if t.strip()))[:12];r['duplicateOf']=canonical(c,target) if target else ''
        else:
            note={'id':'release-'+secrets.token_hex(8),'title':r['title'],'notes':text(data,'notes',2000,True),'version':text(data,'version',80),'date':now(),'author':user['name']}
            r.setdefault('releases',[]).insert(0,note);r['status']='Complete'
    else:raise Problem(400,'Unknown action.')
    r.setdefault('history',[]).insert(0,{'text':user['name']+' updated '+op,'date':now()})
    c.execute('UPDATE records SET payload=?,revision=revision+1 WHERE id=?',(json.dumps(r),id))
    event(c,uid,kind,id,'Releases' if op=='release' else 'Status' if op=='status' else 'Organization','updated '+op,r.get('status',''));return {}
