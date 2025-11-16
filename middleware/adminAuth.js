import pool from '../config/database.js';

export const requireAdmin = async (req, res, next) => {
  try {
    // Проверяем что пользователь авторизован и является админом
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    // Получаем актуальные данные пользователя с ролью
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки прав администратора:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};