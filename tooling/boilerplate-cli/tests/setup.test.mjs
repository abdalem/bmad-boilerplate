import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
	chmod,
	copyFile,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sources = ['.devcontainer', 'templates/base/.devcontainer'];

async function waitFor(check, timeout = 5000) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await check()) return;
		await new Promise(resolveWait => setTimeout(resolveWait, 20));
	}
	assert.fail('Timed out waiting for fixture process');
}

async function processRunning(pid) {
	try {
		process.kill(pid, 0);
		// An exited orphan can remain a zombie until the fixture host reaps it.
		const status = await readFile(`/proc/${pid}/stat`, 'utf8');
		return status.slice(status.lastIndexOf(')') + 2).split(' ')[0] !== 'Z';
	} catch (error) {
		if (error.code === 'ESRCH' || error.code === 'ENOENT') return false;
		throw error;
	}
}

function stopProcess(pid) {
	try {
		process.kill(pid, 'SIGKILL');
	} catch (error) {
		if (error.code !== 'ESRCH') throw error;
	}
}

async function fixture(t, source) {
	const root = await mkdtemp(join(tmpdir(), 'boilerplate-setup-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	for (const dir of [
		'.devcontainer',
		'scripts',
		'node_modules',
		'home',
		'bin',
	]) {
		await mkdir(join(root, dir));
	}
	await copyFile(
		join(repoRoot, source, 'setup.sh'),
		join(root, '.devcontainer/setup.sh'),
	);
	const log = join(root, 'commands');
	async function stub(name, content) {
		const path = join(root, name);
		await writeFile(path, `#!/usr/bin/env bash\n${content}\n`);
		await chmod(path, 0o755);
	}
	await stub(
		'bin/sudo',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell parameter expansion in the fixture.
		'echo "sudo $*" >> "$FIXTURE_LOG"; exit "${SUDO_STATUS:-0}"',
	);
	await stub(
		'bin/corepack',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell parameter expansion in the fixture.
		'echo "corepack $*" >> "$FIXTURE_LOG"; exit "${COREPACK_STATUS:-0}"',
	);
	await stub(
		'bin/pnpm',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell parameter expansion in the fixture.
		'echo "pnpm $*" >> "$FIXTURE_LOG"; if [[ "${HOLD:-0}" == 1 ]]; then sleep 30; fi; exit "${PNPM_STATUS:-0}"',
	);
	await stub(
		'bin/infisical',
		'echo "UNEXPECTED INFISICAL" >> "$FIXTURE_LOG"; exit 91',
	);
	await stub(
		'scripts/install-bmad.sh',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell parameter expansion in the fixture.
		'echo "bmad $*" >> "$FIXTURE_LOG"; exit "${BMAD_STATUS:-0}"',
	);
	const env = {
		...process.env,
		HOME: join(root, 'home'),
		PATH: `${join(root, 'bin')}:${process.env.PATH}`,
		FIXTURE_LOG: log,
		CODEX_INSTALL_DIR: join(root, 'home/.local/bin'),
	};
	const run = (extra = {}) =>
		spawnSync('bash', [join(root, '.devcontainer/setup.sh')], {
			cwd: tmpdir(),
			env: { ...env, ...extra },
			encoding: 'utf8',
			timeout: 5000,
		});
	return { root, env, log, run, stub };
}

for (const source of sources) {
	test(`${source}: setup succeeds, repeats, repairs broken gcloud link, and never probes sign-in`, async t => {
		const f = await fixture(t, source);
		await mkdir(join(f.env.HOME, '.config'));
		await symlink(join(f.root, 'missing'), join(f.env.HOME, '.config/gcloud'));
		for (let i = 0; i < 2; i++) {
			const result = f.run();
			assert.equal(result.status, 0, result.stderr);
			for (const phase of [
				'setup lock',
				'gcloud directories',
				'node_modules permissions',
				'Corepack activation',
				'dependency installation',
				'BMAD installation',
				'Setup complete.',
			]) {
				assert.ok(result.stdout.includes(phase), result.stdout);
			}
			assert.match(result.stdout, /infisical login.*manually/);
		}
		assert.doesNotMatch(await readFile(f.log, 'utf8'), /INFISICAL/);
		assert.match(await readFile(f.log, 'utf8'), /sudo -n chown/);
		assert.equal(
			(await readFile(join(f.env.HOME, '.bashrc'), 'utf8')).match(
				/corepack enable/g,
			).length,
			1,
		);
	});

	for (const [variable, phase] of [
		['SUDO_STATUS', 'node_modules permissions'],
		['COREPACK_STATUS', 'Corepack activation'],
		['PNPM_STATUS', 'dependency installation'],
	]) {
		test(`${source}: ${phase} failure is required and named`, async t => {
			const f = await fixture(t, source);
			const result = f.run({ [variable]: '7' });
			assert.notEqual(result.status, 0);
			assert.ok(
				result.stderr.includes(`FAILED during ${phase}`),
				result.stderr,
			);
			assert.doesNotMatch(await readFile(f.log, 'utf8'), /bmad|INFISICAL/);
		});
	}

	test(`${source}: optional BMAD failure warns; missing installer skips`, async t => {
		const f = await fixture(t, source);
		const failed = f.run({ BMAD_STATUS: '8' });
		assert.equal(failed.status, 0);
		assert.match(failed.stdout, /WARNING: BMAD install failed/);
		assert.match(failed.stdout, /Finished with 1 warning/);
		await chmod(join(f.root, 'scripts/install-bmad.sh'), 0o644);
		assert.match(f.run().stdout, /BMAD installer unavailable; skipped/);
	});

	test(`${source}: shell-only interruption forwards and bounds shutdown, releases the busy lock`, async t => {
		const f = await fixture(t, source);
		await f.stub(
			'bin/pnpm',
			'if [[ "$HOLD" != 1 ]]; then exit 0; fi\ntrap "" TERM\necho "$$" > "$FIXTURE_LOG.pid"\nsleep 30 &\necho "$!" > "$FIXTURE_LOG.descendant"\nwait',
		);
		const child = spawn('bash', [join(f.root, '.devcontainer/setup.sh')], {
			env: { ...f.env, HOLD: '1' },
			detached: true,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let output = '';
		child.stdout.on('data', data => {
			output += data;
		});
		child.stderr.on('data', data => {
			output += data;
		});
		const exited = new Promise(resolveExit =>
			child.once('exit', code => resolveExit(code)),
		);
		t.after(() => {
			try {
				process.kill(-child.pid, 'SIGKILL');
			} catch {}
		});
		await waitFor(async () => {
			try {
				return (await readFile(`${f.log}.descendant`, 'utf8')).trim();
			} catch {
				return false;
			}
		});
		const installerPid = Number(await readFile(`${f.log}.pid`, 'utf8'));
		const descendantPid = Number(await readFile(`${f.log}.descendant`, 'utf8'));
		t.after(() => {
			stopProcess(installerPid);
			stopProcess(descendantPid);
		});
		assert.match(output, /dependency installation/);
		const busy = f.run();
		assert.equal(busy.status, 75);
		assert.match(busy.stderr, /Another setup is already running/);
		const interruptedAt = Date.now();
		child.kill('SIGTERM');
		assert.equal(await exited, 143);
		assert.ok(
			Date.now() - interruptedAt < 4000,
			'interruption exceeded its shutdown budget',
		);
		assert.match(output, /Interrupted during dependency installation/);
		await waitFor(
			async () =>
				!(await processRunning(installerPid)) &&
				!(await processRunning(descendantPid)),
		);
		assert.equal(f.run().status, 0);
	});

	test(`${source}: a child outliving successful setup cannot retain the setup lock`, async t => {
		const f = await fixture(t, source);
		await f.stub(
			'bin/pnpm',
			'sleep 30 </dev/null >/dev/null 2>&1 &\necho "$!" > "$FIXTURE_LOG.pid"',
		);
		assert.equal(f.run().status, 0);
		const pid = Number(await readFile(`${f.log}.pid`, 'utf8'));
		t.after(() => stopProcess(pid));
		assert.equal(await processRunning(pid), true);
		await f.stub('bin/pnpm', 'exit 0');
		assert.equal(f.run().status, 0, 'background child retained fd9');
	});
}

test('agent update download failure warns and preserves installed tools without network access', async t => {
	const f = await fixture(t, 'templates/base/.devcontainer');
	await mkdir(join(f.env.HOME, '.local/bin'), { recursive: true });
	await f.stub('home/.local/bin/codex', 'echo existing-codex');
	await f.stub(
		'home/.local/bin/claude',
		'if [[ "$1" == update ]]; then exit 6; fi; echo existing-claude',
	);
	await f.stub('bin/curl', 'exit 22');
	const before = await readFile(join(f.env.HOME, '.local/bin/codex'), 'utf8');
	const result = spawnSync(
		'bash',
		[join(repoRoot, 'templates/base/.devcontainer/install-agent-clis.sh')],
		{
			env: f.env,
			encoding: 'utf8',
			timeout: 5000,
		},
	);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /codex update failed/);
	assert.match(result.stderr, /claude update failed/);
	assert.equal(
		await readFile(join(f.env.HOME, '.local/bin/codex'), 'utf8'),
		before,
	);
});

async function agentFixture(t) {
	const f = await fixture(t, 'templates/base/.devcontainer');
	const helper = join(
		repoRoot,
		'templates/base/.devcontainer/install-agent-clis.sh',
	);
	const env = {
		...f.env,
		PATH: `${join(f.root, 'bin')}:/usr/bin:/bin`,
		FIXTURE_ROOT: f.root,
	};
	for (const tool of ['codex', 'claude']) {
		await f.stub(`${tool}-binary`, `echo fixture-${tool}`);
		await f.stub(
			`${tool}-installer`,
			`mkdir -p "$HOME/.local/bin"\ncp "$FIXTURE_ROOT/${tool}-binary" "$HOME/.local/bin/${tool}"\nchmod +x "$HOME/.local/bin/${tool}"`,
		);
	}
	await f.stub(
		'bin/curl',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell expansion in the fake downloader.
		'destination="${@: -1}"\ntool="${destination##*/}"\ncp "$FIXTURE_ROOT/${tool%.sh}-installer" "$destination"',
	);
	const run = (extra = {}) =>
		spawnSync('bash', [helper], {
			env: { ...env, ...extra },
			encoding: 'utf8',
			timeout: 10000,
		});
	return { ...f, env, helper, run };
}

test('empty-home agent installs succeed with fake downloads and descendants cannot retain fd200', async t => {
	const f = await agentFixture(t);
	await f.stub(
		'codex-installer',
		'mkdir -p "$HOME/.local/bin"\ncp "$FIXTURE_ROOT/codex-binary" "$HOME/.local/bin/codex"\nchmod +x "$HOME/.local/bin/codex"\nsleep 30 </dev/null >/dev/null 2>&1 &\necho "$!" > "$FIXTURE_LOG.pid"',
	);
	const result = f.run();
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /codex available: fixture-codex/);
	assert.match(result.stdout, /claude available: fixture-claude/);
	const pid = Number(await readFile(`${f.log}.pid`, 'utf8'));
	t.after(() => stopProcess(pid));
	assert.equal(await processRunning(pid), true);
	await f.stub('bin/curl', 'exit 22');
	const retry = f.run();
	assert.equal(retry.status, 0, retry.stderr);
	assert.doesNotMatch(retry.stdout, /Another startup installer/);
});

test('agent version stdout with a failed exit never counts as available', async t => {
	const f = await agentFixture(t);
	await mkdir(join(f.env.HOME, '.local/bin'), { recursive: true });
	for (const tool of ['codex', 'claude'])
		await f.stub(`home/.local/bin/${tool}`, 'echo misleading-version; exit 7');
	await f.stub('bin/curl', 'exit 22');
	const result = f.run();
	assert.equal(result.status, 0);
	assert.doesNotMatch(result.stdout, /available:|misleading-version/);
	assert.match(result.stderr, /codex is unavailable/);
	assert.match(result.stderr, /claude is unavailable/);
});

test('a hanging agent updater obeys its short budget and its descendants exit', {
	timeout: 12000,
}, async t => {
	const f = await agentFixture(t);
	await mkdir(join(f.env.HOME, '.local/bin'), { recursive: true });
	await f.stub('home/.local/bin/codex', 'echo fixture-codex');
	await f.stub(
		'home/.local/bin/claude',
		'if [[ "$1" == --version ]]; then echo fixture-claude; exit 0; fi\ntrap "" TERM\necho "$$" > "$FIXTURE_LOG.pid"\nsleep 30 &\necho "$!" > "$FIXTURE_LOG.descendant"\nwait',
	);
	await f.stub('bin/curl', 'exit 22');
	const started = Date.now();
	const result = f.run({ AGENT_CLI_INSTALL_TIMEOUT_SECONDS: '1' });
	assert.equal(result.status, 0, result.stderr);
	assert.ok(Date.now() - started < 9000);
	assert.match(result.stderr, /claude update failed/);
	assert.match(result.stdout, /claude available: fixture-claude/);
	const pids = await Promise.all(
		['pid', 'descendant'].map(async name =>
			Number(await readFile(`${f.log}.${name}`, 'utf8')),
		),
	);
	t.after(() => {
		for (const pid of pids) stopProcess(pid);
	});
	await waitFor(
		async () =>
			!(await processRunning(pids[0])) && !(await processRunning(pids[1])),
	);
});

test('concurrent agent installers report busy and a later invocation can acquire the lock', {
	timeout: 10000,
}, async t => {
	const f = await agentFixture(t);
	await f.stub(
		'bin/curl',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Shell expansion in the fake downloader.
		'echo waiting >> "$FIXTURE_LOG"\nwhile [[ ! -f "$FIXTURE_ROOT/release" ]]; do sleep 0.05; done\ndestination="${@: -1}"\ntool="${destination##*/}"\ncp "$FIXTURE_ROOT/${tool%.sh}-installer" "$destination"',
	);
	const child = spawn('bash', [f.helper], {
		env: f.env,
		detached: true,
		stdio: 'ignore',
	});
	const exited = new Promise(resolveExit =>
		child.once('exit', code => resolveExit(code)),
	);
	t.after(() => stopProcess(-child.pid));
	await waitFor(async () => {
		try {
			return (await readFile(f.log, 'utf8')).includes('waiting');
		} catch {
			return false;
		}
	});
	const busy = f.run();
	assert.equal(busy.status, 0);
	assert.match(busy.stdout, /Another startup installer is running/);
	await writeFile(join(f.root, 'release'), '');
	assert.equal(await exited, 0);
	const retry = f.run();
	assert.equal(retry.status, 0, retry.stderr);
	assert.doesNotMatch(retry.stdout, /Another startup installer/);
});
