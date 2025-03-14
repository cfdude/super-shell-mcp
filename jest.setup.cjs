// Mock the ESM modules with CommonJS equivalents for Jest
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { randomUUID } = require('crypto');

// Define the CommandSecurityLevel enum
const CommandSecurityLevel = {
  SAFE: 'safe',
  REQUIRES_APPROVAL: 'requires_approval',
  FORBIDDEN: 'forbidden'
};

// Define the PlatformType enum
const PlatformType = {
  WINDOWS: 'windows',
  MACOS: 'macos',
  LINUX: 'linux',
  UNKNOWN: 'unknown'
};

// Mock the platform-utils module
const detectPlatform = () => {
  const platform = process.platform;
  if (platform === 'win32') return PlatformType.WINDOWS;
  if (platform === 'darwin') return PlatformType.MACOS;
  if (platform === 'linux') return PlatformType.LINUX;
  return PlatformType.UNKNOWN;
};

const getDefaultShell = () => {
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
};

const validateShellPath = (shellPath) => {
  try {
    return fs.existsSync(shellPath) && fs.statSync(shellPath).isFile();
  } catch (error) {
    return false;
  }
};

const getShellSuggestions = () => ({
  [PlatformType.WINDOWS]: ['cmd.exe', 'powershell.exe', 'pwsh.exe'],
  [PlatformType.MACOS]: ['/bin/zsh', '/bin/bash', '/bin/sh'],
  [PlatformType.LINUX]: ['/bin/bash', '/bin/sh', '/bin/zsh'],
  [PlatformType.UNKNOWN]: ['/bin/sh']
});

const getCommonShellLocations = () => {
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
};

const getShellConfigurationHelp = () => {
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
};

// Mock the CommandService class
class CommandService extends EventEmitter {
  constructor(shell, defaultTimeout = 30000) {
    super();
    this.shell = shell || getDefaultShell();
    this.whitelist = new Map();
    this.pendingCommands = new Map();
    this.defaultTimeout = defaultTimeout;
    this.initializeDefaultWhitelist();
  }

  getShell() {
    return this.shell;
  }

  initializeDefaultWhitelist() {
    const platform = detectPlatform();
    const commands = [];
    
    // Common commands for all platforms
    commands.push({ command: 'echo', securityLevel: CommandSecurityLevel.SAFE, description: 'Print text to standard output' });
    
    // Platform-specific commands
    if (platform === PlatformType.WINDOWS) {
      commands.push({ command: 'dir', securityLevel: CommandSecurityLevel.SAFE, description: 'List directory contents' });
      commands.push({ command: 'copy', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Copy files' });
      commands.push({ command: 'mkdir', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Create directories' });
      commands.push({ command: 'del', securityLevel: CommandSecurityLevel.FORBIDDEN, description: 'Delete files' });
    } else {
      commands.push({ command: 'ls', securityLevel: CommandSecurityLevel.SAFE, description: 'List directory contents' });
      commands.push({ command: 'cat', securityLevel: CommandSecurityLevel.SAFE, description: 'Concatenate and print files' });
      commands.push({ command: 'grep', securityLevel: CommandSecurityLevel.SAFE, description: 'Search for patterns in files' });
      commands.push({ command: 'find', securityLevel: CommandSecurityLevel.SAFE, description: 'Find files in a directory hierarchy' });
      commands.push({ command: 'cd', securityLevel: CommandSecurityLevel.SAFE, description: 'Change directory' });
      commands.push({ command: 'head', securityLevel: CommandSecurityLevel.SAFE, description: 'Output the first part of files' });
      commands.push({ command: 'tail', securityLevel: CommandSecurityLevel.SAFE, description: 'Output the last part of files' });
      commands.push({ command: 'wc', securityLevel: CommandSecurityLevel.SAFE, description: 'Print newline, word, and byte counts' });
      commands.push({ command: 'mv', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Move (rename) files' });
      commands.push({ command: 'cp', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Copy files and directories' });
      commands.push({ command: 'mkdir', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Create directories' });
      commands.push({ command: 'touch', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Change file timestamps or create empty files' });
      commands.push({ command: 'chmod', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Change file mode bits' });
      commands.push({ command: 'chown', securityLevel: CommandSecurityLevel.REQUIRES_APPROVAL, description: 'Change file owner and group' });
      commands.push({ command: 'rm', securityLevel: CommandSecurityLevel.FORBIDDEN, description: 'Remove files or directories' });
      commands.push({ command: 'sudo', securityLevel: CommandSecurityLevel.FORBIDDEN, description: 'Execute a command as another user' });
    }
    
    commands.forEach(entry => {
      this.whitelist.set(entry.command, entry);
    });
  }

  addToWhitelist(entry) {
    this.whitelist.set(entry.command, entry);
  }

  removeFromWhitelist(command) {
    this.whitelist.delete(command);
  }

  updateSecurityLevel(command, securityLevel) {
    const entry = this.whitelist.get(command);
    if (entry) {
      entry.securityLevel = securityLevel;
      this.whitelist.set(command, entry);
    }
  }

  getWhitelist() {
    return Array.from(this.whitelist.values());
  }

  getPendingCommands() {
    return Array.from(this.pendingCommands.values());
  }

  validateCommand(command, args) {
    const baseCommand = path.basename(command);
    const entry = this.whitelist.get(baseCommand);
    
    if (!entry) {
      return null;
    }
    
    if (entry.securityLevel === CommandSecurityLevel.FORBIDDEN) {
      return CommandSecurityLevel.FORBIDDEN;
    }
    
    if (entry.allowedArgs && entry.allowedArgs.length > 0) {
      const allArgsValid = args.every((arg, index) => {
        if (index >= (entry.allowedArgs?.length || 0)) {
          return false;
        }
        
        const pattern = entry.allowedArgs?.[index];
        if (!pattern) {
          return false;
        }
        
        if (typeof pattern === 'string') {
          return arg === pattern;
        } else {
          return pattern.test(arg);
        }
      });
      
      if (!allArgsValid) {
        return CommandSecurityLevel.REQUIRES_APPROVAL;
      }
    }
    
    return entry.securityLevel;
  }

  async executeCommand(command, args = [], options = {}) {
    const securityLevel = this.validateCommand(command, args);
    
    if (securityLevel === null) {
      throw new Error(`Command not whitelisted: ${command}`);
    }
    
    if (securityLevel === CommandSecurityLevel.FORBIDDEN) {
      throw new Error(`Command is forbidden: ${command}`);
    }
    
    if (securityLevel === CommandSecurityLevel.REQUIRES_APPROVAL) {
      return this.queueCommandForApproval(command, args, options.requestedBy);
    }
    
    try {
      const timeout = options.timeout || this.defaultTimeout;
      const execFileAsync = promisify(execFile);
      const { stdout, stderr } = await execFileAsync(command, args, {
        timeout,
        shell: this.shell
      });
      
      return { stdout, stderr };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Command execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  queueCommandForApproval(command, args = [], requestedBy) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const pendingCommand = {
        id,
        command,
        args,
        requestedAt: new Date(),
        requestedBy,
        resolve: (result) => resolve(result),
        reject: (error) => reject(error)
      };
      
      this.pendingCommands.set(id, pendingCommand);
      this.emit('command:pending', pendingCommand);
      
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.emit('command:approval_timeout', {
            commandId: id,
            message: 'Command approval timed out. If you approved this command in the UI, please use get_pending_commands and approve_command to complete the process.'
          });
        }
      }, 5000);
    });
  }

  queueCommandForApprovalNonBlocking(command, args = [], requestedBy) {
    const id = randomUUID();
    const pendingCommand = {
      id,
      command,
      args,
      requestedAt: new Date(),
      requestedBy,
      resolve: () => {},
      reject: () => {}
    };
    
    this.pendingCommands.set(id, pendingCommand);
    this.emit('command:pending', pendingCommand);
    
    setTimeout(() => {
      if (this.pendingCommands.has(id)) {
        this.emit('command:approval_timeout', {
          commandId: id,
          message: 'Command approval timed out. If you approved this command in the UI, please use get_pending_commands and approve_command to complete the process.'
        });
      }
    }, 5000);
    
    return id;
  }

  async approveCommand(commandId) {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (!pendingCommand) {
      throw new Error(`No pending command with ID: ${commandId}`);
    }
    
    try {
      const execFileAsync = promisify(execFile);
      const { stdout, stderr } = await execFileAsync(
        pendingCommand.command,
        pendingCommand.args,
        { shell: this.shell }
      );
      
      this.pendingCommands.delete(commandId);
      this.emit('command:approved', { commandId, stdout, stderr });
      pendingCommand.resolve({ stdout, stderr });
      
      return { stdout, stderr };
    } catch (error) {
      this.pendingCommands.delete(commandId);
      this.emit('command:failed', { commandId, error });
      
      if (error instanceof Error) {
        pendingCommand.reject(error);
        throw error;
      }
      
      const genericError = new Error('Command execution failed');
      pendingCommand.reject(genericError);
      throw genericError;
    }
  }

  denyCommand(commandId, reason = 'Command denied') {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (!pendingCommand) {
      throw new Error(`No pending command with ID: ${commandId}`);
    }
    
    this.pendingCommands.delete(commandId);
    this.emit('command:denied', { commandId, reason });
    pendingCommand.reject(new Error(reason));
  }
}

// Export the mocked modules
module.exports = {
  CommandService,
  CommandSecurityLevel,
  detectPlatform,
  PlatformType,
  getDefaultShell,
  validateShellPath,
  getShellSuggestions,
  getCommonShellLocations,
  getShellConfigurationHelp
};