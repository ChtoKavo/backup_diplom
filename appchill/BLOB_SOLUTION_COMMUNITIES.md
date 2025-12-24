================================================================================
РЕШЕНИЕ: Отправка Blob вместо base64
================================================================================

ПРЕИМУЩЕСТВА:
✅ Меньше размер данных (Blob компактнее base64)
✅ Быстрее передача
✅ Нет потерь качества
✅ Проще для React Native

================================================================================
ФАЙЛ 1: MessengerExpo/src/services/communitiesAPI.js (НОВЫЙ)
================================================================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://151.241.228.247:3001/api';

console.log('🌐 API URL:', API_URL);

// Создаём экземпляр axios
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Интерсептор для добавления токена
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    console.log('🔐 Token found:', !!token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Для FormData удаляем Content-Type - axios установит сам
    if (config.data instanceof FormData) {
      console.log('📦 FormData detected - removing explicit Content-Type header');
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Интерсептор для обработки ошибок ответа
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response status:', response.status);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
    });
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

// ✅ Функция конвертации base64 в Blob
const base64ToBlob = (base64String, mimeType = 'image/jpeg') => {
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
    return new Blob([bytes], { type: mimeType });
  } catch (err) {
    console.error('❌ Ошибка конвертации base64:', err);
    throw err;
  }
};

export default {
  createCommunity: async (formData) => {
    try {
      console.log('═══════════════════════════════════════');
      console.log('📤 СОЗДАНИЕ СООБЩЕСТВА');
      console.log('═══════════════════════════════════════');
      
      if (!(formData instanceof FormData)) {
        throw new Error('❌ Data must be FormData instance');
      }
      
      console.log('📦 FormData type check: PASSED');
      console.log('🌐 URL: /communities');
      console.log('⏱️ Timeout: 30000ms');
      
      // Отправляем FormData
      const response = await axiosInstance.post('/communities', formData);
      
      console.log('✅ Server response received');
      console.log('📊 Status:', response.status);
      console.log('💾 Data:', response.data);
      
      return response;
      
    } catch (err) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в createCommunity:');
      console.error('   Message:', err.message);
      console.error('   Code:', err.code);
      console.error('   Status:', err.response?.status);
      console.error('   Response data:', err.response?.data);
      throw err;
    }
  },

  getCommunities: async () => {
    try {
      console.log('📥 Загрузка сообществ...');
      const response = await axiosInstance.get('/communities');
      console.log('✅ Сообщества загружены:', response.data?.length || 0);
      return response;
    } catch (err) {
      console.error('❌ Ошибка загрузки сообществ:', err.message);
      throw err;
    }
  },

  getCommunity: (id) => axiosInstance.get(`/communities/${id}`),
  updateCommunity: (id, data) => axiosInstance.put(`/communities/${id}`, data),
  deleteCommunity: (id) => axiosInstance.delete(`/communities/${id}`),
  joinCommunity: (id) => axiosInstance.post(`/communities/${id}/join`),
  leaveCommunity: (id) => axiosInstance.post(`/communities/${id}/leave`),
};

export { base64ToBlob };


================================================================================
ФАЙЛ 2: MessengerExpo/src/screens/CommunitiesScreen.js (ФУНКЦИЯ handleCreateCommunity)
================================================================================

ЗАМЕНИТЕ ФУНКЦИЮ handleCreateCommunity НА ЭТУ:

const handleCreateCommunity = async () => {
  if (!newCommunityName.trim()) {
    warning('Ошибка', 'Введите название сообщества');
    return;
  }

  setIsCreating(true);
  try {
    console.log('═══════════════════════════════════════');
    console.log('🚀 НАЧАЛО: Создание сообщества');
    console.log('═══════════════════════════════════════');
    console.log('📝 Название:', newCommunityName);
    console.log('📄 Описание:', newCommunityDescription);
    console.log('🖼️ Изображение:', !!newCommunityImage);
    
    // ✅ Создаём FormData для отправки
    const formData = new FormData();
    formData.append('name', newCommunityName);
    formData.append('description', newCommunityDescription);
    
    // Если есть изображение - конвертируем в Blob
    if (newCommunityImage) {
      const imageUri = getImageUri(newCommunityImage);
      console.log('🖼️ Image URI detected');
      
      if (imageUri && imageUri.startsWith('data:')) {
        console.log('✅ Это base64 data URI');
        
        try {
          // Конвертируем base64 в Blob
          const base64 = imageUri.split(',')[1];
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          console.log('✅ Blob создан, размер:', blob.size, 'байт');
          console.log('📊 Размер в KB:', (blob.size / 1024).toFixed(2), 'KB');
          
          // Добавляем Blob в FormData
          formData.append('image', blob, `community-${Date.now()}.jpg`);
          console.log('✅ Blob добавлен в FormData');
          
        } catch (blobError) {
          console.error('❌ Ошибка конвертации Blob:', blobError);
          throw blobError;
        }
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('📤 ОТПРАВКА ЗАПРОСА');
    console.log('═══════════════════════════════════════');
    
    // Отправляем FormData с Blob
    const response = await communitiesAPI.createCommunity(formData);

    console.log('═══════════════════════════════════════');
    console.log('✅ ОТВЕТ ПОЛУЧЕН');
    console.log('═══════════════════════════════════════');
    
    if (response?.data) {
      const newCommunity = response.data;
      console.log('🎉 Новое сообщество:', newCommunity);
      
      if (newCommunity.id) {
        setCommunities([newCommunity, ...communities]);
        success('Успех', 'Сообщество создано!');
      }
    }

    // Очищаем форму
    setNewCommunityName('');
    setNewCommunityDescription('');
    setNewCommunityImage(null);
    setShowCreateModal(false);

    // Перезагружаем список
    setTimeout(() => {
      loadCommunities();
    }, 1000);
    
  } catch (err) {
    console.error('═══════════════════════════════════════');
    console.error('❌ ОШИБКА СОЗДАНИЯ СООБЩЕСТВА');
    console.error('═══════════════════════════════════════');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('Status:', err.response?.status);
    console.error('Response:', err.response?.data);
    console.error('═══════════════════════════════════════');
    
    error('Ошибка', err.response?.data?.error || err.message || 'Не удалось создать сообщество');
  } finally {
    setIsCreating(false);
  }
};


================================================================================
РАЗНИЦА МЕЖДУ base64 И Blob
================================================================================

BASE64 (старый способ):
❌ Размер: ~33% больше чем исходные данные
❌ Медленнее передаёт
❌ Нужно конвертировать на сервере
❌ Использует больше памяти

BLOB (новый способ):
✅ Компактнее (меньше размер)
✅ Быстрее передача
✅ Сервер получает готовый файл
✅ Меньше памяти

ПРИМЕР РАЗМЕРА:
- Исходное изображение: 500 KB
- Base64: ~666 KB
- Blob: 500 KB


================================================================================
ЧТО ИЗМЕНИЛОСЬ В КОДЕ
================================================================================

В CommunitiesScreen.js функции handleCreateCommunity:

❌ БЫЛО (base64):
formData.append('image', {
  uri: imageUri,
  type: 'image/jpeg',
  name: `community-${Date.now()}.jpg`,
});

✅ СТАЛО (Blob):
const base64 = imageUri.split(',')[1];
const binaryString = atob(base64);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
const blob = new Blob([bytes], { type: 'image/jpeg' });
formData.append('image', blob, `community-${Date.now()}.jpg`);


================================================================================
УСТАНОВКА
================================================================================

1️⃣ Замените MessengerExpo/src/services/communitiesAPI.js
   - Скопируйте ВЕСЬ КОД из ФАЙЛА 1
   - Сохраните

2️⃣ Замените функцию handleCreateCommunity в CommunitiesScreen.js
   - Скопируйте код из ФАЙЛА 2
   - Сохраните

3️⃣ Перезагрузите приложение
   - Cmd+R или Cmd+M

4️⃣ Тестируйте


================================================================================
ПРОВЕРКА ЛОГОВ
================================================================================

При создании сообщества должны увидеть:

✅ Логи на клиенте:
   "✅ Blob создан, размер: XXXX байт"
   "📊 Размер в KB: X.XX KB"
   "✅ Blob добавлен в FormData"

✅ Логи на сервере:
   "Файл загружен: ДА"
   "Image URL: http://151.241.228.247:3001/uploads/communities/..."


================================================================================
