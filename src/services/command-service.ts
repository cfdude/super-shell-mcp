import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as path from 'path';
import { getDefaultShell } from '../utils/platform-utils.js';
import { getPlatformSpecificCommands } from '../utils/command-whitelist-utils.js';

const execFileAsync = promisify(execFile);

/**
 * Command security level classification
 */
export enum CommandSecurityLevel {
  /** Safe commands that can be executed without approval */
  SAFE = 'safe',
  /** Commands that require approval before execution */
  REQUIRES_APPROVAL = 'requires_approval',
  /** Commands that are explicitly forbidden */
  FORBIDDEN = 'forbidden'
}

/**
 * Command whitelist entry
 */
export interface CommandWhitelistEntry {
  /** The command path or name */
  command: string;
  /** Security level of the command */
  securityLevel: CommandSecurityLevel;
  /** Allowed arguments (string for exact match, RegExp for pattern match) */
  allowedArgs?: Array<string | RegExp>;
  /** Description of the command for documentation */
  description?: string;
}

/**
 * Pending command awaiting approval
 */
export interface PendingCommand {
  /** Unique ID for the command */
  id: string;
  /** The command to execute */
  command: string;
  /** Arguments for the command */
  args: string[];
  /** When the command was requested */
  requestedAt: Date;
  /** Who requested the command */
  requestedBy?: string;
  /** Resolve function to call when approved */
  resolve: (value: { stdout: string; stderr: string }) => void;
  /** Reject function to call when denied */
  reject: (reason: Error) => void;
}

/**
 * Result of command execution
 */
export interface CommandResult {
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
}

/**
 * Command service configuration options
 */
export interface CommandServiceOptions {
  /** Optional shell path to use when shell execution is enabled */
  shell?: string;
  /** Whether to execute commands through a shell (default: false) */
  useShell?: boolean;
  /** Default timeout for command execution in milliseconds (default: 30000) */
  defaultTimeout?: number;
}

/**
 * Service for securely executing shell commands
 */
export class CommandService extends EventEmitter {
  /** Shell to use for commands */
  private shell: string;
  /** Whether shell parsing is enabled */
  private useShell: boolean;
  /** Command whitelist */
  private whitelist: Map<string, CommandWhitelistEntry>;
  /** Pending commands awaiting approval */
  private pendingCommands: Map<string, PendingCommand>;
  /** Default timeout for command execution in milliseconds */
  private defaultTimeout: number;

  /**
   * Create a new CommandService
   * @param options Command service configuration options
   */
  constructor(options: CommandServiceOptions = {}) {
    super();
    this.shell = options.shell || getDefaultShell();
    this.useShell = options.useShell ?? false;
    this.whitelist = new Map();
    this.pendingCommands = new Map();
    this.defaultTimeout = options.defaultTimeout ?? 30000;

    // Initialize with platform-specific commands
    this.initializeDefaultWhitelist();
  }

  /**
   * Get the current shell being used
   * @returns The shell path
   */
  public getShell(): string {
    return this.shell;
  }

  /**
   * Whether command execution uses a shell for parsing
   * @returns True if shell execution is enabled
   */
  public isShellEnabled(): boolean {
    return this.useShell;
  }

  /**
   * Initialize the default command whitelist based on the current platform
   */
  private initializeDefaultWhitelist(): void {
    // Get platform-specific commands
    const platformCommands = getPlatformSpecificCommands();
    
    // Add all commands to the whitelist
    platformCommands.forEach(entry => {
      this.whitelist.set(entry.command, entry);
    });
  }

  /**
   * Add a command to the whitelist
   * @param entry The command whitelist entry
   */
  public addToWhitelist(entry: CommandWhitelistEntry): void {
    this.whitelist.set(entry.command, entry);
  }

  /**
   * Remove a command from the whitelist
   * @param command The command to remove
   */
  public removeFromWhitelist(command: string): void {
    this.whitelist.delete(command);
  }

  /**
   * Update a command's security level
   * @param command The command to update
   * @param securityLevel The new security level
   */
  public updateSecurityLevel(command: string, securityLevel: CommandSecurityLevel): void {
    const entry = this.whitelist.get(command);
    if (entry) {
      entry.securityLevel = securityLevel;
      this.whitelist.set(command, entry);
    }
  }

  /**
   * Get all whitelisted commands
   * @returns Array of command whitelist entries
   */
  public getWhitelist(): CommandWhitelistEntry[] {
    return Array.from(this.whitelist.values());
  }

  /**
   * Get all pending commands awaiting approval
   * @returns Array of pending commands
   */
  public getPendingCommands(): PendingCommand[] {
    return Array.from(this.pendingCommands.values());
  }

  /**
   * Validate if a command and its arguments are allowed
   * @param command The command to validate
   * @param args The command arguments
   * @returns The security level of the command or null if not whitelisted
   */
  private validateCommand(command: string, args: string[]): CommandSecurityLevel | null {
    // Extract the base command (without path) using path.basename
    const baseCommand = path.basename(command);
    
    // Check if the command is in the whitelist
    const entry = this.whitelist.get(baseCommand);
    if (!entry) {
      return null;
    }

    // If the command is forbidden, return immediately
    if (entry.securityLevel === CommandSecurityLevel.FORBIDDEN) {
      return CommandSecurityLevel.FORBIDDEN;
    }

    // If there are allowed arguments defined, validate them
    if (entry.allowedArgs && entry.allowedArgs.length > 0) {
      // Check if all arguments are allowed
      const allArgsValid = args.every((arg, index) => {
        // If we have more args than allowed patterns, reject
        if (index >= (entry.allowedArgs?.length || 0)) {
          return false;
        }

        const pattern = entry.allowedArgs?.[index];
        if (!pattern) {
          return false;
        }

        // Check if the argument matches the pattern
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

  /**
   * Execute a shell command
   * @param command The command to execute
   * @param args Command arguments
   * @param options Additional options
   * @returns Promise resolving to command output
   */
  public async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      timeout?: number;
      requestedBy?: string;
    } = {}
  ): Promise<CommandResult> {
    const securityLevel = this.validateCommand(command, args);

    // If command is not whitelisted, reject
    if (securityLevel === null) {
      throw new Error(`Command not whitelisted: ${command}`);
    }

    // If command is forbidden, reject
    if (securityLevel === CommandSecurityLevel.FORBIDDEN) {
      throw new Error(`Command is forbidden: ${command}`);
    }

    // If command requires approval, add to pending queue
    if (securityLevel === CommandSecurityLevel.REQUIRES_APPROVAL) {
      return this.queueCommandForApproval(command, args, options.requestedBy);
    }

    // For safe commands, execute immediately
    try {
      const timeout = options.timeout || this.defaultTimeout;
      const { stdout, stderr } = await execFileAsync(command, args, {
        timeout,
        shell: this.useShell ? this.shell : false
      });

      return { stdout, stderr };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Command execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Queue a command for approval
   * @param command The command to queue
   * @param args Command arguments
   * @param requestedBy Who requested the command
   * @returns Promise resolving when command is approved and executed
   */
  private queueCommandForApproval(
    command: string,
    args: string[] = [],
    requestedBy?: string
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const pendingCommand: PendingCommand = {
        id,
        command,
        args,
        requestedAt: new Date(),
        requestedBy,
        resolve: (result: CommandResult) => resolve(result),
        reject: (error: Error) => reject(error)
      };

      this.pendingCommands.set(id, pendingCommand);
      
      // Emit event for pending command
      this.emit('command:pending', pendingCommand);
      
      // Set a timeout to check if the command is still pending after a while
      // This helps detect if the UI approval didn't properly trigger the approveCommand method
      setTimeout(() => {
        // If the command is still pending after the timeout
        if (this.pendingCommands.has(id)) {
          // Emit a warning event that can be handled by the client
          this.emit('command:approval_timeout', {
            commandId: id,
            message: 'Command approval timed out. If you approved this command in the UI, please use get_pending_commands and approve_command to complete the process.'
          });
        }
      }, 5000); // 5 second timeout to detect UI approval issues
    });
  }

  /**
   * Queue a command for approval without waiting for the Promise to resolve
   * @param command The command to queue
   * @param args Command arguments
   * @param requestedBy Who requested the command
   * @returns The ID of the queued command
   */
  public queueCommandForApprovalNonBlocking(
    command: string,
    args: string[] = [],
    requestedBy?: string
  ): string {
    const id = randomUUID();
    const pendingCommand: PendingCommand = {
      id,
      command,
      args,
      requestedAt: new Date(),
      requestedBy,
      resolve: () => {}, // No-op resolve function
      reject: () => {}   // No-op reject function
    };

    this.pendingCommands.set(id, pendingCommand);
    
    // Emit event for pending command
    this.emit('command:pending', pendingCommand);
    
    // Set a timeout to check if the command is still pending after a while
    setTimeout(() => {
      // If the command is still pending after the timeout
      if (this.pendingCommands.has(id)) {
        // Emit a warning event that can be handled by the client
        this.emit('command:approval_timeout', {
          commandId: id,
          message: 'Command approval timed out. If you approved this command in the UI, please use get_pending_commands and approve_command to complete the process.'
        });
      }
    }, 5000); // 5 second timeout to detect UI approval issues
    
    return id;
  }

  /**
   * Approve a pending command
   * @param commandId ID of the command to approve
   * @returns Promise resolving to command output
   */
  public async approveCommand(commandId: string): Promise<CommandResult> {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (!pendingCommand) {
      throw new Error(`No pending command with ID: ${commandId}`);
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        pendingCommand.command,
        pendingCommand.args,
        { shell: this.useShell ? this.shell : false }
      );

      // Remove from pending queue
      this.pendingCommands.delete(commandId);
      
      // Emit event for approved command
      this.emit('command:approved', { commandId, stdout, stderr });
      
      // Resolve the original promise
      pendingCommand.resolve({ stdout, stderr });
      
      return { stdout, stderr };
    } catch (error) {
      // Remove from pending queue
      this.pendingCommands.delete(commandId);
      
      // Emit event for failed command
      this.emit('command:failed', { commandId, error });
      
      if (error instanceof Error) {
        // Reject the original promise
        pendingCommand.reject(error);
        throw error;
      }
      
      const genericError = new Error('Command execution failed');
      pendingCommand.reject(genericError);
      throw genericError;
    }
  }

  /**
   * Deny a pending command
   * @param commandId ID of the command to deny
   * @param reason Reason for denial
   */
  public denyCommand(commandId: string, reason: string = 'Command denied'): void {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (!pendingCommand) {
      throw new Error(`No pending command with ID: ${commandId}`);
    }

    // Remove from pending queue
    this.pendingCommands.delete(commandId);
    
    // Emit event for denied command
    this.emit('command:denied', { commandId, reason });
    
    // Reject the original promise
    pendingCommand.reject(new Error(reason));
  }
}
