import pool from '../config/database.js';

export const getLearningProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Простая статистика - только основные данные
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT p.course_id) as total_courses,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT uqa.id) as completed_tests
       FROM purchases p
       LEFT JOIN courses c ON p.course_id = c.id
       LEFT JOIN lessons l ON c.id = l.course_id
       LEFT JOIN user_quiz_attempts uqa ON uqa.user_id = p.user_id AND uqa.is_passed = true
       WHERE p.user_id = $1 AND p.payment_status = 'completed'`,
      [userId]
    );

    const stats = statsResult.rows[0];

    // Активные курсы (упрощенная версия)
    const activeCoursesResult = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.thumbnail_url,
        COUNT(DISTINCT l.id) as total_lessons
       FROM purchases p
       JOIN courses c ON p.course_id = c.id
       LEFT JOIN lessons l ON c.id = l.course_id
       WHERE p.user_id = $1 AND p.payment_status = 'completed'
       GROUP BY c.id, c.title, c.thumbnail_url
       ORDER BY c.title`,
      [userId]
    );

    res.json({
      progress: {
        totalCourses: parseInt(stats.total_courses) || 0,
        completedCourses: 0, // Упрощаем - считаем все курсы активными
        totalLessons: parseInt(stats.total_lessons) || 0,
        completedLessons: parseInt(stats.completed_tests) || 0,
        totalQuizzes: parseInt(stats.completed_tests) || 0,
        passedQuizzes: parseInt(stats.completed_tests) || 0,
        learningTime: 0, // Упрощаем - убираем сложный расчет времени
        streak: 0 // Упрощаем - убираем серии
      },
      activeCourses: activeCoursesResult.rows.map(course => ({
        ...course,
        progress: 0, // Упрощаем - прогресс 0%
        nextLesson: 'Первый урок' // Заглушка
      }))
    });

  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ 
      message: 'Ошибка сервера',
      error: error.message 
    });
  }
};