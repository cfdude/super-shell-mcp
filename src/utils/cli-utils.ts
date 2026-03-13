import * as fs from 'fs';

export interface WhitelistCliEntry {
  command: string;
  securityLevel: string;
  description?: string;
}

export interface ParsedCliArgs {
  initialWhitelist: WhitelistCliEntry[];
  whitelistConfigPath?: string;
}

const VALID_SECURITY_LEVELS = ['safe', 'requires_approval', 'forbidden'];

/**
 * Parse --whitelist and --whitelist-config CLI arguments.
 * --whitelist "command:level[:description]"  (repeatable)
 * --whitelist-config /path/to/whitelist.json
 */
export function parseWhitelistArgs(argv: string[]): ParsedCliArgs {
  const initialWhitelist: WhitelistCliEntry[] = [];
  let whitelistConfigPath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--whitelist' && argv[i + 1]) {
      const raw = argv[++i];
      const parts = raw.split(':');
      if (parts.length >= 2) {
        const [command, securityLevel, ...descParts] = parts;
        if (command && VALID_SECURITY_LEVELS.includes(securityLevel)) {
          initialWhitelist.push({
            command,
            securityLevel,
            description: descParts.length > 0 ? descParts.join(':') : undefined,
          });
        } else {
          console.error(`[Config] Invalid --whitelist value: "${raw}" (format: command:safe|requires_approval|forbidden[:description])`);
        }
      } else {
        console.error(`[Config] Invalid --whitelist value: "${raw}" (format: command:safe|requires_approval|forbidden[:description])`);
      }
    } else if (argv[i] === '--whitelist-config' && argv[i + 1]) {
      whitelistConfigPath = argv[++i];
    }
  }

  return { initialWhitelist, whitelistConfigPath };
}

/**
 * Load whitelist entries from a JSON config file.
 * Expected format: { "whitelist": [{ "command": "git", "securityLevel": "safe", "description": "..." }] }
 * Returns entries on success, empty array on error (errors logged to stderr).
 */
export function loadWhitelistConfig(configPath: string): WhitelistCliEntry[] {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    const entries: WhitelistCliEntry[] = [];

    if (!Array.isArray(config.whitelist)) {
      console.error(`[Config] whitelist-config file must have a "whitelist" array`);
      return [];
    }

    for (const entry of config.whitelist) {
      if (typeof entry.command === 'string' && VALID_SECURITY_LEVELS.includes(entry.securityLevel)) {
        entries.push({
          command: entry.command,
          securityLevel: entry.securityLevel,
          description: typeof entry.description === 'string' ? entry.description : undefined,
        });
      } else {
        console.error(`[Config] Skipping invalid whitelist entry in config file: ${JSON.stringify(entry)}`);
      }
    }

    console.error(`[Config] Loaded whitelist config from ${configPath}`);
    return entries;
  } catch (error) {
    console.error(`[Config] Failed to load whitelist config from ${configPath}: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}
