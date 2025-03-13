# Super Shell MCP Server

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
- Approval workflow for potentially dangerous commands
- Comprehensive command management tools
- Platform information tool for diagnostics

## Installation

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

#### Roo Code Configuration

Add the following to your Roo Code MCP settings configuration file (located at `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`):

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

## Using as an npm Package

To use the Super Shell MCP server with `npx` similar to other MCP servers like Brave Search, you can publish it to npm or use it directly from GitHub.

### Configuration with npx

Add the following to your MCP settings configuration:

#### Roo Code
```json
"super-shell": {
  "command": "npx",
  "args": [
    "-y",
    "github:cfdude/super-shell-mcp"
  ],
  "alwaysAllow": [],
  "disabled": false
}
```

#### Claude Desktop
```json
"super-shell": {
  "command": "npx",
  "args": [
    "-y",
    "github:cfdude/super-shell-mcp"
  ],
  "alwaysAllow": false,
  "disabled": false
}
```

This will automatically download and run the server without requiring a manual clone and build process.

### Publishing to npm

If you want to publish your own version to npm:

1. Update the package.json with your details
2. Add a "bin" field to package.json:
   ```json
   "bin": {
     "super-shell-mcp": "./build/index.js"
   }
   ```
3. Publish to npm:
   ```bash
   npm publish
   ```

Then you can use it in your MCP configuration:

#### Roo Code
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

#### Claude Desktop
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

3. **Whitelist Management**
   - **Issue**: Need to add custom commands to whitelist
   - **Solution**: Use the `add_to_whitelist` tool to add commands specific to your environment

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.