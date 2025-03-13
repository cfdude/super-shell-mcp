const { CommandService, CommandSecurityLevel } = require('../build/services/command-service.js');
const { detectPlatform, PlatformType } = require('../build/utils/platform-utils.js');

describe('CommandService Platform Tests', () => {
  let commandService;
  const currentPlatform = detectPlatform();

  beforeEach(() => {
    // Create a new CommandService instance for each test with auto-detected shell
    commandService = new CommandService();
  });

  test('should initialize with platform-specific whitelist', () => {
    const whitelist = commandService.getWhitelist();
    expect(whitelist).toBeDefined();
    expect(whitelist.length).toBeGreaterThan(0);
    
    // Check for common command across all platforms
    const echoCommand = whitelist.find(entry => entry.command === 'echo');
    expect(echoCommand).toBeDefined();
    expect(echoCommand.securityLevel).toBe(CommandSecurityLevel.SAFE);
    
    // Platform-specific command checks
    if (currentPlatform === PlatformType.WINDOWS) {
      // Windows-specific commands
      const dirCommand = whitelist.find(entry => entry.command === 'dir');
      expect(dirCommand).toBeDefined();
      expect(dirCommand.securityLevel).toBe(CommandSecurityLevel.SAFE);
      
      const delCommand = whitelist.find(entry => entry.command === 'del');
      expect(delCommand).toBeDefined();
      expect(delCommand.securityLevel).toBe(CommandSecurityLevel.FORBIDDEN);
    } else {
      // Unix-like platforms (macOS, Linux)
      const lsCommand = whitelist.find(entry => entry.command === 'ls');
      expect(lsCommand).toBeDefined();
      expect(lsCommand.securityLevel).toBe(CommandSecurityLevel.SAFE);
      
      const rmCommand = whitelist.find(entry => entry.command === 'rm');
      expect(rmCommand).toBeDefined();
      expect(rmCommand.securityLevel).toBe(CommandSecurityLevel.FORBIDDEN);
    }
  });

  test('should execute platform-specific safe command', async () => {
    // Choose a command based on platform
    const command = currentPlatform === PlatformType.WINDOWS ? 'echo' : 'echo';
    const args = ['test'];
    
    const result = await commandService.executeCommand(command, args);
    
    expect(result).toBeDefined();
    expect(result.stdout.trim()).toBe('test');
  });

  test('should reject platform-specific forbidden command', async () => {
    // Choose a forbidden command based on platform
    const command = currentPlatform === PlatformType.WINDOWS ? 'del' : 'rm';
    const args = currentPlatform === PlatformType.WINDOWS ? ['test.txt'] : ['-rf', 'test'];
    
    await expect(commandService.executeCommand(command, args)).rejects.toThrow();
  });

  test('should queue platform-specific command requiring approval', async () => {
    // Set up event listener to capture pending command
    let pendingCommandId = null;
    commandService.on('command:pending', (pendingCommand) => {
      pendingCommandId = pendingCommand.id;
    });
    
    // Choose a command requiring approval based on platform
    // Use a command that doesn't actually create anything to avoid test failures
    const command = currentPlatform === PlatformType.WINDOWS ? 'copy' : 'cp';
    const args = ['nonexistent-file', 'nonexistent-copy'];
    
    // Execute a command that requires approval
    const executePromise = commandService.executeCommand(command, args);
    
    // Wait a bit for the event to fire
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if we got a pending command
    expect(pendingCommandId).not.toBeNull();
    
    // Get pending commands
    const pendingCommands = commandService.getPendingCommands();
    expect(pendingCommands.length).toBe(1);
    expect(pendingCommands[0].id).toBe(pendingCommandId);
    
    // Approve the command
    const approvePromise = commandService.approveCommand(pendingCommandId);
    
    try {
      // Wait for both promises to resolve
      await Promise.all([executePromise, approvePromise]);
    } catch (error) {
      // Expect an error since we're trying to copy a non-existent file
      // This is expected and we can ignore it
    }
    
    // Check that there are no more pending commands
    expect(commandService.getPendingCommands().length).toBe(0);
  });

  test('should deny platform-specific command requiring approval', async () => {
    // Set up event listener to capture pending command
    let pendingCommandId = null;
    commandService.on('command:pending', (pendingCommand) => {
      pendingCommandId = pendingCommand.id;
    });
    
    // Choose a command requiring approval based on platform
    const command = currentPlatform === PlatformType.WINDOWS ? 'mkdir' : 'mkdir';
    const args = ['test-dir'];
    
    // Execute a command that requires approval
    const executePromise = commandService.executeCommand(command, args);
    
    // Wait a bit for the event to fire
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if we got a pending command
    expect(pendingCommandId).not.toBeNull();
    
    // Deny the command
    commandService.denyCommand(pendingCommandId, 'Test denial');
    
    // The execute promise should be rejected
    await expect(executePromise).rejects.toThrow('Test denial');
    
    // Check that there are no more pending commands
    expect(commandService.getPendingCommands().length).toBe(0);
  });
});