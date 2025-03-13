import { CommandSecurityLevel, CommandWhitelistEntry } from '../services/command-service.js';
import { PlatformType, detectPlatform } from './platform-utils.js';

/**
 * Get common safe commands that work across all platforms
 * @returns Array of common safe command whitelist entries
 */
export function getCommonSafeCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'echo',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Print text to standard output'
    }
  ];
}

/**
 * Get Windows-specific safe commands
 * @returns Array of Windows safe command whitelist entries
 */
export function getWindowsSafeCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'dir',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'List directory contents'
    },
    {
      command: 'type',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Display the contents of a text file'
    },
    {
      command: 'cd',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Change directory'
    },
    {
      command: 'findstr',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Search for strings in files'
    },
    {
      command: 'where',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Locate programs'
    },
    {
      command: 'whoami',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Display current user'
    },
    {
      command: 'hostname',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Display computer name'
    },
    {
      command: 'ver',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Display operating system version'
    }
  ];
}

/**
 * Get macOS-specific safe commands
 * @returns Array of macOS safe command whitelist entries
 */
export function getMacOSSafeCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'ls',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'List directory contents'
    },
    {
      command: 'pwd',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Print working directory'
    },
    {
      command: 'cat',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Concatenate and print files'
    },
    {
      command: 'grep',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Search for patterns in files'
    },
    {
      command: 'find',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Find files in a directory hierarchy'
    },
    {
      command: 'cd',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Change directory'
    },
    {
      command: 'head',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Output the first part of files'
    },
    {
      command: 'tail',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Output the last part of files'
    },
    {
      command: 'wc',
      securityLevel: CommandSecurityLevel.SAFE,
      description: 'Print newline, word, and byte counts'
    }
  ];
}

/**
 * Get Linux-specific safe commands
 * @returns Array of Linux safe command whitelist entries
 */
export function getLinuxSafeCommands(): CommandWhitelistEntry[] {
  // Linux safe commands are similar to macOS
  return getMacOSSafeCommands();
}

/**
 * Get Windows-specific commands requiring approval
 * @returns Array of Windows command whitelist entries requiring approval
 */
export function getWindowsApprovalCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'copy',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Copy files'
    },
    {
      command: 'move',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Move files'
    },
    {
      command: 'mkdir',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Create directories'
    },
    {
      command: 'rmdir',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Remove directories'
    },
    {
      command: 'rename',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Rename files'
    },
    {
      command: 'attrib',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Change file attributes'
    }
  ];
}

/**
 * Get macOS-specific commands requiring approval
 * @returns Array of macOS command whitelist entries requiring approval
 */
export function getMacOSApprovalCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'mv',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Move (rename) files'
    },
    {
      command: 'cp',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Copy files and directories'
    },
    {
      command: 'mkdir',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Create directories'
    },
    {
      command: 'touch',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Change file timestamps or create empty files'
    },
    {
      command: 'chmod',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Change file mode bits'
    },
    {
      command: 'chown',
      securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL,
      description: 'Change file owner and group'
    }
  ];
}

/**
 * Get Linux-specific commands requiring approval
 * @returns Array of Linux command whitelist entries requiring approval
 */
export function getLinuxApprovalCommands(): CommandWhitelistEntry[] {
  // Linux approval commands are similar to macOS
  return getMacOSApprovalCommands();
}

/**
 * Get Windows-specific forbidden commands
 * @returns Array of Windows forbidden command whitelist entries
 */
export function getWindowsForbiddenCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'del',
      securityLevel: CommandSecurityLevel.FORBIDDEN,
      description: 'Delete files'
    },
    {
      command: 'erase',
      securityLevel: CommandSecurityLevel.FORBIDDEN,
      description: 'Delete files'
    },
    {
      command: 'format',
      securityLevel: CommandSecurityLevel.FORBIDDEN,
      description: 'Format a disk'
    },
    {
      command: 'runas',
      securityLevel: CommandSecurityLevel.FORBIDDEN,
      description: 'Execute a program as another user'
    }
  ];
}

/**
 * Get macOS-specific forbidden commands
 * @returns Array of macOS forbidden command whitelist entries
 */
export function getMacOSForbiddenCommands(): CommandWhitelistEntry[] {
  return [
    {
      command: 'rm',
      securityLevel: CommandSecurityLevel.FORBIDDEN,
      description: 'Remove files or directories'
    },
    {
      command: 'sudo',
      securityLevel: CommandSecurityLevel.FORBIDDEN,
      description: 'Execute a command as another user'
    }
  ];
}

/**
 * Get Linux-specific forbidden commands
 * @returns Array of Linux forbidden command whitelist entries
 */
export function getLinuxForbiddenCommands(): CommandWhitelistEntry[] {
  // Linux forbidden commands are similar to macOS
  return getMacOSForbiddenCommands();
}

/**
 * Get platform-specific command whitelist entries
 * @returns Array of command whitelist entries for the current platform
 */
export function getPlatformSpecificCommands(): CommandWhitelistEntry[] {
  const platform = detectPlatform();
  
  let safeCommands: CommandWhitelistEntry[] = [];
  let approvalCommands: CommandWhitelistEntry[] = [];
  let forbiddenCommands: CommandWhitelistEntry[] = [];
  
  // Add common safe commands that work across all platforms
  const commonSafeCommands = getCommonSafeCommands();
  
  // Add platform-specific commands
  switch (platform) {
    case PlatformType.WINDOWS:
      safeCommands = getWindowsSafeCommands();
      approvalCommands = getWindowsApprovalCommands();
      forbiddenCommands = getWindowsForbiddenCommands();
      break;
    case PlatformType.MACOS:
      safeCommands = getMacOSSafeCommands();
      approvalCommands = getMacOSApprovalCommands();
      forbiddenCommands = getMacOSForbiddenCommands();
      break;
    case PlatformType.LINUX:
      safeCommands = getLinuxSafeCommands();
      approvalCommands = getLinuxApprovalCommands();
      forbiddenCommands = getLinuxForbiddenCommands();
      break;
    default:
      // Use Unix-like defaults for unknown platforms
      safeCommands = getLinuxSafeCommands();
      approvalCommands = getLinuxApprovalCommands();
      forbiddenCommands = getLinuxForbiddenCommands();
  }
  
  // Combine all commands
  return [...commonSafeCommands, ...safeCommands, ...approvalCommands, ...forbiddenCommands];
}