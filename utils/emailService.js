import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Настройки email:', {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER
});

// Транспорт для Яндекс
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.yandex.ru',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: parseInt(process.env.EMAIL_PORT) === 465, 
  auth: {
    user: process.env.EMAIL_USER?.includes('@') 
      ? process.env.EMAIL_USER 
      : `${process.env.EMAIL_USER}@yandex.ru`,
    pass: process.env.EMAIL_PASS,
  },
});

// Функция для отправки тестового письма
export const sendTestEmail = async (toEmail) => {
  try {
    console.log(' Попытка отправки на:', toEmail);
    
    const fromEmail = process.env.EMAIL_USER?.includes('@') 
      ? process.env.EMAIL_USER 
      : `${process.env.EMAIL_USER}@yandex.ru`;
    
    const info = await transporter.sendMail({
      from: `"OnCourse" <${fromEmail}>`,
      to: toEmail,
      subject: 'Тестовое письмо - OnCourse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">OnCourse</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Тестовое письмо</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Тестовое письмо от OnCourse</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              Это тестовое письмо для проверки работы email системы.
            </p>
            
            <div style="background: #f0fdf4; 
                       padding: 15px; 
                       border-radius: 6px; 
                       border-left: 4px solid #10b981;
                       margin: 25px 0;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>Email система работает корректно!</strong>
              </p>
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">© 2025 OnCourse. Все права защищены.</p>
          </div>
        </div>
      `,
    });

    console.log('Тестовое письмо отправлено!');
    console.log('Message ID:', info.messageId);
    
    return info;
  } catch (error) {
    console.error(' Ошибка отправки тестового письма:', error.message);
    throw error;
  }
};

// Функция для отправки письма сброса пароля
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const fromEmail = process.env.EMAIL_USER?.includes('@') 
      ? process.env.EMAIL_USER 
      : `${process.env.EMAIL_USER}@yandex.ru`;
    
    const info = await transporter.sendMail({
      from: `"OnCourse" <${fromEmail}>`,
      to: email,
      subject: 'Восстановление пароля - OnCourse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">OnCourse</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Восстановление пароля</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Восстановление доступа к аккаунту</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              Вы запросили восстановление пароля для вашего аккаунта OnCourse.
              Для установки нового пароля нажмите на кнопку ниже:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; 
                        background: #2563eb; 
                        color: white; 
                        padding: 14px 28px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600;
                        font-size: 16px;">
                Восстановить пароль
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 15px;">
              Или скопируйте эту ссылку в браузер:
            </p>
            
            <p style="background: #f9fafb; 
                      padding: 15px; 
                      border-radius: 6px; 
                      word-break: break-all;
                      font-family: monospace;
                      color: #374151;
                      margin: 20px 0;">
              ${resetUrl}
            </p>
            
            <div style="background: #fef3cd; 
                       padding: 15px; 
                       border-radius: 6px; 
                       border-left: 4px solid #f59e0b;
                       margin: 25px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Важно:</strong> Ссылка действительна в течение 1 часа. 
                Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
              </p>
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0;">© 2025 OnCourse. Все права защищены.</p>
          </div>
        </div>
      `,
    });

    console.log('Письмо для сброса пароля отправлено!');
    console.log('Кому:', email);
    console.log('Токен для тестирования:', resetToken);
    
    return info;
  } catch (error) {
    console.error('Ошибка отправки письма для сброса пароля:', error);
    throw error;
  }
};

export default transporter;