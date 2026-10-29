"""Ephemeral member chat. No imports, permanent transcript, or governance votes."""
from collections import deque
import threading,time,unicodedata,base64,secrets
import discussions
import shared
LOCK=threading.Lock()
PEOPLE={}
MESSAGES=deque(maxlen=200)
TOPIC='Welcome to #mapleforge. Make yourself at home.'
SERIAL=0
TTL=100
MEDIA={}
MAX_MEDIA=64*1024*1024

def emit(kind,nick,account,body,uid=None,images=None,reply_to=None):
    global SERIAL
    SERIAL+=1
    if len(MESSAGES)==MESSAGES.maxlen:
        for image in MESSAGES[0].get('images',[]):MEDIA.pop(image['id'],None)
    MESSAGES.append(dict(id=SERIAL,kind=kind,nick=nick,account=account,body=body,created=time.time(),uid=uid,images=images or [],revision=1,replyTo=reply_to,reactions={},reactionVersion=0))

def clean():
    for uid,p in list(PEOPLE.items()):
        if p['seen']<time.time()-TTL:
            del PEOPLE[uid]
            emit('system',p['nick'],p['account'],'disconnected')

def nick_value(value):
    if not isinstance(value,str):raise shared.Problem(400,'Choose a nickname.')
    value=unicodedata.normalize('NFKC',value).strip()
    if not 1<=len(value)<=24 or any(not (ch.isalnum() or ch in '_-') for ch in value):
        raise shared.Problem(400,'Use 1 to 24 letters, numbers, underscores or hyphens.')
    if value.casefold() in {'system','admin','administrator','moderator','server'}:raise shared.Problem(400,'That nickname is reserved.')
    return value

def snapshot(uid):
    messages=[]
    by_id={m['id']:m for m in MESSAGES}
    for m in MESSAGES:
        item={k:v for k,v in m.items() if k not in ('uid','reactions')}
        item['canEdit']=m.get('uid')==uid and m['kind'] in ('message','me')
        item['reactions']=[dict(emoji=emoji,count=len(voters),mine=uid in voters) for emoji,voters in m.get('reactions',{}).items() if voters]
        if m.get('replyTo'):
            parent=by_id.get(m['replyTo'])
            item['reply']=dict(id=m['replyTo'],nick=parent['nick'],body=parent['body'][:160] or 'Picture message') if parent else dict(id=m['replyTo'],unavailable=True)
        messages.append(item)
    return dict(topic=TOPIC,messages=messages,joined=uid in PEOPLE,users=[dict(nick=p['nick'],account=p['account'],self=k==uid,cheers=sum(k in x['cheered'] for x in PEOPLE.values())) for k,p in PEOPLE.items()])

def read(uid):
    with LOCK:
        clean()
        return snapshot(uid)

def change(user,data):
    global TOPIC
    uid=user['uid'];op=data.get('op')
    with LOCK:
        clean()
        if op in ('edit','delete'):
            m=next((m for m in MESSAGES if m['id']==data.get('id')),None)
            if not m:raise shared.Problem(404,'This message is no longer in the channel.')
            if m.get('uid')!=uid or m['kind'] not in ('message','me'):raise shared.Problem(403,'You can change only your own messages.')
            if data.get('revision')!=m['revision']:raise shared.Problem(409,'This message changed. Reopen it before editing.')
            if op=='delete':
                for image in m.get('images',[]):MEDIA.pop(image['id'],None)
                MESSAGES.remove(m)
            else:
                body=shared.text(data,'body',2000,not m.get('images'))
                m['body']=body;m['revision']+=1;m['edited']=True
            return snapshot(uid)
        if op=='join':
            nick=nick_value(data.get('nick'))
            if any(k!=uid and p['nick'].casefold()==nick.casefold() for k,p in PEOPLE.items()):raise shared.Problem(409,'That nickname is already in the channel.')
            if uid not in PEOPLE:
                PEOPLE[uid]=dict(nick=nick,account=user['name'],seen=time.time(),cheered=set())
                emit('system',nick,user['name'],'joined #mapleforge')
        elif op=='leave':
            p=PEOPLE.pop(uid,None)
            if p:emit('system',p['nick'],p['account'],'left #mapleforge')
        elif op=='ping':
            if uid in PEOPLE:PEOPLE[uid]['seen']=time.time()
        else:
            if uid not in PEOPLE:raise shared.Problem(403,'Join the chat before speaking.')
            p=PEOPLE[uid];p['seen']=time.time()
            if op=='react':
                emoji=data.get('emoji')
                if emoji not in ('👍','👎','❤️','😂','🎉','🍁','🦫','🛶','❄️','🍯','🏒','snowshoe','lantern'):raise shared.Problem(400,'Choose a supported reaction.')
                if type(data.get('id')) is not int:raise shared.Problem(400,'Choose a message.')
                m=next((m for m in MESSAGES if m['id']==data['id'] and m['kind'] in ('message','me')),None)
                if not m:raise shared.Problem(404,'This message is no longer in the channel.')
                voters=m.setdefault('reactions',{}).setdefault(emoji,set())
                if uid in voters:voters.remove(uid)
                else:voters.add(uid)
                m['reactionVersion']=m.get('reactionVersion',0)+1
            elif op=='nick':
                nick=nick_value(data.get('nick'))
                if any(k!=uid and x['nick'].casefold()==nick.casefold() for k,x in PEOPLE.items()):raise shared.Problem(409,'That nickname is already in the channel.')
                emit('system',p['nick'],p['account'],'is now known as '+nick);p['nick']=nick
            elif op=='cheer':
                target=next((k for k,x in PEOPLE.items() if x['nick'].casefold()==str(data.get('nick','')).casefold()),None)
                if not target or target==uid:raise shared.Problem(400,'Choose another nickname in the channel.')
                if target in p['cheered']:raise shared.Problem(400,'You already cheered this member in this session.')
                p['cheered'].add(target);emit('system',p['nick'],p['account'],'gave '+PEOPLE[target]['nick']+' a +1. Just for fun!')
            elif op in ('message','me','topic'):
                reply_to=data.get('replyTo') if op in ('message','me') else None
                if reply_to is not None:
                    if type(reply_to) is not int:raise shared.Problem(400,'Choose a message to reply to.')
                    if not any(m['id']==reply_to and m['kind'] in ('message','me') for m in MESSAGES):raise shared.Problem(404,'The message you are replying to is no longer in the channel. Cancel the reply to send a new message.')
                images=prepare_images(data.get('images',[])) if op=='message' else []
                body=shared.text(data,'body',240 if op=='topic' else 2000,not images)
                if any(unicodedata.category(ch)=='Cc' and ch not in '\n\t' for ch in body):raise shared.Problem(400,'Use plain text without control characters.')
                if op=='topic':TOPIC=body;emit('system',p['nick'],p['account'],'set the topic: '+body)
                else:
                    refs=[]
                    for mid,mime,name,blob in images:
                        MEDIA[mid]={'mime':mime,'data':blob}
                        refs.append({'id':mid,'name':name,'url':'/api/chat-media/'+mid})
                    emit(op,p['nick'],p['account'],body,uid,refs,reply_to)
            else:raise shared.Problem(400,'Unknown chat action.')
        return snapshot(uid)


def prepare_images(files):
    if not isinstance(files,list) or len(files)>3:raise shared.Problem(400,'Attach up to three pictures.')
    prepared=[];total=0
    for f in files:
        if not isinstance(f,dict):raise shared.Problem(400,'Invalid picture.')
        name=shared.text(f,'name',160,True);encoded=f.get('data')
        if not isinstance(encoded,str) or len(encoded)>9*1024*1024:raise shared.Problem(413,'Pictures must total 6 MB or less.')
        try:blob=base64.b64decode(encoded,validate=True)
        except (ValueError,TypeError):raise shared.Problem(400,'Invalid picture data.')
        total+=len(blob)
        if not blob or total>6*1024*1024:raise shared.Problem(413,'Pictures must total 6 MB or less.')
        mime=discussions.detect(blob)
        if not mime.startswith('image/'):raise shared.Problem(400,'Use PNG, JPEG, GIF or WebP pictures.')
        prepared.append((secrets.token_hex(16),mime,name,blob))
    if sum(len(v['data']) for v in MEDIA.values())+total>MAX_MEDIA:raise shared.Problem(413,'The temporary channel picture storage is full. Delete older pictures to make room.')
    return prepared

def media(user,mid):
    if not user:raise shared.Problem(401,'Sign in to view chat pictures.')
    with LOCK:
        if mid not in MEDIA:raise shared.Problem(404,'This picture is no longer in the channel.')
        return MEDIA[mid]
