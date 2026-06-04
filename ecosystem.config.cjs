const fs = require('fs');
const path = require('path');

// Resolve the secrets file relative to this config file's directory,
// so it works regardless of where the blog repo is deployed on the host.
const secretsPath = path.join(__dirname, '.blog-secrets');

let envPairs = {};
try {
  const raw = fs.readFileSync(secretsPath, 'utf-8');
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq !== -1) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      envPairs[key] = val;
    }
  }
} catch (err) {
  // Secrets file not found — envPairs stays empty.
  // The app will run with git backend until secrets are configured.
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
