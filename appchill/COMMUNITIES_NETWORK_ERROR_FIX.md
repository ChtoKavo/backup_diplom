================================================================================
ИСПРАВЛЕНИЕ: Network Error при создании сообщества
================================================================================

ПРОБЛЕМА:
- ERROR ❌ Communities API Error: {"code": "ERR_NETWORK", ...}
- FormData не отправляется на сервер

ПРИЧИНА:
- axios переопределял Content-Type для FormData
- React Native не может обработать явный 'multipart/form-data' заголовок
- Нужно позволить axios автоматически установить правильные заголовки

РЕШЕНИЕ:
================================================================================

ФАЙЛ 1: MessengerExpo/src/services/communitiesAPI.js
────────────────────────────────────────────────────

✅ Уже исправлен на сервере. 

Ключевые изменения:
1. НЕ устанавливаем Content-Type при отправке FormData
2. Позволяем axios самому установить заголовки для FormData
3. Оставляем опциональные headers если переданы в config

Вот полный файл:

───────────────────────────────────────────────────────────
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://151.241.228.247:3001/api';

// Создаём экземпляр axios с интерсепторами
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Интерсептор для добавления токена
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ошибок
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

// ✅ Функция для конвертации base64 в Blob
const base64ToBlob = (base64String) => {
  try {
    // Удаляем data URI header если есть
    const base64 = base64String.replace(/^data:image\/\w+;base64,/, '');
    
    // Конвертируем base64 в бинарный формат
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Создаём Blob
    return new Blob([bytes], { type: 'image/jpeg' });
  } catch (err) {
    console.error('❌ Ошибка конвертации base64:', err);
    throw err;
  }
};

export default {
  createCommunity: async (data, config = {}) => {
    try {
      console.log('📤 Отправка сообщества...');
      
      // Если это FormData, отправляем как есть БЕЗ явного Content-Type
      // axios автоматически установит правильные заголовки для FormData
      if (data instanceof FormData) {
        console.log('✅ FormData обнаружена, отправляем...');
        return axiosInstance.post('/communities', data, {
          ...config,
          headers: {
            // НЕ устанавливаем Content-Type - axios сделает это автоматически
            ...config.headers,
          },
        });
      }
      
      // Если это обычные данные с base64
      if (data && data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
        console.log('🖼️ Base64 обнаружен, конвертируем в Blob...');
        
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('description', data.description || '');
        formData.append('category', data.category || 'General');
        
        // Конвертируем base64 в Blob и добавляем
        const blob = base64ToBlob(data.image);
        formData.append('image', blob, 'community-image.jpg');
        
        console.log('✅ Blob создан, размер:', blob.size, 'байт');
        
        // БЕЗ явного Content-Type - позволяем axios установить правильные заголовки
        return axiosInstance.post('/communities', formData, config);
      }
      
      // Обычный JSON запрос
      return axiosInstance.post('/communities', data, config);
    } catch (err) {
      console.error('❌ Ошибка createCommunity:', err.message);
      throw err;
    }
  },

  getCommunities: () => {
    console.log('📥 Загрузка сообществ...');
    return axiosInstance.get('/communities');
  },

  getCommunity: (id) => 
    axiosInstance.get(`/communities/${id}`),

  updateCommunity: (id, data) => 
    axiosInstance.put(`/communities/${id}`, data),

  deleteCommunity: (id) => 
    axiosInstance.delete(`/communities/${id}`),

  joinCommunity: (id) => {
    console.log(`👥 Присоединение к сообществу ${id}...`);
    return axiosInstance.post(`/communities/${id}/join`);
  },

  leaveCommunity: (id) => {
    console.log(`👋 Выход из сообщества ${id}...`);
    return axiosInstance.post(`/communities/${id}/leave`);
  },
};
───────────────────────────────────────────────────────────


ФАЙЛ 2: MessengerExpo/src/screens/CommunitiesScreen.js
──────────────────────────────────────────────────────

Найдите функцию `handleCreateCommunity` и замените её на эту:

───────────────────────────────────────────────────────────
const handleCreateCommunity = async () => {
  if (!newCommunityName.trim()) {
    warning('Ошибка', 'Введите название сообщества');
    return;
  }

  setIsCreating(true);
  try {
    console.log('📤 Начинаем создание сообщества...');
    
    // ✅ Создаём FormData для отправки файла
    const formData = new FormData();
    formData.append('name', newCommunityName);
    formData.append('description', newCommunityDescription);
    
    // Если есть изображение - добавляем его как файл
    if (newCommunityImage) {
      const imageUri = getImageUri(newCommunityImage);
      console.log('📸 Image URI detected:', imageUri?.substring(0, 50) + '...');
      
      if (imageUri && imageUri.startsWith('data:')) {
        // ✅ Извлекаем base64 данные
        const base64Data = imageUri.split(',')[1];
        
        console.log('📸 Base64 string extracted:', {
          lengthKB: (base64Data.length / 1024).toFixed(2),
        });
        
        // ✅ Добавляем файл в FormData (React Native автоматически обработает)
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `community-${Date.now()}.jpg`,
        });
        
        console.log('✅ Image appended to FormData');
      }
    }

    console.log('📤 Отправляем FormData на сервер...');
    
    // ✅ Отправляем FormData напрямую (БЕЗ конфига с headers)
    const response = await communitiesAPI.createCommunity(formData);

    if (response?.data) {
      const newCommunity = response.data;
      
      if (newCommunity.id) {
        setCommunities([newCommunity, ...communities]);
        console.log('✅ Сообщество создано:', newCommunity);
        success('Успех', 'Сообщество создано!');
      }
    }

    setNewCommunityName('');
    setNewCommunityDescription('');
    setNewCommunityImage(null);
    setShowCreateModal(false);

    setTimeout(() => {
      loadCommunities();
    }, 1000);
  } catch (err) {
    console.error('❌ Ошибка создания сообщества:', {
      message: err.message,
      response: err.response?.data,
      code: err.code,
      status: err.response?.status,
    });
    error('Ошибка', err.response?.data?.error || err.message || 'Не удалось создать сообщество');
  } finally {
    setIsCreating(false);
  }
};
───────────────────────────────────────────────────────────


ПРОВЕРКА:
================================================================================

1. ✅ Убедитесь что импорт правильный:
   import communitiesAPI from '../services/communitiesAPI';

2. ✅ Обновите оба файла на клиенте (другом компе):
   - MessengerExpo/src/services/communitiesAPI.js
   - MessengerExpo/src/screens/CommunitiesScreen.js (функция handleCreateCommunity)

3. ✅ Перезагрузите приложение (Reload или Cmd+R)

4. ✅ Создайте новое сообщество с изображением

5. ✅ Проверьте консоль логов:
   - "📤 Начинаем создание сообщества..."
   - "✅ FormData обнаружена, отправляем..."
   - "✅ Сообщество создано:"

6. ✅ На сервере проверьте логи:
   pm2 logs appchill-backend | tail -50
   
   Должны быть:
   - "🆕 СОЗДАНИЕ СООБЩЕСТВА"
   - "Файл загружен: ДА"
   - "✅ Image URL: http://151.241.228.247:3001/uploads/communities/..."

7. ✅ Проверьте что файл сохранился:
   ls -la /root/appchill/appChill/backend/uploads/communities/

================================================================================
