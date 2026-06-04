const fs = require('fs');

// Read secrets at module load time so they're available for both PM2 app configs.
// The file exists on the host machine but not in this repo.
const secretsPath = '/Users/samuelsampson/Coding/openclaw-blog/.blog-secrets';
let envPairs = {};
try {
  const raw = fs.readFileSync(secretsPath, 'utf-8');
  raw.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const eq = line.indexOf('=');
      if (eq !== -1) {
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        envPairs[key] = val;
      }
    }
  });
} catch {
  // Secrets file not found locally; empty envPairs (safe fallback).
}

module.exports = {
  apps: [
    {
      name: 'sams-blog-prod',
      script: './build/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SHOW_DRAFTS: 'false',
        BODY_SIZE_LIMIT: '52428800',
        SUPABASE_URL: envPairs.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: envPairs.SUPABASE_ANON_KEY || ''
      }
    },
    {
      name: 'sams-blog-staging',
      script: './build/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SHOW_DRAFTS: 'true',
        BODY_SIZE_LIMIT: '52428800',
        SUPABASE_URL: envPairs.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: envPairs.SUPABASE_ANON_KEY || ''
      }
    }
  ]
};
