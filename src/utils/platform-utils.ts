import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Supported platform types
 */
export enum PlatformType {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  UNKNOWN = 'unknown'
}

/**
 * Detect the current platform
 * @returns The detected platform type
 */
export function detectPlatform(): PlatformType {
  const platform = process.platform;
  
  if (platform === 'win32') return PlatformType.WINDOWS;
  if (platform === 'darwin') return PlatformType.MACOS;
  if (platform === 'linux') return PlatformType.LINUX;
  
  return PlatformType.UNKNOWN;
}

/**
 * Get the default shell for the current platform
 * @returns Path to the default shell
 */
export function getDefaultShell(): string {
  const platform = detectPlatform();
  
  switch (platform) {
    case PlatformType.WINDOWS:
      return process.env.COMSPEC || 'cmd.exe';
    case PlatformType.MACOS:
      return '/bin/zsh';
    case PlatformType.LINUX:
      return process.env.SHELL || '/bin/bash';
    default:
      return process.env.SHELL || '/bin/sh';
  }
}

/**
 * Validate if a shell path exists and is executable
 * @param shellPath Path to the shell
 * @returns True if the shell is valid
 */
export function validateShellPath(shellPath: string): boolean {
  try {
    return fs.existsSync(shellPath) && fs.statSync(shellPath).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Get shell suggestions for each platform
 * @returns Record of platform types to array of suggested shells
 */
export function getShellSuggestions(): Record<PlatformType, string[]> {
  return {
    [PlatformType.WINDOWS]: ['cmd.exe', 'powershell.exe', 'pwsh.exe'],
    [PlatformType.MACOS]: ['/bin/zsh', '/bin/bash', '/bin/sh'],
    [PlatformType.LINUX]: ['/bin/bash', '/bin/sh', '/bin/zsh'],
    [PlatformType.UNKNOWN]: ['/bin/sh']
  };
}

/**
 * Get common locations for shells on the current platform
 * @returns Array of common shell locations
 */
export function getCommonShellLocations(): string[] {
  const platform = detectPlatform();
  
  switch (platform) {
    case PlatformType.WINDOWS:
      return [
        process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
      ];
    case PlatformType.MACOS:
      return ['/bin/zsh', '/bin/bash', '/bin/sh'];
    case PlatformType.LINUX:
      return ['/bin/bash', '/bin/sh', '/usr/bin/bash', '/usr/bin/zsh'];
    default:
      return ['/bin/sh'];
  }
}

/**
 * Get helpful message for shell configuration
 * @returns A helpful message with shell configuration guidance
 */
export function getShellConfigurationHelp(): string {
  const platform = detectPlatform();
  const suggestions = getShellSuggestions()[platform];
  const locations = getCommonShellLocations();
  
  let message = 'Shell Configuration Help:\n\n';
  
  message += `Detected platform: ${platform}\n\n`;
  message += 'Suggested shells for this platform:\n';
  suggestions.forEach(shell => {
    message += `- ${shell}\n`;
  });
  
  message += '\nCommon shell locations on this platform:\n';
  locations.forEach(location => {
    message += `- ${location}\n`;
  });
  
  message += '\nTo configure a custom shell, provide the full path to the shell executable.';
  
  return message;
}

/**
 * Get the application data directory for the current platform
 * @returns Path to the application data directory
 */
export function getAppDataDirectory(): string {
  const platform = detectPlatform();
  const appName = 'super-shell-mcp';
  
  switch (platform) {
    case PlatformType.WINDOWS:
      // Use APPDATA on Windows (e.g., C:\Users\username\AppData\Roaming)
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
    case PlatformType.MACOS:
      // Use ~/Library/Application Support on macOS
      return path.join(os.homedir(), 'Library', 'Application Support', appName);
    case PlatformType.LINUX:
    default:
      // Use ~/.config on Linux and other Unix-like systems
      return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), appName);
  }
}

/**
 * Get the path to the whitelist storage file
 * @param customPath Optional custom path to use instead of default
 * @returns Path to the whitelist JSON file
 */
export function getWhitelistStoragePath(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }
  const dataDir = getAppDataDirectory();
  return path.join(dataDir, 'whitelist.json');
}

/**
 * Ensure the application data directory exists
 * @returns True if directory exists or was created successfully
 */
export function ensureAppDataDirectory(): boolean {
  try {
    const dataDir = getAppDataDirectory();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
}