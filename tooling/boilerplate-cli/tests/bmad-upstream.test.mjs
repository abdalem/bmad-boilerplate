import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const upstreamTarget = process.env.BMAD_COMPATIBILITY_TARGET;

test('real upstream schemas, configuration merge, renderers, and review inheritance remain compatible', {
	skip: !upstreamTarget,
}, () => {
	const target = resolve(upstreamTarget);
	const result = spawnSync('python3', ['-', repoRoot, target], {
		encoding: 'utf8',
		input: `import pathlib,sys,tomllib,subprocess,tempfile
source=pathlib.Path(sys.argv[1]);root=pathlib.Path(sys.argv[2])
sys.path.insert(0,str(root/'_bmad/scripts'))
from config_utils import load_customization,load_central_config
count=0
for override in sorted((source/'.boilerplate/bmad-workflow-pack/bmad-custom').glob('*.toml')):
 skill=root/'.agents/skills'/override.stem
 default=tomllib.loads((skill/'customize.toml').read_text());custom=tomllib.loads(override.read_text())
 def check(schema,value,at):
  for key,v in value.items():
   assert key in schema,f'{at}.{key} unsupported'
   if isinstance(v,dict):check(schema[key],v,f'{at}.{key}')
 check(default,custom,override.stem)
 merged=load_customization(root,skill)
 if override.stem in ['bmad-build','bmad-build-auto']:
  for layer in ['review_layers','oneshot_review_layers']:
   if layer in default['workflow']:assert merged['workflow'][layer]==default['workflow'][layer]
 count+=1
# Prove all four supported central-config layers are merged consistently.
with tempfile.TemporaryDirectory() as tmp:
 project=pathlib.Path(tmp);bmad=project/'_bmad';custom=bmad/'custom';custom.mkdir(parents=True)
 (bmad/'config.toml').write_text('[core]\\nuser_name="base"\\ncommunication_language="English"\\n')
 (bmad/'config.user.toml').write_text('[core]\\nuser_name="personal"\\n')
 (custom/'config.toml').write_text('[core]\\nuser_name="team"\\ndocument_output_language="French"\\n')
 (custom/'config.user.toml').write_text('[core]\\nuser_name="override"\\n')
 config=load_central_config(project)
 assert config['core']=={'user_name':'override','communication_language':'English','document_output_language':'French'}
for name in ['bmad-build','bmad-build-auto']:
 command=[sys.executable,str(root/'_bmad/scripts/render_skill.py'),'--project-root',str(root),'--skill',str(root/'.agents/skills'/name)]
 rendered=subprocess.run(command,capture_output=True,text=True)
 assert rendered.returncode==0,rendered.stderr
 assert 'workflow.md' in rendered.stdout
for name in ['bmad-project-context','bmad-deep-recon']:
 resolved=subprocess.run([sys.executable,str(root/'_bmad/scripts/resolve_customization.py'),'--project-root',str(root),'--skill',str(root/'.agents/skills'/name),'--key','workflow'],capture_output=True,text=True)
 assert resolved.returncode==0,resolved.stderr
print(f'{count} upstream schemas, four config layers, Build renderers and review inheritance verified')
`,
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /upstream schemas, four config layers/);
});
