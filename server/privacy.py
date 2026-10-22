"""Owner-requested deletion, including copies in activity and saved collections."""
import json
import shared

def scrub_activity(c, ids):
    for event_id in ids:
        c.execute('DELETE FROM relations WHERE target=?',('Activity:event-'+str(event_id),))
        c.execute('DELETE FROM activity WHERE id=?',(event_id,))

def delete_comment(c, row):
    kind,_,target=row['target'].partition(':')
    ids=[x['id'] for x in c.execute('SELECT id FROM activity WHERE uid=? AND kind=? AND target=? AND type=? AND detail=?',(row['uid'],kind,target,'Comments',row['body']))]
    scrub_activity(c,ids)
    c.execute('DELETE FROM relations WHERE target=?',('Comments:'+row['id'],))
    c.execute('DELETE FROM comments WHERE id=?',(row['id'],))

def delete_item(c,kind,id):
    target=kind+':'+id
    for row in c.execute('SELECT * FROM comments WHERE target=?',(target,)).fetchall():delete_comment(c,row)
    scrub_activity(c,[r['id'] for r in c.execute('SELECT id FROM activity WHERE kind=? AND target=?',(kind,id))])
    c.execute('DELETE FROM relations WHERE target=?',(target,))
    c.execute('DELETE FROM records WHERE kind=? AND id=?',(kind,id))
    if kind=='Ideas':c.execute('DELETE FROM posts WHERE id=?',(id,))

def owned(c,uid):
    result=[{'id':r['id'],'kind':'Ideas','title':r['title']} for r in c.execute('SELECT * FROM posts WHERE uid=?',(uid,))]
    result += [{'id':r['id'],'kind':r['kind'],'title':json.loads(r['payload']).get('title','Entry')} for r in c.execute('SELECT * FROM records WHERE uid=?',(uid,))]
    result += [{'id':r['id'],'kind':'Comments','title':r['body'][:140]} for r in c.execute('SELECT * FROM comments WHERE uid=?',(uid,))]
    return result

def remove(c,uid,data):
    kind=shared.text(data,'kind',40,True);id=shared.text(data,'id',100)
    if kind=='Account':
        if data.get('confirmation')!='DELETE':raise shared.Problem(400,'Type DELETE to confirm removing your portal account.')
        for item in owned(c,uid):
            if item['kind']!='Comments':delete_item(c,item['kind'],item['id'])
        for row in c.execute('SELECT * FROM comments WHERE uid=?',(uid,)).fetchall():delete_comment(c,row)
        scrub_activity(c,[r['id'] for r in c.execute('SELECT id FROM activity WHERE uid=? OR target=?',(uid,uid))])
        c.execute('DELETE FROM relations WHERE uid=? OR target=? OR target=?',(uid,'People:'+uid,'People & skills:'+uid))
        for table in ('discord_consent','discord_consent_history','sessions','preferences','member_details','member_locations','pending_map_activity'):c.execute('DELETE FROM '+table+' WHERE uid=?',(uid,))
        c.execute('DELETE FROM users WHERE id=?',(uid,))
        return
    if kind=='Comments':
        row=c.execute('SELECT * FROM comments WHERE id=?',(id,)).fetchone()
        if not row or row['uid']!=uid:raise shared.Problem(403,'You can remove only your own comments.')
        delete_comment(c,row);return
    row=c.execute('SELECT uid FROM records WHERE kind=? AND id=?',(kind,id)).fetchone()
    if not row and kind=='Ideas':row=c.execute('SELECT uid FROM posts WHERE id=?',(id,)).fetchone()
    if not row or row['uid']!=uid:raise shared.Problem(403,'You can remove only your own entries.')
    delete_item(c,kind,id)
