// db.js

const mysql = require('mysql2/promise');

// .env 파일에서 환경 변수 불러오기 (db.js가 server.js에서 require될 경우 dotenv는 server.js에서 처리)
// 만약 db.js가 독립적으로 실행된다면 이 라인을 추가: require('dotenv').config(); 

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;