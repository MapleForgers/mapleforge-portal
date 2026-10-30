"""Build a clean portal shell. Private content is served by authenticated APIs."""
from pathlib import Path
import argparse,json,shutil,subprocess
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--content-dir',type=Path,help='Private directory with ideas.json, people.json and governance.json arrays')
parser.add_argument('--output',type=Path,default=ROOT/'dist')
args=parser.parse_args()
if args.content_dir:
    parser.error('Private content must be loaded through authenticated server APIs, not a web build.')
def encode(value):return json.dumps(value,ensure_ascii=False).replace('<', r'\u003c')
modules=['base','idea-discussions','community','feature-tools','governance','activity','people','people-explorer','activity-explorer','tasks','section-tabs','members','board-stats','shared','skills-exchange','resource-sharing','community-rules','bookmarks','navigation-history','project-framework','forgers-map','member-details','privacy-controls','discord-consent','sidebar','version','idea-board-summary','responsive-workspace','locale','timezone','rule-voting','rule-comments','rule-forum','feature-forum','portal-notice','chat','proposal-images','post-history','forum-demo','forum-mobile']
seeds='const governanceSeeds='+encode([])+';\nconst peopleSeeds='+encode([])+';\n'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip())
release={'commit':commit,'short':commit[:7]+('-dirty' if dirty else ''),'dirty':dirty}
modules.insert(modules.index('members') + 1, 'preview')
js='const PORTAL_BUILD='+json.dumps(release)+';\n'+seeds+'\n'.join((ROOT/'src'/f'{name}.js').read_text() for name in modules)
css='\n'.join((ROOT/'src'/f'{name}.css').read_text() for name in ['base','community','design-system'])
html=(ROOT/'src/portal.html').read_text().replace('__STYLES__',css).replace('__SCRIPTS__',js).replace('__IDEAS__',encode([]),1)
if args.output.resolve()!= (ROOT/'dist').resolve():parser.error('Build output must be the repository dist directory.')
if args.output.is_symlink():parser.error('Build output must not be a symlink.')
shutil.rmtree(args.output,ignore_errors=True)
args.output.mkdir(parents=True,exist_ok=True)
shutil.copytree(ROOT/'public',args.output,dirs_exist_ok=True)
(args.output/'portal1').mkdir(exist_ok=True)
(args.output/'portal1/index.html').write_text(html)
shutil.copyfile(ROOT/'public/mapleforge-icon.png',args.output/'portal1/mapleforge-icon.png')
(args.output/'portal1/version.json').write_text(json.dumps(release))
# Materialize the friendly publication routes used by the navigation.
publication_pages = {
    '': 'perspeviera/blackknives/index.html',
    'blackknives-proposal': 'perspeviera/blackknives/index.html',
    'relevant-history': 'perspeviera/index.html',
    'virtual-constitution': 'perspeviera/voting/index.html',
    'blackknives-survey': 'perspeviera/previews/7631821a03a914519d64/blackknives/index.html',
    'mandd-survey': 'perspeviera/previews/7631821a03a914519d64/mandd/index.html',
}
for route, source in publication_pages.items():
    destination = args.output/'publications'/route
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT/'public'/source, destination/'index.html')
print('Built portal at' ,args.output/'portal1/index.html')
