// components/Feed.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feed.css';
import { 
  FiHeart, FiMessageCircle, FiShare2, FiMoreVertical,
  FiImage, FiVideo, FiMusic, FiMapPin, FiSmile,
  FiSend, FiSearch, FiBell, FiHome, FiUsers,
  FiBookmark, FiEye, FiRepeat, FiCalendar
} from 'react-icons/fi';
import { 
  AiFillHeart, AiOutlineHeart, AiOutlineComment,
  AiOutlineShareAlt, AiOutlineEye, AiOutlineMore
} from 'react-icons/ai';

const Feed = ({ currentUser, socket }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', images: [] });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarAvatar, setSidebarAvatar] = useState(currentUser?.avatar_url);
  const loaderRef = useRef(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5001';

  useEffect(() => {
    if (currentUser) {
      loadPosts(true);
    }
  }, [currentUser]);

  useEffect(() => {
    const loadCurrentUserAvatar = async () => {
      try {
        if (currentUser?.user_id) {
          const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.user_id}/profile`);
          if (response.ok) {
            const userData = await response.json();
            console.log('Данные текущего пользователя:', userData);
            if (userData.avatar_url) {
              setSidebarAvatar(userData.avatar_url);
            }
          } else {
            console.error('Ошибка загрузки профиля текущего пользователя:', response.status);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки аватарки текущего пользователя:', error);
      }
    };

    loadCurrentUserAvatar();
  }, [currentUser?.user_id, API_BASE_URL]);

  useEffect(() => {
    if (socket) {
      setSocketConnected(socket.connected);

      socket.on('connect', () => {
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('post_liked', handlePostLiked);
      socket.on('post_unliked', handlePostUnliked);
      socket.on('like_error', handleLikeError);
      socket.on('new_post', handleNewPost);
      socket.on('new_comment', handleNewComment);
      
      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('post_liked', handlePostLiked);
        socket.off('post_unliked', handlePostUnliked);
        socket.off('like_error', handleLikeError);
        socket.off('new_post', handleNewPost);
        socket.off('new_comment', handleNewComment);
      };
    }
  }, [socket]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPosts(false);
        }
      },
      { threshold: 0.5 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  const loadPosts = async (reset = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError('');
      
      const currentPage = reset ? 1 : page;
      const url = new URL(`${API_BASE_URL}/api/posts`);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('limit', '10');
      
      if (currentUser && currentUser.user_id) {
        url.searchParams.append('user_id', currentUser.user_id.toString());
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки постов: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data.posts || data)) {
        const newPosts = data.posts || data;
        if (reset) {
          setPosts(newPosts);
          setPage(2);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
          setPage(prev => prev + 1);
        }
        
        setHasMore(newPosts.length === 10);
      } else {
        setPosts([]);
        setError('Ошибка формата данных');
      }
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
      setError('Не удалось загрузить посты');
    } finally {
      setLoading(false);
    }
  };

  const handlePostLiked = (data) => {
    setPosts(prev => prev.map(post => {
      if (post.post_id === data.post_id) {
        return {
          ...post,
          is_liked: true,
          likes_count: (post.likes_count || 0) + 1,
          liked_users: [...(post.liked_users || []), { user_id: data.user_id }]
        };
      }
      return post;
    }));
  };

  const handlePostUnliked = (data) => {
    setPosts(prev => prev.map(post => {
      if (post.post_id === data.post_id) {
        return {
          ...post,
          is_liked: false,
          likes_count: Math.max(0, (post.likes_count || 1) - 1),
          liked_users: (post.liked_users || []).filter(user => user.user_id !== data.user_id)
        };
      }
      return post;
    }));
  };

  const handleNewPost = (postData) => {
    if (postData.user_id !== currentUser.user_id) {
      setPosts(prev => [{
        ...postData,
        is_liked: false,
        likes_count: 0,
        comments_count: 0
      }, ...prev]);
    }
  };

  const handleNewComment = (commentData) => {
    setPosts(prev => prev.map(post => {
      if (post.post_id === commentData.post_id) {
        return {
          ...post,
          comments_count: (post.comments_count || 0) + 1
        };
      }
      return post;
    }));
  };

  const handleLikeError = (errorData) => {
    console.error('Like error:', errorData);
    setError(errorData.error || 'Ошибка при лайке');
    loadPosts(true);
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) {
      setError('Введите текст поста');
      return;
    }

    try {
      setError('');
      const formData = new FormData();
      formData.append('user_id', currentUser.user_id.toString());
      formData.append('title', newPost.content.substring(0, 100));
      formData.append('content', newPost.content);
      formData.append('is_public', '1');
      formData.append('category_id', '1');
      
      newPost.images.forEach((image) => {
        formData.append('media', image);
      });

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка создания поста');
      }

      const post = await response.json();
      
      const postWithLike = { 
        ...post, 
        is_liked: false, 
        likes_count: 0, 
        comments_count: 0,
        images: post.images || [],
        author_name: currentUser.name,
        author_avatar: currentUser.avatar_url
      };
      
      setPosts(prev => [postWithLike, ...prev]);
      setNewPost({ content: '', images: [] });
      setShowCreatePost(false);
      setError('');
      
      if (socket && socketConnected) {
        socket.emit('new_post', postWithLike);
      }
      
    } catch (error) {
      console.error('Ошибка создания поста:', error);
      setError(error.message || 'Не удалось создать пост');
    }
  };

  const handleLike = async (postId) => {
    if (!socket || !socketConnected) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: currentUser.user_id
          })
        });

        if (response.ok) {
          const result = await response.json();
          setPosts(prev => prev.map(post => {
            if (post.post_id === postId) {
              return {
                ...post,
                is_liked: result.is_liked,
                likes_count: result.likes_count
              };
            }
            return post;
          }));
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка лайка');
        }
      } catch (error) {
        console.error('Ошибка лайка через REST:', error);
        setError(`Ошибка: ${error.message}`);
        loadPosts(true);
      }
      return;
    }

    try {
      const post = posts.find(p => p.post_id === postId);
      const wasLiked = post?.is_liked || false;
      
      setPosts(prev => prev.map(post => {
        if (post.post_id === postId) {
          return {
            ...post,
            is_liked: !wasLiked,
            likes_count: wasLiked ? 
              Math.max(0, (post.likes_count || 1) - 1) : 
              (post.likes_count || 0) + 1
          };
        }
        return post;
      }));

      socket.emit('like_post', {
        post_id: postId,
        user_id: currentUser.user_id
      });

    } catch (error) {
      console.error('Ошибка отправки лайка через WebSocket:', error);
      setError('Не удалось поставить лайк');
      loadPosts(true);
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    const totalImages = newPost.images.length + files.length;
    if (totalImages > 10) {
      setError(`Можно загрузить не более 10 изображений. У вас уже ${newPost.images.length}, пытаетесь добавить еще ${files.length}`);
      e.target.value = '';
      return;
    }

    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`Файл "${file.name}" слишком большой (максимум 10MB)`);
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        errors.push(`Файл "${file.name}" не является изображением`);
        return;
      }
      
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    }

    if (validFiles.length > 0) {
      setNewPost(prev => ({ 
        ...prev, 
        images: [...prev.images, ...validFiles] 
      }));
      setError('');
    }

    e.target.value = '';
  };

  const removeImage = (indexToRemove) => {
    setNewPost(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleProfileClick = () => {
    navigate(`/profile/${currentUser?.user_id}`);
  };

  return (
    <div className="vk-feed-container">
      {/* Sidebar */}
      <div className="vk-sidebar">
        <div className="vk-sidebar-header">
          <div className="vk-logo">
            <div className="vk-logo-icon">VK</div>
            <span className="vk-logo-text">Социальная сеть</span>
          </div>
        </div>
        
        <div className="vk-user-profile" onClick={handleProfileClick} style={{cursor: 'pointer'}}>
          <div className="vk-user-avatar">
            {sidebarAvatar ? (
              <img 
                src={`${API_BASE_URL}${sidebarAvatar}`} 
                alt={currentUser.name}
                onError={(e) => {
                  console.error('Ошибка загрузки аватарки боковой панели:', sidebarAvatar);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="vk-avatar-fallback">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="vk-user-info">
            <div className="vk-user-name">{currentUser?.name || 'Пользователь'}</div>
            <div className="vk-user-status">online</div>
          </div>
        </div>

        <nav className="vk-nav-menu">
          <a href="#" className="vk-nav-item active">
            <FiHome className="vk-nav-icon" />
            <span className="vk-nav-text">Новости</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiUsers className="vk-nav-icon" />
            <span className="vk-nav-text">Друзья</span>
            <span className="vk-nav-badge">127</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiMessageCircle className="vk-nav-icon" />
            <span className="vk-nav-text">Сообщения</span>
            <span className="vk-nav-badge">3</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiBell className="vk-nav-icon" />
            <span className="vk-nav-text">Уведомления</span>
            <span className="vk-nav-badge">12</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiImage className="vk-nav-icon" />
            <span className="vk-nav-text">Фотографии</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiMusic className="vk-nav-icon" />
            <span className="vk-nav-text">Музыка</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiVideo className="vk-nav-icon" />
            <span className="vk-nav-text">Видео</span>
          </a>
          <a href="#" className="vk-nav-item">
            <FiBookmark className="vk-nav-icon" />
            <span className="vk-nav-text">Закладки</span>
          </a>
        </nav>

        <div className="vk-sidebar-footer">
          <button className="vk-settings-btn">
            <FiMoreVertical className="vk-settings-icon" />
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
              placeholder="Поиск по новостям, людям, сообществам..."
              className="vk-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="vk-header-actions">
            <button className="vk-create-post-btn" onClick={() => setShowCreatePost(true)}>
              <FiSend className="vk-create-post-icon" />
              Создать запись
            </button>
            
            <div className="vk-notifications">
              <FiBell className="vk-notifications-icon" />
              <span className="vk-notifications-badge">12</span>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="vk-tabs">
          <button 
            className={`vk-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Все
          </button>
          <button 
            className={`vk-tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Друзья
          </button>
          <button 
            className={`vk-tab ${activeTab === 'communities' ? 'active' : ''}`}
            onClick={() => setActiveTab('communities')}
          >
            Сообщества
          </button>
          <button 
            className={`vk-tab ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            Популярное
          </button>
        </div>

        {/* Create Post Button */}
        <div className="vk-create-post-prompt">
          <div className="vk-create-post-author">
            <div className="vk-create-post-avatar">
              {currentUser?.avatar_url ? (
                <img src={`${API_BASE_URL}${currentUser.avatar_url}`} alt={currentUser.name} />
              ) : (
                <div className="vk-avatar-fallback">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <input 
              type="text" 
              placeholder={`Что у Вас нового, ${currentUser?.name?.split(' ')[0] || 'друг'}?`}
              className="vk-create-post-input"
              onClick={() => setShowCreatePost(true)}
              readOnly
            />
          </div>
          
          <div className="vk-create-post-actions">
            <button className="vk-media-btn">
              <FiImage className="vk-media-icon" />
              <span>Фото/Видео</span>
            </button>
            <button className="vk-media-btn">
              <FiSmile className="vk-media-icon" />
              <span>Чувства</span>
            </button>
            <button className="vk-media-btn">
              <FiMapPin className="vk-media-icon" />
              <span>Место</span>
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="vk-posts-container">
          {loading && posts.length === 0 ? (
            <div className="vk-loading">
              <div className="vk-spinner"></div>
              <p>Загружаем новости...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="vk-empty-state">
              <div className="vk-empty-icon">📰</div>
              <h3>Новостей пока нет</h3>
              <p>Будьте первым, кто поделится новостью!</p>
              <button 
                className="vk-primary-btn"
                onClick={() => setShowCreatePost(true)}
              >
                Написать первым
              </button>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <PostItem 
                  key={post.post_id} 
                  post={post} 
                  currentUser={currentUser}
                  onLike={handleLike}
                  formatDate={formatDate}
                  socketConnected={socketConnected}
                  API_BASE_URL={API_BASE_URL}
                  index={index}
                />
              ))}
              
              {hasMore && (
                <div ref={loaderRef} className="vk-infinite-loader">
                  <div className="vk-loader-dots">
                    <div className="vk-dot"></div>
                    <div className="vk-dot"></div>
                    <div className="vk-dot"></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar - Recommendations */}
        <div className="vk-right-sidebar">
          <div className="vk-recommendations">
            <h3 className="vk-sidebar-title">Рекомендации</h3>
            
            <div className="vk-friend-suggestions">
              <div className="vk-friend-card">
                <div className="vk-friend-avatar">АБ</div>
                <div className="vk-friend-info">
                  <div className="vk-friend-name">Алексей Борисов</div>
                  <div className="vk-friend-mutual">12 общих друзей</div>
                  <button className="vk-add-friend-btn">Добавить</button>
                </div>
              </div>
              
              <div className="vk-friend-card">
                <div className="vk-friend-avatar">МК</div>
                <div className="vk-friend-info">
                  <div className="vk-friend-name">Мария Кузнецова</div>
                  <div className="vk-friend-mutual">8 общих друзей</div>
                  <button className="vk-add-friend-btn">Добавить</button>
                </div>
              </div>
            </div>

            <div className="vk-birthdays">
              <h4 className="vk-birthdays-title">Дни рождения</h4>
              <div className="vk-birthday-item">
                <div className="vk-birthday-avatar">ИП</div>
                <div className="vk-birthday-info">
                  <div className="vk-birthday-name">Иван Петров</div>
                  <div className="vk-birthday-age">Сегодня 25 лет</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="vk-modal-overlay">
          <div className="vk-modal">
            <div className="vk-modal-header">
              <h3>Создание записи</h3>
              <button 
                className="vk-modal-close"
                onClick={() => {
                  setShowCreatePost(false);
                  setNewPost({ content: '', images: [] });
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            
            <div className="vk-modal-content">
              <div className="vk-modal-author">
                <div className="vk-modal-avatar">
                  {currentUser?.avatar_url ? (
                    <img src={`${API_BASE_URL}${currentUser.avatar_url}`} alt={currentUser.name} />
                  ) : (
                    <div className="vk-avatar-fallback">
                      {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="vk-modal-user-info">
                  <div className="vk-modal-user-name">{currentUser?.name}</div>
                  <select className="vk-privacy-select">
                    <option value="public">🌍 Публичная запись</option>
                    <option value="friends">👥 Только друзья</option>
                    <option value="private">🔒 Только я</option>
                  </select>
                </div>
              </div>
              
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                placeholder="Что у Вас нового?"
                className="vk-post-textarea"
                rows="4"
              />
              
              {newPost.images.length > 0 && (
                <div className="vk-attachment-preview">
                  {newPost.images.map((image, index) => (
                    <div key={index} className="vk-attachment-item">
                      <img src={URL.createObjectURL(image)} alt={`Приложение ${index + 1}`} />
                      <button 
                        className="vk-remove-attachment"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="vk-attachment-options">
                <label className="vk-attachment-option">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleImagesChange}
                    disabled={newPost.images.length >= 10}
                  />
                  <FiImage className="vk-attachment-icon" />
                  <span>Фото/Видео</span>
                </label>
                
                <button className="vk-attachment-option">
                  <FiMapPin className="vk-attachment-icon" />
                  <span>Место</span>
                </button>
                
                <button className="vk-attachment-option">
                  <FiSmile className="vk-attachment-icon" />
                  <span>Чувства</span>
                </button>
                
                <button className="vk-attachment-option">
                  <FiCalendar className="vk-attachment-icon" />
                  <span>Событие</span>
                </button>
              </div>
            </div>
            
            <div className="vk-modal-footer">
              <button 
                className="vk-secondary-btn"
                onClick={() => {
                  setShowCreatePost(false);
                  setNewPost({ content: '', images: [] });
                  setError('');
                }}
              >
                Отмена
              </button>
              <button 
                className="vk-primary-btn"
                onClick={createPost}
                disabled={!newPost.content.trim()}
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PostItem = ({ post, currentUser, onLike, formatDate, socketConnected, API_BASE_URL, index }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [authorAvatar, setAuthorAvatar] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const loadAuthorAvatar = async () => {
      try {
        if (post.user_id) {
          const response = await fetch(`${API_BASE_URL}/api/users/${post.user_id}/profile`);
          if (response.ok) {
            const userData = await response.json();
            console.log('Данные профиля автора:', userData);
            if (userData.avatar_url) {
              setAuthorAvatar(userData.avatar_url);
            }
          } else {
            console.error('Ошибка загрузки профиля автора:', response.status);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки аватарки автора:', error);
      }
    };

    loadAuthorAvatar();
  }, [post.user_id, API_BASE_URL]);

  const loadComments = async () => {
    if (comments.length > 0 && showComments) {
      setShowComments(false);
      setTimeout(() => setComments([]), 300);
      return;
    }

    try {
      setLoadingComments(true);
      
      const response = await fetch(
        `${API_BASE_URL}/api/posts/${post.post_id}/comments?user_id=${currentUser.user_id}`
      );
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки комментариев');
      }
      
      const data = await response.json();
      setComments(Array.isArray(data) ? data : []);
      setTimeout(() => setShowComments(true), 10);
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${post.post_id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          content: newComment
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка добавления комментария');
      }

      const addedComment = await response.json();
      
      setComments(prev => [...prev, addedComment]);
      setNewComment('');
      post.comments_count = (post.comments_count || 0) + 1;
      
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      alert('Не удалось добавить комментарий: ' + error.message);
    }
  };

  const handleCommentKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    onLike(post.post_id);
  };

  const renderPostImages = () => {
    if (!post.image_url && !post.images) return null;

    let images = [];
    
    if (post.images && Array.isArray(post.images)) {
      images = post.images;
    } else if (post.image_url) {
      images = [post.image_url];
    }

    if (images.length === 0) return null;

    const getGridClass = (count) => {
      if (count === 1) return 'single-image';
      if (count === 2) return 'two-images';
      if (count === 3) return 'three-images';
      return 'four-images';
    };

    return (
      <div className={`vk-post-images ${getGridClass(images.length)}`}>
        {images.map((imageUrl, index) => (
          <div 
            key={index} 
            className="vk-post-image-item"
            onClick={() => setExpandedImage(imageUrl)}
          >
            <img 
              src={`${API_BASE_URL}${imageUrl}`} 
              alt={`Изображение ${index + 1}`} 
              className="vk-post-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {images.length > 4 && index === 3 && (
              <div className="vk-images-overlay">
                +{images.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {expandedImage && (
        <div className="vk-image-modal" onClick={() => setExpandedImage(null)}>
          <img 
            src={`${API_BASE_URL}${expandedImage}`} 
            alt="Expanded" 
            className="vk-expanded-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="vk-close-image-modal" onClick={() => setExpandedImage(null)}>
            ×
          </button>
        </div>
      )}

      <div className="vk-post">
        {/* Post Header */}
        <div className="vk-post-header">
          <div className="vk-post-author">
            <div className="vk-post-avatar">
              {authorAvatar ? (
                <img 
                  src={`${API_BASE_URL}${authorAvatar}`} 
                  alt="Avatar"
                  className="vk-avatar-image"
                  onError={(e) => {
                    console.error('Ошибка загрузки аватарки поста:', authorAvatar);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="vk-avatar-fallback">
                  {post.author_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="vk-post-author-info">
              <div className="vk-post-author-name">{post.author_name || 'Пользователь'}</div>
              <div className="vk-post-meta">
                <span className="vk-post-time">{formatDate(post.created_at)}</span>
                {post.is_public && <span className="vk-post-privacy">🌍</span>}
              </div>
            </div>
          </div>
          
          <div className="vk-post-options">
            <button 
              className="vk-options-btn"
              onClick={() => setShowOptions(!showOptions)}
            >
              <AiOutlineMore />
            </button>
            
            {showOptions && (
              <div className="vk-options-dropdown">
                <button className="vk-option-item">Скопировать ссылку</button>
                <button className="vk-option-item">Пожаловаться</button>
                <button className="vk-option-item">Скрыть</button>
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="vk-post-content">
          <p className="vk-post-text">{post.content}</p>
          {renderPostImages()}
        </div>

        {/* Post Stats */}
        <div className="vk-post-stats">
          <div className="vk-stat">
            <AiOutlineHeart className="vk-stat-icon" />
            <span className="vk-stat-count">{likesCount}</span>
          </div>
          <div className="vk-stat">
            <AiOutlineComment className="vk-stat-icon" />
            <span className="vk-stat-count">{post.comments_count || 0}</span>
          </div>
          <div className="vk-stat">
            <AiOutlineEye className="vk-stat-icon" />
            <span className="vk-stat-count">{post.views_count || 0}</span>
          </div>
          <div className="vk-stat">
            <FiRepeat className="vk-stat-icon" />
            <span className="vk-stat-count">{post.shares_count || 0}</span>
          </div>
        </div>

        {/* Post Actions */}
        <div className="vk-post-actions">
          <button 
            className={`vk-action-btn ${isLiked ? 'vk-action-liked' : ''}`}
            onClick={handleLike}
          >
            {isLiked ? (
              <AiFillHeart className="vk-action-icon" />
            ) : (
              <AiOutlineHeart className="vk-action-icon" />
            )}
            <span className="vk-action-text">Нравится</span>
          </button>
          
          <button 
            className="vk-action-btn"
            onClick={loadComments}
            disabled={loadingComments}
          >
            <AiOutlineComment className="vk-action-icon" />
            <span className="vk-action-text">
              {loadingComments ? 'Загрузка...' : 'Комментировать'}
            </span>
          </button>
          
          <button className="vk-action-btn">
            <AiOutlineShareAlt className="vk-action-icon" />
            <span className="vk-action-text">Поделиться</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="vk-comments-section">
            {/* Add Comment */}
            <div className="vk-add-comment">
              <div className="vk-comment-avatar">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="vk-comment-input-wrapper">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleCommentKeyPress}
                  placeholder="Напишите комментарий..."
                  className="vk-comment-input"
                />
                <button 
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="vk-comment-submit-btn"
                >
                  <FiSend />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="vk-comments-list">
              {comments.length === 0 ? (
                <div className="vk-no-comments">
                  <p>Комментариев пока нет</p>
                  <p className="vk-hint">Будьте первым, кто оставит комментарий!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.comment_id} className="vk-comment">
                    <div className="vk-comment-avatar">
                      {comment.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="vk-comment-content">
                      <div className="vk-comment-header">
                        <span className="vk-comment-author">{comment.user_name}</span>
                        <span className="vk-comment-time">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="vk-comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Feed;