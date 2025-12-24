================================================================================
ПОЛНОЕ РЕШЕНИЕ: Ошибка создания сообщества (ERR_NETWORK)
================================================================================

ПРОБЛЕМА:
- "Network Error" при отправке FormData
- axios не может отправить multipart/form-data на сервер
- Проблема в обработке FormData в React Native + axios

КОРЕНЬ ПРОБЛЕМЫ:
- React Native не поддерживает fetch() для конвертации base64 в Blob
- FormData в React Native работает иначе, чем в браузере
- axios неправильно обрабатывает FormData из React Native

================================================================================
ФАЙЛ 1: MessengerExpo/src/services/communitiesAPI.js (ПОЛНЫЙ ФАЙЛ)
================================================================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://151.241.228.247:3001/api';

console.log('🌐 API URL:', API_URL);

// Создаём экземпляр axios
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,  // Увеличиваем timeout для загрузки файлов
});

// Интерсептор для добавления токена
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    console.log('🔐 Token found:', !!token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 🔑 КРИТИЧНО: Для FormData НЕ устанавливаем Content-Type явно
    // axios ДОЛЖЕН сам установить граница и multipart/form-data
    if (config.data instanceof FormData) {
      console.log('📦 FormData detected - removing explicit Content-Type header');
      delete config.headers['Content-Type'];
      console.log('📋 Headers after delete:', config.headers);
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
      
      // КРИТИЧНО: Отправляем ТОЛЬКО formData, БЕЗ конфига с headers
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
      console.error('   Full error:', err);
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

  joinCommunity: (id) => {
    console.log(`👥 Присоединение к сообществу ${id}...`);
    return axiosInstance.post(`/communities/${id}/join`);
  },

  leaveCommunity: (id) => {
    console.log(`👋 Выход из сообщества ${id}...`);
    return axiosInstance.post(`/communities/${id}/leave`);
  },
};


================================================================================
ФАЙЛ 2: MessengerExpo/src/screens/CommunitiesScreen.js (ФУНКЦИЯ handleCreateCommunity)
================================================================================

НАЙДИТЕ ЭТУ ФУНКЦИЮ И ЗАМЕНИТЕ:

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
    
    // ✅ СОЗДАЁМ FormData
    const formData = new FormData();
    
    console.log('📦 Создаём FormData...');
    formData.append('name', newCommunityName);
    formData.append('description', newCommunityDescription);
    
    // Если есть изображение
    if (newCommunityImage) {
      const imageUri = getImageUri(newCommunityImage);
      console.log('🖼️ Image URI:', imageUri?.substring(0, 80) + '...');
      
      if (imageUri && imageUri.startsWith('data:')) {
        console.log('✅ Это base64 data URI');
        
        // ДОБАВЛЯЕМ В FormData КАК ОБЪЕКТ С uri
        // React Native автоматически конвертирует это в Blob
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `community-${Date.now()}.jpg`,
        });
        
        console.log('✅ Image добавлен в FormData');
      } else {
        console.warn('⚠️ Image URI не является data URI');
      }
    }

    console.log('═══════════════════════════════════════');
    console.log('📤 ОТПРАВКА ЗАПРОСА');
    console.log('═══════════════════════════════════════');
    
    // ОТПРАВЛЯЕМ FormData
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

    // Перезагружаем список через 1 сек
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
ИНСТРУКЦИЯ ПО ВНЕДРЕНИЮ
================================================================================

1️⃣ ЗАМЕНИТЕ MessengerExpo/src/services/communitiesAPI.js
   - Скопируйте ВЕСЬ КОД из ФАЙЛА 1 выше
   - Замените весь содержимый файл этим кодом
   - Сохраните

2️⃣ ЗАМЕНИТЕ функцию handleCreateCommunity в CommunitiesScreen.js
   - Найдите функцию handleCreateCommunity
   - Замените её на код из ФАЙЛА 2 выше
   - Сохраните

3️⃣ ПЕРЕЗАГРУЗИТЕ ПРИЛОЖЕНИЕ
   - Нажмите Cmd+R (iOS) или Cmd+M (Android)
   - Или перезагрузите приложение полностью

4️⃣ ПРОВЕРЬТЕ ЛОГИ
   - Откройте консоль логов (Metro bundler)
   - Попытайтесь создать сообщество
   - Должны увидеть:
     * "🚀 НАЧАЛО: Создание сообщества"
     * "📤 ОТПРАВКА ЗАПРОСА"
     * "✅ ОТВЕТ ПОЛУЧЕН" ИЛИ "❌ ОШИБКА СОЗДАНИЯ СООБЩЕСТВА"

5️⃣ ПРОВЕРЬТЕ СЕРВЕР
   - На сервере запустите: pm2 logs appchill-backend | tail -50
   - После создания должны увидеть:
     * "🆕 СОЗДАНИЕ СООБЩЕСТВА"
     * "Файл загружен: ДА"
     * "✅ Image URL: http://151.241.228.247:3001/uploads/communities/..."

6️⃣ ПРОВЕРЬТЕ ФАЙЛ
   - На сервере: ls -la /root/appchill/appChill/backend/uploads/communities/
   - Должен быть загруженный файл с названием типа: community-1733510400000.jpg

================================================================================
ВОЗМОЖНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ
================================================================================

ПРОБЛЕМА 1: Всё ещё "Network Error"
РЕШЕНИЕ:
  - Убедитесь что удалили старый communitiesAPI.js и скопировали новый
  - Перезагрузите приложение полностью (не только reload)
  - Проверьте что IP адрес сервера 151.241.228.247 правильный

ПРОБЛЕМА 2: "Authorization Failed" (401)
РЕШЕНИЕ:
  - Убедитесь что вы залогинены в приложении
  - Проверьте что токен сохранен в AsyncStorage
  - Посмотрите логи: должна быть строка "🔐 Token found: true"

ПРОБЛЕМА 3: На сервере "Ошибка создания сообщества"
РЕШЕНИЕ:
  - Проверьте что таблица communities существует: mysql -u root -p messenger_db -e "DESCRIBE communities;"
  - Проверьте права на папку uploads: ls -ld /root/appchill/appChill/backend/uploads/communities/
  - Должно быть: drwxr-xr-x (755)

ПРОБЛЕМА 4: Изображение не загружается
РЕШЕНИЕ:
  - На сервере проверьте логи: pm2 logs appchill-backend | grep "Файл загружен"
  - Если "Файл загружен: НЕТ" — проблема в передаче FormData
  - Убедитесь что в CommunitiesScreen.js используется новая версия handleCreateCommunity

================================================================================
КЛЮЧЕВЫЕ ОТЛИЧИЯ В НОВОМ КОДЕ
================================================================================

В communitiesAPI.js:
✅ timeout: 30000 (вместо дефолтного - для загрузки файлов)
✅ delete config.headers['Content-Type'] (КРИТИЧНО - позволяет axios установить правильные headers)
✅ Отправляем ТОЛЬКО formData без конфига с headers
✅ Много логирования для отладки

В CommunitiesScreen.js:
✅ FormData создаётся с name и description
✅ image добавляется как объект {uri, type, name}
✅ НЕ используем fetch() для конвертации base64
✅ React Native автоматически обработает uri в FormData

================================================================================
ИТОГОВАЯ ПРОВЕРКА
================================================================================

После всех изменений проверьте:

1. ✅ Файл communitiesAPI.js обновлен
2. ✅ Функция handleCreateCommunity обновлена
3. ✅ Приложение перезагружено
4. ✅ Логи показывают "🚀 НАЧАЛО: Создание сообщества"
5. ✅ На сервере логи показывают "🆕 СОЗДАНИЕ СООБЩЕСТВА"
6. ✅ Файл загружен в /uploads/communities/
7. ✅ Сообщество появилось в БД и списке

Если всё работает — готово! 🎉

================================================================================
