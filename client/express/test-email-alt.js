const nodemailer = require('nodemailer');

console.log('Тестирование альтернативных настроек email...');

// Попробуем разные конфигурации
const configs = [
  {
    name: 'Gmail SSL (порт 465)',
    config: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: "Yra222225522@gmail.com",
        pass: "hoxz zegf yeix jgoo",
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  },
  {
    name: 'Gmail TLS (порт 587)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: "Yra222225522@gmail.com",
        pass: "hoxz zegf yeix jgoo",
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  },
  {
    name: 'Gmail через service',
    config: {
      service: 'gmail',
      auth: {
        user: "Yra222225522@gmail.com",
        pass: "hoxz zegf yeix jgoo",
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  }
];

async function testConfig(configData) {
  return new Promise((resolve) => {
    console.log(`\n🔄 Тестируем: ${configData.name}`);
    
    const transporter = nodemailer.createTransport(configData.config);
    
    const timeout = setTimeout(() => {
      console.log(`❌ Таймаут для ${configData.name}`);
      resolve(false);
    }, 10000);
    
    transporter.verify((error, success) => {
      clearTimeout(timeout);
      if (error) {
        console.log(`❌ ${configData.name}: ${error.message}`);
        resolve(false);
      } else {
        console.log(`✅ ${configData.name}: Подключение успешно!`);
        resolve(true);
      }
    });
  });
}

async function testAllConfigs() {
  for (const config of configs) {
    const success = await testConfig(config);
    if (success) {
      console.log(`\n🎉 Рабочая конфигурация найдена: ${config.name}`);
      break;
    }
  }
  
  console.log('\n🔍 Проверяем сетевое подключение...');
  
  // Проверяем доступность DNS
  const dns = require('dns');
  dns.lookup('smtp.gmail.com', (err, address) => {
    if (err) {
      console.log('❌ DNS lookup failed:', err.message);
    } else {
      console.log('✅ DNS lookup успешен:', address);
    }
  });
  
  // Проверяем доступность портов
  const net = require('net');
  
  [25, 465, 587].forEach(port => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log(`❌ Порт ${port}: таймаут`);
    }, 5000);
    
    socket.connect(port, 'smtp.gmail.com', () => {
      clearTimeout(timeout);
      console.log(`✅ Порт ${port}: доступен`);
      socket.destroy();
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`❌ Порт ${port}: ${err.message}`);
    });
  });
}

testAllConfigs();