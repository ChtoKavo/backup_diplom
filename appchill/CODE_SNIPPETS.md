# 💾 КОПИРОВАТЬ-ВСТАВИТЬ КОД

Используй эти блоки для быстрого применения изменений в ChatScreen.js

---

## БЛОК 1: handleConnect (Исправление порядка эмитов)

```javascript
const handleConnect = () => {
  console.log('✅ Подключено к WebSocket');
  
  // 🔑 КРИТИЧНО: Первый шаг - аутентификация
  if (currentUser?.id) {
    sharedSocket.emit('authenticate_socket', { user_id: currentUser.id });
    console.log('🔐 Socket authenticated with user_id:', currentUser.id);
    
    // Отправляем статус "онлайн" для текущего пользователя
    sharedSocket.emit('user_status', { 
      user_id: currentUser.id, 
      is_online: true,
      timestamp: new Date().toISOString()
    });
    console.log('🟢 Отправлен статус онлайн для текущего пользователя');
  }

  // 🔑 КРИТИЧНО: Второй шаг - присоединяемся к комнате ПОСЛЕ аутентификации
  // ⏰ Небольшая задержка чтобы убедиться что аутентификация обработана
  setTimeout(() => {
    if (isGroup) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔴 ПРИСОЕДИНЯЮСЬ К ГРУППОВОЙ КОМНАТЕ`);
      console.log(`   group_id: ${user.id}`);
      console.log(`   current_user_id: ${currentUser?.id}`);
      console.log(`${'='.repeat(60)}`);
      sharedSocket.emit('join_group_room', user.id);
      console.log(`✅ Эмит 'join_group_room' отправлен на сервер\n`);
    } else {
      // ✅ КРИТИЧНОЕ: Присоединяемся к личной комнате
      sharedSocket.emit('join_personal_room', user.id);
      console.log('✅ Присоединился к личной комнате: user_' + currentUser?.id);
      
      sharedSocket.emit('subscribe_user_status', user.id);
    }
  }, 100); // Задержка 100ms для гарантии обработки аутентификации
  
  // ✅ Отправляем серверу что пользователь открыл чат
  sharedSocket.emit('set_active_chat', {
    chat_id: user.id,
    chat_type: isGroup ? 'group' : 'personal',
    timestamp: new Date().toISOString()
  });
  console.log('📍 Отправлено set_active_chat для', isGroup ? 'группы' : 'личного чата', user.id);
};
```

---

## БЛОК 2: Регистрация обработчиков (исправить условную регистрацию)

**НАЙТИ этот код:**
```javascript
registerHandler(isGroup ? 'new_group_message' : 'new_message', handleNewMessage);
```

**ЗАМЕНИТЬ НА:**
```javascript
// ✅ ИСПРАВЛЕНИЕ: Регистрируем ОБА обработчика ВСЕГДА
registerHandler('new_group_message', handleNewMessage);
registerHandler('new_message', handleNewMessage);
console.log(`✅ Зарегистрированы оба обработчика: new_message и new_group_message`);
```

---

## БЛОК 3: Direct Listeners (Добавить после регистрации обработчиков)

```javascript
// 🔴 КРИТИЧНА ДИАГНОСТИКА: Слушаем напрямую на сокете для отладки
if (sharedSocket && isGroup) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 ДОБАВЛЯЮ DIRECT LISTENERS ДЛЯ ГРУППЫ ${user.id}`);
  console.log(`${'='.repeat(60)}`);
  
  sharedSocket.on('new_group_message', (data) => {
    console.log(`\n🔴 [DIRECT ON] new_group_message получено:`, data);
    console.log(`   Message ID: ${data?.id}`);
    console.log(`   Group ID: ${data?.group_id}`);
    console.log(`   Sender: ${data?.sender_id}`);
    console.log(`   Current user: ${currentUser?.id}`);
    console.log(`   Current group: ${user.id}`);
    console.log(`   Match: ${data?.group_id === user.id}\n`);
  });
  console.log(`✅ Добавлен sharedSocket.on('new_group_message')`);

  sharedSocket.on('message_read_status_updated', (data) => {
    console.log(`\n🔴 [DIRECT ON] message_read_status_updated получено:`, data);
    console.log(`   Message ID: ${data?.message_id}`);
    console.log(`   Group ID: ${data?.group_id}`);
    console.log(`   Reader count: ${data?.reader_count}\n`);
  });
  console.log(`✅ Добавлен sharedSocket.on('message_read_status_updated')\n`);
}
```

---

## БЛОК 4: handleNewMessage (Проверить эту функцию)

```javascript
const handleNewMessage = (message) => {
  console.log('🔔 [ChatScreen] Получено сообщение:', message);
  console.log('   От:', message.sender_id, '| Кому:', message.receiver_id);
  console.log(`   isGroup=${isGroup}, user.id=${user.id}, message.group_id=${message.group_id}`);

  let isForThisChat = false;
  if (isGroup) {
    // ✅ ДЛЯ ГРУПП: сравниваем group_id
    isForThisChat = message.group_id === user.id;
    console.log(`   Group message check: ${message.group_id} === ${user.id}? ${isForThisChat}`);
  } else {
    // ДЛЯ ЛИЧНЫХ: сравниваем sender/receiver
    isForThisChat =
      (message.sender_id === user.id && message.receiver_id === currentUser.id) ||
      (message.sender_id === currentUser.id && message.receiver_id === user.id);
    console.log(`   Personal message check: isForThisChat? ${isForThisChat}`);
  }

  if (isForThisChat) {
    setMessages(prev => {
      const exists = prev.some(msg => msg.id === message.id);
      if (exists) {
        console.log('   ⚠️ Сообщение уже есть, пропускаем');
        return prev;
      }
      
      console.log('   ✅ Добавляем сообщение в список');

      if (message.sender_id !== currentUser.id) {
        const senderName = isGroup ? (message.sender_username || displayName) : displayName;
        const template = NotificationTemplates.newMessage(senderName, message.message);
        showNotificationIfEnabled(template, {
          chatId: user.id,
          messageId: message.id,
          isGroup
        });
        setTimeout(() => scrollToBottom(), 100);
        
        // Отмечаем входящее сообщение как прочитанное
        if (!isGroup) {
          markMessageAsRead(message.id);
        }
      }

      return [...prev, message];
    });
  } else {
    console.log('   ❌ Сообщение не для этого чата, игнорируем');
  }
};
```

---

## БЛОК 5: handleMessageReadStatusUpdated

```javascript
const handleMessageReadStatusUpdated = (data) => {
  const { message_id, is_read, read_by, reader_count, sender_id, receiver_id, group_id } = data;
  
  console.log(`\n🔔 Socket: message_read_status_updated получено:`);
  console.log(`   message_id: ${message_id}`);
  console.log(`   is_read: ${is_read}`);
  console.log(`   read_by: ${read_by}`);
  console.log(`   sender_id: ${sender_id}, receiver_id: ${receiver_id}`);
  console.log(`   group_id: ${group_id}`);
  console.log(`   Текущий чат: isGroup=${isGroup}, user.id=${user.id}`);
  
  // ПРОВЕРКА: Это событие для нашего чата?
  let isForThisChat = false;
  if (group_id) {
    // Групповой чат
    isForThisChat = group_id === user.id;
    console.log(`   Группа проверка: ${group_id} === ${user.id}? ${isForThisChat}`);
  } else if (!isGroup) {
    // Личный чат
    isForThisChat = (sender_id === user.id || receiver_id === user.id);
    console.log(`   Личный чат проверка: ${sender_id} === ${user.id} или ${receiver_id} === ${user.id}? ${isForThisChat}`);
  }
  
  if (!isForThisChat) {
    console.log(`   ❌ События для другого чата, игнорируем`);
    return;
  }
  
  console.log(`   ✅ События для этого чата, обновляем`);
  
  // Обновляем сообщение в списке
  setMessages(prev => prev.map(msg => {
    if (msg.id === message_id) {
      console.log(`   📝 Обновляю сообщение ${message_id}: is_read ${msg.is_read} → ${is_read}`);
      return {
        ...msg,
        is_read: is_read,
        read_by: read_by || msg.read_by,  // Для групповых: массив читателей
        reader_count: reader_count || msg.reader_count  // Количество читателей
      };
    }
    return msg;
  }));
  
  console.log(`✅ Сообщение ${message_id} обновлено\n`);
};
```

---

## БЛОК 6: Регистрация handleMessageReadStatusUpdated

**НАЙТИ:**
```javascript
console.log(`\n✅ Подписываюсь на 'message_read_status_updated'...`);
registerHandler('message_read_status_updated', handleMessageReadStatusUpdated);
console.log(`✅ Подписка на 'message_read_status_updated' успешна\n`);
```

**Убедиться что ОНО ЕСТЬ, если нет - ДОБАВИТЬ!**

---

## ✅ КОПИРОВАНИЕ БЕЗ ОШИБОК

1. Выбрать блок кода выше
2. Ctrl+C скопировать
3. Открыть ChatScreen.js
4. Найти нужное место (указано в CHATSCREEN_CLIENT_FIX.md)
5. Ctrl+V вставить
6. Проверить что код не поломан (отступы, скобки, запятые)
7. Сохранить файл

---

## 🔍 ВСТАВКА КОДА - ПРАКТИЧЕСКИЕ СОВЕТЫ

### Проблема: Отступы поломались

**Решение:** VS Code → Edit → Format Document (Ctrl+Shift+I)

### Проблема: Не нашёл нужное место для вставки

**Решение:** Использовать Ctrl+F поиск по уникальной строке из CHATSCREEN_CLIENT_FIX.md

### Проблема: После вставки красные ошибки

**Решение:** Проверить что:
- Все фигурные скобки `{` имеют парные `}`
- Все круглые скобки `(` имеют парные `)`
- Все точки с запятой `;` на месте

---

## 📱 ТЕСТИРОВАНИЕ ПОСЛЕ ВСТАВКИ

После вставки каждого блока:

1. Сохранить файл (Ctrl+S)
2. Перезагрузить приложение
3. Открыть консоль (DevTools)
4. Поискать логи из вставленного кода

Например, если вставили БЛОК 1, должны видеть:
```
✅ Подключено к WebSocket
🔐 Socket authenticated with user_id: 123
🔴 ПРИСОЕДИНЯЮСЬ К ГРУППОВОЙ КОМНАТЕ
```

Если этих логов нет - вставка не прошла правильно!

---

## 💡 ПОМОЩЬ

Если не уверен где вставлять:

1. В CHATSCREEN_CLIENT_FIX.md есть точное описание "**Найти:**"
2. Используй Ctrl+F в VS Code
3. Поискай эту строку
4. Вставь код рядом

Например:
- "**Найти:** Функция `handleConnect` внутри `useEffect`"
- Ctrl+F → поиск "handleConnect"
- Нашли? Вставляем рядом!
