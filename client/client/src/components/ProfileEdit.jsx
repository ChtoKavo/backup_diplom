// components/ProfileEdit.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import './Friends.css';
import { FiArrowLeft, FiHome, FiUsers, FiMessageCircle, FiBell, FiImage, FiMusic, FiVideo, FiBookmark, FiMoreVertical, FiSave, FiX } from 'react-icons/fi';

const ProfileEdit = ({ currentUser }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    city: '',
    website: ''
  });
  const [sidebarAvatar, setSidebarAvatar] = useState(null);
  const [banner, setBanner] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    loadProfileData();
  }, [currentUser]);

  const loadProfileData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.user_id}/profile`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          bio: data.bio || '',
          city: data.city || '',
          website: data.website || ''
        });
        if (data.avatar_url) {
          setSidebarAvatar(`${API_BASE_URL}${data.avatar_url}`);
          setAvatar(`${API_BASE_URL}${data.avatar_url}`);
        }
        if (data.banner_url) {
          setBanner(`${API_BASE_URL}${data.banner_url}`);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      setError('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBanner(file);
    }
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.user_id}/avatar`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newAvatarUrl = `${API_BASE_URL}/api/users/${currentUser.user_id}/avatar?t=${Date.now()}`;
        setAvatar(newAvatarUrl);
        setSidebarAvatar(newAvatarUrl);
        setSuccess('Аватар обновлён');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      setError('Ошибка загрузки аватара');
    }
  };

  const uploadBanner = async (file) => {
    const formData = new FormData();
    formData.append('banner', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.user_id}/banner`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newBannerUrl = `${API_BASE_URL}/api/users/${currentUser.user_id}/banner?t=${Date.now()}`;
        setBanner(newBannerUrl);
        setSuccess('Фоновое изображение обновлено');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Ошибка загрузки фона:', error);
      setError('Ошибка загрузки фона');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSuccess('Профиль обновлён успешно');
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      } else {
        setError('Ошибка при обновлении профиля');
      }
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
      setError('Ошибка при сохранении профиля');
    }
  };

  if (loading) {
    return <div className="profile-loading">Загрузка...</div>;
  }

  return (
    <div className="friends-page">
      {/* Sidebar */}
      <div className="friends-sidebar">
        {currentUser && (
          <div className="sidebar-user-profile" onClick={() => navigate(`/profile/${currentUser.user_id}`)} style={{ cursor: 'pointer' }}>
            <div className="sidebar-user-avatar">
              {sidebarAvatar ? (
                <img src={sidebarAvatar} alt={currentUser.name} />
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
            className="sidebar-nav-item"
            onClick={() => navigate('/notifications')}
          >
            <FiBell className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">Уведомления</span>
            <span className="sidebar-nav-badge">12</span>
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
        <div className="profile-edit-header">
          <button className="back-btn" onClick={() => navigate('/profile')}>
            <FiArrowLeft /> Назад
          </button>
          <h2>Редактирование профиля</h2>
          <div className="spacer"></div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="profile-edit-container">
          {/* Banner Edit */}
          <div className="profile-edit-section">
            <h3>Фоновое изображение</h3>
            <div className="edit-banner-preview">
              {banner && <img src={banner} alt="Banner" className="edit-banner-img" />}
              <button 
                className="edit-banner-btn"
                onClick={() => bannerInputRef.current?.click()}
              >
                Выбрать фон
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Avatar Edit */}
          <div className="profile-edit-section">
            <h3>Аватар</h3>
            <div className="edit-avatar-preview">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="edit-avatar-img" />
              ) : (
                <div className="edit-avatar-placeholder">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <button 
                className="edit-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
              >
                Изменить аватар
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="profile-edit-section">
            <h3>Основная информация</h3>
            <div className="edit-form-group">
              <label>Имя</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Введите имя"
              />
            </div>

            <div className="edit-form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Введите email"
              />
            </div>

            <div className="edit-form-group">
              <label>О себе</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Расскажите о себе"
                rows="4"
              />
            </div>

            <div className="edit-form-group">
              <label>Город</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Введите город"
              />
            </div>

            <div className="edit-form-group">
              <label>Веб-сайт</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="Введите веб-сайт"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-edit-actions">
            <button className="save-btn" onClick={handleSaveProfile}>
              <FiSave /> Сохранить
            </button>
            <button className="cancel-btn" onClick={() => navigate('/profile')}>
              <FiX /> Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;
