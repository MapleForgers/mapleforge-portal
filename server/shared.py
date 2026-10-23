"""Transactional shared boards. Identity always comes from the authenticated session."""
import json, time, secrets, math, os, re, hashlib
from pathlib import Path
from datetime import datetime, timezone
IDEA_CATEGORIES={'Community & care','Work & careers','Climate & resources','Business & technology'}
GOVERNANCE_CATEGORIES={'Decision-making','Roles & teams','Project process','Ownership & credit','Offers to help'}
KINDS={'Ideas','Features','Tasks','Governance','Skills exchange','Resource sharing','Framework'}
class Problem(Exception):
    def __init__(self,status,message):self.status=status;self.message=message

def init(c):
    c.executescript('''
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,uid TEXT NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS relations(uid TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(uid,kind,target));
    CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,type TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS member_locations(uid TEXT PRIMARY KEY,lat REAL NOT NULL,lng REAL NOT NULL,label TEXT NOT NULL,flags TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pending_map_activity(uid TEXT PRIMARY KEY,action TEXT NOT NULL,due REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS member_details(uid TEXT PRIMARY KEY,payload TEXT NOT NULL,updated REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS discord_import_authors(message_id TEXT PRIMARY KEY,uid TEXT NOT NULL,channel_id TEXT NOT NULL,verified_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS discord_consent(uid TEXT PRIMARY KEY,version TEXT NOT NULL,existing INTEGER NOT NULL,future INTEGER NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS discord_consent_history(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,version TEXT NOT NULL,existing INTEGER NOT NULL,future INTEGER NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS preferences(uid TEXT PRIMARY KEY,payload TEXT NOT NULL);
    ''')
def revision(c):
    return c.execute('SELECT value FROM content_version WHERE id=1').fetchone()[0]
def now():return datetime.now(timezone.utc).isoformat()
def event(c,uid,kind,target,type,action,detail=''):
    c.execute('INSERT INTO activity(uid,kind,target,type,action,detail,created) VALUES(?,?,?,?,?,?,?)',(uid,kind,target,type,action,detail[:4000],time.time()))
def flush_map_activity(c):
    for row in c.execute('SELECT * FROM pending_map_activity WHERE due<=?',(time.time(),)).fetchall():
        c.execute('INSERT INTO activity(uid,kind,target,type,action,detail,created) VALUES(?,?,?,?,?,?,?)',(row['uid'],'Forgers’ Map',row['uid'],'Map',row['action'],'',row['due']))
        c.execute('DELETE FROM pending_map_activity WHERE uid=?',(row['uid'],))
def queue_map_activity(c,uid,action):
    old=c.execute('SELECT action FROM pending_map_activity WHERE uid=?',(uid,)).fetchone()
    if old and old['action']=='added their map pin' and action=='updated their map pin':action=old['action']
    if old and old['action']=='added their map pin' and action=='removed their map pin':
        c.execute('DELETE FROM pending_map_activity WHERE uid=?',(uid,));return
    c.execute('INSERT INTO pending_map_activity VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET action=excluded.action,due=excluded.due',(uid,action,time.time()+120))
def record(c,kind,id):
    r=c.execute('SELECT * FROM records WHERE id=? AND kind=?',(id,kind)).fetchone()
    if r:
        payload=json.loads(r['payload'])
        if is_imported(r['uid'],payload) and not import_visible(c,payload):raise Problem(404,'Waiting for the contributor’s consent to show this.')
        return {**payload,'id':r['id'],'uid':r['uid'],'revision':r['revision'],'board':r['kind']}
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
def source_links(payload):
    links=[]
    if isinstance(payload.get('source'),str):links.append(payload['source'])
    for item in payload.get('sources',[]):
        if isinstance(item,dict) and isinstance(item.get('url'),str):links.append(item['url'])
    return links

def is_imported(uid,payload):
    return uid=='imported' or payload.get('imported') is True or any('discord.com/channels/' in x for x in source_links(payload))

def import_visible(c,payload):
    links=source_links(payload)
    if not links:return False
    for link in links:
        match=re.fullmatch(r'https://discord.com/channels/1562193716423430334/(\d+)/(\d+)',link)
        if not match or match[1] not in DISCORD_CHANNELS:return False
        author=c.execute('SELECT uid,channel_id FROM discord_import_authors WHERE message_id=?',(match[2],)).fetchone()
        if not author or author['channel_id']!=match[1]:return False
        # Legacy imports are existing contributions. New importers must mark future ones.
        if not may_import_discord(c,author['uid'],payload.get('consentPeriod','existing')!='future'):return False
    return True

WAITING='Waiting for the contributor’s consent to show this.'
def placeholder(row,payload):
    categories=IDEA_CATEGORIES if row['kind']=='Ideas' else GOVERNANCE_CATEGORIES if row['kind']=='Governance' else set()
    result={'id':row['id'],'board':row['kind'],'uid':'','revision':row['revision'],'title':'Contribution awaiting consent','summary':WAITING,'body':WAITING,'description':WAITING,'detail':WAITING,'author':'Contributor','proposer':'Contributor','status':'Awaiting consent','consentHidden':True,'canEdit':False,'discussion':[],'withheldReplyCount':max(0,len(payload.get('discussion',[]))-1)}
    if payload.get('category') in categories:result['category']=payload['category']
    return result

def imported_people(c):
    path=Path(os.environ.get('IMPORTED_PEOPLE','/var/lib/mapleforge/imported-people.json'))
    if not path.exists():return []
    people=[]
    for p in json.loads(path.read_text()):
        if import_visible(c,p):people.append({k:v for k,v in p.items() if k not in ('sources','channel','messageId')} | {'sources':[]})
        else:people.append({'id':p['id'],'name':'Contributor awaiting consent','category':'Other','summary':WAITING,'services':'','sources':[],'consentHidden':True})
    return people
def clean_record(r):
    if 'discussion' in r:r['discussion']=[{k:v for k,v in m.items() if k in ('author','text','time','role')} for m in r['discussion']]
    for key in ('source','sources','channel','messageId','attachments','consentPeriod'):r.pop(key,None)
    return r
def directory_entries(c,uid):
    entries=[]
    for row in c.execute('SELECT member_details.*,users.username FROM member_details JOIN users ON users.id=uid'):
        stored=json.loads(row['payload'])
        # Do not expose account IDs or portal names that link a hidden handle.
        entry={k:stored.get(k,'') for k in ('firstName','lastName','province','city','email','linkedin','background','skills','interests','hours')}
        entry['showDiscordName']=stored.get('showDiscordName') is True
        entry['name']=' '.join(x for x in (entry['firstName'],entry['lastName']) if x) or 'Member'
        entry['isOwn']=row['uid']==uid
        if entry['showDiscordName']:entry['discordName']=row['username']
        entries.append(entry)
    return entries

CONSENT_VERSION='2026-10-22-v2'
DISCORD_CHANNELS={'1562193717484593156':'welcome','1562294200991485982':'company-direction-suggestions','1562298952613888152':'lobby-chat','1562482881186496602':'mapleforge-announcements'}
def consent_status(c,uid):
    row=c.execute('SELECT * FROM discord_consent WHERE uid=?',(uid,)).fetchone()
    return {'version':CONSENT_VERSION,'answered':bool(row and row['version']==CONSENT_VERSION),'existing':bool(row and row['existing']),'future':bool(row and row['future']),'updated':row['updated'] if row else None}
def may_import_discord(c,uid,existing=True):
    # Importers must use verified Discord IDs, never a display-name match.
    choice=consent_status(c,uid)
    return choice['answered'] and choice['existing' if existing else 'future']

def snapshot(c,user,config):
    flush_map_activity(c)
    version=revision(c)
    uid=user['uid'] if user else '';names={r['id']:r['name'] for r in c.execute('SELECT id,name FROM users')}
    records=[]
    contributor_names={}
    for row in c.execute('SELECT * FROM records'):
        r={**json.loads(row['payload']),'id':row['id'],'uid':row['uid'],'revision':row['revision'],'board':row['kind']}
        author=names.get(row['uid'],r.get('proposer') or r.get('author'))
        if author:contributor_names.setdefault(row['kind'],set()).add(author.strip().casefold())
        if is_imported(row['uid'],r) and not import_visible(c,r):
            records.append(placeholder(row,r));continue
        if 'discussion' in r:
            original=r['discussion'];r['discussion']=[m for m in original if import_visible(c,m)]
            r['withheldReplyCount']=len(original)-len(r['discussion'])
            if r['withheldReplyCount']:r.pop('discussionNote',None)
        r=clean_record(r)
        r['author']=names.get(row['uid'],r.get('author','Community'))
        r['canEdit']=bool(user and allowed(r,user,config));records.append(r)
    hidden={r['board']+':'+r['id'] for r in records if r.get('consentHidden')}
    hidden_people={p['id'] for p in imported_people(c) if p.get('consentHidden')}
    hidden_events={str(r['id']) for r in c.execute('SELECT * FROM activity') if r['uid']=='imported' or r['kind']+':'+r['target'] in hidden or r['target'] in hidden_people}
    hidden_comments={r['id'] for r in c.execute('SELECT id,target FROM comments') if r['target'] in hidden}
    def relation_visible(r):
        return r['target'] not in hidden and r['target'] not in {'People:'+i for i in hidden_people} and r['target'] not in {'Comments:'+i for i in hidden_comments} and r['target'] not in {'Activity:event-'+i for i in hidden_events}
    for post in c.execute('SELECT uid FROM posts WHERE archived=0'):
        if names.get(post['uid']):contributor_names.setdefault('Ideas',set()).add(names[post['uid']].strip().casefold())
    relations=[dict(r) for r in c.execute('SELECT * FROM relations') if (r['kind'] not in ('saved','follow') or r['uid']==uid) and relation_visible(r)]
    for r in relations:r['data']=json.loads(r.pop('payload'));r['name']=names.get(r['uid'],'Member')
    valid={r['board']+':'+r['id'] for r in records if not r.get('consentHidden')}
    valid.update('Ideas:'+r['id'] for r in c.execute('SELECT id FROM posts WHERE archived=0'))
    comments=[dict(r) for r in c.execute('SELECT comments.*,users.name AS author FROM comments JOIN users ON users.id=uid ORDER BY created') if r['target'] in valid]
    titles={r['id']:r.get('title','Item') for r in records};titles.update({r['id']:r['title'] for r in c.execute('SELECT id,title FROM posts WHERE archived=0')})
    activity=[]
    for r in c.execute('SELECT * FROM activity ORDER BY id DESC LIMIT 2000'):
        if str(r['id']) in hidden_events:continue
        activity.append({'id':'event-'+str(r['id']),'date':datetime.fromtimestamp(r['created'],timezone.utc).isoformat(),'actor':names.get(r['uid'],'Member'),'type':r['type'],'section':r['kind'],'target':r['target'],'title':titles.get(r['target'],names.get(r['target'],'Community')),'action':r['action'],'detail':r['detail']})
    p=c.execute('SELECT payload FROM preferences WHERE uid=?',(uid,)).fetchone()
    return {'boardContributorCounts':{k:len(v) for k,v in contributor_names.items()},'discordConsent':consent_status(c,uid),'version':version,'importedPeople':imported_people(c) if user else [],'records':records,'relations':relations,'comments':comments,'activity':activity,'memberDetails':directory_entries(c,uid) if user else [],'mapPins':[dict(r,flags=json.loads(r['flags'])) for r in c.execute('SELECT member_locations.*,users.name AS name FROM member_locations JOIN users ON users.id=uid')] if user else [],'preferences':json.loads(p[0]) if p else None,'admin':uid in config.get('admin_ids',[])}
def mutate(c,user,data,config):
    uid=user['uid'];op=text(data,'op',40,True);kind=text(data,'kind',30);id=text(data,'id',100)
    if op=='discord_consent':
        if data.get('version')!=CONSENT_VERSION:raise Problem(409,'The consent notice changed. Refresh and review it again.')
        if any(type(data.get(k)) is not bool for k in ('existing','future')):raise Problem(400,'Choose both sharing permissions.')
        values=(uid,CONSENT_VERSION,int(data['existing']),int(data['future']),now())
        c.execute('INSERT INTO discord_consent VALUES(?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET version=excluded.version,existing=excluded.existing,future=excluded.future,updated=excluded.updated',values)
        c.execute('INSERT INTO discord_consent_history(uid,version,existing,future,updated) VALUES(?,?,?,?,?)',values)
        return {'discordConsent':consent_status(c,uid)}
    if op=='member_details':
        if data.get('remove') is True:
            c.execute('DELETE FROM member_details WHERE uid=?',(uid,));return {}
        if data.get('consent') is not True:raise Problem(400,'Confirm sharing your details with signed-in members.')
        fields=data.get('fields')
        if not isinstance(fields,dict):raise Problem(400,'Invalid member details.')
        show_discord=fields.get('showDiscordName',False)
        if type(show_discord) is not bool:raise Problem(400,'Choose whether to show your Discord username.')
        limits={'firstName':80,'lastName':80,'province':80,'city':120,'email':254,'linkedin':300,'background':4000,'skills':2000,'interests':2000}
        payload={k:text(fields,k,limit) for k,limit in limits.items()}
        payload['showDiscordName']=show_discord
        if payload['province'] not in ('','Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Northwest Territories','Nunavut','Ontario','Prince Edward Island','Québec','Saskatchewan','Yukon','Outside Canada'):raise Problem(400,'Choose a province or territory.')
        if payload['email'] and ('@' not in payload['email'] or any(ch.isspace() for ch in payload['email'])):raise Problem(400,'Enter a valid email address.')
        if payload['linkedin']:
            from urllib.parse import urlparse
            url=urlparse(payload['linkedin'])
            if url.scheme!='https' or url.hostname not in ('linkedin.com','www.linkedin.com') or url.username or url.password:raise Problem(400,'Use an https://www.linkedin.com/ link.')
        hours=fields.get('hours','')
        if hours is None or hours=='':payload['hours']=None
        elif type(hours) not in (float,int) or not math.isfinite(hours) or not 0<=hours<=168:raise Problem(400,'Weekly availability must be between 0 and 168 hours.')
        else:payload['hours']=hours
        c.execute('INSERT INTO member_details VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET payload=excluded.payload,updated=excluded.updated',(uid,json.dumps(payload),time.time()))
        return {}
    if op=='map_pin':
        flush_map_activity(c)
        previous=c.execute('SELECT * FROM member_locations WHERE uid=?',(uid,)).fetchone()
        if data.get('remove') is True:
            c.execute('DELETE FROM member_locations WHERE uid=?',(uid,))
            if previous:queue_map_activity(c,uid,'removed their map pin')
            return {}
        if data.get('consent') is not True:raise Problem(400,'Please choose to share your pin with signed-in members.')
        lat=data.get('lat');lng=data.get('lng');label=text(data,'label',100,True);flags=data.get('flags',[])
        if type(lat) not in (int,float) or type(lng) not in (int,float) or not math.isfinite(lat) or not math.isfinite(lng) or not (-85<=lat<=85 and -180<=lng<=180):raise Problem(400,'Choose a valid map position.')
        province_flags={'CA-AB','CA-BC','CA-MB','CA-NB','CA-NL','CA-NS','CA-NT','CA-NU','CA-ON','CA-PE','CA-QC','CA-SK','CA-YT'}
        if not isinstance(flags,list) or len(flags)>3 or any(not isinstance(f,str) or not (f in province_flags or len(f)==2 and f.isascii() and f.isalpha() and f.isupper()) for f in flags):raise Problem(400,'Choose up to three flags.')
        values=(round(lat,5),round(lng,5),label,json.dumps(list(dict.fromkeys(flags))))
        if previous and tuple(previous[k] for k in ('lat','lng','label','flags'))==values:return {}
        queue_map_activity(c,uid,'updated their map pin' if previous else 'added their map pin')
        c.execute('INSERT INTO member_locations VALUES(?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,label=excluded.label,flags=excluded.flags',(uid,round(lat,5),round(lng,5),label,json.dumps(list(dict.fromkeys(flags)))))
        return {}
    if op=='preferences':
        p=data.get('preferences');valid={}
        if not isinstance(p,dict):raise Problem(400,'Invalid preferences.')
        for k,choices in {'theme':['forest','maple','night','plain'],'layout':['feed','cards','compact','lanes','list','board'],'menuFontSize':[14,15,16,17,18,19,20,22],'menuFontWeight':['400','600','700'],'menuSpacing':['compact','comfortable','spacious'],'menuStyle':['simple','soft','outlined'],'density':['compact','balanced','roomy'],'fontScale':[100,115,130,150],'sort':['original','votes','newest','alphabetical','author','comments']}.items():
            if k in p:
                if p[k] not in choices:raise Problem(400,'Invalid preference.')
                valid[k]=p[k]
        c.execute('INSERT INTO preferences VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET payload=excluded.payload',(uid,json.dumps(valid)));return {}
    if op in ('bookmark','community_pick'):
        enabled=data.get('enabled')
        if type(enabled) is not bool or kind not in KINDS|{'Comments','People','Boards','Activity'} or not id:raise Problem(400,'Invalid bookmark.')
        relation='pick' if op=='community_pick' else 'saved'
        payload={}
        if enabled:
            if kind=='Comments':
                comment=c.execute('SELECT target FROM comments WHERE id=?',(id,)).fetchone()
                if not comment:raise Problem(404,'Comment no longer available.')
                parent_kind,_,parent_id=comment['target'].partition(':');record(c,parent_kind,parent_id)
            elif kind=='Boards':
                if id not in ('ideas','requests','tasks','governance','exchange','resource','people','framework','activity','process','rules'):raise Problem(400,'Unknown board.')
            elif kind=='Activity':
                if not id.startswith('event-') or not id[6:].isdigit():raise Problem(400,'Invalid activity.')
                activity=c.execute('SELECT * FROM activity WHERE id=?',(int(id[6:]),)).fetchone()
                if not activity:raise Problem(404,'Activity no longer available.')
                author=c.execute('SELECT name FROM users WHERE id=?',(activity['uid'],)).fetchone()
                payload={'item':{'title':(author['name'] if author else 'Member')+' '+activity['action'],'body':activity['detail'],'author':author['name'] if author else 'Member','parent':('People' if activity['kind']=='People & skills' else activity['kind'])+':'+activity['target']}}
            elif kind=='People':
                # Imported profile IDs are external content. Store only a personal display label.
                payload={'title':text(data,'title',160,True)}
            else:record(c,kind,id)
            payload['savedAt']=time.time()
            c.execute('INSERT INTO relations VALUES(?,?,?,?) ON CONFLICT(uid,kind,target) DO NOTHING',(uid,relation,kind+':'+id,json.dumps(payload)))
        else:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(uid,relation,kind+':'+id))
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
            if p['category'] not in GOVERNANCE_CATEGORIES:raise Problem(400,'Choose a governance category.')
        p.setdefault('created',now());id=id or 'shared-'+secrets.token_hex(12)
        for key in ('id','uid','revision','canEdit'):p.pop(key,None)
        c.execute('INSERT INTO records(id,kind,uid,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=records.revision+1',(id,kind,uid,json.dumps(p)))
        event(c,uid,kind,id,'Organization' if old else 'Posts','updated an item' if old else 'created an item');return {'id':id}
    r=record(c,kind,id)
    if op=='relation':
        relation=text(data,'relation',30,True);enabled=data.get('enabled')
        if type(enabled) is not bool or relation not in ('vote','join','follow'):raise Problem(400,'Invalid action.')
        if relation=='join' and kind!='Ideas':raise Problem(400,'Join is for ideas.')
        target=kind+':'+id;payload={}
        if relation=='vote' and kind=='Features':
            links={x['id']:json.loads(x['payload']).get('duplicateOf') for x in c.execute("SELECT id,payload FROM records WHERE kind='Features'")}
            roots={}
            def root_of(key):
                seen=[]
                while key not in roots:
                    if key in seen:raise Problem(400,'Duplicate links cannot form a loop.')
                    if key not in links:raise Problem(404,'Linked feature is unavailable.')
                    seen.append(key)
                    if not links[key]:roots[key]=key;break
                    key=links[key]
                for item in seen:roots[item]=roots[key]
                return roots[key]
            root=root_of(id);family=[key for key in links if root_of(key)==root]
            for fid in family:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(uid,'vote','Features:'+fid))
            target='Features:'+root
        if relation=='join':payload={'role':text(data,'role',100) or 'Joined the discussion','capacity':text(data,'capacity',100)}
        if enabled:c.execute('INSERT INTO relations VALUES(?,?,?,?) ON CONFLICT(uid,kind,target) DO UPDATE SET payload=excluded.payload',(uid,relation,target,json.dumps(payload)))
        else:c.execute('DELETE FROM relations WHERE uid=? AND kind=? AND target=?',(uid,relation,target))
        if relation!='follow':event(c,uid,kind,id,{'vote':'Votes','join':'Membership'}[relation],('added support' if enabled else 'withdrew support') if relation=='vote' else ('joined or updated their contribution' if enabled else 'left the idea'))
        return {}
    if op=='status':
        if not allowed(r,user,config) and not(kind=='Tasks' and r.get('assignee')==uid):raise Problem(403,'Only the author, assigned member, or a maintainer can change this status.')
        status=text(data,'status',40,True)
        stages={'Ideas':['Idea','Challenge','Refine','Vote','Scope & build','Review'],'Tasks':['To do','In progress','Needs review','Blocked','Done'],'Features':['Open','Under review','Planned','In progress','Complete','Closed']}
        if status not in stages.get(kind,[]):raise Problem(400,'Invalid status.')
        if kind=='Ideas' and id.startswith('live-'):
            raise Problem(400,'Stages are not enabled for member idea posts.')
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
    r['history']=r['history'][:20]
    c.execute('UPDATE records SET payload=?,revision=revision+1 WHERE id=?',(json.dumps(r),id))
    event(c,uid,kind,id,'Releases' if op=='release' else 'Status' if op=='status' else 'Organization','updated '+op,r.get('status',''));return {}
