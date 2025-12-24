# 🔧 ДИАГНОСТИКА И УЛУЧШЕНИЯ ДЛЯ СЕРВЕРА

## Текущее состояние сервера

Проверено что на сервере:
✅ `join_group_room` вызывает `socket.join()` правильно
✅ `mark_message_read` отправляет события в группу через `io.to('group_${group_id}')`
✅ POST `/api/groups/:groupId/messages` отправляет `new_group_message` событие
✅ `messageData` содержит `group_id` поле

---

## ДОПОЛНИТЕЛЬНЫЕ УЛУЧШЕНИЯ СЕРВЕРА (опционально)

### Улучшение 1: Добавить подробное логирование для Socket комнат

**Файл:** `server.js`, найти функцию `socket.on('join_group_room',...`

**Добавить больше логирования:**

```javascript
socket.on('join_group_room', (groupId) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📡 JOIN GROUP ROOM EVENT`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Group ID: ${groupId}`);
  console.log(`   Rooms before: [${[...socket.rooms].join(', ')}]`);
  
  socket.join(`group_${groupId}`);
  
  console.log(`   Rooms after: [${[...socket.rooms].join(', ')}]`);
  console.log(`✅ Socket ${socket.id} присоединился к комнате group_${groupId}`);
  console.log(`${'='.repeat(70)}\n`);
});
```

---

### Улучшение 2: Проверить что messageData ВСЕГДА содержит group_id

**Файл:** `server.js`, найти POST `/api/groups/:groupId/messages`

**Убедиться что перед `io.to()` вывод:**

```javascript
// ⭐ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Получаем аватар из таблицы users
db.query(
  'SELECT avatar FROM users WHERE id = ?',
  [sender_id],
  (err, userResults) => {
    if (err) {
      console.error('❌ Error fetching user avatar:', err);
    }
    
    const userAvatar = userResults && userResults.length > 0 ? userResults[0].avatar : null;
    
    const messageData = {
      id: messageId,
      group_id: groupId,  // ✅ КРИТИЧНОЕ ПОЛЕ!
      sender_id: sender_id,
      message,
      reply_to: reply_to || null,
      media_type,
      media_url: media_url || null,
      duration: duration || null,
      caption: caption || null,
      sender_username: req.user.username,
      sender_avatar: userAvatar,
      created_at: new Date()
    };
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📤 messageData ПЕРЕД эмитом:`);
    console.log(`   group_id: ${messageData.group_id}`);
    console.log(`   message_id: ${messageData.id}`);
    console.log(`   sender_id: ${messageData.sender_id}`);
    console.log(`   Комната: group_${groupId}`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Отправляем ответ клиенту
    res.json(messageData);
    console.log(`📤 Ответ отправлен клиенту`);

    // 🔌 Socket.io СОБЫТИЕ
    io.to(`group_${groupId}`).emit('new_group_message', messageData);
    console.log(`✅ Эмит 'new_group_message' в комнату: group_${groupId}`);
  }
);
```

---

### Улучшение 3: Добавить проверку Socket подключений

**Файл:** `server.js`, в главном Socket.io коде добавить:

```javascript
// 🔍 ДИАГНОСТИКА: Проверяем активные Socket подключения
setInterval(() => {
  const stats = {
    totalSockets: Object.keys(io.sockets.sockets).length,
    authenticatedUsers: global.authenticatedUsers ? global.authenticatedUsers.size : 0,
  };
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 SOCKET STATISTICS (каждые 30 сек):`);
  console.log(`   Total socket connections: ${stats.totalSockets}`);
  console.log(`   Authenticated users: ${stats.authenticatedUsers}`);
  console.log(`${'='.repeat(70)}\n`);
}, 30000); // Каждые 30 секунд
```

---

## 🔍 ДИАГНОСТИЧЕСКИЕ КОМАНДЫ ДЛЯ ПРОВЕРКИ

### Просмотр логов сервера в реальном времени:

```bash
cd /root/appchill/appChill/backend
pm2 logs appchill-backend --lines 100
```

### Поиск конкретных логов:

```bash
# Поиск логов группового сообщения
pm2 logs appchill-backend | grep "new_group_message"

# Поиск логов подключения к группе
pm2 logs appchill-backend | grep "JOIN GROUP ROOM"

# Поиск логов статуса чтения
pm2 logs appchill-backend | grep "message_read_status_updated"
```

---

## 📋 ПРОВЕРКА НА СЕРВЕРЕ (ручная диагностика)

### 1. Убедиться что messageData содержит group_id

Искать в логах:
```
📤 messageData ПЕРЕД эмитом:
   group_id: 123
   message_id: 456
   sender_id: 789
```

❌ Если `group_id: undefined` - есть проблема!

### 2. Проверить что Socket событие отправляется

Искать в логах:
```
✅ Эмит 'new_group_message' в комнату: group_123
```

❌ Если этой строки нет - Socket событие не отправляется!

### 3. Проверить что клиент присоединился к комнате

Искать в логах:
```
✅ Socket abc123def456 присоединился к комнате group_123
```

❌ Если этой строки нет - клиент не в комнате!

---

## 🚨 ЧАСТЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: messageData не содержит group_id

**Симптом:** Логи показывают `group_id: undefined`

**Решение:** Убедиться что в `messageData` объекте явно добавлено:
```javascript
const messageData = {
  id: messageId,
  group_id: groupId,  // ← ОБЯЗАТЕЛЬНО ЭТА СТРОКА!
  // ... остальные поля
};
```

### Проблема 2: Клиент не получает Socket события

**Симптом:** Логи `new_group_message` на сервере есть, но на клиенте ничего не приходит

**Решение:** 
- Проверить что клиент вызвал `join_group_room` ПОСЛЕ `authenticate_socket`
- Проверить что обработчик `new_group_message` зарегистрирован
- Проверить что `message.group_id` совпадает с `user.id`

### Проблема 3: Комната неправильная

**Симптом:** Логи: `✅ Эмит в комнату: group_undefined`

**Решение:** Убедиться что `groupId` передан в POST запросе в параметрах URL:
```javascript
POST /api/groups/123/messages  // 123 - это groupId
```

---

## 🔄 ПЕРЕЗАГРУЗКА СЕРВЕРА ПОСЛЕ ИЗМЕНЕНИЙ

```bash
cd /root/appchill/appChill/backend
pm2 restart appchill-backend --update-env
pm2 logs appchill-backend --lines 50
```

Убедиться что вывод:
```
[CLUSTER MODE] - Worker #0 online
✅ Server started on port 3001
```

---

## 📊 ИТОГОВАЯ СХЕМА ПОТОКА ДАННЫХ

```
CLIENT (Группа 123)
  ↓
  emit('authenticate_socket', {user_id: 1})
  ↓
SERVER: authenticate_socket обработчик
  ↓
  emit('join_group_room', 123)  [с задержкой 100ms]
  ↓
SERVER: socket.join('group_123')
  ↓
CLIENT отправляет сообщение
  ↓
SERVER: POST /api/groups/123/messages
  ↓
SERVER: messageData = {group_id: 123, ...}
  ↓
SERVER: io.to('group_123').emit('new_group_message', messageData)
  ↓
CLIENT: sharedSocket.on('new_group_message', handleNewMessage)
  ↓
CLIENT: проверка message.group_id === user.id (123 === 123 ✓)
  ↓
CLIENT: добавляет сообщение в список
```

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [ ] На клиенте применены 6 изменений из CHATSCREEN_CLIENT_FIX.md
- [ ] `authenticate_socket` вызывается ПЕРВЫМ
- [ ] `join_group_room` вызывается ВТОРЫМ с задержкой
- [ ] Обработчики регистрируются для обоих типов (`new_group_message` и `new_message`)
- [ ] На сервере `messageData` содержит `group_id`
- [ ] На сервере отправляется `io.to('group_${groupId}').emit()`
- [ ] Консоль показывает логи подключения к комнате
- [ ] Консоль показывает логи отправки сообщения
- [ ] Тестировка: сообщение приходит в реальном времени
- [ ] Тестировка: галочки обновляются в реальном времени
