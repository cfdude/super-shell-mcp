/**
 * Integration tests for --whitelist and --whitelist-config startup args.
 * Spawns the actual server process and communicates over stdin/stdout.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SERVER_BIN = path.join(__dirname, '../build/index.js');

/**
 * Start the server with given args, send requests, collect responses, then kill.
 * @param {string[]} args - CLI args to pass to the server
 * @param {object[]} requests - Array of JSON-RPC request objects to send
 * @returns {Promise<object[]>} - Array of parsed JSON-RPC response objects
 */
function runServer(args, requests) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [SERVER_BIN, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const responses = [];
    let stdout = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      // Each response is a complete JSON line
      const lines = stdout.split('\n');
      stdout = lines.pop(); // keep incomplete line
      for (const line of lines) {
        if (line.trim()) {
          try {
            responses.push(JSON.parse(line));
          } catch {
            // ignore non-JSON lines
          }
        }
      }
      if (responses.length >= requests.length) {
        proc.kill();
      }
    });

    proc.on('close', () => resolve(responses));
    proc.on('error', reject);

    // Send all requests
    for (const req of requests) {
      proc.stdin.write(JSON.stringify(req) + '\n');
    }

    // Safety timeout
    setTimeout(() => {
      proc.kill();
    }, 8000).unref();
  });
}

function makeListReq() {
  return { jsonrpc: '2.0', id: 1, method: 'tools/list' };
}

function makeGetWhitelistReq() {
  return { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_whitelist', arguments: {} } };
}

function makeAddToWhitelistReq(command, securityLevel, description) {
  return {
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'add_to_whitelist', arguments: { command, securityLevel, description } },
  };
}

function parseWhitelistFromResponse(responses) {
  const whitelistResp = responses.find(r => r.id === 2);
  expect(whitelistResp).toBeDefined();
  return JSON.parse(whitelistResp.result.content[0].text);
}

describe('--whitelist CLI arg (integration)', () => {
  test('pre-populates whitelist with a safe command', async () => {
    const responses = await runServer(
      ['--whitelist', 'git:safe:Git version control'],
      [makeListReq(), makeGetWhitelistReq()],
    );
    const whitelist = parseWhitelistFromResponse(responses);
    const entry = whitelist.find(e => e.command === 'git');
    expect(entry).toBeDefined();
    expect(entry.securityLevel).toBe('safe');
    expect(entry.description).toBe('Git version control');
  });

  test('pre-populates whitelist with requires_approval command', async () => {
    const responses = await runServer(
      ['--whitelist', 'npm:requires_approval'],
      [makeListReq(), makeGetWhitelistReq()],
    );
    const whitelist = parseWhitelistFromResponse(responses);
    const entry = whitelist.find(e => e.command === 'npm');
    expect(entry).toBeDefined();
    expect(entry.securityLevel).toBe('requires_approval');
  });

  test('pre-populates whitelist with multiple --whitelist flags', async () => {
    const responses = await runServer(
      ['--whitelist', 'git:safe', '--whitelist', 'docker:forbidden'],
      [makeListReq(), makeGetWhitelistReq()],
    );
    const whitelist = parseWhitelistFromResponse(responses);
    expect(whitelist.find(e => e.command === 'git')?.securityLevel).toBe('safe');
    expect(whitelist.find(e => e.command === 'docker')?.securityLevel).toBe('forbidden');
  });
});

describe('--whitelist-config CLI arg (integration)', () => {
  let tmpConfigFile;

  beforeEach(() => {
    tmpConfigFile = path.join(os.tmpdir(), `whitelist-integration-${Date.now()}.json`);
    fs.writeFileSync(tmpConfigFile, JSON.stringify({
      whitelist: [
        { command: 'git', securityLevel: 'safe', description: 'Git VCS' },
        { command: 'npm', securityLevel: 'requires_approval', description: 'Node package manager' },
        { command: 'docker', securityLevel: 'forbidden', description: 'Container runtime' },
      ],
    }), 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(tmpConfigFile)) fs.unlinkSync(tmpConfigFile);
  });

  test('loads all entries from config file', async () => {
    const responses = await runServer(
      ['--whitelist-config', tmpConfigFile],
      [makeListReq(), makeGetWhitelistReq()],
    );
    const whitelist = parseWhitelistFromResponse(responses);
    expect(whitelist.find(e => e.command === 'git')?.securityLevel).toBe('safe');
    expect(whitelist.find(e => e.command === 'npm')?.securityLevel).toBe('requires_approval');
    expect(whitelist.find(e => e.command === 'docker')?.securityLevel).toBe('forbidden');
  });

  test('persists add_to_whitelist back to config file', async () => {
    const responses = await runServer(
      ['--whitelist-config', tmpConfigFile],
      [makeListReq(), makeAddToWhitelistReq('curl', 'safe', 'HTTP client'), makeGetWhitelistReq()],
    );
    // Server should have written back to the config file
    const saved = JSON.parse(fs.readFileSync(tmpConfigFile, 'utf-8'));
    const curlEntry = saved.whitelist.find(e => e.command === 'curl');
    expect(curlEntry).toBeDefined();
    expect(curlEntry.securityLevel).toBe('safe');
    expect(curlEntry.description).toBe('HTTP client');
  });

  test('survives restart with persisted entry', async () => {
    // First run: add curl
    await runServer(
      ['--whitelist-config', tmpConfigFile],
      [makeListReq(), makeAddToWhitelistReq('curl', 'safe', 'HTTP client'), makeGetWhitelistReq()],
    );

    // Second run: curl should still be in the whitelist loaded from config
    const responses = await runServer(
      ['--whitelist-config', tmpConfigFile],
      [makeListReq(), makeGetWhitelistReq()],
    );
    const whitelist = parseWhitelistFromResponse(responses);
    const curlEntry = whitelist.find(e => e.command === 'curl');
    expect(curlEntry).toBeDefined();
    expect(curlEntry.securityLevel).toBe('safe');
  });

  test('CLI --whitelist and --whitelist-config can be combined', async () => {
    const responses = await runServer(
      ['--whitelist', 'make:safe', '--whitelist-config', tmpConfigFile],
      [makeListReq(), makeGetWhitelistReq()],
    );
    const whitelist = parseWhitelistFromResponse(responses);
    expect(whitelist.find(e => e.command === 'make')?.securityLevel).toBe('safe');
    expect(whitelist.find(e => e.command === 'git')?.securityLevel).toBe('safe');
  });
});
