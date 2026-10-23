"""Expire unconsented Discord imports, without deleting native portal contributions.

Run hourly. A persistent first-hidden timestamp prevents repeated scans or
restarts extending the deadline. Consented text is not removed. Legacy imports
start their clock on the first scan; withdrawal starts a new hidden period.
"""
import hashlib,json,os,time
from pathlib import Path
import shared
DAYS=29  # One day of scheduling margin for the public 30-day limit.

def expire(c,people_path,at=None):
    at=time.time() if at is None else at
    c.execute('CREATE TABLE IF NOT EXISTS import_retention(key TEXT PRIMARY KEY,hidden_since REAL NOT NULL)')
    changed=0
    def due(key,payload):
        if payload.get('retentionExpired'):return False
        if shared.import_visible(c,payload):
            c.execute('DELETE FROM import_retention WHERE key=?',(key,));return False
        c.execute('INSERT OR IGNORE INTO import_retention VALUES(?,?)',(key,at))
        start=c.execute('SELECT hidden_since FROM import_retention WHERE key=?',(key,)).fetchone()[0]
        return at-start>=DAYS*86400
    for row in c.execute('SELECT * FROM records').fetchall():
        p=json.loads(row['payload'])
        if not shared.is_imported(row['uid'],p):continue
        original=json.dumps(p,sort_keys=True)
        replies=[];expired=p.get('expiredReplyCount',0)
        for index,msg in enumerate(p.get('discussion',[])):
            identity=json.dumps(shared.source_links(msg),sort_keys=True) or str(index)
            key='reply:'+row['id']+':'+hashlib.sha256(identity.encode()).hexdigest()
            if due(key,msg):
                if msg.get('role')!='Original proposal':expired+=1
                else:replies.append({'role':'Original proposal','retentionExpired':True})
            else:replies.append(msg)
        if due('record:'+row['id'],p):
            p={'imported':True,'retentionExpired':True,'discussion':replies,'expiredReplyCount':expired}
        else:
            p['discussion']=replies;p['expiredReplyCount']=expired
        if json.dumps(p,sort_keys=True)!=original:
            c.execute('UPDATE records SET payload=?,revision=revision+1 WHERE id=?',(json.dumps(p),row['id']));changed+=1
        if p.get('retentionExpired'):
            # Cached import descriptions can survive in bookmarks and activity.
            target=row['kind']+':'+row['id']
            c.execute('UPDATE relations SET payload=? WHERE target=?',('{}',target))
            c.execute('UPDATE activity SET detail=? WHERE kind=? AND target=?',('',row['kind'],row['id']))
    path=Path(people_path)
    if path.exists():
        people=json.loads(path.read_text());updated=False
        for i,p in enumerate(people):
            if due('person:'+p['id'],p):
                people[i]={'id':p['id'],'retentionExpired':True};updated=True;changed+=1
                c.execute('UPDATE relations SET payload=? WHERE target=?',('{}','People:'+p['id']))
        if updated:
            temp=path.with_name(path.name+'.retention-new')
            with open(temp,'w') as f:
                os.chmod(temp,0o600);json.dump(people,f);f.flush();os.fsync(f.fileno())
            os.replace(temp,path)
    # Forget identity mappings when no retained original still references them.
    referenced=set()
    def collect(p):
        for link in shared.source_links(p):
            match=shared.re.fullmatch(r'https://discord.com/channels/1562193716423430334/(\d+)/(\d+)',link)
            if match:referenced.add(match[2])
        for msg in p.get('discussion',[]):collect(msg)
    for row in c.execute('SELECT payload FROM records'):collect(json.loads(row[0]))
    if path.exists():
        for p in json.loads(path.read_text()):collect(p)
    for row in c.execute('SELECT message_id FROM discord_import_authors').fetchall():
        if row[0] not in referenced:c.execute('DELETE FROM discord_import_authors WHERE message_id=?',(row[0],))
    if changed:c.execute('UPDATE content_version SET value=value+1 WHERE id=1')
    return changed

if __name__=='__main__':
    import sqlite3
    c=sqlite3.connect(os.environ.get('MEMBER_DB','/var/lib/mapleforge/members.sqlite3'));c.row_factory=sqlite3.Row
    with c:
        c.execute('PRAGMA secure_delete=ON')
        print('Updated import entries:',expire(c,os.environ.get('IMPORTED_PEOPLE','/var/lib/mapleforge/imported-people.json')))
    # Remove deleted originals from free pages. Backups follow their own expiry.
    c.execute('VACUUM');c.execute('PRAGMA wal_checkpoint(TRUNCATE)');c.close()
