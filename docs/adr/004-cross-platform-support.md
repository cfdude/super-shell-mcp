# ADR 004: Cross-Platform Shell Support

## Status

Accepted

## Context

The original Mac Shell MCP server was designed specifically for macOS with ZSH shell. However, there's a need to support multiple platforms (Windows, macOS, Linux) and various shells (Bash, ZSH, PowerShell, CMD, etc.) to make the tool more widely usable.

Key limitations in the original implementation:

1. **Shell Path Hardcoding**: The server was hardcoded to use `/bin/zsh` as the default shell
2. **Command Set Assumptions**: The default whitelist included macOS/Unix commands that don't exist natively on Windows
3. **Path Handling**: Command validation extracted the base command by splitting on '/' which doesn't work for Windows backslash paths
4. **Naming and Documentation**: The server was explicitly named "mac-shell-mcp" and documented for macOS

## Decision

We will refactor the server to be platform-agnostic with the following changes:

1. **Platform Detection**: Implement platform detection using `process.platform` to identify the current operating system
2. **Shell Selection**: Select appropriate default shell based on platform and allow shell path to be configurable
3. **Path Normalization**: Use Node.js `path` module for cross-platform path handling
4. **Platform-Specific Command Whitelists**: Implement separate command whitelists for each supported platform
5. **Rename and Rebrand**: Rename to "super-shell-mcp" and update documentation to reflect cross-platform support

## Consequences

### Positive

- Works across Windows, macOS, and Linux
- Supports various shells based on user preference
- Maintains the same security model across platforms
- Provides consistent experience regardless of platform
- Increases the potential user base by supporting multiple platforms

### Negative

- Increased complexity in command handling
- Need to maintain separate command whitelists for each platform
- Some commands may behave differently across platforms
- Testing becomes more complex, requiring validation on multiple platforms

## Implementation

The implementation uses a platform detection utility:

```typescript
export function detectPlatform(): PlatformType {
  const platform = process.platform;
  
  if (platform === 'win32') return PlatformType.WINDOWS;
  if (platform === 'darwin') return PlatformType.MACOS;
  if (platform === 'linux') return PlatformType.LINUX;
  
  return PlatformType.UNKNOWN;
}
```

Platform-specific shell detection:

```typescript
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
```

Platform-specific command whitelists:

```typescript
private initializeDefaultWhitelist(): void {
  const platformCommands = getPlatformSpecificCommands();
  
  platformCommands.forEach(entry => {
    this.whitelist.set(entry.command, entry);
  });
}
```

Cross-platform path handling:

```typescript
private validateCommand(command: string, args: string[]): CommandSecurityLevel | null {
  // Extract the base command (without path) using path.basename
  const baseCommand = path.basename(command);
  
  // Check if the command is in the whitelist
  const entry = this.whitelist.get(baseCommand);
  if (!entry) {
    return null;
  }
  
  // Rest of validation...
}