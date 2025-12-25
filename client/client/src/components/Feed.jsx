// components/Feed.jsx
import React, { useState, useEffect } from 'react';
import './Feed.css';

const Feed = ({ currentUser, socket }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', images: [] });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const API_BASE_URL = 'http://localhost:5001';

  useEffect(() => {
    if (currentUser) {
      loadPosts();
    }
  }, [currentUser]);

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
      
      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('post_liked', handlePostLiked);
        socket.off('post_unliked', handlePostUnliked);
        socket.off('like_error', handleLikeError);
      };
    }
  }, [socket]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const url = new URL(`${API_BASE_URL}/api/posts`);
      if (currentUser && currentUser.user_id) {
        url.searchParams.append('user_id', currentUser.user_id.toString());
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки постов: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]);
        setError('Ошибка формата данных');
      }
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
      setError('Не удалось загрузить посты');
      setPosts([]);
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
          likes_count: (post.likes_count || 0) + 1
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
          likes_count: Math.max(0, (post.likes_count || 1) - 1)
        };
      }
      return post;
    }));
  };

  const handleLikeError = (errorData) => {
    console.error('Like error:', errorData);
    setError(errorData.error || 'Ошибка при лайке');
    loadPosts();
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
        images: post.images || []
      };
      
      setPosts(prev => [postWithLike, ...prev]);
      setNewPost({ content: '', images: [] });
      setShowCreatePost(false);
      setError('');
      
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
        loadPosts();
      }
      return;
    }

    try {
      setPosts(prev => prev.map(post => {
        if (post.post_id === postId) {
          const wasLiked = post.is_liked;
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
      loadPosts();
    }
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    const totalImages = newPost.images.length + files.length;
    if (totalImages > 5) {
      setError(`Можно загрузить не более 5 изображений. У вас уже ${newPost.images.length}, пытаетесь добавить еще ${files.length}`);
      e.target.value = '';
      return;
    }

    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`Файл "${file.name}" слишком большой (максимум 5MB)`);
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

  return (
    <div className="feed-container">
      <div className="feed-header">
        <div className="feed-header-content">
          <h1>Лента новостей</h1>
          <p>Будьте в курсе последних событий</p>
        </div>
        
        <button 
          className="create-post-btn"
          onClick={() => setShowCreatePost(true)}
        >
          <span className="btn-icon">+</span>
          Создать пост
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {showCreatePost && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Создать новый пост</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreatePost(false);
                  setNewPost({ content: '', images: [] });
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={createPost} className="post-form">
              <div className="form-body">
                <div className="current-user-info">
                  <div className="user-avatar">
                    {currentUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{currentUser.name}</span>
                    <span className="post-visibility">Публичный пост</span>
                  </div>
                </div>
                
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  placeholder="Что у вас нового? Поделитесь своими мыслями..."
                  rows="5"
                  maxLength="2000"
                  className="post-content-input"
                />
                
                <div className="char-counter">
                  <span>{newPost.content.length}</span>/2000
                </div>

                {newPost.images.length > 0 && (
                  <div className="images-preview-container">
                    <div className="images-grid">
                      {newPost.images.map((image, index) => (
                        <div key={index} className="preview-image-wrapper">
                          <img 
                            src={URL.createObjectURL(image)} 
                            alt={`Preview ${index + 1}`} 
                            className="preview-image"
                          />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => removeImage(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-footer">
                <div className="form-actions">
                  <label className="upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      disabled={newPost.images.length >= 5}
                    />
                    <span className="upload-icon">📷</span>
                    <span>Фото</span>
                    {newPost.images.length > 0 && (
                      <span className="upload-count">({newPost.images.length}/5)</span>
                    )}
                  </label>
                </div>
                
                <div className="form-buttons">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreatePost(false);
                      setNewPost({ content: '', images: [] });
                      setError('');
                    }}
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!newPost.content.trim()}
                  >
                    Опубликовать
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="posts-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Загрузка постов...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📰</div>
            <h3>Лента пуста</h3>
            <p>Начните делиться новостями с друзьями!</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreatePost(true)}
            >
              Создать первый пост
            </button>
          </div>
        ) : (
          posts.map(post => (
            <PostItem 
              key={post.post_id} 
              post={post} 
              currentUser={currentUser}
              onLike={handleLike}
              formatDate={formatDate}
              socketConnected={socketConnected}
              API_BASE_URL={API_BASE_URL}
            />
          ))
        )}
      </div>
    </div>
  );
};

const PostItem = ({ post, currentUser, onLike, formatDate, socketConnected, API_BASE_URL }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [authorAvatar, setAuthorAvatar] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    const loadAuthorAvatar = async () => {
      try {
        if (post.user_id) {
          const response = await fetch(`${API_BASE_URL}/api/users/${post.user_id}/profile`);
          if (response.ok) {
            const userData = await response.json();
            if (userData.avatar_url) {
              setAuthorAvatar(userData.avatar_url);
            }
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
      setComments([]);
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
      setShowComments(true);
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
      <div className={`post-images ${getGridClass(images.length)}`}>
        {images.map((imageUrl, index) => (
          <div 
            key={index} 
            className="post-image-item"
            onClick={() => setExpandedImage(imageUrl)}
          >
            <img 
              src={`${API_BASE_URL}${imageUrl}`} 
              alt={`Изображение ${index + 1}`} 
              className="post-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {images.length > 4 && index === 3 && (
              <div className="images-overlay">
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
        <div className="image-modal" onClick={() => setExpandedImage(null)}>
          <img 
            src={`${API_BASE_URL}${expandedImage}`} 
            alt="Expanded" 
            className="expanded-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="close-image-modal" onClick={() => setExpandedImage(null)}>
            ×
          </button>
        </div>
      )}

      <article className="post-card">
        <header className="post-header">
          <div className="post-author">
            <div className="author-avatar">
              {authorAvatar ? (
                <img 
                  src={`${API_BASE_URL}${authorAvatar}`} 
                  alt="Avatar"
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-fallback">
                  {post.author_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="author-info">
              <h3 className="author-name">{post.author_name || 'Пользователь'}</h3>
              <div className="post-meta">
                <time className="post-time">{formatDate(post.created_at)}</time>
              </div>
            </div>
          </div>
        </header>

        <div className="post-content">
          <p className="post-text">{post.content}</p>
          {renderPostImages()}
        </div>

        <div className="post-stats">
          <div className="stats-item">
            <span className="stats-icon">❤️</span>
            <span className="stats-count">{post.likes_count || 0}</span>
          </div>
          <div className="stats-item">
            <span className="stats-icon">💬</span>
            <span className="stats-count">{post.comments_count || 0}</span>
          </div>
        </div>

        <div className="post-actions">
          <button 
            className={`action-btn ${post.is_liked ? 'liked' : ''}`}
            onClick={() => onLike(post.post_id)}
            title={post.is_liked ? 'Убрать лайк' : 'Поставить лайк'}
          >
            <span className="action-icon">
              {post.is_liked ? '❤️' : '🤍'}
            </span>
            <span className="action-label">Нравится</span>
          </button>
          
          <button 
            className="action-btn"
            onClick={loadComments}
            disabled={loadingComments}
          >
            <span className="action-icon">💬</span>
            <span className="action-label">
              {loadingComments ? 'Загрузка...' : 'Комментировать'}
            </span>
          </button>
        </div>

        {showComments && (
          <div className="comments-section">
            <div className="add-comment-form">
              <div className="comment-avatar">
                {currentUser.name?.charAt(0).toUpperCase()}
              </div>
              <div className="comment-input-group">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleCommentKeyPress}
                  placeholder="Напишите комментарий..."
                  className="comment-input"
                />
                <button 
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="comment-submit-btn"
                >
                  Отправить
                </button>
              </div>
            </div>
            
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="no-comments">
                  <p>Комментариев пока нет</p>
                  <p className="hint">Будьте первым, кто оставит комментарий!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.comment_id} className="comment-item">
                    <div className="comment-author-avatar">
                      {comment.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author-name">{comment.user_name}</span>
                        <span className="comment-time">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </article>
    </>
  );
};

export default Feed;