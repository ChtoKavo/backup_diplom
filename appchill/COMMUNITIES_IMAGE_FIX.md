# 🖼️ ИСПРАВЛЕНИЕ: Нет изображений при создании сообщества

## 🔴 ПРОБЛЕМА

При создании сообщества с изображением:
- Изображение не отображается после создания
- Base64 строка может быть слишком большой для БД
- Сохранение base64 неэффективно

---

## ✅ РЕШЕНИЕ

Есть **два подхода**:

### **ПОДХОД 1: Загружать через multipart/form-data (РЕКОМЕНДУЕТСЯ)**

Это лучший способ - отправлять файл, а не base64 строку.

**ШАГ 1: Обновить CommunitiesScreen.js - функция handleCreateCommunity**

**Найти:**
```javascript
  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) {
      warning('Ошибка', 'Введите название сообщества');
      return;
    }

    setIsCreating(true);
    try {
      const data = {
        name: newCommunityName,
        description: newCommunityDescription,
        image: newCommunityImage,
      };

      const response = await communitiesAPI.createCommunity?.(data);
```

**ЗАМЕНИТЬ НА:**
```javascript
  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) {
      warning('Ошибка', 'Введите название сообщества');
      return;
    }

    setIsCreating(true);
    try {
      // ✅ Создаём FormData для отправки файла
      const formData = new FormData();
      formData.append('name', newCommunityName);
      formData.append('description', newCommunityDescription);
      
      // Если есть изображение - добавляем его как файл
      if (newCommunityImage) {
        const imageUri = getImageUri(newCommunityImage);
        if (imageUri && imageUri.startsWith('file://')) {
          // Это локальный файл - добавляем как Blob
          formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `community-${Date.now()}.jpg`,
          });
        } else if (imageUri && imageUri.startsWith('data:')) {
          // Это base64 - конвертируем в Blob и добавляем
          const blobData = await fetch(imageUri).then(r => r.blob());
          formData.append('image', blobData, `community-${Date.now()}.jpg`);
        }
      }

      // ✅ Отправляем FormData вместо JSON
      const response = await communitiesAPI.createCommunity?.(formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
```

---

### **ПОДХОД 2: Оптимизировать base64 перед отправкой (ПРОСТОЙ)**

Если вы хотите остаться с base64, но оптимизировать размер.

**Найти в pickImage функции:**
```javascript
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setNewCommunityImage(base64);
    }
  };
```

**ЗАМЕНИТЬ НА:**
```javascript
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,  // ⬇️ Снижаем качество с 0.8 до 0.6
      base64: true,
    });

    if (!result.canceled) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      // ✅ Логируем размер для отладки
      console.log(`📸 Изображение выбрано, размер base64: ${(base64.length / 1024).toFixed(2)} KB`);
      setNewCommunityImage(base64);
    }
  };
```

---

## 🔧 ШАГ 2: Обновить сервер для обработки multipart/form-data

**В server.js найти (строка ~8172):**
```javascript
  app.post('/api/communities', authenticateToken, (req, res) => {
    const { name, description, category = 'General', image, banner_image, rules, is_private = false } = req.body;
```

**ЗАМЕНИТЬ НА:**
```javascript
  // 🆕 ДОБАВИТЬ MULTER ДЛЯ ЗАГРУЗКИ ИЗОБРАЖЕНИЙ
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  
  // Настройка хранилища для загрузок
  const uploadsDir = path.join(__dirname, 'uploads/communities');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const communityUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'community-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Разрешены только изображения'));
      }
    }
  });

  app.post('/api/communities', authenticateToken, communityUpload.single('image'), (req, res) => {
    const { name, description, category = 'General', banner_image, rules, is_private = false } = req.body;
    const userId = req.user.id;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🆕 СОЗДАНИЕ СООБЩЕСТВА`);
    console.log(`   Название: ${name}`);
    console.log(`   Категория: ${category}`);
    console.log(`   Приватное: ${is_private}`);
    console.log(`   Создатель: ${userId}`);
    console.log(`   Файл загружен: ${req.file ? 'ДА' : 'НЕТ'}`);
    if (req.file) {
      console.log(`   Имя файла: ${req.file.filename}`);
      console.log(`   Размер: ${(req.file.size / 1024).toFixed(2)} KB`);
    }
    console.log(`${'='.repeat(70)}`);
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Название сообщества обязательно' });
    }
    
    if (name.length > 100) {
      return res.status(400).json({ error: 'Название не должно превышать 100 символов' });
    }
    
    // ✅ Формируем URL изображения
    let imageUrl = null;
    if (req.file) {
      imageUrl = `http://151.241.228.247:3001/uploads/communities/${req.file.filename}`;
      console.log(`✅ Image URL: ${imageUrl}`);
    }
    
    // Создаем сообщество
    db.query(
      `INSERT INTO communities (name, description, category, creator_id, image, banner_image, rules, is_private) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, category, userId, imageUrl || null, banner_image || null, rules || null, is_private ? 1 : 0],
      (err, result) => {
        if (err) {
          console.error('❌ Ошибка создания сообщества:', err);
          // Удаляем загруженный файл если был
          if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
              if (unlinkErr) console.error('⚠️ Ошибка удаления файла:', unlinkErr);
            });
          }
          return res.status(500).json({ error: 'Ошибка сервера', details: err.message });
        }
        
        const communityId = result.insertId;
        console.log(`✅ Сообщество ${communityId} создано в БД`);
        
        // ... остальной код без изменений ...
```

---

## ✅ ИТОГОВЫЙ ЧЕКЛИСТ

### Клиент (CommunitiesScreen.js):
- [ ] `pickImage()` оптимизирует качество
- [ ] `handleCreateCommunity()` создаёт FormData
- [ ] Отправляет изображение как файл через `multipart/form-data`

### Сервер (server.js):
- [ ] Добавлен multer для обработки загрузок
- [ ] Создана папка `uploads/communities`
- [ ] Файл сохраняется на диск
- [ ] URL формируется правильно: `http://151.241.228.247:3001/uploads/communities/...`
- [ ] URL сохраняется в БД в поле `image`
- [ ] URL возвращается в ответе создания

### Статический файловый сервис:
- [ ] `app.use('/uploads', express.static('uploads'));` в server.js
- [ ] Папка `uploads/communities` доступна по HTTP

---

## 📱 ТЕСТИРОВАНИЕ

1. Открыть CommunitiesScreen
2. Нажать кнопку создания сообщества
3. Выбрать изображение из галереи
4. Заполнить название и описание
5. Нажать "Создать сообщество"
6. **Проверить:**
   - ✅ Сообщество создалось
   - ✅ Изображение отображается в списке
   - ✅ В консоли сервера логи с именем файла и размером
   - ✅ Файл находится в `appChill/backend/uploads/communities/`

---

## 🐛 ЕСЛИ ОСТАЮТСЯ ПРОБЛЕМЫ

**Проблема:** "Разрешены только изображения"
- **Решение:** Проверить что вы выбираете файл изображения, а не другой тип

**Проблема:** "413 Payload Too Large"
- **Решение:** Увеличить лимит в multer: `limits: { fileSize: 20 * 1024 * 1024 }`

**Проблема:** Изображение не загружается
- **Решение:** Проверить что папка `uploads/communities` создана и доступна
  ```bash
  mkdir -p /root/appchill/appChill/backend/uploads/communities
  chmod 755 /root/appchill/appChill/backend/uploads/communities
  ```

**Проблема:** 404 при попытке просмотра изображения
- **Решение:** Убедиться что есть строка в server.js:
  ```javascript
  app.use('/uploads', express.static('uploads'));
  ```
