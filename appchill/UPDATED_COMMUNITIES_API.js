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
    
    // 🔑 ВАЖНО: Для FormData не трогаем Content-Type
    // axios автоматически установит правильные заголовки
    if (config.data instanceof FormData) {
      console.log('🔧 FormData обнаружена в интерсепторе - не переопределяем Content-Type');
      // Удаляем Content-Type если он был установлен
      delete config.headers['Content-Type'];
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
      console.log('📤 Отправка сообщества...', {
        isFormData: data instanceof FormData,
        dataType: typeof data,
      });
      
      // Если это FormData, отправляем как есть БЕЗ явного Content-Type
      // axios автоматически установит правильные заголовки для FormData
      if (data instanceof FormData) {
        console.log('✅ FormData обнаружена, отправляем на /communities');
        
        // Отправляем БЕЗ явных headers
        const response = await axiosInstance.post('/communities', data);
        console.log('✅ Ответ получен:', response.status);
        return response;
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
        const response = await axiosInstance.post('/communities', formData);
        console.log('✅ Ответ получен:', response.status);
        return response;
      }
      
      // Обычный JSON запрос
      console.log('📋 JSON запрос');
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
