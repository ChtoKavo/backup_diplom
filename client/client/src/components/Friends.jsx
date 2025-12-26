import React, { useState, useEffect } from 'react';
import './Friends.css';
import { 
  FiHome, FiUsers, FiMessageCircle, FiBell,
  FiImage, FiMusic, FiVideo, FiBookmark, FiMoreVertical
} from 'react-icons/fi';

const Friends = ({ currentUserId: propCurrentUserId, onViewProfile }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [showActions, setShowActions] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarAvatar, setSidebarAvatar] = useState(null);

  // Базовый URL API
  const API_BASE = 'http://localhost:5001';

  // Получаем user_id из различных источников
  const getCurrentUserId = () => {
    // Используем переданный prop
    if (propCurrentUserId) return propCurrentUserId;
    
    // Пробуем получить из localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.user_id) return user.user_id;
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    
    // Пробуем получить из sessionStorage
    const sessionUserData = sessionStorage.getItem('user');
    if (sessionUserData) {
      try {
        const user = JSON.parse(sessionUserData);
        if (user.user_id) return user.user_id;
      } catch (error) {
        console.error('Error parsing user data from sessionStorage:', error);
      }
    }
    
    console.error('No user ID found in props or storage');
    return null;
  };

  // Получаем текущий user_id
  const currentUserId = getCurrentUserId();

  // Функция для просмотра профиля
  const handleViewProfile = (userId) => {
    if (onViewProfile) {
      onViewProfile(userId);
    }
  };

  // Загрузка профиля пользователя
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (currentUserId) {
          const response = await fetch(`${API_BASE}/api/users/${currentUserId}/profile`);
          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
            if (userData.avatar_url) {
              setSidebarAvatar(userData.avatar_url);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      }
    };

    loadUserProfile();
  }, [currentUserId]);

  // Загрузка данных при изменении вкладки
  useEffect(() => {
    if (currentUserId) {
      loadFriendsData();
    } else {
      console.error('Cannot load friends: no user ID available');
    }
  }, [activeTab, currentUserId]);

  const loadFriendsData = async () => {
    if (!currentUserId) {
      console.error('No user ID available for loading friends data');
      return;
    }
    
    setLoading(true);
    try {
      switch (activeTab) {
        case 'all':
          await loadAllFriends();
          break;
        case 'online':
          await loadOnlineFriends();
          break;
        case 'requests':
          await loadFriendRequests();
          break;
        case 'find':
          await loadSuggestedFriends();
          break;
        default:
          await loadAllFriends();
      }
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllFriends = async () => {
    try {
      console.log('Loading friends for user:', currentUserId);
      const response = await fetch(`${API_BASE}/api/users/${currentUserId}/friends`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      } else {
        console.error('Ошибка загрузки друзей:', response.status);
        setFriends(getMockFriends());
      }
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
      setFriends(getMockFriends());
    }
  };

  const loadOnlineFriends = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUserId}/friends`);
      if (response.ok) {
        const data = await response.json();
        const onlineFriends = data.filter(friend => friend.is_online);
        setFriends(onlineFriends);
      } else {
        const mockFriends = getMockFriends().filter(friend => friend.is_online);
        setFriends(mockFriends);
      }
    } catch (error) {
      console.error('Ошибка загрузки онлайн друзей:', error);
      const mockFriends = getMockFriends().filter(friend => friend.is_online);
      setFriends(mockFriends);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUserId}/friend-requests`);
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data);
      } else {
        console.error('Ошибка загрузки заявок:', response.status);
        setFriendRequests(getMockFriendRequests());
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
      setFriendRequests(getMockFriendRequests());
    }
  };

  const loadSuggestedFriends = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/suggested/${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedFriends(data);
      } else {
        console.error('Ошибка загрузки предложений:', response.status);
        setSuggestedFriends(getMockSuggestedFriends());
      }
    } catch (error) {
      console.error('Ошибка загрузки предложений:', error);
      setSuggestedFriends(getMockSuggestedFriends());
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/search/${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const users = await response.json();
          // Фильтруем, чтобы исключить текущего пользователя и уже добавленных друзей
          const filteredUsers = users.filter(user => 
            user.user_id !== currentUserId && 
            !friends.some(friend => friend.user_id === user.user_id)
          );
          setSearchResults(filteredUsers);
        } else {
          const text = await response.text();
          console.error('Expected JSON but got:', text);
          setSearchResults([]);
        }
      } else {
        console.error('Search failed with status:', response.status);
        const mockUsers = getMockSuggestedFriends().filter(user => 
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(mockUsers);
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
      const mockUsers = getMockSuggestedFriends().filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(mockUsers);
    }
  };

  const sendFriendRequest = async (targetUserId) => {
    if (!currentUserId) {
      alert('Ошибка: не удалось определить ваш ID пользователя');
      return;
    }

    console.log('Sending friend request:', { from_user_id: currentUserId, to_user_id: targetUserId });

    try {
      const response = await fetch(`${API_BASE}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          from_user_id: currentUserId,
          to_user_id: targetUserId
        })
      });

      if (response.ok) {
        await loadSuggestedFriends();
        setSearchResults(prev => prev.filter(user => user.user_id !== targetUserId));
        alert('Запрос в друзья отправлен!');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка отправки запроса:', error);
      alert('Ошибка при отправке запроса');
    }
  };

  const respondToFriendRequest = async (friendshipId, responseType) => {
    if (!currentUserId) {
      alert('Ошибка: не удалось определить ваш ID пользователя');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/friends/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          friendship_id: friendshipId,
          response: responseType,
          user_id: currentUserId
        })
      });

      if (response.ok) {
        await loadFriendRequests();
        if (responseType === 'accepted') {
          await loadAllFriends();
        }
        alert(`Запрос ${responseType === 'accepted' ? 'принят' : 'отклонен'}`);
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка обработки запроса:', error);
      alert('Ошибка при обработке запроса');
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Вы уверены, что хотите удалить пользователя из друзей?')) {
      return;
    }

    if (!currentUserId) {
      alert('Ошибка: не удалось определить ваш ID пользователя');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/friends`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: currentUserId,
          friend_id: friendId
        })
      });

      if (response.ok) {
        await loadAllFriends();
        alert('Пользователь удален из друзей');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка удаления друга:', error);
      alert('Ошибка при удалении друга');
    }
  };

  const toggleActions = (id) => {
    setShowActions(showActions === id ? null : id);
  };

  // Моковые данные для fallback
  const getMockFriends = () => [
    { user_id: 2, name: 'Лини Снежевич', email: 'lini@example.com', is_online: true, last_seen: new Date().toISOString(), avatar_url: null },
    { user_id: 3, name: 'Линнет Снежевна', email: 'linnet@example.com', is_online: true, last_seen: new Date().toISOString(), avatar_url: null },
    { user_id: 4, name: 'Фремине Снежевич', email: 'fremine@example.com', is_online: false, last_seen: new Date(Date.now() - 3600000).toISOString(), avatar_url: null },
    { user_id: 5, name: 'Коломбина Снежевна', email: 'kolombina@example.com', is_online: true, last_seen: new Date().toISOString(), avatar_url: null },
    { user_id: 6, name: 'Чайлд Снежевич', email: 'child@example.com', is_online: false, last_seen: new Date(Date.now() - 7200000).toISOString(), avatar_url: null },
    { user_id: 7, name: 'Фурина Фонтейн', email: 'furina@example.com', is_online: true, last_seen: new Date().toISOString(), avatar_url: null },
  ];

  const getMockFriendRequests = () => [
    { friendship_id: 1, from_user_id: 8, from_user_name: 'Дракон Нёвилетт', from_user_email: 'neuvillette@example.com', created_at: new Date().toISOString() },
    { friendship_id: 2, from_user_id: 9, from_user_name: 'Навия Каспар', from_user_email: 'navia@example.com', created_at: new Date(Date.now() - 86400000).toISOString() },
  ];

  const getMockSuggestedFriends = () => [
    { user_id: 10, name: 'Аяка Камисато', email: 'ayaka@example.com', is_online: true, last_seen: new Date().toISOString(), avatar_url: null, mutual_friends: 4 },
    { user_id: 11, name: 'Эола Лоуренс', email: 'eula@example.com', is_online: false, last_seen: new Date(Date.now() - 7200000).toISOString(), avatar_url: null, mutual_friends: 0 },
    { user_id: 12, name: 'Гань Юй', email: 'ganyu@example.com', is_online: true, last_seen: new Date().toISOString(), avatar_url: null, mutual_friends: 3 },
    { user_id: 13, name: 'Кэ Цин', email: 'keqing@example.com', is_online: false, last_seen: new Date(Date.now() - 3600000).toISOString(), avatar_url: null, mutual_friends: 2 },
  ];

  // Функция для получения аватара
  const getAvatarUrl = (user) => {
    if (user.avatar_url) {
      return `${API_BASE}${user.avatar_url}`;
    }
    return null;
  };

  // Рендер аватара
  const renderAvatar = (user, size = 'medium') => {
    const avatarUrl = getAvatarUrl(user);
    const sizeClass = size === 'small' ? 'avatar-small' : 'avatar-medium';
    
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={user.name}
          className={`avatar-image ${sizeClass}`}
          onError={(e) => {
            e.target.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = `avatar-placeholder ${sizeClass}`;
            placeholder.textContent = user.name.split(' ').map(n => n[0]).join('');
            e.target.parentNode.appendChild(placeholder);
          }}
        />
      );
    }

    return (
      <div className={`avatar-placeholder ${sizeClass}`}>
        {user.name.split(' ').map(n => n[0]).join('')}
      </div>
    );
  };

  if (!currentUserId) {
    return (
      <div className="friends-page">
        <div className="error-state">
          <h2>Ошибка</h2>
          <p>Не удалось определить ID пользователя. Пожалуйста, войдите в систему.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      {/* Sidebar */}
      <div className="friends-sidebar">

        
        {currentUser && (
          <div className="sidebar-user-profile" onClick={() => handleViewProfile(currentUserId)} style={{cursor: 'pointer'}}>
            <div className="sidebar-user-avatar">
              {sidebarAvatar ? (
                <img 
                  src={`${API_BASE}${sidebarAvatar}`} 
                  alt={currentUser.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="sidebar-avatar-fallback">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentUser?.name || 'Пользователь'}</div>
              <div className="sidebar-user-status">online</div>
            </div>
          </div>
        )}
        
        <nav className="sidebar-nav-menu">
          <a href="#" className="sidebar-nav-item">
            <FiHome className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Новости</span>
          </a>
          <a href="#" className={`sidebar-nav-item ${activeTab === 'all' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('all'); }}>
            <FiUsers className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Друзья</span>
            {friends.length > 0 && <span className="sidebar-nav-badge">{friends.length}</span>}
          </a>
          <a href="#" className="sidebar-nav-item">
            <FiMessageCircle className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Сообщения</span>
            <span className="sidebar-nav-badge">3</span>
          </a>
          <a href="#" className={`sidebar-nav-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('requests'); }}>
            <FiBell className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Уведомления</span>
            {friendRequests.length > 0 && <span className="sidebar-nav-badge alert">{friendRequests.length}</span>}
          </a>
          <a href="#" className="sidebar-nav-item">
            <FiImage className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Фотографии</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <FiMusic className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Музыка</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <FiVideo className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Видео</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <FiBookmark className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Закладки</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-settings-btn">
            <FiMoreVertical className="sidebar-settings-icon" />
            <span>Еще</span>
          </button>
        </div>
      </div>

      {/* Центральная колонка - Основной контент */}
      <div className="friends-main">
        <div className="friends-header">
          <h1>
            {activeTab === 'all' && 'Друзья'}
            {activeTab === 'online' && 'Друзья онлайн'}
            {activeTab === 'requests' && 'Заявки в друзья'}
            {activeTab === 'find' && 'Найти друзей'}
          </h1>
          
          {(activeTab === 'all' || activeTab === 'online' || activeTab === 'find') && (
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Поиск друзей..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
          </div>
        )}

        {/* Контент для разных вкладок */}
        <div className="friends-content">
          {activeTab === 'all' && (
            <div className="friends-grid">
              {friends.length === 0 ? (
                <div className="empty-state empty-friends">
                  <div className="empty-icon">👥</div>
                  <h2>У вас пока нет друзей</h2>
                  <p>Начните добавлять друзей, чтобы общаться и делиться моментами</p>
                  <div className="empty-actions">
                    <button 
                      className="primary-btn find-friends-action"
                      onClick={() => setActiveTab('find')}
                    >
                      🔍 Найти друзей
                    </button>
                    <button 
                      className="secondary-btn find-requests-action"
                      onClick={() => setActiveTab('requests')}
                    >
                      📬 Заявки в друзья ({friendRequests.length})
                    </button>
                  </div>
                </div>
              ) : (
                friends.map(friend => (
                  <FriendGridCard 
                    key={friend.user_id}
                    user={friend}
                    onRemoveFriend={removeFriend}
                    showActions={showActions}
                    toggleActions={toggleActions}
                    renderAvatar={renderAvatar}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'online' && (
            <div className="friends-grid">
              {friends.length === 0 ? (
                <div className="empty-state empty-online">
                  <div className="empty-icon">🟢</div>
                  <h2>Нет друзей онлайн</h2>
                  <p>Друзья появятся здесь, когда они будут в сети</p>
                  <button 
                    className="secondary-btn"
                    onClick={() => setActiveTab('all')}
                  >
                    ← Вернуться к списку друзей
                  </button>
                </div>
              ) : (
                friends.map(friend => (
                  <FriendGridCard 
                    key={friend.user_id}
                    user={friend}
                    onRemoveFriend={removeFriend}
                    showActions={showActions}
                    toggleActions={toggleActions}
                    renderAvatar={renderAvatar}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="requests-list">
              {friendRequests.length === 0 ? (
                <div className="empty-state empty-requests">
                  <div className="empty-icon">📬</div>
                  <h2>Нет новых заявок</h2>
                  <p>Когда люди отправят вам заявки в друзья, они появятся здесь</p>
                  <button 
                    className="secondary-btn"
                    onClick={() => setActiveTab('find')}
                  >
                    🔍 Найти друзей и отправить заявки
                  </button>
                </div>
              ) : (
                friendRequests.map(request => (
                  <FriendRequestCard 
                    key={request.friendship_id}
                    request={request}
                    onRespond={respondToFriendRequest}
                    renderAvatar={renderAvatar}
                    onViewProfile={handleViewProfile}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'find' && (
            <div className="find-friends-content">
              {searchQuery ? (
                <div className="search-results">
                  <div className="search-results-header">
                    <h3>🔍 Результаты: "{searchQuery}"</h3>
                    <span className="results-count">{searchResults.length} {searchResults.length === 1 ? 'результат' : 'результатов'}</span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="empty-state empty-search">
                      <div className="empty-icon">🔎</div>
                      <h2>Пользователи не найдены</h2>
                      <p>Попробуйте другой поисковый запрос или посмотрите предложения ниже</p>
                    </div>
                  ) : (
                    <div className="suggestions-grid">
                      {searchResults.map(user => (
                        <UserCard 
                          key={user.user_id}
                          user={user}
                          onAddFriend={sendFriendRequest}
                          renderAvatar={renderAvatar}
                          onViewProfile={handleViewProfile}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="suggestions-section">
                  <h3>✨ Возможные друзья</h3>
                  {suggestedFriends.length === 0 ? (
                    <div className="empty-state empty-suggestions">
                      <div className="empty-icon">✨</div>
                      <h2>Нет предложений</h2>
                      <p>Когда появятся новые пользователи, мы покажем их вам</p>
                    </div>
                  ) : (
                    <div className="suggestions-grid">
                      {suggestedFriends.map(user => (
                        <UserCard 
                          key={user.user_id}
                          user={user}
                          onAddFriend={sendFriendRequest}
                          renderAvatar={renderAvatar}
                          onViewProfile={handleViewProfile}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Компонент карточки друга для grid layout
const FriendGridCard = ({ 
  user, 
  onRemoveFriend, 
  showActions, 
  toggleActions, 
  renderAvatar,
  onViewProfile 
}) => {
  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(user.user_id);
    }
  };

  const startChat = () => {
    console.log('Start chat with:', user.user_id);
  };

  return (
    <div className="friend-grid-card">
      <div 
        className="friend-grid-avatar"
        onClick={handleViewProfile}
        style={{ cursor: 'pointer' }}
      >
        {renderAvatar(user, 'medium')}
        {user.is_online && <div className="online-dot"></div>}
      </div>
      
      <div 
        className="friend-grid-info"
        onClick={handleViewProfile}
        style={{ cursor: 'pointer', flex: 1 }}
      >
        <div className="friend-grid-name" title={user.name}>{user.name}</div>
        <div className="friend-grid-status">
          <span>{user.is_online ? '🟢 В сети' : `⏱️ ${new Date(user.last_seen).toLocaleDateString()}`}</span>
        </div>
        <div className="friend-grid-email" title={user.email}>{user.email}</div>
      </div>

      <div className="friend-grid-actions">
        <button 
          className="more-actions-btn"
          onClick={() => toggleActions(user.user_id)}
          title="Больше действий"
        >
          ⋮
        </button>
        
        {showActions === user.user_id && (
          <div className="actions-dropdown">
            <div className="dropdown-item" onClick={handleViewProfile}>
              👤 Посмотреть профиль
            </div>
            <div className="dropdown-item" onClick={startChat}>
              💬 Написать сообщение
            </div>
            <div className="dropdown-item remove" onClick={() => onRemoveFriend(user.user_id)}>
              ❌ Удалить из друзей
            </div>
          </div>
        )}
      </div>

      <div className="friend-grid-buttons">
        <button 
          className="action-btn message-btn" 
          onClick={startChat}
          title="Отправить сообщение"
        >
          💬 Написать
        </button>
        <button 
          className="action-btn profile-btn" 
          onClick={handleViewProfile}
          title="Перейти на профиль"
        >
          👤 Профиль
        </button>
        <button 
          className="action-btn remove-btn" 
          onClick={() => onRemoveFriend(user.user_id)}
          title="Удалить из друзей"
        >
          ✕ Удалить
        </button>
      </div>
    </div>
  );
};

// Компонент карточки заявки в друзья
const FriendRequestCard = ({ request, onRespond, renderAvatar, onViewProfile }) => {
  const user = {
    user_id: request.from_user_id,
    name: request.from_user_name,
    email: request.from_user_email
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(user.user_id);
    }
  };

  return (
    <div className="request-item">
      <div 
        className="request-avatar"
        onClick={handleViewProfile}
        style={{ cursor: 'pointer' }}
      >
        {renderAvatar(user, 'small')}
      </div>
      
      <div 
        className="request-info"
        onClick={handleViewProfile}
        style={{ cursor: 'pointer', flex: 1 }}
      >
        <div className="request-name">{request.from_user_name}</div>
        <div className="request-email">{request.from_user_email}</div>
        <div className="request-time">
          📅 {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>
        
      <div className="request-actions">
        <button 
          className="accept-btn"
          onClick={() => onRespond(request.friendship_id, 'accepted')}
          title="Принять заявку"
        >
          ✓ Принять
        </button>
        <button 
          className="decline-btn"
          onClick={() => onRespond(request.friendship_id, 'declined')}
          title="Отклонить заявку"
        >
          ✕ Отклонить
        </button>
        <button 
          className="view-profile-btn"
          onClick={handleViewProfile}
          title="Посмотреть профиль"
        >
          👤 Профиль
        </button>
      </div>
    </div>
  );
};

// Компонент карточки пользователя для поиска/предложений
const UserCard = ({ user, onAddFriend, renderAvatar, onViewProfile }) => {
  const [requestSent, setRequestSent] = useState(false);

  const handleAddFriend = () => {
    onAddFriend(user.user_id);
    setRequestSent(true);
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(user.user_id);
    }
  };

  return (
    <div className="user-card">
      <div 
        className="user-avatar"
        onClick={handleViewProfile}
        style={{ cursor: 'pointer' }}
      >
        {renderAvatar(user, 'small')}
        {user.is_online && <div className="online-dot"></div>}
      </div>
      
      <div 
        className="user-info"
        onClick={handleViewProfile}
        style={{ cursor: 'pointer', flex: 1 }}
      >
        <div className="user-name">{user.name}</div>
        <div className="user-email">{user.email}</div>
        <div className="user-status">
          {user.is_online ? '🟢 В сети' : '⚫ Не в сети'}
        </div>
        {user.mutual_friends > 0 && (
          <div className="mutual-friends">
            👥 {user.mutual_friends} общих друзей
          </div>
        )}
      </div>
      
      <div className="user-actions">
        {requestSent ? (
          <button className="request-sent-btn" disabled title="Запрос уже отправлен">
            ⏳ Запрос отправлен
          </button>
        ) : (
          <button 
            className="add-friend-btn" 
            onClick={handleAddFriend}
            title="Добавить в друзья"
          >
            ➕ Добавить
          </button>
        )}
        <button 
          className="view-profile-btn" 
          onClick={handleViewProfile}
          title="Посмотреть профиль"
        >
          👤 Профиль
        </button>
      </div>
    </div>
  );
};

export default Friends;