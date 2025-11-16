import pool from '../config/database.js';

export const getProfile = async (req, res) => {
  try {
    // Используем данные из req.user, которые уже загружены в auth middleware
    const user = req.user;
    
    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        login: user.login,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        role: user.role, // Это поле должно приходить из auth middleware
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, phone, email, login, first_name, last_name, avatar_url, role`,
      [firstName, lastName, userId]
    );

    const updatedUser = result.rows[0];
    
    res.json({
      message: 'Профиль обновлен',
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        email: updatedUser.email,
        login: updatedUser.login,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        avatarUrl: updatedUser.avatar_url,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE users 
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2
       RETURNING id, phone, email, login, first_name, last_name, avatar_url, role`,
      [avatarUrl, userId]
    );

    const updatedUser = result.rows[0];

    res.json({
      message: 'Аватар успешно загружен',
      avatarUrl: avatarUrl,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        email: updatedUser.email,
        login: updatedUser.login,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        avatarUrl: updatedUser.avatar_url,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({ message: 'Ошибка загрузки файла' });
  }
};