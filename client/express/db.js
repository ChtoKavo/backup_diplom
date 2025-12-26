const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '151.247.196.66',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'qweasdzxc',
  database: process.env.DB_NAME || 'AppMessage',
  port: process.env.DB_PORT || 3306, 
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 50,
  enableKeepAlive: true,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  // Добавьте опции для SSL если нужно
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

const promisePool = pool.promise();

module.exports = promisePool;