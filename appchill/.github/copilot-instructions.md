## Кратко — что это за репозиторий

Это набор проектов мессенджера: сервер на Node.js/Express + MySQL и несколько мобильных клиентов (Expo React Native и старые Cordova/Android артефакты).

- Основной backend: `appChill/backend/server.js` (Node.js, Express, mysql2, Socket.io).
- Клиент (Expo): `MessengerExpo/` (React Native + Expo). Клиент делает HTTP запросы через `MessengerExpo/src/services/api.js`.
- В проекте также есть `MessengerAPK/` (Cordova/Android artefacts) и веб-ресурсы в `appChill/www/`.

## Что важно знать (архитектура и интеграции)

- Backend хранит данные в MySQL и создаёт таблицы при старте (см. `server.js`). БД должна существовать (по умолчанию имя в README — `messenger_db`) — сервер сам создаёт таблицы, но не базу.
- Аутентификация: JWT. Middleware `authenticateToken` проверяет заголовок `Authorization: Bearer <token>`.
- WebSocket: Socket.io используется для real-time: события, которые эмитятся/слушаются — `new_message`, `new_group_message`, `message_deleted`, `group_message_deleted`, `join_group`, `leave_group`.
- Файловые загрузки: multer сохраняет файлы в `appChill/backend/uploads` и статически раздаёт по `/uploads`. В `server.js` для ответа при загрузке формируется URL с хардкоженым хостом: `http://151.241.228.247:3001/uploads/...` — это важный deployment-пометка.
- Клиент → сервер: `MessengerExpo/src/services/api.js` содержит `API_URL = 'http://151.241.228.247:3001/api'` и axios-интерсепторы, которые добавляют токен из `AsyncStorage`.

## Быстрые команды (чтобы запускать и тестировать)

- Запустить backend (локально):
  - Создать `.env` в `appChill/backend/` с переменными: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (например `messenger_db`), `JWT_SECRET`, `PORT`.
  - Установить зависимости и запустить dev-сервер:

    cd appChill/backend
    npm install
    npm run dev    # nodemon, или `npm start` для продакшен-режима

- Запустить клиент (Expo):

    cd MessengerExpo
    npm install
    npm run android   # или `npm run ios`, `npm run web`, `npm start`

## Конвенции и паттерны в кодовой базе (важно для правок)

- Язык: чистый JavaScript (без TypeScript). Чаще используются коллбэки с `mysql2` и асинхронные bcrypt/Promise для хеша паролей.
- Ответы API: JSON-ответы с полем `error` или success/message. При изменении форматов ответов — проверьте клиентские обработчики (axios interceptors в `MessengerExpo/src/services/api.js`).
- SQL и миграции: схема создаётся inline в `server.js` при подключении. Если меняете модель данных — редактируйте `server.js` и учитывайте существующие данные (нет миграционной системы).
- Безопасность и конфигурация: секреты (DB, JWT) в `.env`. Никогда не хардкодьте секреты в коде.

## Частые места для изменений и что проверять

- Изменили API-эндпоинт/порт — обновите `MessengerExpo/src/services/api.js` и, при необходимости, строку формирования `fileUrl` в `server.js`.
- Работа с файлами: поле формы для загрузки — `media` (см. `upload.single('media')`). Новые функции загрузки должны сохранять в `uploads/` и возвращать валидный URL.
- WebSocket-события: соблюдайте имена событий (см. список выше). Клиенты ожидают именно те имена.
- Таблицы и внешние ключи: `server.js` использует `FOREIGN KEY` и `UNIQUE` ограничения — при изменениях проверьте порядок создания таблиц и целостность.

## Примеры (конкретно из кода)

- Вызов входа: POST /api/login — в `server.js` формируется токен: `jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET)`.
- Отправка сообщения (сервер): после вставки в DB `io.emit('new_message', messageData);`.
- Клиентский baseURL: `const API_URL = 'http://151.241.228.247:3001/api'` в `MessengerExpo/src/services/api.js`.

## Что агентам полезно делать первым делом

1. Открыть `appChill/backend/server.js` и `MessengerExpo/src/services/api.js` — это быстрее всего даёт представление об API, auth-потоке и реальном URL.
2. Убедиться, что локальная `.env` у разработчика содержит рабочие MySQL creds и `JWT_SECRET`.
3. Не менять хост/порт/URL без синхронизации frontend/backend (поиск по `151.241.228.247` и `/api`).

## Ограничения и отсутствующие вещи

- Нет тестов и миграций — изменения в модели БД требуют осторожности.
- Push-уведомления: есть заготовки (функция `sendPushNotifications`), но реальной интеграции с Expo Push API нет — проверки логируются в консоль.

Если что-то неясно или хотите, чтобы я включил примеры команд для Docker/docker-compose, или предложил минимальные миграции — скажите, добавлю.
