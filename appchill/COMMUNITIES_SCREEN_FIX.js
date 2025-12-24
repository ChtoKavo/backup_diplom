// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ handleCreateCommunity для CommunitiesScreen.js
// Замените существующую функцию на эту

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
