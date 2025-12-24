import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ChatSelector from './components/ChatSelector';
import Messenger from './components/Messenger';
import Feed from './components/Feed';
import Notifications from './components/Notifications';
import Friends from './components/Friends';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import Search from './components/Search';
import Fon from '../public/фон.png';
import Logo from '../public/Лого.png'
import Friend from '../public/friend.png';
import Chat from '../public/chat.png';
import Lenta from '../public/lenta.png';
import Prof from '../public/Profile.png';
import Setting from '../public/settings.png';
import Notification from '../public/nofications.png';
import './App.css';

// Компонент для основной части приложения после авторизации
function MainApp({ currentUser, activeTab, setActiveTab, sidebarOpen, setSidebarOpen, handleLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userAvatar, setUserAvatar] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Определяем мобильное устройство
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      // Закрываем сайдбар при изменении размера на десктоп
      if (window.innerWidth > 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, setSidebarOpen]);

  // Загружаем аватар пользователя
  useEffect(() => {
    if (currentUser?.user_id) {
      loadUserAvatar();
    }
  }, [currentUser]);

  // Синхронизация активной вкладки с текущим маршрутом
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/feed') setActiveTab('feed');
    else if (path === '/chats' || path.startsWith('/chat/')) setActiveTab('messenger');
    else if (path === '/friends') setActiveTab('friends');
    else if (path === '/notifications') setActiveTab('notifications');
    else if (path === '/profile' || path.startsWith('/profile/')) setActiveTab('profile');
    else if (path === '/admin') setActiveTab('admin');
  }, [location.pathname, setActiveTab]);

  // Автоматически закрываем сайдбар при навигации на мобильных устройствах
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, sidebarOpen, setSidebarOpen]);

  // Обработчик для просмотра профилей других пользователей
  const handleViewProfile = (userId) => {
    setProfileUserId(userId);
    navigate(`/profile/${userId}`);
    setActiveTab('profile');
    setSidebarOpen(false);
  };

  // Обработчик для возврата к своему профилю
  const handleViewMyProfile = () => {
    setProfileUserId(null);
    navigate('/profile');
    setActiveTab('profile');
    setSidebarOpen(false);
  };

  const loadUserAvatar = async () => {
    try {
      const response = await fetch(`http://151.247.197.250:5001/api/users/${currentUser.user_id}/avatar`);
      if (response.ok) {
        setUserAvatar(`http://151.247.197.250:5001/api/users/${currentUser.user_id}/avatar?t=${Date.now()}`);
      } else {
        setUserAvatar(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      setUserAvatar(null);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    setProfileUserId(null);
    
    switch (tab) {
      case 'feed':
        navigate('/');
        break;
      case 'messenger':
        navigate('/chats');
        break;
      case 'friends':
        navigate('/friends');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/');
    }
  };

  // Функция для отображения аватара
  const renderAvatar = () => {
    if (userAvatar) {
      return (
        <img 
          src={userAvatar} 
          alt="Аватар" 
          className="user-avatar-image"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    }
    
    return (
      <div className="user-avatar-fallback">
        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Профессиональная шапка */}
      <header className="top-header">
        <div className="header-wrapper">
          {/* Левая часть - логотип и навигация */}
          <div className="header-left">
            <div className="header-logo">
              <img src={Logo} alt="Logo" className="logo-image" />
            </div>
            
            {/* Десктопная горизонтальная навигация */}
            {!isMobile && (
              <nav className="header-nav">
                <button 
                  className={`nav-btn ${activeTab === 'feed' ? 'active' : ''}`}
                  onClick={() => handleTabChange('feed')}
                  title="Лента"
                >
                  <img src={Lenta} alt="Лента" />
                  <span>Лента</span>
                </button>
                <button 
                  className={`nav-btn ${activeTab === 'messenger' ? 'active' : ''}`}
                  onClick={() => handleTabChange('messenger')}
                  title="Чаты"
                >
                  <img src={Chat} alt="Чаты" />
                  <span>Чаты</span>
                </button>
                <button 
                  className={`nav-btn ${activeTab === 'friends' ? 'active' : ''}`}
                  onClick={() => handleTabChange('friends')}
                  title="Друзья"
                >
                  <img src={Friend} alt="Друзья" />
                  <span>Друзья</span>
                </button>
                <button 
                  className={`nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => handleTabChange('notifications')}
                  title="Уведомления"
                >
                  <img src={Notification} alt="Уведомления" />
                  <span>Уведомления</span>
                </button>
              </nav>
            )}
          </div>

          {/* Правая часть - профиль и действия */}
          <div className="header-right">
            {!isMobile && (
              <div className="user-profile-section">
                <div className="user-avatar" onClick={handleViewMyProfile} style={{ cursor: 'pointer' }}>
                  {renderAvatar()}
                </div>
                <div className="user-info" onClick={handleViewMyProfile} style={{ cursor: 'pointer' }}>
                  <div className="user-name">{currentUser.name}</div>
                  <div className="user-role">{currentUser.role}</div>
                </div>
              </div>
            )}
            
            {currentUser.role === 'admin' && !isMobile && (
              <button 
                className={`admin-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => handleTabChange('admin')}
                title="Админ панель"
              >
                <img src={Setting} alt="Админ" />
              </button>
            )}

            {isMobile && (
              <div className="user-avatar" onClick={handleViewMyProfile} style={{ cursor: 'pointer' }}>
                {renderAvatar()}
              </div>
            )}

            <button onClick={handleLogout} className="logout-btn" title="Выход">
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Мобильная навигация */}
      {isMobile && (
        <div className="mobile-bottom-nav">
          <button 
            className={`mobile-nav-item ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => handleTabChange('feed')}
          >
            <span className="mobile-nav-icon"><img src={Lenta} alt="Лента" /></span>
            <span className="mobile-nav-label">Лента</span>
          </button>
          <button 
            className={`mobile-nav-item ${activeTab === 'messenger' ? 'active' : ''}`}
            onClick={() => handleTabChange('messenger')}
          >
            <span className="mobile-nav-icon"><img src={Chat} alt="Мессенджер" /></span>
            <span className="mobile-nav-label">Чат</span>
          </button>
          <button 
            className={`mobile-nav-item ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => handleTabChange('friends')}
          >
            <span className="mobile-nav-icon"><img src={Friend} alt="Друзья" /></span>
            <span className="mobile-nav-label">Друзья</span>
          </button>
          <button 
            className={`mobile-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleTabChange('notifications')}
          >
            <span className="mobile-nav-icon"><img src={Notification} alt="Уведомления" /></span>
            <span className="mobile-nav-label">Уведомления</span>
          </button>
          <button 
            className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={handleViewMyProfile}
          >
            <span className="mobile-nav-icon"><img src={Prof} alt="Профиль" /></span>
            <span className="mobile-nav-label">Профиль</span>
          </button>
        </div>
      )}

      {/* Боковое меню как отдельное окно */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
           onClick={() => setSidebarOpen(false)}>
      </div>
      
      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <h3>Навигация</h3>
          <button 
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => handleTabChange('feed')}
          >
            <span className="sidebar-icon"><img src={Lenta} alt="" /></span>
            <span className="sidebar-label">Лента</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'messenger' ? 'active' : ''}`}
            onClick={() => handleTabChange('messenger')}
          >
            <span className="sidebar-icon"><img src={Chat} alt="" /></span>
            <span className="sidebar-label">Мессенджер</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => handleTabChange('friends')}
          >
            <span className="sidebar-icon"><img src={Friend} alt="" /></span>
            <span className="sidebar-label">Друзья</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => handleTabChange('notifications')}
          >
            <span className="sidebar-icon"><img src={Notification} alt="" /></span>
            <span className="sidebar-label">Уведомления</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={handleViewMyProfile}
          >
            <span className="sidebar-icon"><img src={Prof} alt="" /></span>
            <span className="sidebar-label">Профиль</span>
          </button>
          {currentUser.role === 'admin' && (
            <button 
              className={`sidebar-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => handleTabChange('admin')}
            >
              <span className="sidebar-icon"><img src={Setting} alt="" /></span>
              <span className="sidebar-label">Админ-панель</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Основной контент с маршрутизацией */}
      <main className={`main-content ${isMobile ? 'mobile' : ''}`}>
        <Routes>
          <Route path="/" element={<Feed currentUser={currentUser} isMobile={isMobile} />} />
          <Route path="/feed" element={<Feed currentUser={currentUser} isMobile={isMobile} />} />
          <Route path="/chats" element={<ChatSelector currentUser={currentUser} isMobile={isMobile} />} />
          <Route path="/chat/:chatId" element={<Messenger currentUser={currentUser} isMobile={isMobile} />} />
          <Route 
            path="/friends" 
            element={
              <Friends 
                currentUserId={currentUser.user_id} 
                onViewProfile={handleViewProfile}
                isMobile={isMobile}
              />
            } 
          />
          <Route path="/notifications" element={<Notifications currentUser={currentUser} isMobile={isMobile} />} />
          <Route 
            path="/profile" 
            element={
              <Profile 
                currentUser={currentUser}
                isMobile={isMobile}
              />
            } 
          />
          <Route 
            path="/profile/:userId" 
            element={
              <Profile 
                currentUser={currentUser}
                isMobile={isMobile}
              />
            } 
          />
          <Route 
            path="/admin" 
            element={
              currentUser.role === 'admin' 
                ? <AdminPanel currentUser={currentUser} isMobile={isMobile} /> 
                : <Navigate to="/" replace />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = () => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      console.log('Saved user from localStorage:', savedUser);
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        console.log('Parsed user:', parsedUser);
        setCurrentUser(parsedUser);
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      localStorage.removeItem('currentUser');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user) => {
    console.log('User logged in:', user);
    setCurrentUser(user);
    const userToSave = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    localStorage.setItem('currentUser', JSON.stringify(userToSave));
  };

  const handleRegister = (user) => {
    console.log('User registered:', user);
    setCurrentUser(user);
    const userToSave = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    localStorage.setItem('currentUser', JSON.stringify(userToSave));
  };

  const handleLogout = () => {
    console.log('Logging out...');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setShowAdminPanel(false);
    setSidebarOpen(false);
    setActiveTab('feed');
    if (socket) {
      socket.disconnect();
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {/* Фон без размытия */}
        <div className="background-overlay">
          <div className="background-image"></div>
          <div className="background-gradient"></div>
        </div>
        
        <Routes>
          <Route 
            path="*" 
            element={
              currentUser ? (
                <MainApp 
                  currentUser={currentUser}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  handleLogout={handleLogout}
                />
              ) : showRegister ? (
                <Register 
                  onRegister={handleRegister} 
                  onSwitchToLogin={() => setShowRegister(false)}
                />
              ) : (
                <Login 
                  onLogin={handleLogin} 
                  onSwitchToRegister={() => setShowRegister(true)}
                />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;