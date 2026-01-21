module.exports = {
  apps: [
    {
      name: 'basketball-booking-api',
      script: './server-prod.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      max_memory_restart: '500M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      max_instances: 4,
      instance_var: 'INSTANCE_ID'
    }
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/basketball-booking.git',
      path: '/home/deploy/apps/basketball-booking',
      'post-deploy': 'npm install && npm run migrate && pm2 startOrRestart ecosystem.config.js --env production'
    }
  }
};
