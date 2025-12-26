import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './Messenger.css';
import './Friends.css';
import { 
  FiHome, FiUsers, FiBookmark, FiMoreVertical, FiMessageCircle,
  FiMusic, FiVideo, FiImage, FiBell, FiArrowLeft, FiSend,
  FiPaperclip, FiMic, FiMoreHorizontal
} from 'react-icons/fi';

const Messenger = ({ currentUser }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [participantAvatars, setParticipantAvatars] = useState({});
  const [sidebarAvatar, setSidebarAvatar] = useState(currentUser?.avatar_url);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const API_BASE_URL = 'http://localhost:5001';

  useEffect(() => {
    if (chatId && currentUser) {
      loadChatData();
      loadMessages();
      setupWebSocket();
    }
  }, [chatId, currentUser]);

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

  const loadParticipantAvatars = useCallback(async (chat) => {
    if (!chat || !chat.participant_ids) return;
    
    try {
      const participantIds = chat.participant_ids.split(',').map(id => parseInt(id.trim()));
      const avatars = {};
      
      for (const participantId of participantIds) {
        if (participantId === currentUser.user_id) continue;
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/users/${participantId}/avatar`);
          if (response.ok) {
            const avatarBlob = await response.blob();
            if (avatarBlob.type.startsWith('image/')) {
              const avatarUrl = URL.createObjectURL(avatarBlob);
              avatars[participantId] = avatarUrl;
            } else {
              avatars[participantId] = null;
            }
          } else {
            avatars[participantId] = null;
          }
        } catch (error) {
          console.error(`Ошибка загрузки аватара пользователя ${participantId}:`, error);
          avatars[participantId] = null;
        }
      }
      
      setParticipantAvatars(avatars);
    } catch (error) {
      console.error('Ошибка загрузки аватаров участников:', error);
    }
  }, [currentUser, API_BASE_URL]);

  const setupWebSocket = () => {
    if (!currentUser) return;

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);
    newSocket.emit('register_user', currentUser.user_id.toString());

    newSocket.on('new_message', (message) => {
      if (message.chat_id === parseInt(chatId)) {
        setMessages(prev => {
          const newMessage = {
            ...message,
            is_own: message.user_id === currentUser.user_id
          };
          
          const messageExists = prev.some(msg => 
            msg.message_id === newMessage.message_id
          );
          
          if (!messageExists) {
            return [...prev, newMessage];
          }
          return prev;
        });
      }
    });

    newSocket.on('message_updated', (updatedMessage) => {
      if (updatedMessage.chat_id === parseInt(chatId)) {
        setMessages(prev => prev.map(msg => 
          msg.message_id === updatedMessage.message_id 
            ? { ...updatedMessage, is_own: updatedMessage.user_id === currentUser.user_id }
            : msg
        ));
      }
    });

    newSocket.on('online_users_list', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('user_online', (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    newSocket.on('user_offline', (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  };

  const loadChatData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${currentUser.user_id}`);
      if (!response.ok) throw new Error('Ошибка загрузки чатов');
      const chats = await response.json();
      const currentChat = chats.find(chat => chat.chat_id === parseInt(chatId));
      setActiveChat(currentChat);
      
      if (currentChat) {
        loadParticipantAvatars(currentChat);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных чата:', error);
      setError('Чат не найден');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/messages/${chatId}?userId=${currentUser.user_id}`);
      if (!response.ok) throw new Error('Ошибка загрузки сообщений');
      const data = await response.json();
      
      const messagesWithOwnFlag = data.map(msg => ({
        ...msg,
        is_own: msg.user_id === currentUser.user_id
      }));
      
      setMessages(messagesWithOwnFlag);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      setError('Ошибка загрузки сообщений');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeChat || !socket || sending) return;

    const messageData = {
      chat_id: activeChat.chat_id,
      user_id: currentUser.user_id,
      content: newMessage.trim(),
      message_type: 'text'
    };

    try {
      setSending(true);
      setError('');
      setNewMessage('');

      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }

      socket.emit('send_message', messageData);
      
    } catch (error) {
      console.error('Ошибка отправки:', error);
      setError('Ошибка отправки сообщения');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const getOtherParticipants = (chat) => {
    return chat.participant_names?.split(',')
      .filter(name => name.trim() !== currentUser.name)
      .join(', ') || 'Пользователь';
  };

  const getOtherParticipantId = (chat) => {
    if (!chat || !chat.participant_ids) return null;
    
    const participantIds = chat.participant_ids.split(',').map(id => parseInt(id.trim()));
    const otherParticipantId = participantIds.find(id => id !== currentUser.user_id);
    return otherParticipantId;
  };

  const getUserAvatar = (userId, userName = '') => {
    return participantAvatars[userId] || null;
  };

  const getUserInitials = (userName = '') => {
    const names = userName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const renderMessageContent = (message) => {
    switch (message.message_type) {
      case 'image':
      case 'file':
        return (
          <div className="message-media">
            <img 
              src={`${API_BASE_URL}${message.attachment_url}`} 
              alt={message.original_filename || 'Изображение'}
              className="message-image"
              onClick={() => window.open(`${API_BASE_URL}${message.attachment_url}`, '_blank')}
            />
          </div>
        );
        
      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;

    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          type: 'date',
          date: message.created_at,
          id: `date-${messageDate}`
        });
      }
      
      groups.push({
        type: 'message',
        ...message
      });
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

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

  if (!activeChat) {
    return (
      <div className="friends-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка чата...</p>
        </div>
      </div>
    );
  }

  const otherParticipantId = getOtherParticipantId(activeChat);
  const headerAvatar = getUserAvatar(otherParticipantId);
  const otherParticipantName = getOtherParticipants(activeChat);

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
        {/* Заголовок чата */}
        <div className="friends-header chat-header-modern">
          <div className="chat-header-left">
            <button className="back-button" onClick={() => navigate('/chats')}>
              <FiArrowLeft />
            </button>
            
            <div className="chat-avatar">
              {headerAvatar ? (
                <img 
                  src={headerAvatar} 
                  alt="Аватар" 
                  className="chat-avatar-img"
                />
              ) : (
                <div className="chat-avatar-placeholder">
                  {getUserInitials(otherParticipantName)}
                </div>
              )}
            </div>
            
            <div className="chat-info">
              <h1>{otherParticipantName}</h1>
              <span className="online-status">
                {onlineUsers.has(otherParticipantId?.toString()) ? 'В сети' : 'Не в сети'}
              </span>
            </div>
          </div>
          
          <div className="chat-header-actions">
            <button className="header-action-btn">
              <FiMoreHorizontal />
            </button>
          </div>
        </div>

        {/* Сообщения */}
        <div className="friends-content">
          <div className="messages-container" ref={messagesContainerRef}>
            {loading && messages.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Загрузка сообщений...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h2>Нет сообщений</h2>
                <p>Начните общение первым!</p>
              </div>
            ) : (
              <div className="messages-list">
                {messageGroups.map(item => {
                  if (item.type === 'date') {
                    return (
                      <div key={item.id} className="date-divider">
                        <span>{formatDate(item.date)}</span>
                      </div>
                    );
                  }
                  
                  const messageAvatar = getUserAvatar(item.user_id, item.user_name);
                  
                  return (
                    <div 
                      key={item.message_id}
                      className={`message ${item.is_own ? 'own' : 'other'} ${item.is_sending ? 'sending' : ''}`}
                    >
                      {!item.is_own && (
                        <div className="message-avatar">
                          {messageAvatar ? (
                            <img 
                              src={messageAvatar} 
                              alt={item.user_name} 
                              className="message-avatar-img"
                            />
                          ) : (
                            <div className="message-avatar-placeholder">
                              {getUserInitials(item.user_name)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="message-content-wrapper">
                        {!item.is_own && (
                          <div className="message-sender">
                            {item.user_name}
                          </div>
                        )}
                        
                        <div className="message-content">
                          {renderMessageContent(item)}
                          <div className="message-time">
                            {formatTime(item.created_at)}
                            {item.is_edited && <span className="edited-indicator"> (изменено)</span>}
                            {item.is_sending && <span className="sending-indicator">...</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Форма отправки сообщений */}
        <div className="message-input-container">
          <form className="message-input-form" onSubmit={sendMessage}>
            <div className="input-wrapper">
              <button 
                type="button"
                className="input-action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Прикрепить файл"
                disabled={uploadingFile || sending}
              >
                <FiPaperclip />
              </button>
              
              <input
                ref={messageInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Написать сообщение..."
                className="message-input"
                disabled={sending || uploadingFile}
              />

              <button 
                type="submit" 
                className={`send-button ${sending ? 'sending' : ''}`}
                disabled={!newMessage.trim() || sending || uploadingFile}
                title="Отправить сообщение"
              >
                {sending ? (
                  <div className="loading-spinner small"></div>
                ) : (
                  <FiSend />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />

      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
    </div>
  );
};

export default Messenger;