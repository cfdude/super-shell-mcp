#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CommandService, CommandSecurityLevel } from './services/command-service.js';
import { getLogger, Logger } from './utils/logger.js';

// In ESM, __dirname is not available directly, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execFileAsync = promisify(execFile);
// Initialize the logger
// Use __dirname to get the directory of the current file
const LOG_FILE = path.join(__dirname, '../logs/super-shell-mcp.log');
console.error(`Log file path: ${LOG_FILE}`);
const logger = getLogger(LOG_FILE, true);

/**
 * SuperShellMcpServer - MCP server for executing shell commands across multiple platforms
 */
class SuperShellMcpServer {
  private server: Server;
  private commandService: CommandService;
  private pendingApprovals: Map<string, { command: string; args: string[] }>;

  constructor(options?: { shell?: string }) {
    // Initialize the command service with auto-detected or specified shell
    this.commandService = new CommandService(options?.shell);
    this.pendingApprovals = new Map();

    // Initialize the MCP server
    this.server = new Server(
      {
        name: 'super-shell-mcp',
        version: '2.0.13',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up event handlers for command service
    this.setupCommandServiceEvents();

    // Set up MCP request handlers
    this.setupRequestHandlers();
    
    // Error handling
    this.server.onerror = (error) => {
      logger.error(`[MCP Error] ${error}`);
      console.error('[MCP Error]', error);
    };
    
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal, shutting down');
      await this.server.close();
      logger.info('Server closed, exiting process');
      logger.close();
      process.exit(0);
    });
  }

  /**
   * Set up event handlers for the command service
   */
  private setupCommandServiceEvents(): void {
    this.commandService.on('command:pending', (pendingCommand) => {
      logger.info(`[Pending Command] ID: ${pendingCommand.id}, Command: ${pendingCommand.command} ${pendingCommand.args.join(' ')}`);
      console.error(`[Pending Command] ID: ${pendingCommand.id}, Command: ${pendingCommand.command} ${pendingCommand.args.join(' ')}`);
      this.pendingApprovals.set(pendingCommand.id, {
        command: pendingCommand.command,
        args: pendingCommand.args,
      });
    });

    this.commandService.on('command:approved', (data) => {
      logger.info(`[Approved Command] ID: ${data.commandId}`);
      console.error(`[Approved Command] ID: ${data.commandId}`);
      this.pendingApprovals.delete(data.commandId);
    });

    this.commandService.on('command:denied', (data) => {
      logger.info(`[Denied Command] ID: ${data.commandId}, Reason: ${data.reason}`);
      console.error(`[Denied Command] ID: ${data.commandId}, Reason: ${data.reason}`);
      this.pendingApprovals.delete(data.commandId);
    });

    this.commandService.on('command:failed', (data) => {
      logger.error(`[Failed Command] ID: ${data.commandId}, Error: ${data.error.message}`);
      console.error(`[Failed Command] ID: ${data.commandId}, Error: ${data.error.message}`);
      this.pendingApprovals.delete(data.commandId);
    });
    
    // Handle approval timeout events
    this.commandService.on('command:approval_timeout', (data) => {
      logger.error(`[Approval Timeout] ID: ${data.commandId}, Message: ${data.message}`);
      console.error(`[Approval Timeout] ID: ${data.commandId}, Message: ${data.message}`);
      // Log the timeout but keep the command in the pending queue
      // The AI assistant will need to use get_pending_commands and approve_command to proceed
    });
  }

  /**
   * Set up MCP request handlers
   */
  private setupRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_platform_info',
          description: 'Get information about the current platform and shell',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'execute_command',
          description: 'Execute a shell command on the current platform',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to execute',
              },
              args: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Command arguments',
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'get_whitelist',
          description: 'Get the list of whitelisted commands',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'add_to_whitelist',
          description: 'Add a command to the whitelist',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to whitelist',
              },
              securityLevel: {
                type: 'string',
                enum: ['safe', 'requires_approval', 'forbidden'],
                description: 'Security level for the command',
              },
              description: {
                type: 'string',
                description: 'Description of the command',
              },
            },
            required: ['command', 'securityLevel'],
          },
        },
        {
          name: 'update_security_level',
          description: 'Update the security level of a whitelisted command',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to update',
              },
              securityLevel: {
                type: 'string',
                enum: ['safe', 'requires_approval', 'forbidden'],
                description: 'New security level for the command',
              },
            },
            required: ['command', 'securityLevel'],
          },
        },
        {
          name: 'remove_from_whitelist',
          description: 'Remove a command from the whitelist',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to remove from whitelist',
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'get_pending_commands',
          description: 'Get the list of commands pending approval',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'approve_command',
          description: 'Approve a pending command',
          inputSchema: {
            type: 'object',
            properties: {
              commandId: {
                type: 'string',
                description: 'ID of the command to approve',
              },
            },
            required: ['commandId'],
          },
        },
        {
          name: 'deny_command',
          description: 'Deny a pending command',
          inputSchema: {
            type: 'object',
            properties: {
              commandId: {
                type: 'string',
                description: 'ID of the command to deny',
              },
              reason: {
                type: 'string',
                description: 'Reason for denial',
              },
            },
            required: ['commandId'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_platform_info':
            return await this.handleGetPlatformInfo();
          case 'execute_command':
            return await this.handleExecuteCommand(args);
          case 'get_whitelist':
            return await this.handleGetWhitelist();
          case 'add_to_whitelist':
            return await this.handleAddToWhitelist(args);
          case 'update_security_level':
            return await this.handleUpdateSecurityLevel(args);
          case 'remove_from_whitelist':
            return await this.handleRemoveFromWhitelist(args);
          case 'get_pending_commands':
            return await this.handleGetPendingCommands();
          case 'approve_command':
            return await this.handleApproveCommand(args);
          case 'deny_command':
            return await this.handleDenyCommand(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        if (error instanceof Error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          'An unexpected error occurred'
        );
      }
    });
  }

  /**
   * Handle execute_command tool
   */
  private async handleExecuteCommand(args: any) {
    const schema = z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
    });

    // Log the start of command execution
    logger.debug(`handleExecuteCommand called with args: ${JSON.stringify(args)}`);

    const { command, args: commandArgs = [] } = schema.parse(args);

    // Extract the base command (without path)
    const baseCommand = path.basename(command);
    
    logger.debug(`[Executing Command] Command: ${command} ${commandArgs.join(' ')}`);
    logger.debug(`Base command: ${baseCommand}`);
    
    // Check if the command requires approval before attempting execution
    const whitelist = this.commandService.getWhitelist();
    logger.debug(`Whitelist entries: ${whitelist.length}`);
    
    const whitelistEntry = whitelist.find(entry => entry.command === baseCommand);
    logger.debug(`Whitelist entry found: ${whitelistEntry ? 'yes' : 'no'}`);
    
    if (whitelistEntry) {
      logger.debug(`Security level: ${whitelistEntry.securityLevel}`);
    }
    
    if (whitelistEntry && whitelistEntry.securityLevel === CommandSecurityLevel.REQUIRES_APPROVAL) {
      logger.debug(`[Command Requires Approval] Command: ${command} ${commandArgs.join(' ')}`);
      
      // Use the non-blocking method to queue the command for approval
      const commandId = this.commandService.queueCommandForApprovalNonBlocking(command, commandArgs);
      logger.debug(`Command queued for approval with ID: ${commandId}`);
      
      // Return immediately with instructions for approval
      logger.debug(`Returning response to client`);
      return {
        content: [
          {
            type: 'text',
            text: `This command requires approval. It has been queued with ID: ${commandId}\n\nPlease approve this command in the UI or use the 'approve_command' function with this command ID.`,
          },
        ],
        isError: false, // Not an error, just needs approval
      };
    }
    
    // For safe commands or forbidden commands, use the normal execution path
    try {
      // Use the CommandService's executeCommand method
      const result = await this.commandService.executeCommand(command, commandArgs);
      
      return {
        content: [
          {
            type: 'text',
            text: result.stdout,
          },
          {
            type: 'text',
            text: result.stderr ? `Error output: ${result.stderr}` : '',
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error occurred';
      
      console.error(`[Command Execution Failed] Error: ${errorMessage}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Command execution failed: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle get_whitelist tool
   */
  private async handleGetWhitelist() {
    const whitelist = this.commandService.getWhitelist();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(whitelist, null, 2),
        },
      ],
    };
  }

  /**
   * Handle add_to_whitelist tool
   */
  private async handleAddToWhitelist(args: any) {
    const schema = z.object({
      command: z.string(),
      securityLevel: z.enum(['safe', 'requires_approval', 'forbidden']),
      description: z.string().optional(),
    });

    const { command, securityLevel, description } = schema.parse(args);

    // Map string security level to enum
    const securityLevelEnum = securityLevel === 'safe'
      ? CommandSecurityLevel.SAFE
      : securityLevel === 'requires_approval'
        ? CommandSecurityLevel.REQUIRES_APPROVAL
        : CommandSecurityLevel.FORBIDDEN;

    this.commandService.addToWhitelist({
      command,
      securityLevel: securityLevelEnum,
      description,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Command '${command}' added to whitelist with security level '${securityLevel}'`,
        },
      ],
    };
  }

  /**
   * Handle update_security_level tool
   */
  private async handleUpdateSecurityLevel(args: any) {
    const schema = z.object({
      command: z.string(),
      securityLevel: z.enum(['safe', 'requires_approval', 'forbidden']),
    });

    const { command, securityLevel } = schema.parse(args);

    // Map string security level to enum
    const securityLevelEnum = securityLevel === 'safe'
      ? CommandSecurityLevel.SAFE
      : securityLevel === 'requires_approval'
        ? CommandSecurityLevel.REQUIRES_APPROVAL
        : CommandSecurityLevel.FORBIDDEN;

    this.commandService.updateSecurityLevel(command, securityLevelEnum);

    return {
      content: [
        {
          type: 'text',
          text: `Security level for command '${command}' updated to '${securityLevel}'`,
        },
      ],
    };
  }

  /**
   * Handle remove_from_whitelist tool
   */
  private async handleRemoveFromWhitelist(args: any) {
    const schema = z.object({
      command: z.string(),
    });

    const { command } = schema.parse(args);

    this.commandService.removeFromWhitelist(command);

    return {
      content: [
        {
          type: 'text',
          text: `Command '${command}' removed from whitelist`,
        },
      ],
    };
  }

  /**
   * Handle get_platform_info tool
   */
  private async handleGetPlatformInfo() {
    const { detectPlatform, getDefaultShell, getShellSuggestions, getCommonShellLocations } = await import('./utils/platform-utils.js');
    
    const platform = detectPlatform();
    const currentShell = this.commandService.getShell();
    const suggestedShells = getShellSuggestions()[platform];
    const commonLocations = getCommonShellLocations();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            platform,
            currentShell,
            suggestedShells,
            commonLocations,
            helpMessage: `Super Shell MCP is running on ${platform} using ${currentShell}`
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_pending_commands tool
   */
  private async handleGetPendingCommands() {
    const pendingCommands = this.commandService.getPendingCommands();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pendingCommands.map(cmd => ({
            id: cmd.id,
            command: cmd.command,
            args: cmd.args,
            requestedAt: cmd.requestedAt,
            requestedBy: cmd.requestedBy,
          })), null, 2),
        },
      ],
    };
  }

  /**
   * Handle approve_command tool
   */
  private async handleApproveCommand(args: any) {
    const schema = z.object({
      commandId: z.string(),
    });

    logger.debug(`handleApproveCommand called with args: ${JSON.stringify(args)}`);

    const { commandId } = schema.parse(args);

    // Log the approval attempt
    logger.debug(`[Approval Attempt] ID: ${commandId}`);

    // Check if the command exists in our local pending approvals map
    const localPending = this.pendingApprovals.has(commandId);
    logger.debug(`Command found in local pendingApprovals: ${localPending ? 'yes' : 'no'}`);

    // Check if the command exists in the CommandService's pending queue
    const pendingCommands = this.commandService.getPendingCommands();
    logger.debug(`CommandService pending commands: ${pendingCommands.length}`);
    const pendingCommand = pendingCommands.find(cmd => cmd.id === commandId);
    logger.debug(`Command found in CommandService pending queue: ${pendingCommand ? 'yes' : 'no'}`);
    
    if (pendingCommand) {
      logger.debug(`Pending command details: ${JSON.stringify({
        id: pendingCommand.id,
        command: pendingCommand.command,
        args: pendingCommand.args,
        requestedAt: pendingCommand.requestedAt
      })}`);
    }

    try {
      logger.debug(`Calling CommandService.approveCommand with ID: ${commandId}`);
      // Use the CommandService's approveCommand method directly
      const result = await this.commandService.approveCommand(commandId);
      
      logger.debug(`[Command Approved] ID: ${commandId}, Output length: ${result.stdout.length}`);
      logger.debug(`Command output: ${result.stdout.substring(0, 100)}${result.stdout.length > 100 ? '...' : ''}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Command approved and executed successfully.\nOutput: ${result.stdout}`,
          },
          {
            type: 'text',
            text: result.stderr ? `Error output: ${result.stderr}` : '',
          },
        ],
      };
    } catch (error) {
      logger.error(`[Approval Error] ID: ${commandId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Error) {
        return {
          content: [
            {
              type: 'text',
              text: `Command approval failed: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  /**
   * Handle deny_command tool
   */
  private async handleDenyCommand(args: any) {
    const schema = z.object({
      commandId: z.string(),
      reason: z.string().optional(),
    });

    logger.debug(`handleDenyCommand called with args: ${JSON.stringify(args)}`);

    const { commandId, reason } = schema.parse(args);

    logger.debug(`[Denial Attempt] ID: ${commandId}, Reason: ${reason || 'none provided'}`);

    try {
      this.commandService.denyCommand(commandId, reason);
      logger.info(`Command denied: ID: ${commandId}, Reason: ${reason || 'none provided'}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Command denied${reason ? `: ${reason}` : ''}`,
          },
        ],
      };
    } catch (error) {
      logger.error(`[Denial Error] ID: ${commandId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Error) {
        return {
          content: [
            {
              type: 'text',
              text: `Command denial failed: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  }

  /**
   * Run the MCP server
   */
  async run() {
    logger.info('Starting Super Shell MCP server');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Super Shell MCP server running on stdio');
    console.error('Super Shell MCP server running on stdio');
    console.error(`Log file: ${LOG_FILE}`);
    logger.info(`Log file: ${LOG_FILE}`);
  }
}

// Create and run the server
const server = new SuperShellMcpServer();
server.run().catch(console.error);