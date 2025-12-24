# 🚫 Система бана пользователей

## Описание
Система управления банами позволяет администраторам блокировать доступ пользователей ко всему контенту приложения.

## Структура БД

Добавлены новые поля в таблицу `users`:
- `is_banned BOOLEAN DEFAULT FALSE` - статус бана (забанен или нет)
- `ban_reason TEXT` - причина бана
- `banned_at TIMESTAMP` - когда пользователь был забанен
- `banned_by INT` - ID администратора, который забанил пользователя (foreign key)

## API Endpoints

### 1. Забанить пользователя
```
POST /api/admin/users/:userId/ban
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "reason": "Спам и оскорбления"  // опционально, default: "Нарушение правил сообщества"
}

Response (200):
{
  "success": true,
  "message": "Пользователь 123 успешно забанен",
  "reason": "Спам и оскорбления"
}

Response (403): "Доступ запрещен. Требуются права администратора"
Response (404): "Пользователь не найден"
```

### 2. Разбанить пользователя
```
POST /api/admin/users/:userId/unban
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Пользователь 123 успешно разбанен"
}

Response (403): "Доступ запрещен. Требуются права администратора"
Response (404): "Пользователь не найден"
```

### 3. Получить информацию о бане пользователя
```
GET /api/admin/users/:userId/ban-info
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "id": 123,
    "username": "user123",
    "email": "user@example.com",
    "is_banned": true,
    "ban_reason": "Спам и оскорбления",
    "banned_at": "2025-11-16T10:30:00.000Z",
    "banned_by": 1,
    "banned_by_username": "admin"
  }
}

Response (403): "Доступ запрещен. Требуются права администратора"
Response (404): "Пользователь не найден"
```

### 4. Получить всех забаненных пользователей
```
GET /api/admin/banned-users
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 123,
      "username": "user123",
      "email": "user@example.com",
      "ban_reason": "Спам и оскорбления",
      "banned_at": "2025-11-16T10:30:00.000Z",
      "banned_by_username": "admin"
    },
    ...
  ]
}

Response (403): "Доступ запрещен. Требуются права администратора"
```

## Поведение

### При входе забаненного пользователя
```
POST /api/login
Email: banned@example.com
Password: password123

Response (403):
{
  "error": "Ваш аккаунт заблокирован",
  "reason": "Спам и оскорбления",
  "banned_at": "2025-11-16T10:30:00.000Z"
}
```

### При выполнении любого запроса забаненным пользователем
Если забаненный пользователь имеет valid token и пытается выполнить запрос (через old token):

```
Response (403):
{
  "error": "Ваш аккаунт заблокирован",
  "reason": "Спам и оскорбления"
}
```

### WebSocket уведомление
Если забаненный пользователь онлайн, ему отправляется WebSocket сообщение:
```javascript
socket.on('user_banned', (data) => {
  console.log(data.reason);      // "Спам и оскорбления"
  console.log(data.message);     // "Ваш аккаунт заблокирован администратором"
});
```

## Требования

- Требуются **права администратора** (`is_admin = true`)
- Админ **не может забанить сам себя**
- При бане **все активные сессии пользователя остаются**, но при следующем запросе будут отклонены
- При разбане пользователь может снова входить в систему

## Обновление БД

Если вы используете **существующую БД**, выполните SQL скрипт:
```bash
mysql -u your_user -p your_database < ban_system.sql
```

Или используйте MySQL консоль:
```sql
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN banned_by INT NULL;
ALTER TABLE users ADD FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL;
```

## Примеры использования

### JavaScript/Axios

```javascript
// Забанить пользователя
async function banUser(userId, reason = 'Нарушение правил') {
  try {
    const response = await api.post(`/admin/users/${userId}/ban`, {
      reason: reason
    });
    console.log(response.data.message);
  } catch (error) {
    console.error(error.response.data.error);
  }
}

// Разбанить пользователя
async function unbanUser(userId) {
  try {
    const response = await api.post(`/admin/users/${userId}/unban`);
    console.log(response.data.message);
  } catch (error) {
    console.error(error.response.data.error);
  }
}

// Получить информацию о бане
async function getBanInfo(userId) {
  try {
    const response = await api.get(`/admin/users/${userId}/ban-info`);
    console.log(response.data.data);
  } catch (error) {
    console.error(error.response.data.error);
  }
}

// Получить всех забаненных пользователей
async function getAllBannedUsers() {
  try {
    const response = await api.get('/admin/banned-users');
    console.log(response.data.data);
  } catch (error) {
    console.error(error.response.data.error);
  }
}
```

### cURL примеры

```bash
# Забанить пользователя
curl -X POST http://localhost:3001/api/admin/users/123/ban \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Спам и оскорбления"}'

# Разбанить пользователя
curl -X POST http://localhost:3001/api/admin/users/123/unban \
  -H "Authorization: Bearer YOUR_TOKEN"

# Получить информацию о бане
curl -X GET http://localhost:3001/api/admin/users/123/ban-info \
  -H "Authorization: Bearer YOUR_TOKEN"

# Получить всех забаненных пользователей
curl -X GET http://localhost:3001/api/admin/banned-users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Безопасность

- ✅ Только администраторы могут банить/разбанить
- ✅ Защита от самобана
- ✅ Все запросы забаненного пользователя отклоняются
- ✅ История бана сохраняется (who banned, when, why)
- ✅ WebSocket уведомления о бане
