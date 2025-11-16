import pool from '../config/database.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartResult = await pool.query(
      `SELECT ci.*, c.title, c.description, c.price, c.thumbnail_url 
       FROM cart_items ci 
       JOIN courses c ON ci.course_id = c.id 
       WHERE ci.user_id = $1 AND c.is_published = true`,
      [userId]
    );

    // Считаем общую сумму
    const total = cartResult.rows.reduce((sum, item) => sum + parseFloat(item.price), 0);

    res.json({
      cartItems: cartResult.rows,
      total: total
    });
  } catch (error) {
    console.error('Ошибка получения корзины:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const addToCart = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    const courseResult = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND is_published = true',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    // Проверяем, не куплен ли уже
    const purchaseResult = await pool.query(
      'SELECT id FROM purchases WHERE user_id = $1 AND course_id = $2 AND payment_status = $3',
      [userId, courseId, 'completed']
    );

    if (purchaseResult.rows.length > 0) {
      return res.status(400).json({ message: 'Курс уже куплен' });
    }

    // Добавляем в корзину
    await pool.query(
      'INSERT INTO cart_items (user_id, course_id) VALUES ($1, $2) ON CONFLICT (user_id, course_id) DO NOTHING',
      [userId, courseId]
    );

    res.json({ message: 'Курс добавлен в корзину' });
  } catch (error) {
    console.error('Ошибка добавления в корзину:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    res.json({ message: 'Курс удален из корзины' });
  } catch (error) {
    console.error('Ошибка удаления из корзины:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'Корзина очищена' });
  } catch (error) {
    console.error('Ошибка очистки корзины:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};