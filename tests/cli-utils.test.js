const { parseWhitelistArgs, loadWhitelistConfig } = require('../build/utils/cli-utils.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('parseWhitelistArgs', () => {
  test('returns empty results when no args provided', () => {
    const result = parseWhitelistArgs([]);
    expect(result.initialWhitelist).toEqual([]);
    expect(result.whitelistConfigPath).toBeUndefined();
  });

  test('parses a single --whitelist arg with command and level', () => {
    const result = parseWhitelistArgs(['--whitelist', 'git:safe']);
    expect(result.initialWhitelist).toHaveLength(1);
    expect(result.initialWhitelist[0]).toEqual({ command: 'git', securityLevel: 'safe', description: undefined });
  });

  test('parses --whitelist with description', () => {
    const result = parseWhitelistArgs(['--whitelist', 'git:safe:Git version control']);
    expect(result.initialWhitelist[0]).toEqual({
      command: 'git',
      securityLevel: 'safe',
      description: 'Git version control',
    });
  });

  test('parses description containing colons', () => {
    const result = parseWhitelistArgs(['--whitelist', 'curl:safe:HTTP client: fetches URLs']);
    expect(result.initialWhitelist[0].description).toBe('HTTP client: fetches URLs');
  });

  test('parses multiple --whitelist args', () => {
    const result = parseWhitelistArgs([
      '--whitelist', 'git:safe',
      '--whitelist', 'npm:requires_approval',
      '--whitelist', 'rm:forbidden:Dangerous delete',
    ]);
    expect(result.initialWhitelist).toHaveLength(3);
    expect(result.initialWhitelist[0].command).toBe('git');
    expect(result.initialWhitelist[1].command).toBe('npm');
    expect(result.initialWhitelist[1].securityLevel).toBe('requires_approval');
    expect(result.initialWhitelist[2].securityLevel).toBe('forbidden');
  });

  test('ignores --whitelist with invalid security level', () => {
    const result = parseWhitelistArgs(['--whitelist', 'git:invalid-level']);
    expect(result.initialWhitelist).toHaveLength(0);
  });

  test('ignores --whitelist with missing level', () => {
    const result = parseWhitelistArgs(['--whitelist', 'git']);
    expect(result.initialWhitelist).toHaveLength(0);
  });

  test('parses --whitelist-config path', () => {
    const result = parseWhitelistArgs(['--whitelist-config', '/path/to/whitelist.json']);
    expect(result.whitelistConfigPath).toBe('/path/to/whitelist.json');
    expect(result.initialWhitelist).toHaveLength(0);
  });

  test('parses both --whitelist and --whitelist-config together', () => {
    const result = parseWhitelistArgs([
      '--whitelist', 'git:safe',
      '--whitelist-config', '/tmp/config.json',
    ]);
    expect(result.initialWhitelist).toHaveLength(1);
    expect(result.whitelistConfigPath).toBe('/tmp/config.json');
  });

  test('ignores unknown flags', () => {
    const result = parseWhitelistArgs(['--some-other-flag', 'value', '--whitelist', 'git:safe']);
    expect(result.initialWhitelist).toHaveLength(1);
    expect(result.whitelistConfigPath).toBeUndefined();
  });
});

describe('loadWhitelistConfig', () => {
  let tmpFile;

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  });

  function writeTmp(content) {
    tmpFile = path.join(os.tmpdir(), `whitelist-test-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(content), 'utf-8');
    return tmpFile;
  }

  test('loads valid whitelist entries from JSON file', () => {
    const file = writeTmp({
      whitelist: [
        { command: 'git', securityLevel: 'safe', description: 'Git VCS' },
        { command: 'npm', securityLevel: 'requires_approval' },
        { command: 'rm', securityLevel: 'forbidden' },
      ],
    });
    const entries = loadWhitelistConfig(file);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ command: 'git', securityLevel: 'safe', description: 'Git VCS' });
    expect(entries[1]).toEqual({ command: 'npm', securityLevel: 'requires_approval', description: undefined });
    expect(entries[2].securityLevel).toBe('forbidden');
  });

  test('skips entries with invalid security level', () => {
    const file = writeTmp({
      whitelist: [
        { command: 'git', securityLevel: 'safe' },
        { command: 'bad', securityLevel: 'not-a-level' },
      ],
    });
    const entries = loadWhitelistConfig(file);
    expect(entries).toHaveLength(1);
    expect(entries[0].command).toBe('git');
  });

  test('returns empty array when file does not exist', () => {
    const entries = loadWhitelistConfig('/nonexistent/path/whitelist.json');
    expect(entries).toEqual([]);
  });

  test('returns empty array when file contains invalid JSON', () => {
    tmpFile = path.join(os.tmpdir(), `whitelist-test-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, 'not json {{{', 'utf-8');
    const entries = loadWhitelistConfig(tmpFile);
    expect(entries).toEqual([]);
  });

  test('returns empty array when whitelist key is missing', () => {
    const file = writeTmp({ commands: [] });
    const entries = loadWhitelistConfig(file);
    expect(entries).toEqual([]);
  });

  test('returns empty array when whitelist is not an array', () => {
    const file = writeTmp({ whitelist: { command: 'git', securityLevel: 'safe' } });
    const entries = loadWhitelistConfig(file);
    expect(entries).toEqual([]);
  });
});
