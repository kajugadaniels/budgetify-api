module.exports = {
  apps: [
    {
      name: 'budgetify-api',
      cwd: '/var/www/budgetify/api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      merge_logs: true,
      output: '/var/www/budgetify/shared/logs/budgetify-api.out.log',
      error: '/var/www/budgetify/shared/logs/budgetify-api.error.log',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
