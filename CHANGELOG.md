# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.15] - 2025-09-17

### Security
- Disabled shell parsing by default to prevent command injection in `execute_command`
- Added explicit environment-controlled opt-in for legacy shell mode

### Added
- New `CommandServiceOptions` API surface (`useShell`, `defaultTimeout`) and `isShellEnabled`
- Environment variable support for shell mode/timeout configuration
- Documentation updates covering safe defaults and opt-in shell behaviour

### Fixed
- Updated tests to cover literal argument handling and shell opt-in paths
- Manifest now exposes shell parsing toggle to MCP clients

## [2.0.14] - 2025-09-17

### Changed
- Internal release iteration superseded by 2.0.15

## [2.0.13] - 2025-03-14

### Fixed
 - Updated the package.json file to include the proper github repo information

## [2.0.12] - 2025-03-14

### Changed
- Converted project from CommonJS to ESM module system
- Updated TypeScript configuration to use NodeNext module system
- Added ESM-compatible workaround for `__dirname` in ESM context

### Fixed
- Fixed Jest test suite to work with ESM modules
- Added CommonJS-compatible mock modules for testing
- Updated module imports to use ESM syntax with .js extensions

## [2.0.11] - 2025-03-14

### Added
- Published package to npm at https://www.npmjs.com/package/super-shell-mcp
- Updated README.md to highlight NPX installation method as the recommended approach
- Added benefits of using NPX in documentation
- Enhanced configuration examples for easier setup

### Changed
- Reorganized documentation to prioritize NPX installation method
- Simplified GitHub installation instructions
- Improved package publishing documentation

## [2.0.10] - 2025-03-14

### Added
- Added logs directory with .gitkeep file to ensure logs directory is tracked by Git
- Enhanced error handling for command approval process
- Improved logging for command execution and approval workflow

### Fixed
- Fixed version inconsistencies across package.json, package-lock.json, and src/index.ts
- Improved documentation for logging system
- Enhanced cross-platform compatibility for log file paths

## [2.0.9] - 2025-03-14

### Added
- Added additional logging for command approval workflow
- Improved error handling for command execution
- Enhanced debugging capabilities with more detailed logs

### Fixed
- Fixed minor issues with command approval workflow
- Improved reliability of command execution across platforms
- Enhanced error messages for better troubleshooting

## [2.0.8] - 2025-03-13

### Added
- Added comprehensive logging system with file-based logs
- Implemented non-blocking command approval workflow
- Added new `queueCommandForApprovalNonBlocking` method to CommandService

### Fixed
- Fixed timeout issue with commands requiring approval by implementing non-blocking approval workflow
- Improved user experience by providing immediate feedback for commands requiring approval
- Enhanced error handling for commands requiring approval
- Fixed issue where pending commands would cause client timeouts

## [2.0.7] - 2025-03-13

### Fixed
- Fixed timeout issue when using the "Approve" button in Roo Code client
- Improved error handling in `handleApproveCommand` method to bypass Promise resolution mechanism
- Added detailed logging for command approval process to aid debugging
- Enhanced direct command execution in approval workflow to prevent timeouts
- Fixed TypeScript errors related to error handling in command execution

## [2.0.6] - 2025-03-13

### Fixed
- Fixed command approval workflow to prevent timeout errors
- Added immediate detection of commands requiring approval
- Improved error messages for commands requiring approval with clear instructions
- Added direct guidance to use get_pending_commands and approve_command functions

## [2.0.5] - 2025-03-13

### Added
- Improved command approval workflow with timeout detection
- Added guidance for AI assistants when command approval times out
- Enhanced error messages for commands requiring approval

### Fixed
- Module compatibility issues between ES Modules and CommonJS in tests
- Updated TypeScript configuration to use CommonJS module system for better test compatibility
- Removed unnecessary CommonJS compatibility code from source files
- Changed package.json "type" from "module" to "commonjs" for consistent module system

## [2.0.4] - 2025-03-13

### Fixed
- Module compatibility issues between ES Modules and CommonJS in tests
- Updated TypeScript configuration to use CommonJS module system for better test compatibility
- Removed unnecessary CommonJS compatibility code from source files
- Changed package.json "type" from "module" to "commonjs" for consistent module system

## [2.0.3] - 2025-03-12

### Added
- NPX best practices documentation in README.md
- Improved package.json configuration for NPX compatibility

### Changed
- Updated TypeScript configuration to use NodeNext module system for better ES Modules support
- Added prepare script to ensure compilation happens on install
- Added files field to package.json to specify which files to include when publishing
- Simplified build script to use chmod directly instead of custom script

## [2.0.2] - 2025-03-12

### Fixed
- Test suite compatibility with cross-platform environments
- Module system compatibility between ESM and CommonJS
- Fixed platform-specific test cases to work on all operating systems
- Updated TypeScript configuration for better CommonJS compatibility
- Improved test reliability by using non-filesystem-modifying commands

## [2.0.1] - 2025-03-12

### Added
- Platform-aware test suite that adapts to the current operating system
- Cross-platform build script that works on Windows, macOS, and Linux
- Enhanced platform-specific documentation with configuration examples
- Troubleshooting guide for common cross-platform issues
- Detailed shell path examples for each supported platform

### Fixed
- Build script compatibility with Windows (removed Unix-specific chmod)
- Test suite compatibility with Windows command sets
- Path handling in shell validation for Windows paths

## [2.0.0] - 2025-03-12

### Added
- Cross-platform support for Windows, macOS, and Linux
- Platform detection using `process.platform`
- Auto-detection of appropriate shell based on platform
- Platform-specific command whitelists
- New `get_platform_info` tool to retrieve platform and shell information
- Support for Windows shells (cmd.exe, PowerShell)
- Support for Linux shells (bash, sh)
- New ADR for cross-platform support

### Changed
- Renamed from "mac-shell-mcp" to "super-shell-mcp"
- Updated path handling to use Node.js path module for cross-platform compatibility
- Modified command validation to work with Windows paths
- Updated documentation to reflect cross-platform support
- Refactored code to be platform-agnostic
- Made shell configurable with auto-detection as fallback

## [1.0.3] - 2025-03-12

### Fixed

- Improved documentation for Claude Desktop configuration which uses boolean value for `alwaysAllow`
- Added separate configuration examples for Roo Code and Claude Desktop
- Clarified that Roo Code uses array format while Claude Desktop uses boolean format
- Added explicit note that the `alwaysAllow` parameter is processed by the MCP client, not the server

## [1.0.2] - 2025-03-12

### Fixed

- Fixed MCP configuration format to use an empty array `[]` for `alwaysAllow` instead of `false`
- Updated all configuration examples in README.md to use the correct format
- Fixed error "Invalid config: missing or invalid parameters" when adding to MCP settings

## [1.0.1] - 2025-03-12

### Added

- Support for using the server as an npm package with npx
- Added bin field to package.json for CLI usage
- Improved MCP configuration instructions for Roo Code and Claude Desktop
- Added examples for using with npx directly from GitHub

## [1.0.0] - 2025-03-12

### Added

- Initial release of the Mac Shell MCP Server
- Command execution service with ZSH shell support
- Command whitelisting system with three security levels:
  - Safe commands (no approval required)
  - Commands requiring approval
  - Forbidden commands
- Pre-configured whitelist with common safe commands
- Approval workflow for potentially dangerous commands
- MCP tools for command execution and whitelist management:
  - `execute_command`: Execute shell commands
  - `get_whitelist`: Get the list of whitelisted commands
  - `add_to_whitelist`: Add a command to the whitelist
  - `update_security_level`: Update a command's security level
  - `remove_from_whitelist`: Remove a command from the whitelist
  - `get_pending_commands`: Get commands pending approval
  - `approve_command`: Approve a pending command
  - `deny_command`: Deny a pending command
- Comprehensive test suite for the command service
- Example client implementation
- Documentation and configuration examples