const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '151.241.228.247',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'AppMessage',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

module.exports = promisePool; 