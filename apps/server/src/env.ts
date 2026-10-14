import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Imported first from main.ts so the variables are set before any module reads them.
const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
