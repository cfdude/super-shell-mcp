import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple logging utility that writes to a file
 */
export class Logger {
  private logFile: string;
  private enabled: boolean;
  private fileStream: fs.WriteStream | null = null;

  /**
   * Create a new logger
   * @param logFile Path to the log file
   * @param enabled Whether logging is enabled
   */
  constructor(logFile: string, enabled = true) {
    this.logFile = logFile;
    this.enabled = enabled;
    
    if (this.enabled) {
      // Create the directory if it doesn't exist
      const logDir = path.dirname(this.logFile);
      console.error(`Creating log directory: ${logDir}`);
      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      } catch (error) {
        console.error(`Error creating log directory: ${error}`);
        // Fall back to a directory we know exists
        this.logFile = './super-shell-mcp.log';
        console.error(`Falling back to log file: ${this.logFile}`);
      }
      
      // Create or truncate the log file
      this.fileStream = fs.createWriteStream(this.logFile, { flags: 'w' });
      
      // Write a header to the log file
      this.log('INFO', `Logging started at ${new Date().toISOString()}`);
    }
  }

  /**
   * Log a message
   * @param level Log level (INFO, DEBUG, ERROR, etc.)
   * @param message Message to log
   */
  public log(level: string, message: string): void {
    if (!this.enabled || !this.fileStream) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    this.fileStream.write(logMessage);
  }

  /**
   * Log an info message
   * @param message Message to log
   */
  public info(message: string): void {
    this.log('INFO', message);
  }

  /**
   * Log a debug message
   * @param message Message to log
   */
  public debug(message: string): void {
    this.log('DEBUG', message);
  }

  /**
   * Log an error message
   * @param message Message to log
   */
  public error(message: string): void {
    this.log('ERROR', message);
  }

  /**
   * Close the logger
   */
  public close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }
}

// Create a singleton logger instance
let loggerInstance: Logger | null = null;

/**
 * Get the logger instance
 * @param logFile Path to the log file
 * @param enabled Whether logging is enabled
 * @returns Logger instance
 */
export function getLogger(logFile?: string, enabled?: boolean): Logger {
  if (!loggerInstance && logFile) {
    loggerInstance = new Logger(logFile, enabled);
  }
  
  if (!loggerInstance) {
    throw new Error('Logger not initialized');
  }
  
  return loggerInstance;
}