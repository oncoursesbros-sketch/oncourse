import pool from '../config/database.js';
import { sendTestEmail } from '../utils/emailService.js';
import { hashPassword } from '../utils/authUtils.js';

export const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email обязателен' });
    }

    await sendTestEmail(email);
    
    res.json({ 
      message: 'Тестовое письмо отправлено! Проверьте консоль для ссылки на просмотр.',
      note: 'Для Ethereal Email: перейдите по ссылке из консоли сервера'
    });
  } catch (error) {
    console.error('Ошибка отправки тестового письма:', error);
    res.status(500).json({ message: 'Ошибка отправки письма: ' + error.message });
  }
};

export const testDatabase = async (req, res) => {
  try {
    // Простой запрос для проверки БД
    const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
    
    res.json({
      message: 'База данных работает нормально',
      userCount: result.rows[0].user_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка тестирования БД:', error);
    res.status(500).json({ 
      message: 'Ошибка подключения к базе данных',
      error: error.message 
    });
  }
};

export const createTestData = async (req, res) => {
  try {
    // Хешируем пароль для тестового пользователя
    const hashedPassword = await hashPassword('123456');
    
    // Создаем тестового пользователя-инструктора
    const instructorResult = await pool.query(
      `INSERT INTO users (phone, email, login, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      ['+79990000001', 'instructor@test.com', 'instructor', hashedPassword, 'Иван', 'Инструкторов']
    );

    const instructorId = instructorResult.rows[0].id;

    // Создаем тестового студента
    const studentResult = await pool.query(
      `INSERT INTO users (phone, email, login, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      ['+79990000002', 'student@test.com', 'student', hashedPassword, 'Петр', 'Студентов']
    );

    const studentId = studentResult.rows[0].id;

    // Создаем тестовый курс
    const courseResult = await pool.query(
      `INSERT INTO courses (title, description, price, instructor_id, is_published) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      ['Тестовый курс по программированию', 'Это тестовый курс для проверки работы системы', 2990, instructorId, true]
    );

    const courseId = courseResult.rows[0].id;

    // Создаем тестовые уроки
    await pool.query(
      `INSERT INTO lessons (course_id, title, description, order_index, video_url) 
       VALUES ($1, $2, $3, $4, $5)`,
      [courseId, 'Введение в программирование', 'Основные понятия программирования', 1, 'https://example.com/video1.mp4']
    );

    await pool.query(
      `INSERT INTO lessons (course_id, title, description, order_index) 
       VALUES ($1, $2, $3, $4)`,
      [courseId, 'Переменные и типы данных', 'Изучаем основы переменных', 2]
    );

    // Создаем тестовую покупку
    await pool.query(
      `INSERT INTO purchases (user_id, course_id, amount, payment_status) 
       VALUES ($1, $2, $3, $4)`,
      [studentId, courseId, 2990, 'completed']
    );

    res.json({
      message: 'Тестовые данные созданы',
      users: {
        instructor: { id: instructorId, login: 'instructor', password: '123456' },
        student: { id: studentId, login: 'student', password: '123456' }
      },
      courseId,
      note: 'Для входа используйте логин "instructor" или "student" с паролем "123456"'
    });
  } catch (error) {
    console.error('Ошибка создания тестовых данных:', error);
    
    // Если данные уже существуют, возвращаем информацию о них
    if (error.code === '23505') { // unique_violation
      try {
        const existingUsers = await pool.query(
          'SELECT id, login, email FROM users WHERE login IN ($1, $2)',
          ['instructor', 'student']
        );
        
        const existingCourses = await pool.query(
          'SELECT id, title FROM courses WHERE title = $1',
          ['Тестовый курс по программированию']
        );
        
        res.json({
          message: 'Тестовые данные уже существуют',
          existingUsers: existingUsers.rows,
          existingCourses: existingCourses.rows,
          note: 'Для входа используйте логин "instructor" или "student" с паролем "123456"'
        });
      } catch (err) {
        res.status(500).json({ 
          message: 'Ошибка создания тестовых данных',
          error: error.message 
        });
      }
    } else {
      res.status(500).json({ 
        message: 'Ошибка создания тестовых данных',
        error: error.message 
      });
    }
  }
};

// Новая функция для тестирования сброса пароля
export const testPasswordReset = async (req, res) => {
  try {
    // Используем тестового студента
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE login = $1',
      ['student']
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        message: 'Сначала создайте тестовые данные через /api/test/create-test-data' 
      });
    }

    const user = userResult.rows[0];
    
    res.json({
      message: 'Готово для тестирования сброса пароля',
      testEmail: user.email,
      note: 'Отправьте POST запрос на /api/auth/forgot-password с этим email'
    });
  } catch (error) {
    console.error('Ошибка тестирования сброса пароля:', error);
    res.status(500).json({ 
      message: 'Ошибка при подготовке теста сброса пароля',
      error: error.message 
    });
  }
};