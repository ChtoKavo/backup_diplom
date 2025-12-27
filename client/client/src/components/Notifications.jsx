// components/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';
import './Friends.css';
import { 
  FiHome, FiUsers, FiMessageCircle, FiBell,
  FiImage, FiMusic, FiVideo, FiBookmark,
  FiMoreVertical, FiSearch
} from 'react-icons/fi';

const Notifications = ({ currentUser, socket }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarAvatar, setSidebarAvatar] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      loadUserAvatar();
    }
    
    if (socket) {
      socket.on('new_notification', handleNewNotification);
      socket.on('new_friend_request', handleFriendRequest);
    }

    return () => {
      if (socket) {
        socket.off('new_notification', handleNewNotification);
        socket.off('new_friend_request', handleFriendRequest);
      }
    };
  }, [socket, currentUser]);

  const loadUserAvatar = async () => {
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

  const loadNotifications = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${currentUser.user_id}/notifications`
      );
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const handleFriendRequest = (request) => {
    // Обработка запроса дружбы
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  const getNotificationText = (notification) => {
    const texts = {
      like: `${notification.from_user_name} понравился ваш пост`,
      comment: `${notification.from_user_name} прокомментировал ваш пост`,
      friend_request: `${notification.from_user_name} отправил запрос дружбы`,
      friend_accept: `${notification.from_user_name} принял запрос дружбы`
    };
    return texts[notification.type] || 'Новое уведомление';
  };

  return (
    <div className="friends-page">
      {/* Sidebar */}
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
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/')}
          >
            <FiHome className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Новости</span>
          </button>
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/friends')}
          >
            <FiUsers className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Друзья</span>
            <span className="sidebar-nav-badge">127</span>
          </button>
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/chats')}
          >
            <FiMessageCircle className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Сообщения</span>
            <span className="sidebar-nav-badge">3</span>
          </button>
          <button 
            className="sidebar-nav-item active"
            onClick={() => navigate('/notifications')}
          >
            <FiBell className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Уведомления</span>
            <span className="sidebar-nav-badge">{unreadCount > 0 ? unreadCount : ''}</span>
          </button>
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/gallery')}
          >
            <FiImage className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Фотографии</span>
          </button>
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/music')}
          >
            <FiMusic className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Музыка</span>
          </button>
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/videos')}
          >
            <FiVideo className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Видео</span>
          </button>
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/bookmarks')}
          >
            <FiBookmark className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Закладки</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-settings-btn">
            <FiMoreVertical className="sidebar-settings-icon" />
            <span>Еще</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="vk-main-content">
        {/* Header */}
        <header className="vk-header">
          <div className="vk-search">
            <FiSearch className="vk-search-icon" />
            <input 
              type="text" 
              placeholder="Поиск по уведомлениям..."
              className="vk-search-input"
            />
          </div>
        </header>

        <div className="notifications-content">
          <div className="notifications-header">
            <h3>Уведомления</h3>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>

          <div className="notifications-list">
            {notifications.map(notification => (
              <div
                key={notification.notification_id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.notification_id)}
              >
                <div className="notification-avatar">
                  {notification.from_user_name?.charAt(0).toUpperCase()}
                </div>
                <div className="notification-content">
                  <p>{getNotificationText(notification)}</p>
                  <span className="notification-time">
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {notifications.length === 0 && (
              <div className="no-notifications">
                <p>Уведомлений пока нет</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
