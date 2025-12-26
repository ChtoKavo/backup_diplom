import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatSelector.css';
import './Friends.css';
import io from 'socket.io-client';
import { 
  FiHome, FiUsers, FiBookmark, FiMoreVertical, FiMessageCircle,
  FiMusic, FiVideo, FiImage, FiBell, FiSearch, FiPlus
} from 'react-icons/fi';

const ChatSelector = ({ currentUser }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userAvatars, setUserAvatars] = useState({});
  const [userStatuses, setUserStatuses] = useState({});
  const [socket, setSocket] = useState(null);
  const [sidebarAvatar, setSidebarAvatar] = useState(currentUser?.avatar_url);
  
  const navigate = useNavigate();
  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    if (currentUser) {
      loadChats();
      initializeWebSocket();
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    const loadCurrentUserAvatar = async () => {
      try {
        if (currentUser?.user_id) {
          const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.user_id}/profile`);
          if (response.ok) {
            const userData = await response.json();
            if (userData.avatar_url) {
              setSidebarAvatar(userData.avatar_url);
            }
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки аватарки:', error);
      }
    };
    loadCurrentUserAvatar();
  }, [currentUser?.user_id, API_BASE_URL]);

  const handleProfileClick = () => {
    navigate(`/profile/${currentUser?.user_id}`);
  };

  const initializeWebSocket = () => {
    const newSocket = io(API_BASE_URL, {
      withCredentials: true
    });
    setSocket(newSocket);
    newSocket.emit('register_user', currentUser.user_id);

    newSocket.on('new_message', (message) => {
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.chat_id === message.chat_id) {
            return {
              ...chat,
              last_message: message.content,
              last_message_time: message.created_at,
              last_message_sender_id: message.user_id,
              unread_count: message.user_id !== currentUser.user_id 
                ? (chat.unread_count || 0) + 1 
                : chat.unread_count
            };
          }
          return chat;
        });
        
        const chatIndex = updatedChats.findIndex(chat => chat.chat_id === message.chat_id);
        if (chatIndex > 0) {
          const [chat] = updatedChats.splice(chatIndex, 1);
          updatedChats.unshift(chat);
        }
        
        return updatedChats;
      });
    });

    newSocket.on('contact_status_updated', (data) => {
      setUserStatuses(prev => ({
        ...prev,
        [data.user_id]: {
          status: data.status,
          message: data.status_message,
          isOnline: data.status !== 'offline',
          lastSeen: data.last_seen || data.last_activity
        }
      }));
    });

    newSocket.on('messages_read', (data) => {
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.chat_id === data.chat_id) {
            return { ...chat, unread_count: 0 };
          }
          return chat;
        });
      });
    });
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/chats/${currentUser.user_id}`);
      if (!response.ok) throw new Error('Ошибка загрузки чатов');
      const data = await response.json();
      setChats(data);
      await loadAvatarsAndStatusesForChats(data);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      setError('Ошибка загрузки чатов');
    } finally {
      setLoading(false);
    }
  };

  const loadAvatarsAndStatusesForChats = async (chatsData) => {
    const participantIds = new Set();
    chatsData.forEach(chat => {
      const ids = chat.participant_ids?.split(',').filter(id => id !== currentUser.user_id.toString()) || [];
      ids.forEach(id => participantIds.add(id));
    });

    const promises = Array.from(participantIds).map(async (participantId) => {
      if (!userAvatars[participantId]) {
        await loadUserAvatar(participantId);
      }
    });
    await Promise.all(promises);
  };

  const loadUserAvatar = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/avatar`);
      if (response.ok) {
        const blob = await response.blob();
        const avatarUrl = URL.createObjectURL(blob);
        setUserAvatars(prev => ({
          ...prev,
          [userId]: avatarUrl
        }));
      }
    } catch (error) {
      console.log(`Аватар для пользователя ${userId} не найден`);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/search/${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Ошибка поиска пользователей');
      const data = await response.json();
      
      const filteredUsers = data.filter(user => user.user_id !== currentUser.user_id);
      setUsers(filteredUsers);
      
      filteredUsers.forEach(user => {
        if (!userAvatars[user.user_id]) {
          loadUserAvatar(user.user_id);
        }
      });
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error);
      setError('Ошибка поиска пользователей');
    }
  };

  const createChat = async (participantId) => {
    try {
      setError('');
      const checkResponse = await fetch(
        `${API_BASE_URL}/chats/check/${currentUser.user_id}/${participantId}`
      );
      
      if (!checkResponse.ok) {
        throw new Error(`Ошибка проверки чата: ${checkResponse.status}`);
      }
      
      const checkData = await checkResponse.json();
      
      if (checkData.exists) {
        if (socket) {
          socket.emit('mark_messages_read', {
            chat_id: checkData.chat_id,
            user_id: currentUser.user_id
          });
        }
        navigate(`/chat/${checkData.chat_id}`);
      } else {
        const response = await fetch(`${API_BASE_URL}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: parseInt(currentUser.user_id),
            participant_id: parseInt(participantId),
            chat_type: 'private'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка создания чата: ${response.status} - ${errorText}`);
        }
        
        const newChat = await response.json();
        setShowUserSearch(false);
        setSearchQuery('');
        setUsers([]);
        navigate(`/chat/${newChat.chat_id}`);
      }
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      setError(`Ошибка создания чата: ${error.message}`);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} ч`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} д`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getOtherParticipants = (chat) => {
    return chat.participant_names?.split(',')
      .filter(name => name.trim() !== currentUser.name)
      .join(', ') || 'Пользователь';
  };

  const getLastMessagePreview = (chat) => {
    if (!chat.last_message) return 'Нет сообщений';
    
    if (chat.is_draft) {
      return `Черновик: ${chat.last_message}`;
    }
    
    const message = chat.last_message;
    if (message.length > 60) {
      return message.substring(0, 60) + '...';
    }
    return message;
  };

  const getReadStatus = (chat) => {
    if (!chat.last_message_sender_id) return 'sent';
    
    if (chat.last_message_sender_id === currentUser.user_id) {
      return chat.is_read ? 'read' : 'sent';
    }
    
    return 'received';
  };

  const handleChatClick = (chat) => {
    if (socket) {
      socket.emit('mark_messages_read', {
        chat_id: chat.chat_id,
        user_id: currentUser.user_id
      });
    }
    
    setChats(prevChats => 
      prevChats.map(c => 
        c.chat_id === chat.chat_id ? { ...c, unread_count: 0 } : c
      )
    );
    
    navigate(`/chat/${chat.chat_id}`);
  };

  const getParticipantAvatar = (chat) => {
    const participantIds = chat.participant_ids?.split(',').filter(id => id !== currentUser.user_id.toString()) || [];
    if (participantIds.length > 0) {
      const participantId = participantIds[0];
      return userAvatars[participantId] || null;
    }
    return null;
  };

  const renderAvatar = (chat) => {
    const avatarUrl = getParticipantAvatar(chat);
    const displayName = getOtherParticipants(chat);
    
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt="Avatar" 
          className="chat-avatar-img"
        />
      );
    }

    return (
      <div className="chat-avatar-placeholder">
        {displayName.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="friends-page">
        <div className="error-state">
          <h2>Ошибка</h2>
          <p>Войдите в систему для использования мессенджера</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      {/* Боковая панель */}
      <div className="friends-sidebar">
        {currentUser && (
          <div className="sidebar-user-profile" onClick={handleProfileClick} style={{cursor: 'pointer'}}>
            <div className="sidebar-user-avatar">
              {sidebarAvatar ? (
                <img 
                  src={`${API_BASE_URL}${sidebarAvatar}`} 
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
          <a href="#" className="sidebar-nav-item">
            <FiUsers className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Друзья</span>
            <span className="sidebar-nav-badge">127</span>
          </a>
          <a href="#" className="sidebar-nav-item active">
            <FiMessageCircle className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Сообщения</span>
            <span className="sidebar-nav-badge">3</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <FiBell className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Уведомления</span>
            <span className="sidebar-nav-badge">12</span>
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

      {/* Основной контент */}
      <div className="friends-main">
        <div className="friends-header">
          <h1>Сообщения</h1>
          
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Поиск сообщений..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              onClick={() => setShowUserSearch(true)}
            />
          </div>
        </div>

        <div className="friends-content">
          <div className="chats-list">
            {loading && chats.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Загружаем сообщения...</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h2>Нет сообщений</h2>
                <p>Начните общение, создав новый чат</p>
                <button 
                  className="primary-btn"
                  onClick={() => setShowUserSearch(true)}
                >
                  <FiPlus /> Начать общение
                </button>
              </div>
            ) : (
              chats.map(chat => (
                <div 
                  key={chat.chat_id}
                  className="chat-item"
                  onClick={() => handleChatClick(chat)}
                >
                  <div className="chat-avatar">
                    {renderAvatar(chat)}
                  </div>
                  
                  <div className="chat-content">
                    <div className="chat-header">
                      <div className="chat-name">
                        {getOtherParticipants(chat)}
                      </div>
                      <div className="chat-time">
                        {formatTime(chat.last_message_time)}
                      </div>
                    </div>
                    
                    <div className={`last-message ${chat.is_draft ? 'draft' : ''}`}>
                      {getLastMessagePreview(chat)}
                    </div>
                  </div>

                  <div className="chat-indicators">
                    {chat.unread_count > 0 && (
                      <div className="unread-count">{chat.unread_count}</div>
                    )}
                    <div className={`read-status ${getReadStatus(chat)}`}>
                      {getReadStatus(chat) === 'read' && '✓✓'}
                      {getReadStatus(chat) === 'sent' && '✓'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно поиска */}
      {showUserSearch && (
        <div className="vk-modal-overlay">
          <div className="vk-modal">
            <div className="vk-modal-header">
              <h3>Новый чат</h3>
              <button 
                className="vk-modal-close"
                onClick={() => {
                  setShowUserSearch(false);
                  setSearchQuery('');
                  setUsers([]);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="vk-modal-content">
              <div className="search-box">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Введите имя или email..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  autoFocus
                />
              </div>
              
              <div className="search-results">
                {users.length > 0 ? (
                  <div className="users-grid">
                    {users.map(user => (
                      <div 
                        key={user.user_id}
                        className="user-card"
                        onClick={() => createChat(user.user_id)}
                      >
                        <div className="user-avatar">
                          {userAvatars[user.user_id] ? (
                            <img 
                              src={userAvatars[user.user_id]} 
                              alt="Avatar" 
                              className="user-avatar-img"
                            />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{user.name}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>Пользователи не найдены</h3>
                    <p>Попробуйте другой запрос</p>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">💬</div>
                    <h3>Начните поиск</h3>
                    <p>Введите имя или email пользователя</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
    </div>
  );
};

export default ChatSelector;