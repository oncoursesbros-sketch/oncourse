import express from 'express';
import pool from '../config/database.js';
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateResetToken 
} from '../utils/authUtils.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// Регистрация
router.post('/register', validateRegister, async (req, res) => {
  const { phone, email, login, password, firstName, lastName } = req.body;

  try {
    // Проверяем, существует ли пользователь с таким телефоном, email или логином
    const existingUser = await pool.query(
      `SELECT * FROM users WHERE phone = $1 OR email = $2 OR login = $3`,
      [phone, email, login]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: 'Пользователь с таким телефоном, email или логином уже существует'
      });
    }

    // Хешируем пароль
    const hashedPassword = await hashPassword(password);

    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO users (phone, email, login, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, phone, email, login, first_name, last_name, avatar_url, created_at`,
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
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
});

// Вход в систему
router.post('/login', validateLogin, async (req, res) => {
  const { login, password } = req.body; // login может быть email, телефон или логин

  try {
    // Ищем пользователя по email, телефону или логину
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR phone = $1 OR login = $1`,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const user = result.rows[0];

    // Проверяем пароль
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    const token = generateToken(user.id);

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
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Ошибка при входе в систему' });
  }
});

// Запрос на сброс пароля
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Для безопасности не сообщаем, что email не найден
      return res.json({
        message: 'Если email зарегистрирован, инструкции отправлены на почту'
      });
    }

    const userId = userResult.rows[0].id;
    const resetToken = generateResetToken();
    const tokenHash = await hashPassword(resetToken);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    // Удаляем старые токены для этого пользователя
    await pool.query(
      'DELETE FROM password_resets WHERE user_id = $1',
      [userId]
    );

    // Сохраняем новый токен в БД
    await pool.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    // Отправляем email с токеном
    await sendPasswordResetEmail(email, resetToken);

    res.json({
      message: 'Если email зарегистрирован, инструкции отправлены на почту'
    });

  } catch (error) {
    console.error('Ошибка восстановления пароля:', error);
    res.status(500).json({ message: 'Ошибка при восстановлении пароля' });
  }
});

// Сброс пароля с токеном
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Токен и новый пароль обязательны' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Пароль должен содержать минимум 6 символов' 
      });
    }

    // Находим все непросроченные токены
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
      return res.status(400).json({ 
        message: 'Недействительный или просроченный токен' 
      });
    }

    // Хешируем новый пароль
    const hashedPassword = await hashPassword(newPassword);

    // Обновляем пароль пользователя
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, validToken.user_id]
    );

    // Удаляем использованный токен
    await pool.query(
      'DELETE FROM password_resets WHERE id = $1',
      [validToken.id]
    );

    res.json({ 
      message: 'Пароль успешно изменен' 
    });

  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    res.status(500).json({ message: 'Ошибка при сбросе пароля' });
  }
});

// Проверка токена сброса пароля (опционально, для фронтенда)
router.get('/verify-reset-token/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Находим все непросроченные токены
    const resetResult = await pool.query(
      `SELECT pr.*
       FROM password_resets pr
       WHERE pr.expires_at > NOW()`
    );

    let isValid = false;

    // Проверяем все непросроченные токены
    for (const reset of resetResult.rows) {
      const tokenValid = await comparePassword(token, reset.token_hash);
      if (tokenValid) {
        isValid = true;
        break;
      }
    }

    if (isValid) {
      res.json({ valid: true });
    } else {
      res.status(400).json({ 
        valid: false, 
        message: 'Недействительный или просроченный токен' 
      });
    }

  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(500).json({ message: 'Ошибка при проверке токена' });
  }
});

export default router;