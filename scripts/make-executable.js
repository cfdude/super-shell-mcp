import fs from 'fs';
import { platform } from 'os';

const isWindows = platform() === 'win32';
const indexPath = './build/index.js';

if (isWindows) {
  console.log('Windows detected, skipping chmod operation');
} else {
  try {
    // On Unix-like systems, make the file executable
    fs.chmodSync(indexPath, '755');
    console.log(`Made ${indexPath} executable`);
  } catch (error) {
    console.error(`Error making ${indexPath} executable:`, error);
    process.exit(1);
  }
}