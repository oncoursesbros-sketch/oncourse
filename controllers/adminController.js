import pool from '../config/database.js';

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, phone, email, login, first_name, last_name, 
        avatar_url, is_verified, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json({
      users: result.rows
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getAllPurchases = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.email as user_email,
        c.title as course_title,
        c.price as course_price
      FROM purchases p
      JOIN users u ON p.user_id = u.id
      JOIN courses c ON p.course_id = c.id
      ORDER BY p.purchased_at DESC
    `);
    
    res.json({
      purchases: result.rows
    });
  } catch (error) {
    console.error('Ошибка получения покупок:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};