import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feed.css';

const Videos = ({ currentUser, isMobile }) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    loadVideos();
  }, [currentUser]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/posts?media_type=video`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки видео');
      }
      
      const data = await response.json();
      setVideos(Array.isArray(data.posts || data) ? (data.posts || data) : []);
    } catch (error) {
      console.error('Ошибка загрузки видео:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="videos-page">
      <div className="videos-header">
        <h1>Видео</h1>
        <p className="videos-description">Все видео из постов</p>
      </div>

      {loading ? (
        <div className="videos-loading">
          <div className="loading-spinner"></div>
          <p>Загружаем видео...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="videos-empty">
          <div className="videos-empty-icon">🎬</div>
          <h3>Видео пока нет</h3>
          <p>Поделитесь видео в постах</p>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.post_id} className="video-item">
              <div className="video-thumbnail">
                {video.image_url ? (
                  <img 
                    src={`${API_BASE_URL}${video.image_url}`} 
                    alt="Видео"
                    className="video-thumbnail-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="video-placeholder">🎬</div>
                )}
                <div className="video-play-button">▶️</div>
              </div>
              <div className="video-info">
                <div className="video-title">{video.title || 'Без названия'}</div>
                <div className="video-author">{video.author_name || 'Неизвестный автор'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Videos;
