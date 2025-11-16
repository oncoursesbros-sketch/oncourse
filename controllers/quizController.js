import pool from '../config/database.js';

export const getQuiz = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;

    console.log('📥 Запрос теста для урока:', lessonId);

    const quizResult = await pool.query(
      `SELECT q.*, l.title as lesson_title, l.course_id
       FROM quizzes q 
       JOIN lessons l ON q.lesson_id = l.id 
       WHERE q.lesson_id = $1`,
      [lessonId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ message: 'Тест не найден' });
    }

    const quiz = quizResult.rows[0];
    console.log('📋 Найден тест:', quiz.id, quiz.title);

    // Проверяем доступ к курсу
    if (req.user) {
      const accessResult = await pool.query(
        `SELECT 1 FROM purchases p 
         WHERE p.user_id = $1 AND p.course_id = $2 AND p.payment_status = 'completed'`,
        [req.user.id, quiz.course_id]
      );

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ message: 'Нет доступа к этому тесту' });
      }
    }

    // УПРОЩЕННЫЙ ЗАПРОС - получаем вопросы и ответы отдельно
    const questionsResult = await pool.query(
      `SELECT id, quiz_id, question_text, order_index
       FROM questions 
       WHERE quiz_id = $1 
       ORDER BY order_index`,
      [quiz.id]
    );

    console.log('❓ Найдено вопросов:', questionsResult.rows.length);

    // Для каждого вопроса получаем ответы
    const questionsWithAnswers = await Promise.all(
      questionsResult.rows.map(async (question) => {
        const answersResult = await pool.query(
          `SELECT id, answer_text, is_correct
           FROM answers 
           WHERE question_id = $1 
           ORDER BY id`,
          [question.id]
        );

        console.log(`📝 Вопрос ${question.id}: ${answersResult.rows.length} ответов`);

        return {
          ...question,
          answers: answersResult.rows
        };
      })
    );

    res.json({
      quiz: {
        ...quiz,
        questions: questionsWithAnswers
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения теста:', error);
    res.status(500).json({ 
      message: 'Ошибка сервера',
      error: error.message 
    });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const { answers } = req.body;
    const userId = req.user.id;

    console.log('📥 Получены ответы:', answers);

    // Получаем тест
    const quizResult = await pool.query(
      `SELECT q.*, l.course_id 
       FROM quizzes q 
       JOIN lessons l ON q.lesson_id = l.id 
       WHERE q.lesson_id = $1`,
      [lessonId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ message: 'Тест не найден' });
    }

    const quiz = quizResult.rows[0];
    console.log('📋 Найден тест:', quiz.id, 'Вопросов должно быть: 3');

    // Проверяем доступ к курсу
    const accessResult = await pool.query(
      `SELECT 1 FROM purchases p 
       WHERE p.user_id = $1 AND p.course_id = $2 AND p.payment_status = 'completed'`,
      [userId, quiz.course_id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ message: 'Нет доступа к этому тесту' });
    }

    // Получаем ВСЕ вопросы теста
    const questionsResult = await pool.query(
      `SELECT id FROM questions WHERE quiz_id = $1`,
      [quiz.id]
    );

    console.log('❓ Всего вопросов в тесте:', questionsResult.rows.length);

    // Получаем правильные ответы
    const correctAnswersResult = await pool.query(
      `SELECT q.id as question_id, a.id as correct_answer_id
       FROM questions q 
       JOIN answers a ON q.id = a.question_id 
       WHERE q.quiz_id = $1 AND a.is_correct = true`,
      [quiz.id]
    );

    console.log('✅ Правильные ответы:', correctAnswersResult.rows);

    const correctAnswersMap = {};
    correctAnswersResult.rows.forEach(row => {
      correctAnswersMap[row.question_id] = row.correct_answer_id;
    });

    console.log('🗺️ Карта правильных ответов:', correctAnswersMap);

    // Проверяем ответы пользователя
    let correctCount = 0;
    const totalQuestions = questionsResult.rows.length; // Используем реальное количество вопросов

    console.log('🔍 Начинаем проверку ответов...');
    
    Object.keys(answers).forEach(questionId => {
      const userAnswer = parseInt(answers[questionId]);
      const correctAnswer = parseInt(correctAnswersMap[questionId]);
      
      console.log(`Вопрос ${questionId}: пользователь = ${userAnswer}, правильный = ${correctAnswer}`);
      
      if (userAnswer === correctAnswer) {
        correctCount++;
        console.log('✅ Правильно!');
      } else {
        console.log('❌ Неправильно');
      }
    });

    console.log(`📊 Итог: ${correctCount}/${totalQuestions} правильных`);

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isPassed = score >= quiz.pass_score;

    // Сохраняем попытку
    await pool.query(
      `INSERT INTO user_quiz_attempts (user_id, quiz_id, score, is_passed) 
       VALUES ($1, $2, $3, $4)`,
      [userId, quiz.id, score, isPassed]
    );

    res.json({
      score,
      isPassed,
      correctCount,
      totalQuestions,
      passScore: quiz.pass_score,
      message: isPassed 
        ? 'Тест пройден успешно!' 
        : `Тест не пройден. Необходимо набрать ${quiz.pass_score}%`
    });

  } catch (error) {
    console.error('❌ Ошибка отправки теста:', error);
    res.status(500).json({ 
      message: 'Ошибка сервера',
      error: error.message
    });
  }
};