import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Токен доступа отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Получаем актуальные данные пользователя из БД
    const userResult = await pool.query(
      'SELECT id, email, login, first_name, last_name, avatar_url, phone, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ message: 'Недействительный токен' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userResult = await pool.query(
        'SELECT id, email, login, first_name, last_name, avatar_url, phone, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    } catch (error) {
      // Продолжаем без аутентификации
      console.error('Optional auth error:', error);
    }
  }
  next();
};