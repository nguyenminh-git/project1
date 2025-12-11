// src/db.js
import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

// Debug xem env có đọc được không
console.log('[PG ENV]', {
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  db: process.env.PG_DB,
  user: process.env.PG_USER,
  pwd: process.env.PG_PWD,
  pwdType: typeof process.env.PG_PWD,
});

// Tạo pool PostgreSQL
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PWD,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Kết nối thử để log trạng thái
pool.connect()
  .then(client => {
    console.log('✅ [DB] Connected to PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('❌ [DB] Connection error (PostgreSQL):', err.message);
  });

/**
 * Hàm query dùng chung cho toàn backend
 * @param {string} q      - câu SQL, dùng $1, $2, ...
 * @param {Array}  params - mảng giá trị truyền vào
 */
export async function query(q, params = []) {
  const result = await pool.query(q, params);
  return result;          // result.rows là mảng dữ liệu
}

export { pool };
