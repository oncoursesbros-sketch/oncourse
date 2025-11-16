// Простая имитация платежной системы
export const processPayment = async (amount, courseId, userId) => {
  // Имитация обработки платежа - всегда успешно
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        paymentId: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        amount: amount,
        status: 'completed'
      });
    }, 1000); // Имитация задержки платежа
  });
};