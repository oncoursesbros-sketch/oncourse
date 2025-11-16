import pool from '../config/database.js';
import { hashPassword, comparePassword, generateToken, generateResetToken } from '../utils/authUtils.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

export const register = async (req, res) => {
  const { phone, email, login, password, firstName, lastName } = req.body;

  try {
    const existingUser = await pool.query(
      `SELECT * FROM users WHERE phone = $1 OR email = $2 OR login = $3`,
      [phone, email, login]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Пользователь с таким телефоном, email или логином уже существует' 
      });
    }

    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (phone, email, login, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5, $6, 'student') 
       RETURNING id, phone, email, login, first_name, last_name, avatar_url, role, created_at`,
      [phone, email, login, hashedPassword, firstName, lastName]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        login: user.login,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        role: user.role, // Здесь role есть
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
};

export const login = async (req, res) => {
  const { login, password } = req.body;

  try {
    // ИСПРАВЛЕНО: явно указываем поля вместо SELECT *
    const result = await pool.query(
      `SELECT 
        id, phone, email, login, password_hash, 
        first_name, last_name, avatar_url, role, created_at
       FROM users 
       WHERE email = $1 OR phone = $1 OR login = $1`,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const user = result.rows[0];
    const isPasswordValid = await comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const token = generateToken(user.id);

    // Добавим отладочный вывод
    console.log('🔐 Login user role:', user.role);

    res.json({
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        login: user.login,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        role: user.role, // Убедимся что поле role передается
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Ошибка при входе в систему' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({ 
        message: 'Если email зарегистрирован, инструкции отправлены на почту' 
      });
    }

    const userId = userResult.rows[0].id;
    const resetToken = generateResetToken();
    const tokenHash = await hashPassword(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    await sendPasswordResetEmail(email, resetToken);

    res.json({ 
      message: 'Если email зарегистрирован, инструкции отправлены на почту' 
    });

  } catch (error) {
    console.error('Ошибка восстановления пароля:', error);
    res.status(500).json({ message: 'Ошибка при восстановлении пароля' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Находим токен сброса
    const resetResult = await pool.query(
      `SELECT pr.*, u.id as user_id 
       FROM password_resets pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.expires_at > NOW()`
    );

    let validToken = null;
    
    // Проверяем все непросроченные токены
    for (const reset of resetResult.rows) {
      const isValid = await comparePassword(token, reset.token_hash);
      if (isValid) {
        validToken = reset;
        break;
      }
    }

    if (!validToken) {
      return res.status(400).json({ message: 'Недействительный или просроченный токен' });
    }

    // Хешируем новый пароль
    const hashedPassword = await hashPassword(newPassword);

    // Обновляем пароль
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, validToken.user_id]
    );

    // Удаляем использованный токен
    await pool.query(
      'DELETE FROM password_resets WHERE id = $1',
      [validToken.id]
    );

    res.json({ message: 'Пароль успешно изменен' });

  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    res.status(500).json({ message: 'Ошибка при сбросе пароля' });
  }
};