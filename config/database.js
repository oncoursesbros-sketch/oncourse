import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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