module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 3002',
      cwd: '/root/client/client',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/root/.pm2/logs/frontend-error.log',
      out_file: '/root/.pm2/logs/frontend-out.log'
    }
  ]
};
