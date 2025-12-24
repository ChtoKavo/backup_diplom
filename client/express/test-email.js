const nodemailer = require('nodemailer');

console.log('Тестирование email подключения...');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: "Yra222225522@gmail.com",
    pass: "hoxz zegf yeix jgoo",
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000
});

// Тестируем подключение
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Ошибка подключения к SMTP серверу:', error);
    console.error('Код ошибки:', error.code);
    console.error('Команда:', error.command);
  } else {
    console.log('✅ SMTP сервер готов к отправке сообщений');
    
    // Отправляем тестовое письмо
    const mailOptions = {
      from: 'Yra222225522@gmail.com',
      to: 'Yra222225522@gmail.com', 
      subject: 'Тест отправки email',
      text: 'Это тестовое письмо для проверки работы SMTP'
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Ошибка отправки тестового письма:', error);
      } else {
        console.log('✅ Тестовое письмо отправлено:', info.response);
        console.log('Message ID:', info.messageId);
      }
      process.exit(0);
    });
  }
});