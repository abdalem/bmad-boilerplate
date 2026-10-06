#!/usr/bin/env node
'use strict';
// Copy with the reviewed project MCP entry changes. No Remok host dependency.
const {execFileSync, spawn} = require('node:child_process');
const {isIP} = require('node:net');
const {constants} = require('node:os');

function validateUrl(value) {
  const invalid = () => new Error('Invalid REMOK_CHROME_URL; expected an HTTP(S) browser base URL without credentials, path, query or fragment.');
  if (typeof value !== 'string' || value.length > 2048) throw invalid();
  if (value === '') return value;
  // Do not use WHATWG URL normalization: it accepts shorthand numeric hosts and
  // normalizes paths before they could be checked against this narrow contract.
  const match = /^(https?):\/\/(\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::([0-9]+))?\/?$/i.exec(value);
  if (!match || match[0] !== value) throw invalid();
  const [, , host, port] = match;
  if (port && !(Number(port) >= 1 && Number(port) <= 65535)) throw invalid();
  if (host.startsWith('[')) {
    if (isIP(host.slice(1, -1)) !== 6) throw invalid();
  } else if (/^[0-9.]+$/.test(host)) {
    if (isIP(host) !== 4) throw invalid();
  } else {
    const labels = host.replace(/\.$/, '').split('.');
    if (host.length > 253 || !labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
        /^\d+$/.test(labels.at(-1)) || /^0x[0-9a-f]+$/i.test(labels.at(-1))) throw invalid();
  }
  return value;
}

function lookupLocal() {
  return execFileSync('getent', ['hosts', 'host.docker.internal'], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function selectUrl(environment = process.env, lookup = lookupLocal) {
  const selected = environment.REMOK_CHROME_URL;
  if (selected !== undefined && selected !== '') return validateUrl(selected);
  let address;
  try { address = lookup().trim().split(/\s+/)[0]; }
  catch { throw new Error('Cannot resolve host.docker.internal; no browser fallback was attempted.'); }
  if (!isIP(address)) throw new Error('Cannot resolve host.docker.internal to an IP address; no browser fallback was attempted.');
  return `http://${isIP(address) === 6 ? '[' + address + ']' : address}:9222`;
}

function argumentsFor(url, extra = []) {
  validateUrl(url);
  if (!url) throw new Error('Browser selection requires a resolved URL.');
  const selectors = new Set(['browserurl', 'wsendpoint', 'autoconnect']);
  if (extra.some(arg => arg === '--' || arg.startsWith('-u') || arg.startsWith('-w') || selectors.has(arg.split('=', 1)[0].replace(/^--(?:no-)?/, '').replace(/[-_]/g, '').toLowerCase()))) {
    throw new Error('Browser selection belongs to REMOK_CHROME_URL; remove conflicting MCP arguments.');
  }
  return ['-y', 'chrome-devtools-mcp@latest', ...extra, '--browser-url=' + url];
}

function main(extra = process.argv.slice(2)) {
  let args;
  try { args = argumentsFor(selectUrl(), extra); }
  catch (error) { console.error(`chrome-mcp: ${error.message}`); process.exitCode = 1; return; }
  // npx can launch the MCP as a descendant; forward shutdown to their group on
  // POSIX so the browser server does not outlive its launcher. Windows keeps
  // Node's direct-child signal behavior without creating a detached process.
  const grouped = process.platform !== 'win32';
  const child = spawn('npx', args, {stdio: 'inherit', shell: false, detached: grouped});
  const forward = signal => {
    try {
      if (grouped && child.pid) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (error.code !== 'ESRCH') child.kill(signal);
    }
  };
  let shutdownTimer;
  const shutdownGroup = signal => {
    forward(signal);
    if (!grouped || !child.pid || shutdownTimer) return;
    // Keep the launcher alive long enough to stop descendants even if npx
    // exits immediately or an MCP descendant ignores the graceful signal.
    try { process.kill(-child.pid, 0); }
    catch (error) { if (error.code === 'ESRCH') return; }
    shutdownTimer = setTimeout(() => forward('SIGKILL'), 2000);
  };
  const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => shutdownGroup(signal)]));
  for (const [signal, handler] of handlers) process.on(signal, handler);
  const cleanup = () => { for (const [signal, handler] of handlers) process.off(signal, handler); };
  child.once('error', () => {
    cleanup();
    console.error('chrome-mcp: Cannot start npx; check the existing Node/npm installation.');
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    cleanup();
    if (grouped && !shutdownTimer) shutdownGroup('SIGTERM');
    process.exitCode = code ?? (128 + (constants.signals[signal] || 1));
  });
}

if (require.main === module) main();
module.exports = {validateUrl, selectUrl, argumentsFor};
