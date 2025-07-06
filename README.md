[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cfdude-super-shell-mcp-badge.png)](https://mseep.ai/app/cfdude-super-shell-mcp)

# Super Shell MCP Server

[![smithery badge](https://smithery.ai/badge/@cfdude/super-shell-mcp)](https://smithery.ai/package/@cfdude/super-shell-mcp)

An MCP (Model Context Protocol) server for executing shell commands across multiple platforms (Windows, macOS, Linux). This server provides a secure way to execute shell commands with built-in whitelisting and approval mechanisms.

## Features

- Execute shell commands through MCP on Windows, macOS, and Linux
- Automatic platform detection and shell selection
- Support for multiple shells:
  - **Windows**: cmd.exe, PowerShell
  - **macOS**: zsh, bash, sh
  - **Linux**: bash, sh, zsh
- Command whitelisting with security levels:
  - **Safe**: Commands that can be executed without approval
  - **Requires Approval**: Commands that need explicit approval before execution
  - **Forbidden**: Commands that are explicitly blocked
- Platform-specific command whitelists
- Non-blocking approval workflow for potentially dangerous commands
- Comprehensive logging system with file-based logs
- Comprehensive command management tools
- Platform information tool for diagnostics

## Installation

### Installing via Smithery

To install Super Shell MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/package/@cfdude/super-shell-mcp):

```bash
npx -y @smithery/cli install @cfdude/super-shell-mcp --client claude
```

### Installing Manually

```bash
# Clone the repository
git clone https://github.com/cfdude/super-shell-mcp.git
cd super-shell-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the Server

```bash
npm start
```

Or directly:

```bash
node build/index.js
```

### Configuring in Roo Code and Claude Desktop

Both Roo Code and Claude Desktop use a similar configuration format for MCP servers. Here's how to set up the Super Shell MCP server:

#### Option 1: Using NPX (Recommended)

The easiest way to use Super Shell MCP is with NPX, which automatically installs and runs the package from npm without requiring manual setup. The package is available on NPM at [https://www.npmjs.com/package/super-shell-mcp](https://www.npmjs.com/package/super-shell-mcp).

##### Roo Code Configuration with NPX

```json
"super-shell": {
  "command": "npx",
  "args": [
    "-y",
    "super-shell-mcp"
  ],
  "alwaysAllow": [],
  "disabled": false
}
```

##### Claude Desktop Configuration with NPX

```json
"super-shell": {
  "command": "npx",
  "args": [
    "-y",
    "super-shell-mcp"
  ],
  "alwaysAllow": false,
  "disabled": false
}
```

#### Option 2: Using Local Installation

If you prefer to use a local installation, add the following to your Roo Code MCP settings configuration file (located at `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`):

```json
"super-shell": {
  "command": "node",
  "args": [
    "/path/to/super-shell-mcp/build/index.js"
  ],
  "alwaysAllow": [],
  "disabled": false
}
```

You can optionally specify a custom shell by adding a shell parameter:

```json
"super-shell": {
  "command": "node",
  "args": [
    "/path/to/super-shell-mcp/build/index.js",
    "--shell=/usr/bin/bash"
  ],
  "alwaysAllow": [],
  "disabled": false
}
```
Windows 11 example
```json
"super-shell": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "super-shell-mcp",
        "C:\\Users\\username"
      ],
      "alwaysAllow": [],
      "disabled": false
    }
```

#### Claude Desktop Configuration

Add the following to your Claude Desktop configuration file (located at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
"super-shell": {
  "command": "node",
  "args": [
    "/path/to/super-shell-mcp/build/index.js"
  ],
  "alwaysAllow": false,
  "disabled": false
}
```
For Windows users, the configuration file is typically located at `%APPDATA%\Claude\claude_desktop_config.json`.

### Platform-Specific Configuration

#### Windows
- Default shell: cmd.exe (or PowerShell if available)
- Configuration paths:
  - Roo Code: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
  - Claude Desktop: `%APPDATA%\Claude\claude_desktop_config.json`
- Shell path examples:
  - cmd.exe: `C:\\Windows\\System32\\cmd.exe`
  - PowerShell: `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
  - PowerShell Core: `C:\\Program Files\\PowerShell\\7\\pwsh.exe`

#### macOS
- Default shell: /bin/zsh
- Configuration paths:
  - Roo Code: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
  - Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Shell path examples:
  - zsh: `/bin/zsh`
  - bash: `/bin/bash`
  - sh: `/bin/sh`

#### Linux
- Default shell: /bin/bash (or $SHELL environment variable)
- Configuration paths:
  - Roo Code: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
  - Claude Desktop: `~/.config/Claude/claude_desktop_config.json`
- Shell path examples:
  - bash: `/bin/bash`
  - sh: `/bin/sh`
  - zsh: `/usr/bin/zsh`


You can optionally specify a custom shell:

```json
"super-shell": {
  "command": "node",
  "args": [
    "/path/to/super-shell-mcp/build/index.js",
    "--shell=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
  ],
  "alwaysAllow": false,
  "disabled": false
}
```

Replace `/path/to/super-shell-mcp` with the actual path where you cloned the repository.

> **Note**:
> - For Roo Code: Setting `alwaysAllow` to an empty array `[]` is recommended for security reasons, as it will prompt for approval before executing any commands. If you want to allow specific commands without prompting, you can add their names to the array, for example: `"alwaysAllow": ["execute_command", "get_whitelist"]`.
> - For Claude Desktop: Setting `alwaysAllow` to `false` is recommended for security reasons. Claude Desktop uses a boolean value instead of an array, where `false` means all commands require approval and `true` means all commands are allowed without prompting.
>
> **Important**: The `alwaysAllow` parameter is processed by the MCP client (Roo Code or Claude Desktop), not by the Super Shell MCP server itself. The server will work correctly with either format, as the client handles the approval process before sending requests to the server.

### Available Tools
The server exposes the following MCP tools:

#### `get_platform_info`

Get information about the current platform and shell.

```json
{}
```


#### `execute_command`

Execute a shell command on the current platform.

```json
{
  "command": "ls",
  "args": ["-la"]
}
```

#### `get_whitelist`

Get the list of whitelisted commands.

```json
{}
```

#### `add_to_whitelist`

Add a command to the whitelist.

```json
{
  "command": "python3",
  "securityLevel": "safe",
  "description": "Run Python 3 scripts"
}
```

#### `update_security_level`

Update the security level of a whitelisted command.

```json
{
  "command": "python3",
  "securityLevel": "requires_approval"
}
```

#### `remove_from_whitelist`

Remove a command from the whitelist.

```json
{
  "command": "python3"
}
```

#### `get_pending_commands`

Get the list of commands pending approval.

```json
{}
```

#### `approve_command`

Approve a pending command.

```json
{
  "commandId": "command-uuid-here"
}
```

#### `deny_command`

Deny a pending command.

```json
{
  "commandId": "command-uuid-here",
  "reason": "This command is potentially dangerous"
}
```

## Default Whitelisted Commands

The server includes platform-specific command whitelists that are automatically selected based on the detected platform.

### Common Safe Commands (All Platforms)

- `echo` - Print text to standard output

### Unix-like Safe Commands (macOS/Linux)

- `ls` - List directory contents
- `pwd` - Print working directory
- `echo` - Print text to standard output
- `cat` - Concatenate and print files
- `grep` - Search for patterns in files
- `find` - Find files in a directory hierarchy
- `cd` - Change directory
- `head` - Output the first part of files
- `tail` - Output the last part of files
- `wc` - Print newline, word, and byte counts

### Windows-specific Safe Commands

- `dir` - List directory contents
- `type` - Display the contents of a text file
- `findstr` - Search for strings in files
- `where` - Locate programs
- `whoami` - Display current user
- `hostname` - Display computer name
- `ver` - Display operating system version
### Commands Requiring Approval

#### Windows Commands Requiring Approval

- `copy` - Copy files
- `move` - Move files
- `mkdir` - Create directories
- `rmdir` - Remove directories
- `rename` - Rename files
- `attrib` - Change file attributes

#### Unix Commands Requiring Approval


- `mv` - Move (rename) files
- `cp` - Copy files and directories
- `mkdir` - Create directories
- `touch` - Change file timestamps or create empty files
- `chmod` - Change file mode bits
- `chown` - Change file owner and group

### Forbidden Commands

#### Windows Forbidden Commands

- `del` - Delete files
- `erase` - Delete files
- `format` - Format a disk
- `runas` - Execute a program as another user

#### Unix Forbidden Commands

- `rm` - Remove files or directories
- `sudo` - Execute a command as another user

## Security Considerations

- All commands are executed with the permissions of the user running the MCP server
- Commands requiring approval are held in a queue until explicitly approved
- Forbidden commands are never executed
- The server uses Node.js's `execFile` instead of `exec` to prevent shell injection
- Arguments are validated against allowed patterns when specified

## Extending the Whitelist

You can extend the whitelist by using the `add_to_whitelist` tool. For example:

```json
{
  "command": "npm",
  "securityLevel": "requires_approval",
  "description": "Node.js package manager"
}
```

## NPM Package Information

Super Shell MCP is available as an npm package at [https://www.npmjs.com/package/super-shell-mcp](https://www.npmjs.com/package/super-shell-mcp).

### Benefits of Using NPX

Using the NPX method (as shown in Option 1 of the Configuration section) offers several advantages:

1. **No Manual Setup**: No need to clone the repository, install dependencies, or build the project
2. **Automatic Updates**: Always uses the latest published version
3. **Cross-Platform Compatibility**: Works the same way on Windows, macOS, and Linux
4. **Simplified Configuration**: Shorter configuration with no absolute paths
5. **Reduced Maintenance**: No local files to manage or update

### Using from GitHub

If you prefer to use the latest development version directly from GitHub:

```json
"super-shell": {
  "command": "npx",
  "args": [
    "-y",
    "github:cfdude/super-shell-mcp"
  ],
  "alwaysAllow": [],  // For Roo Code
  "disabled": false
}
```

### Publishing Your Own Version

If you want to publish your own modified version to npm:

1. Update the package.json with your details
2. Ensure the "bin" field is properly configured:
   ```json
   "bin": {
     "super-shell-mcp": "./build/index.js"
   }
   ```
3. Publish to npm:
   ```bash
   npm publish
   ```

## NPX Best Practices

For optimal integration with MCP clients using NPX, this project follows these best practices:

1. **Executable Entry Point**: The main file includes a shebang line (`#!/usr/bin/env node`) and is made executable during build.

2. **Package Configuration**:
   - `"type": "module"` - Ensures ES Modules are used
   - `"bin"` field - Maps the command name to the entry point
   - `"files"` field - Specifies which files to include when publishing
   - `"prepare"` script - Ensures compilation happens on install

3. **TypeScript Configuration**:
   - `"module": "NodeNext"` - Proper ES Modules support
   - `"moduleResolution": "NodeNext"` - Consistent with ES Modules

4. **Automatic Installation and Execution**:
   - The MCP client configuration uses `npx -y` to automatically install and run the package
   - No terminal window is tied up as the process runs in the background

5. **Publishing Process**:
   ```bash
   # Update version in package.json
   npm version patch  # or minor/major as appropriate
   
   # Build and publish
   npm publish
   ```

These practices ensure the MCP server can be started automatically by the MCP client without requiring a separate terminal window, improving user experience and operational efficiency.

## Troubleshooting

### Cross-Platform Issues

#### Windows-Specific Issues

1. **PowerShell Script Execution Policy**
   - **Issue**: PowerShell may block script execution with the error "Execution of scripts is disabled on this system"
   - **Solution**: Run PowerShell as Administrator and execute `Set-ExecutionPolicy RemoteSigned` or use the `-ExecutionPolicy Bypass` parameter when configuring the shell

2. **Path Separators**
   - **Issue**: Windows uses backslashes (`\`) in paths, which need to be escaped in JSON
   - **Solution**: Use double backslashes (`\\`) in JSON configuration files, e.g., `C:\\Windows\\System32\\cmd.exe`

3. **Command Not Found**
   - **Issue**: Windows doesn't have Unix commands like `ls`, `grep`, etc.
   - **Solution**: Use Windows equivalents (`dir` instead of `ls`, `findstr` instead of `grep`)

#### macOS/Linux-Specific Issues

1. **Shell Permissions**
   - **Issue**: Permission denied when executing commands
   - **Solution**: Ensure the shell has appropriate permissions with `chmod +x /path/to/shell`

2. **Environment Variables**
   - **Issue**: Environment variables not available in MCP server
   - **Solution**: Set environment variables in the shell's profile file (`.zshrc`, `.bashrc`, etc.)

### General Troubleshooting

1. **Shell Detection Issues**
   - **Issue**: Server fails to detect the correct shell
   - **Solution**: Explicitly specify the shell path in the configuration

2. **Command Execution Timeout**
   - **Issue**: Commands taking too long and timing out
   - **Solution**: Increase the timeout value in the command service constructor

### Logging System

The server includes a comprehensive logging system that writes logs to a file for easier debugging and monitoring:

1. **Log File Location**
   - Default: `logs/super-shell-mcp.log` in the server's directory
   - The logs directory is created automatically and tracked by Git (with a .gitkeep file)
   - Log files themselves are excluded from Git via .gitignore
   - Contains detailed information about server operations, command execution, and approval workflow

2. **Log Levels**
   - **INFO**: General operational information
   - **DEBUG**: Detailed debugging information
   - **ERROR**: Error conditions and exceptions

3. **Viewing Logs**
   - Use standard file viewing commands to check logs:
     ```bash
     # View the entire log
     cat logs/super-shell-mcp.log
     
     # Follow log updates in real-time
     tail -f logs/super-shell-mcp.log
     ```

4. **Log Content**
   - Server startup and configuration
   - Command execution requests and results
   - Approval workflow events (pending, approved, denied)
   - Error conditions and troubleshooting information

3. **Whitelist Management**
   - **Issue**: Need to add custom commands to whitelist
   - **Solution**: Use the `add_to_whitelist` tool to add commands specific to your environment

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
