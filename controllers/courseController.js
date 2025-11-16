import pool from '../config/database.js';

export const getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;

    // Получаем курсы с информацией о преподавателе
    const coursesResult = await pool.query(
      `SELECT c.*, 
              u.first_name as instructor_name, 
              u.last_name as instructor_last_name,
              COUNT(l.id) as lessons_count
       FROM courses c 
       LEFT JOIN users u ON c.instructor_id = u.id 
       LEFT JOIN lessons l ON c.id = l.course_id
       WHERE c.is_published = true 
       GROUP BY c.id, u.first_name, u.last_name
       ORDER BY c.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Получаем общее количество
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM courses WHERE is_published = true'
    );

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // Проверяем покупки для авторизованного пользователя
    let purchasedCourseIds = [];
    if (req.user) {
      const purchasesResult = await pool.query(
        'SELECT course_id FROM purchases WHERE user_id = $1 AND payment_status = $2',
        [req.user.id, 'completed']
      );
      purchasedCourseIds = purchasesResult.rows.map(row => row.course_id);
    }

    const courses = coursesResult.rows.map(course => ({
      ...course,
      isPurchased: purchasedCourseIds.includes(course.id)
    }));

    res.json({
      courses,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Ошибка получения курсов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    const courseResult = await pool.query(
      `SELECT c.*, 
              u.first_name as instructor_name, 
              u.last_name as instructor_last_name,
              u.email as instructor_email
       FROM courses c 
       LEFT JOIN users u ON c.instructor_id = u.id 
       WHERE c.id = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    const course = courseResult.rows[0];

    // Получаем уроки курса
    const lessonsResult = await pool.query(
      `SELECT l.*, 
              EXISTS(SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id) as has_quiz
       FROM lessons l 
       WHERE l.course_id = $1 
       ORDER BY l.order_index`,
      [courseId]
    );

    // Проверяем покупку
    let hasAccess = false;
    if (req.user) {
      const purchaseResult = await pool.query(
        'SELECT id FROM purchases WHERE user_id = $1 AND course_id = $2 AND payment_status = $3',
        [req.user.id, courseId, 'completed']
      );
      hasAccess = purchaseResult.rows.length > 0;
    }

    res.json({
      course: {
        ...course,
        lessons: lessonsResult.rows,
        hasAccess
      }
    });
  } catch (error) {
    console.error('Ошибка получения курса:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const coursesResult = await pool.query(
      `SELECT c.*, 
              u.first_name as instructor_name, 
              u.last_name as instructor_last_name,
              p.purchased_at,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as total_lessons,
              (SELECT COUNT(*) FROM user_quiz_attempts uqa 
               JOIN quizzes q ON uqa.quiz_id = q.id 
               JOIN lessons l ON q.lesson_id = l.id 
               WHERE l.course_id = c.id AND uqa.user_id = $1) as completed_quizzes
       FROM purchases p
       JOIN courses c ON p.course_id = c.id
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE p.user_id = $1 AND p.payment_status = 'completed'
       ORDER BY p.purchased_at DESC`,
      [userId]
    );

    // Рассчитываем прогресс для каждого курса
    const coursesWithProgress = coursesResult.rows.map(course => {
      const progress = course.total_lessons > 0 
        ? Math.round((course.completed_quizzes / course.total_lessons) * 100)
        : 0;
      
      return {
        ...course,
        progress
      };
    });

    res.json({
      courses: coursesWithProgress
    });
  } catch (error) {
    console.error('Ошибка получения моих курсов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};