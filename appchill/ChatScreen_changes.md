# Диагностика: Сокеты группового чата не работают

## ❌ ПРОБЛЕМА

- Сообщения в групповом чате не доставляются в реальном времени
- Галочки (read status) не обновляются в реальном времени
- События `new_group_message` и `message_read_status_updated` не приходят

## ✅ ЧЕКЛИСТ ДЛЯ ДИАГНОСТИКИ

### 1. Проверь что клиент присоединяется к группе

**В ChatScreen.js найди код где устанавливается Socket:**

```javascript
// Примерно строка 1042 в useEffect:
if (isGroup) {
  sharedSocket.emit('join_group_room', user.id);
  console.log('📡 Joined group room:', user.id);
}
```

✅ **Это должно быть ДО или ПОСЛЕ authenticateToken?** → **ПОСЛЕ**

Правильный порядок:
```javascript
handleConnect = () => {
  // 1️⃣ Сначала аутентифицируем
  sharedSocket.emit('authenticate_socket', { user_id: currentUser.id });
  
  // 2️⃣ ПОТОМ присоединяемся к группе
  if (isGroup) {
    sharedSocket.emit('join_group_room', user.id);
    console.log('📡 Joined group room:', user.id);
  }
}
```

### 2. Проверь что обработчик `new_group_message` зарегистрирован

**В ChatScreen.js найди регистрацию обработчика:**

```javascript
// Должно быть в том же useEffect где регистрируются Socket обработчики
registerHandler('new_group_message', handleNewMessage);
console.log(`✅ Зарегистрирован слушатель для события: new_group_message`);
```

⚠️ **ВАЖНО:** Обработчик может быть не зарегистрирован если это условие:
```javascript
registerHandler(isGroup ? 'new_group_message' : 'new_message', handleNewMessage);
```

### 3. Проверь что `handleNewMessage` корректно определяет групповое сообщение

```javascript
const handleNewMessage = (message) => {
  console.log('🔔 [ChatScreen] Получено сообщение:', message);
  console.log('   От:', message.sender_id, '| Кому:', message.receiver_id);
  console.log('   isGroup:', isGroup, '| message.group_id:', message.group_id, '| user.id:', user.id);

  let isForThisChat = false;
  if (isGroup) {
    // ✅ Для групп: сравниваем group_id
    isForThisChat = message.group_id === user.id;
    console.log(`   Group message check: ${message.group_id} === ${user.id}? ${isForThisChat}`);
  } else {
    // Для личных: сравниваем sender/receiver
    isForThisChat =
      (message.sender_id === user.id && message.receiver_id === currentUser.id) ||
      (message.sender_id === currentUser.id && message.receiver_id === user.id);
  }
  
  if (!isForThisChat) {
    console.log('   ❌ Сообщение не для этого чата, игнорируем');
    return;
  }
  
  // Добавляем сообщение...
};
```

### 4. Проверь что на сервере отправляется `message.group_id`

**На сервере (строка 2930):**

```javascript
io.to(`group_${groupId}`).emit('new_group_message', messageData);
```

✅ `messageData` должен содержать `group_id`:

```javascript
const messageData = {
  id: result.insertId,
  message: message,
  sender_id: sender_id,
  group_id: groupId,  // ✅ ОБЯЗАТЕЛЬНО ДОЛЖНО БЫТЬ!
  media_type: media_type,
  media_url: media_url,
  created_at: new Date().toISOString(),
  ...
};
```

### 5. Проверь логи сокета на сервере

При отправке сообщения в группу должно быть:

```
📡 Socket.io EVENTS:
   ✅ Эмит 'new_group_message' в комнату: group_<groupId>
```

### 6. Проверь что сокет находится в правильной комнате

**На сервере когда клиент подключается:**

```javascript
socket.on('join_group_room', (groupId) => {
  socket.join(`group_${groupId}`);
  console.log(`✅ Socket ${socket.id} присоединился к комнате group_${groupId}`);
});
```

---

## 🔧 ЕСЛИ НЕ РАБОТАЕТ - РЕШЕНИЕ

### Вариант 1: join_group_room вызывается до authenticate_socket

**НЕПРАВИЛЬНО:**
```javascript
if (isGroup) {
  sharedSocket.emit('join_group_room', user.id);  // ❌ Вызов ДО аутентификации
}
sharedSocket.emit('authenticate_socket', { user_id: currentUser.id });
```

**ПРАВИЛЬНО:**
```javascript
sharedSocket.emit('authenticate_socket', { user_id: currentUser.id });
// затем в handleConnect:
if (isGroup) {
  sharedSocket.emit('join_group_room', user.id);  // ✅ Вызов ПОСЛЕ аутентификации
}
```

### Вариант 2: Обработчик не регистрируется для групп

Убедись что в месте регистрации обработчика:

```javascript
// ✅ ПРАВИЛЬНО - ВСЕГДА регистрируем оба
registerHandler('new_message', handleNewMessage);
registerHandler('new_group_message', handleNewMessage);

// ❌ НЕПРАВИЛЬНО - условная регистрация
if (isGroup) {
  registerHandler('new_group_message', handleNewMessage);
} else {
  registerHandler('new_message', handleNewMessage);
}
```

---

## Изменение 1: Добавить обработчик события `chat_cleared`

**Где найти:** В `useEffect` где регистрируются Socket обработчики (примерно после строки 950)

**Ищи этот блок:**
```javascript
// Регистрируем обработчик статуса чтения сообщений (для всех чатов)
console.log(`\n✅ Подписываюсь на 'message_read_status_updated'...`);
registerHandler('message_read_status_updated', handleMessageReadStatusUpdated);
console.log(`✅ Подписка на 'message_read_status_updated' успешна\n`);
```

**Добавь после него:**
```javascript
// 🆕 НОВОЕ: Обработчик очистки чата в реальном времени
const handleChatCleared = (data) => {
  console.log('🧹 Socket: Получено событие chat_cleared:', data);
  console.log(`   Текущий чат: user.id=${user.id}, isGroup=${isGroup}`);
  console.log(`   Данные события: initiatorId=${data?.initiatorId}, otherUserId=${data?.otherUserId}`);
  
  if (isGroup) {
    console.log('   ❌ Это групповой чат, игнорируем');
    return;
  }
  
  // ✅ ИСПРАВЛЕНО: Проверяем что это чат между нами и отправителем события
  // data.initiatorId - тот кто нажал "очистить"
  // data.otherUserId - адресат (второй участник)
  // Событие придёт обоим, нам нужно очистить если это наш чат
  const isRelevantChat = 
    (data?.initiatorId === user.id && data?.otherUserId === currentUser?.id) ||
    (data?.otherUserId === user.id && data?.initiatorId === currentUser?.id) ||
    (data?.initiatorId === user.id) ||
    (data?.otherUserId === user.id);
  
  console.log(`   isRelevantChat: ${isRelevantChat}`);
  
  if (!isRelevantChat) {
    console.log(`   ❌ Событие не для нашего чата, игнорируем`);
    return;
  }
  
  console.log(`   ✅ Это наш чат! Очищаем локально`);
  setMessages([]);
  success('Готово', 'Чат очищен обоими пользователями');
};

registerHandler('chat_cleared', handleChatCleared);
console.log(`✅ Подписка на 'chat_cleared' успешна`);
```

---

## Изменение 2: Обновить функцию `handleClearChat`

**Где найти:** Примерно на строке 2400, функция `handleClearChat`

**Старый код:**
```javascript
const handleClearChat = async () => {
  try {
    await messageAPI.clearChat(user.id);
    setMessages([]);
    success('Успех', 'Чат очищен');
  } catch (err) {
    console.error('Ошибка очистки чата:', err);
    error('Ошибка', 'Не удалось очистить чат: ' + (err.response?.data?.error || err.message));
  }
};
```

**Новый код:**
```javascript
const handleClearChat = async () => {
  try {
    console.log('🧹 Начинаю очистку чата...');
    const response = await messageAPI.clearChat(user.id);
    
    // Локально очищаем сообщения
    setMessages([]);
    console.log(`✅ Чат локально очищен (${response.data?.deletedCount || 0} сообщений удалено)`);
    
    // 📡 Отправляем Socket событие на сервер (избыточно, но для синхронизации)
    if (socket && socket.connected) {
      socket.emit('request_clear_chat', {
        other_user_id: user.id,
        timestamp: new Date().toISOString()
      });
      console.log('📤 Отправлено событие request_clear_chat на сервер');
    }
    
    success('Успех', 'Чат очищен у обоих пользователей');
  } catch (err) {
    console.error('❌ Ошибка очистки чата:', err);
    error('Ошибка', 'Не удалось очистить чат: ' + (err.response?.data?.error || err.message));
  }
};
```

---

## Что это делает:

1. **На сервере** (уже внедрено):
   - Когда API получает запрос `/api/messages/clear-chat/:userId`
   - Удаляет все сообщения между двумя пользователями
   - Отправляет Socket.IO событие `chat_cleared` обоим пользователям

2. **На клиенте** (эти изменения):
   - Слушает событие `chat_cleared` через Socket.IO
   - Проверяет что событие для текущего чата
   - Очищает локальный список сообщений
   - Показывает уведомление пользователю

3. **Синхронизация**:
   - Когда User A очищает чат с User B
   - Both User A и User B увидят пустой чат мгновенно
   - Работает в реальном времени через WebSocket

---

## Проверка:

1. Открой чат между двумя пользователями
2. В меню чата нажми "Очистить чат"
3. Подтверди действие
4. Оба пользователя должны увидеть пустой чат одновременно
5. В консоли будут логи:
   - 🧹 Начинаю очистку чата...
   - ✅ Чат локально очищен...
   - 📤 Отправлено событие request_clear_chat на сервер
   - 🧹 Socket: Получено событие chat_cleared
   - ✅ Это наш чат, очищаем локально
