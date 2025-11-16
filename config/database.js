import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Проверка подключения к БД
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL подключена успешно');
    client.release();
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
  }
};

testConnection();

export default pool;