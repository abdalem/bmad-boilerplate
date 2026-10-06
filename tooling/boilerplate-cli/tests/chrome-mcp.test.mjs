import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const helper = join(repoRoot, 'templates/base/.devcontainer/chrome-mcp.cjs');
const { validateUrl, selectUrl, argumentsFor } = require(helper);

test('Chrome helper selects an explicit environment endpoint or local IPv4/IPv6 fallback', () => {
	assert.equal(
		selectUrl({ REMOK_CHROME_URL: 'https://browser.example:9223/' }, () =>
			assert.fail('unexpected lookup'),
		),
		'https://browser.example:9223/',
	);
	assert.equal(
		selectUrl({}, () => '192.0.2.1 host.docker.internal\n'),
		'http://192.0.2.1:9222',
	);
	assert.equal(
		selectUrl(
			{ REMOK_CHROME_URL: '' },
			() => '2001:db8::1 host.docker.internal\n',
		),
		'http://[2001:db8::1]:9222',
	);
	assert.throws(
		() =>
			selectUrl({}, () => {
				throw new Error('lookup unavailable');
			}),
		/Cannot resolve/,
	);
	assert.throws(() => selectUrl({}, () => 'not-an-ip'), /Cannot resolve/);
});

test('Chrome helper rejects invalid override values and conflicting selectors without echoing inputs', () => {
	for (const value of [
		'http://user:secret@example.com',
		'http://example.com/path',
		'http://example.com?secret=token',
		'http://example.com#token',
		'ws://example.com',
		'http://127.1',
		'http://example.com:0',
		'http://example.com:65536',
		'http://[bad::ip]',
		'http://example.com\n',
	]) {
		assert.throws(
			() => validateUrl(value),
			error => {
				assert.match(error.message, /Invalid REMOK_CHROME_URL/);
				assert.equal(error.message.includes(value), false);
				return true;
			},
		);
	}
	for (const argument of [
		'--browser-url=http://other',
		'--browserUrl',
		'--ws-endpoint',
		'--autoConnect',
		'--no-auto-connect',
		'-u',
		'-w',
		'-w=ws://other',
		'--',
	]) {
		assert.throws(
			() => argumentsFor('http://browser.example', [argument]),
			/conflicting MCP arguments/,
		);
	}
	assert.deepEqual(argumentsFor('http://browser.example', ['--isolated']), [
		'-y',
		'chrome-devtools-mcp@latest',
		'--isolated',
		'--browser-url=http://browser.example',
	]);
});

test('Chrome launcher uses stub processes, preserves child status, and never starts npx for invalid input', async t => {
	const root = await mkdtemp(join(tmpdir(), 'boilerplate-chrome-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, 'bin'));
	const log = join(root, 'arguments');
	for (const [name, body] of [
		['getent', 'echo "192.0.2.2 host.docker.internal"'],
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell parameter expansion in the fixture.
		['npx', 'printf "%s\\n" "$@" > "$FIXTURE_LOG"; exit "${CHILD_STATUS:-0}"'],
	]) {
		const path = join(root, 'bin', name);
		await writeFile(path, `#!/usr/bin/env bash\n${body}\n`);
		await chmod(path, 0o755);
	}
	const run = (extra = {}) =>
		spawnSync(process.execPath, [helper, '--isolated'], {
			env: {
				...process.env,
				PATH: `${join(root, 'bin')}:${process.env.PATH}`,
				FIXTURE_LOG: log,
				REMOK_CHROME_URL: '',
				...extra,
			},
			encoding: 'utf8',
			timeout: 5000,
		});
	assert.equal(run().status, 0);
	assert.match(
		await readFile(log, 'utf8'),
		/--browser-url=http:\/\/192\.0\.2\.2:9222/,
	);
	assert.equal(
		run({ REMOK_CHROME_URL: 'https://browser.example:9443', CHILD_STATUS: '9' })
			.status,
		9,
	);
	const args = await readFile(log, 'utf8');
	assert.match(
		args,
		/--isolated\n--browser-url=https:\/\/browser\.example:9443/,
	);
	const invalid = run({
		REMOK_CHROME_URL: 'http://user:super-secret@example.com',
	});
	assert.equal(invalid.status, 1);
	assert.doesNotMatch(invalid.stderr, /super-secret/);
	assert.equal(await readFile(log, 'utf8'), args);
});

test('distributed Chrome and agent helpers remain aligned with the reviewed root helpers', async () => {
	for (const name of ['chrome-mcp.cjs', 'install-agent-clis.sh', 'setup.sh']) {
		assert.equal(
			await readFile(
				join(repoRoot, 'templates/base/.devcontainer', name),
				'utf8',
			),
			await readFile(join(repoRoot, '.devcontainer', name), 'utf8'),
		);
	}
});

async function waitFor(check, timeout = 4000) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await check()) return;
		await new Promise(resolveWait => setTimeout(resolveWait, 20));
	}
	assert.fail('Timed out waiting for Chrome fixture process');
}

async function processRunning(pid) {
	try {
		process.kill(pid, 0);
		const status = await readFile(`/proc/${pid}/stat`, 'utf8');
		return status.slice(status.lastIndexOf(')') + 2).split(' ')[0] !== 'Z';
	} catch (error) {
		if (error.code === 'ESRCH' || error.code === 'ENOENT') return false;
		throw error;
	}
}

for (const signal of ['SIGINT', 'SIGTERM']) {
	test(`Chrome launcher forwards ${signal} to persistent npx and MCP descendants`, {
		timeout: 10000,
	}, async t => {
		const root = await mkdtemp(join(tmpdir(), 'boilerplate-chrome-signal-'));
		t.after(() => rm(root, { recursive: true, force: true }));
		const worker = join(root, 'worker.cjs');
		await writeFile(
			worker,
			`const fs = require('node:fs');
fs.writeFileSync(process.env.CHILD_PID, String(process.pid));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  fs.writeFileSync(process.env.CHILD_STOP, signal);
  process.exit(0);
});
setInterval(() => {}, 1000);
`,
		);
		const npx = join(root, 'npx');
		await writeFile(
			npx,
			`#!${process.execPath}
const fs = require('node:fs');
require('node:child_process').spawn(process.execPath, [process.env.WORKER], { stdio: 'inherit' });
fs.writeFileSync(process.env.NPX_PID, String(process.pid));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  fs.writeFileSync(process.env.NPX_STOP, signal);
  process.exit(0);
});
setInterval(() => {}, 1000);
`,
		);
		await chmod(npx, 0o755);
		const env = {
			...process.env,
			PATH: root,
			REMOK_CHROME_URL: 'http://browser.example',
			WORKER: worker,
			NPX_PID: join(root, 'npx.pid'),
			CHILD_PID: join(root, 'child.pid'),
			NPX_STOP: join(root, 'npx.stop'),
			CHILD_STOP: join(root, 'child.stop'),
		};
		const launcher = spawn(process.execPath, [helper], {
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		const exited = new Promise(resolveExit =>
			launcher.once('exit', code => resolveExit(code)),
		);
		let npxPid;
		let childPid;
		t.after(() => {
			for (const pid of [launcher.pid, npxPid, childPid].filter(Boolean)) {
				try {
					process.kill(pid, 'SIGKILL');
				} catch (error) {
					if (error.code !== 'ESRCH') throw error;
				}
			}
		});
		await waitFor(async () => {
			try {
				childPid = Number(await readFile(env.CHILD_PID, 'utf8'));
				npxPid = Number(await readFile(env.NPX_PID, 'utf8'));
				return childPid && npxPid;
			} catch {
				return false;
			}
		});
		launcher.kill(signal);
		assert.equal(await exited, 0);
		assert.equal(await readFile(env.NPX_STOP, 'utf8'), signal);
		await waitFor(async () => {
			try {
				return await readFile(env.CHILD_STOP, 'utf8');
			} catch {
				return false;
			}
		}, 1000);
		assert.equal(await readFile(env.CHILD_STOP, 'utf8'), signal);
		await waitFor(
			async () =>
				!(await processRunning(npxPid)) && !(await processRunning(childPid)),
		);
	});
}

test('Chrome launcher reports missing npx and exits without hanging', async t => {
	const root = await mkdtemp(join(tmpdir(), 'boilerplate-chrome-missing-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	const result = spawnSync(process.execPath, [helper], {
		env: {
			...process.env,
			PATH: root,
			REMOK_CHROME_URL: 'http://browser.example',
		},
		encoding: 'utf8',
		timeout: 3000,
	});
	assert.equal(result.error, undefined);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Cannot start npx/);
});

test('Chrome launcher bounds shutdown when npx exits but its descendant ignores signals', {
	timeout: 10000,
}, async t => {
	const root = await mkdtemp(join(tmpdir(), 'boilerplate-chrome-stubborn-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	const worker = join(root, 'worker.cjs');
	await writeFile(
		worker,
		`const fs = require('node:fs');
fs.writeFileSync(process.env.CHILD_PID, String(process.pid));
process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
setInterval(() => {}, 1000);
`,
	);
	const npx = join(root, 'npx');
	await writeFile(
		npx,
		`#!${process.execPath}
require('node:child_process').spawn(process.execPath, [process.env.WORKER], {stdio: 'inherit'});
process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 1000);
`,
	);
	await chmod(npx, 0o755);
	const pidPath = join(root, 'child.pid');
	const launcher = spawn(process.execPath, [helper], {
		env: {
			...process.env,
			PATH: root,
			REMOK_CHROME_URL: 'http://browser.example',
			WORKER: worker,
			CHILD_PID: pidPath,
		},
		stdio: 'ignore',
	});
	const exited = new Promise(resolveExit => launcher.once('exit', resolveExit));
	let childPid;
	t.after(() => {
		for (const pid of [launcher.pid, childPid].filter(Boolean)) {
			try {
				process.kill(pid, 'SIGKILL');
			} catch (error) {
				if (error.code !== 'ESRCH') throw error;
			}
		}
	});
	await waitFor(async () => {
		try {
			childPid = Number(await readFile(pidPath, 'utf8'));
			return childPid;
		} catch {
			return false;
		}
	});
	const started = Date.now();
	launcher.kill('SIGTERM');
	assert.equal(await exited, 0);
	assert.ok(Date.now() - started < 4000, 'shutdown exceeded grace period');
	await waitFor(async () => !(await processRunning(childPid)));
});
