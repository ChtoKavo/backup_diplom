import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feed.css';

const Gallery = ({ currentUser, isMobile }) => {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    loadGallery();
  }, [currentUser]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/posts?media_type=image`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки галереи');
      }
      
      const data = await response.json();
      setImages(Array.isArray(data.posts || data) ? (data.posts || data) : []);
    } catch (error) {
      console.error('Ошибка загрузки галереи:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <h1>Фотографии</h1>
        <p className="gallery-description">Все фотографии из постов</p>
      </div>

      {loading ? (
        <div className="gallery-loading">
          <div className="loading-spinner"></div>
          <p>Загружаем фотографии...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="gallery-empty">
          <div className="gallery-empty-icon">📷</div>
          <h3>Фотографий пока нет</h3>
          <p>Поделитесь своими фотографиями в постах</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {images.map((image) => (
            <div key={image.post_id} className="gallery-item">
              {image.image_url && (
                <img 
                  src={`${API_BASE_URL}${image.image_url}`} 
                  alt="Фото"
                  className="gallery-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
