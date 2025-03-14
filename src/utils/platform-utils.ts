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
