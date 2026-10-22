"""Build the portal using public source and optional separately managed content."""
from pathlib import Path
import argparse,json,shutil,subprocess
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--content-dir',type=Path,help='Private directory with ideas.json, people.json and governance.json arrays')
parser.add_argument('--output',type=Path,default=ROOT/'dist')
args=parser.parse_args()
def content(name):
    if not args.content_dir:return []
    path=args.content_dir/(name+'.json')
    value=json.loads(path.read_text()) if path.exists() else []
    if not isinstance(value,list):raise ValueError(name+' must contain a JSON array')
    return value
def encode(value):return json.dumps(value,ensure_ascii=False).replace('</','<\\/')
modules=['base','idea-discussions','community','feature-tools','governance','activity','people','people-explorer','activity-explorer','tasks','section-tabs','members','board-stats','shared','skills-exchange','resource-sharing','community-rules','bookmarks','navigation-history','project-framework','forgers-map','member-details','sidebar','version','idea-board-summary','locale','timezone']
seeds='const governanceSeeds='+encode(content('governance'))+';\nconst peopleSeeds='+encode(content('people'))+';\n'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
release={'commit':commit,'short':commit[:7]}
js='const PORTAL_BUILD='+json.dumps(release)+';\n'+seeds+'\n'.join((ROOT/'src'/f'{name}.js').read_text() for name in modules)
css='\n'.join((ROOT/'src'/f'{name}.css').read_text() for name in ['base','community'])
html=(ROOT/'src/portal.html').read_text().replace('__STYLES__',css).replace('__SCRIPTS__',js).replace('__IDEAS__',encode(content('ideas')))
args.output.mkdir(parents=True,exist_ok=True)
shutil.copytree(ROOT/'public',args.output,dirs_exist_ok=True)
(args.output/'portal1').mkdir(exist_ok=True)
(args.output/'portal1/index.html').write_text(html)
shutil.copyfile(ROOT/'public/mapleforge-icon.png',args.output/'portal1/mapleforge-icon.png')
(args.output/'portal1/version.json').write_text(json.dumps(release))
print('Built portal at',args.output/'portal1/index.html')
