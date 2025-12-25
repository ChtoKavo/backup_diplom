# ✅ Чек-лист конфигурации Localhost

## Статус: ГОТОВО К ЗАПУСКУ

### 🔧 Бэкенд (Express)

- ✅ **db.js**: `host: process.env.DB_HOST || 'localhost'` 
  - Использует localhost в fallback вместо старого IP
  - Читает из .env переменной DB_HOST

- ✅ **.env**: Содержит правильные переменные
  ```
  PORT=5001
  DB_HOST=localhost
  DB_USER=admin
  DB_PASSWORD=qweasdzxc
  DB_NAME=AppMessage
  ```

- ✅ **index.js** (Line 3660): 
  ```
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  ```
  - Изменено с `http://151.247.197.250` на `http://localhost`

- ✅ **CORS**: Настроена поддержка всех источников
- ✅ **WebSocket**: Будет работать на localhost:5001

---

### 🎨 Фронтенд (React + Vite)

- ✅ **App.jsx**: `http://localhost:5001` вместо IP
- ✅ **AdminPanel.jsx**: Все запросы на localhost:5001
- ✅ **ChatSelector.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Feed.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Friends.jsx**: `API_BASE = 'http://localhost:5001'`
- ✅ **Login.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Messenger.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Notifications.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Profile.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Register.jsx**: `API_BASE_URL = 'http://localhost:5001'`
- ✅ **Search.jsx**: Все запросы используют `http://localhost:5001`
- ✅ **VoiceRecorder.jsx**: `http://localhost:5001/messages/upload-voice`

- ✅ **.env** (клиент):
  ```
  VITE_API_URL=http://localhost:5001
  VITE_SOCKET_URL=http://localhost:5001
  ```

---

### 🗄️ База данных

**Требуемая конфигурация:**
```
Хост: localhost (127.0.0.1)
Пользователь: admin
Пароль: qweasdzxc
БД: AppMessage
Порт: 3306
```

**Создание БД (если нет):**
```sql
CREATE DATABASE AppMessage;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'qweasdzxc';
GRANT ALL PRIVILEGES ON AppMessage.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
```

---

## 🚀 Быстрый старт

### Терминал 1 - Бэкенд:
```bash
cd backup_diplom/client/express
npm install  # если ещё не установлены зависимости
npm start
```

**Ожидаемый вывод:**
```
🚀 Сервер запущен на http://localhost:5001
📱 WebSocket сервер активен на порту 5001
```

### Терминал 2 - Фронтенд:
```bash
cd backup_diplom/client/client
npm install  # если ещё не установлены зависимости
npm run dev
```

**Ожидаемый вывод:**
```
VITE v... ready in ... ms
➜  Local:   http://localhost:3000/
```

---

## 🧪 Проверка подключения

### 1. Проверить бэкенд:
```bash
curl http://localhost:5001/status
```

**Ответ:**
```json
{"status":"OK","timestamp":"...","activeUsers":0,"environment":"development"}
```

### 2. Проверить фронтенд:
Откройте в браузере: `http://localhost:3000`

### 3. Проверить БД подключение:
Подождите загрузку, если нет ошибок ECONNREFUSED - всё ок!

---

## ⚠️ Решение проблем

### Ошибка: "Cannot find module 'dotenv'"
```bash
npm install dotenv
```

### Ошибка: "ECONNREFUSED 127.0.0.1:3306"
- MySQL не запущен или не доступен на localhost
- Проверьте: `mysql -u admin -p` (введите пароль `qweasdzxc`)

### Ошибка: "Port 5001 already in use"
```bash
# Windows:
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :5001
kill -9 <PID>
```

### Ошибка: "CORS error"
- Убедитесь, что бэкенд запущен на `http://localhost:5001`
- Обновите браузер (Ctrl+F5)

---

## 📁 Структура файлов (обновлено)

```
backup_diplom/
├── client/
│   ├── client/                 # React фронтенд
│   │   ├── .env ✅ (обновлён)
│   │   ├── src/
│   │   │   ├── App.jsx ✅ (обновлён)
│   │   │   └── components/
│   │   │       ├── AdminPanel.jsx ✅
│   │   │       ├── ChatSelector.jsx ✅
│   │   │       ├── Feed.jsx ✅
│   │   │       ├── Friends.jsx ✅
│   │   │       ├── Login.jsx ✅
│   │   │       ├── Messenger.jsx ✅
│   │   │       ├── Notifications.jsx ✅
│   │   │       ├── Profile.jsx ✅
│   │   │       ├── Register.jsx ✅
│   │   │       ├── Search.jsx ✅
│   │   │       └── VoiceRecorder.jsx ✅
│   │   └── package.json
│   │
│   └── express/                # Node.js бэкенд
│       ├── .env ✅ (обновлён)
│       ├── index.js ✅ (обновлён - localhost в логе)
│       ├── db.js ✅ (обновлён - localhost в fallback)
│       └── package.json
│
├── LOCALHOST_SETUP.md          # Подробная инструкция
└── CONFIG_CHECKLIST.md ✅      # Этот файл
```

---

## ✨ Дополнительно

**Для удобства разработки создайте батник `start-dev.bat`:**

```batch
@echo off
title App Development Environment
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   App Local Development - Starting Servers     ║
echo ╚════════════════════════════════════════════════╝
echo.

echo [1/2] Starting Backend (Express)...
cd express
start cmd /k "title Backend - localhost:5001 && npm start"

timeout /t 3 /nobreak

echo [2/2] Starting Frontend (React)...
cd ../client
start cmd /k "title Frontend - localhost:3000 && npm run dev"

echo.
echo ✅ Both servers should be starting now!
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:3000
echo.
pause
```

Сохраните как `start-dev.bat` в папке `backup_diplom/client` и запускайте двойным кликом.

---

## 🎉 Всё готово!

Проект полностью настроен для работы локально. Все IP адреса заменены на localhost, и вы можете начать разработку!

**Дата обновления:** 25 Декабря 2025
**Статус:** ✅ ГОТОВО К ЗАПУСКУ
