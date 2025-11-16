import pool from '../config/database.js';
import { processPayment } from '../utils/paymentService.js';

export const createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.body;

    // Проверяем курс
    const courseResult = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND is_published = true',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    const course = courseResult.rows[0];

    // Проверяем, не куплен ли уже
    const existingPurchase = await pool.query(
      'SELECT id FROM purchases WHERE user_id = $1 AND course_id = $2 AND payment_status = $3',
      [userId, courseId, 'completed']
    );

    if (existingPurchase.rows.length > 0) {
      return res.status(400).json({ message: 'Курс уже куплен' });
    }

    // Создаем запись о покупке
    const newPurchase = await pool.query(
      `INSERT INTO purchases (user_id, course_id, amount, payment_status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [userId, courseId, course.price, 'pending']
    );

    // Имитируем оплату
    const payment = await processPayment(course.price, courseId, userId);

    if (payment.success) {
      // Обновляем статус на "оплачено"
      await pool.query(
        'UPDATE purchases SET payment_status = $1, payment_id = $2 WHERE id = $3',
        ['completed', payment.paymentId, newPurchase.rows[0].id]
      );

      // Удаляем из корзины
      await pool.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );

      res.json({ 
        success: true, 
        message: 'Оплата прошла успешно!',
        paymentId: payment.paymentId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Ошибка оплаты' 
      });
    }

  } catch (error) {
    console.error('Ошибка оплаты:', error);
    res.status(500).json({ message: 'Ошибка при обработке платежа' });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const purchasesResult = await pool.query(
      `SELECT p.*, c.title, c.description, c.thumbnail_url 
       FROM purchases p 
       JOIN courses c ON p.course_id = c.id 
       WHERE p.user_id = $1 
       ORDER BY p.purchased_at DESC`,
      [userId]
    );

    res.json({
      purchases: purchasesResult.rows
    });

  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};