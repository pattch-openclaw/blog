const dotenv = require('dotenv');
dotenv.config({ path: '/Users/samuelsampson/Coding/openclaw-blog/.blog-secrets' });

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
        BODY_SIZE_LIMIT: '52428800'
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
        BODY_SIZE_LIMIT: '52428800'
      }
    }
  ]
};
