import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feed.css';

const Bookmarks = ({ currentUser, isMobile }) => {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = 'http://151.247.196.66:5001';

  useEffect(() => {
    loadBookmarks();
  }, [currentUser]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/bookmarks?user_id=${currentUser.user_id}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки закладок');
      }
      
      const data = await response.json();
      setBookmarks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Ошибка загрузки закладок:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookmarks/${bookmarkId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления закладки');
      }

      setBookmarks(prev => prev.filter(b => b.bookmark_id !== bookmarkId));
    } catch (error) {
      console.error('Ошибка удаления закладки:', error);
    }
  };

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-header">
        <h1>Закладки</h1>
        <p className="bookmarks-description">Ваши сохраненные посты</p>
      </div>

      {loading ? (
        <div className="bookmarks-loading">
          <div className="loading-spinner"></div>
          <p>Загружаем закладки...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="bookmarks-empty">
          <div className="bookmarks-empty-icon">📑</div>
          <h3>Закладок пока нет</h3>
          <p>Добавьте интересные посты в закладки</p>
        </div>
      ) : (
        <div className="bookmarks-list">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.bookmark_id} className="bookmark-item">
              <div className="bookmark-content">
                <h3 className="bookmark-title">{bookmark.post_title || 'Без названия'}</h3>
                <p className="bookmark-text">{bookmark.post_content || 'Нет содержимого'}</p>
              </div>
              <button 
                className="bookmark-remove-btn"
                onClick={() => removeBookmark(bookmark.bookmark_id)}
                title="Удалить закладку"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
