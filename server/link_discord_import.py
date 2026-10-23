"""Administrator-only mapping from a verified Discord message export, never names.

Input is an actual Discord API message object with id, channel_id and author.id.
Keep this export and the database outside the web root and Git repository.
"""
import argparse,json,sqlite3
import shared

def link(c,message):
    mid=message.get('id','');channel=message.get('channel_id','');uid=message.get('author',{}).get('id','')
    if any(not isinstance(v,str) or not v.isdigit() for v in (mid,channel,uid)) or channel not in shared.DISCORD_CHANNELS:
        raise ValueError('Expected a verified Discord API message from a named consent channel.')
    old=c.execute('SELECT uid,channel_id FROM discord_import_authors WHERE message_id=?',(mid,)).fetchone()
    if old and tuple(old)!=(uid,channel):raise ValueError('Existing author mapping conflicts. Review it manually.')
    c.execute('INSERT OR IGNORE INTO discord_import_authors VALUES(?,?,?,?)',(mid,uid,channel,shared.now()))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('database');p.add_argument('verified_message_json');a=p.parse_args()
    with open(a.verified_message_json) as f:messages=json.load(f)
    if not isinstance(messages,list):messages=[messages]
    with sqlite3.connect(a.database) as c:
        for message in messages:link(c,message)
    print('Verified message authors linked:',len(messages))
