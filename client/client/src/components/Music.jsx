import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feed.css';

const Music = ({ currentUser, isMobile }) => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    loadMusic();
  }, [currentUser]);

  const loadMusic = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/posts?media_type=audio`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки музыки');
      }
      
      const data = await response.json();
      setTracks(Array.isArray(data.posts || data) ? (data.posts || data) : []);
    } catch (error) {
      console.error('Ошибка загрузки музыки:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="music-page">
      <div className="music-header">
        <h1>Музыка</h1>
        <p className="music-description">Все треки из постов</p>
      </div>

      {loading ? (
        <div className="music-loading">
          <div className="loading-spinner"></div>
          <p>Загружаем музыку...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="music-empty">
          <div className="music-empty-icon">🎵</div>
          <h3>Музыки пока нет</h3>
          <p>Поделитесь музыкой в постах</p>
        </div>
      ) : (
        <div className="music-list">
          {tracks.map((track) => (
            <div key={track.post_id} className="music-item">
              <div className="music-item-icon">🎵</div>
              <div className="music-item-info">
                <div className="music-item-title">{track.title || 'Без названия'}</div>
                <div className="music-item-author">{track.author_name || 'Неизвестный автор'}</div>
              </div>
              <button className="music-item-play">▶️ Слушать</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Music;
