module.exports = {
  apps: [
    {
      name: 'sams-blog',
      script: './build/index.js',
      instances: 1, // Change if running on multi-core CPU
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
