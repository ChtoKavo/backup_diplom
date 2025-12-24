import React, { useState } from 'react';
import './Register.css';

const Register = ({ onRegister, onSwitchToLogin, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    nick: '',
    password: '',
    confirmPassword: '',
    categories: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState('personal'); // personal -> credentials -> categories -> confirm
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const API_BASE_URL = 'http://151.241.228.247:5001';

  // Категории для выбора
  const availableCategories = [
    { id: 1, name: 'Искусство', icon: '🎨' },
    { id: 2, name: 'Музыка', icon: '🎵' },
    { id: 3, name: 'Спорт', icon: '⚽' },
    { id: 4, name: 'Технологии', icon: '💻' },
    { id: 5, name: 'Наука', icon: '🔬' },
    { id: 6, name: 'Путешествия', icon: '✈️' },
    { id: 7, name: 'Еда', icon: '🍕' },
    { id: 8, name: 'Кино', icon: '🎬' },
    { id: 9, name: 'Книги', icon: '📚' },
    { id: 10, name: 'Игры', icon: '🎮' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => {
      const categories = prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId];
      return { ...prev, categories };
    });
  };

  const validatePersonalInfo = () => {
    if (!formData.name.trim()) {
      setError('Имя обязательно для заполнения');
      return false;
    }
    if (!formData.surname.trim()) {
      setError('Фамилия обязательна для заполнения');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email обязателен для заполнения');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Некорректный формат email');
      return false;
    }
    return true;
  };

  const validateCredentials = () => {
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }
    return true;
  };

  const validateCategories = () => {
    if (formData.categories.length === 0) {
      setError('Выберите хотя бы одну категорию интересов');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError('');
    
    switch (step) {
      case 'personal':
        if (validatePersonalInfo()) {
          setStep('credentials');
        }
        break;
      case 'credentials':
        if (validateCredentials()) {
          setStep('categories');
        }
        break;
      case 'categories':
        if (validateCategories()) {
          setStep('terms');
        }
        break;
      default:
        break;
    }
  };

  const prevStep = () => {
    setError('');
    switch (step) {
      case 'credentials':
        setStep('personal');
        break;
      case 'categories':
        setStep('credentials');
        break;
      case 'terms':
        setStep('categories');
        break;
      default:
        break;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Необходимо принять условия использования');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          surname: formData.surname,
          nick: formData.nick || null,
          email: formData.email,
          password: formData.password,
          categories: formData.categories
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        let userData;
        
        if (data.user && data.user.user_id && data.user.name && data.user.email) {
          userData = data.user;
        } else if (data.user_id && data.name && data.email) {
          userData = data;
        } else {
          throw new Error('Некорректные данные пользователя в ответе сервера');
        }
        
        // Успешная регистрация - очищаем форму
        setFormData({
          name: '',
          surname: '',
          email: '',
          nick: '',
          password: '',
          confirmPassword: '',
          categories: []
        });
        setAcceptedTerms(false);
        setStep('personal');
        
        // Показываем сообщение об успехе
        setError('✅ Регистрация успешна! Переход на страницу входа...');
        setIsSuccess(true);
        
        // Вызываем onRegister для передачи данных пользователя
        if (onRegister) {
          onRegister(userData);
        }
        
        // Переключаемся на вход через 1.5 секунды
        setTimeout(() => {
          setIsSuccess(false);
          onSwitchToLogin();
        }, 1500);
      } else {
        const errorMsg = data.error || 'Ошибка регистрации';
        setError(errorMsg);
        
        // Если email уже существует, переключаемся на вход через 2 секунды
        if (errorMsg.toLowerCase().includes('email') && errorMsg.toLowerCase().includes('существует')) {
          setTimeout(() => {
            onSwitchToLogin();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      setError(error.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalInfoForm = () => (
    <div className="register-container">
      <div className="sphere-1"></div>
      <div className="sphere-2"></div>
      <div className="sphere-3"></div>
      
      <div className="header-sphere">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={onSwitchToLogin}
            type="button"
          >
            ← Назад
          </button>
          <h1 className="register-title">Регистрация</h1>
          <div className="step-indicator">Шаг 1 из 4</div>
        </div>
      </div>
      
      <div className="register-form">
        <form className="form-registration">
          <div className="form-group">
            <input
              className='inputlol'
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Введите ваше имя*"
            />
          </div>

          <div className="form-group">
            <input
              className='inputlol'
              type="text"
              id="surname"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              required
              placeholder="Введите вашу фамилию*"
            />
          </div>

          <div className="form-group">
            <input
              className='inputlol'
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Введите ваш email*"
            />
          </div>

          {error && <div className={`error-message ${isSuccess ? 'success' : ''}`}>{error}</div>}

          <button 
            type="button" 
            className="register-button"
            onClick={nextStep}
          >
            Продолжить
          </button>
        </form>

        <div className="switch-auth">
          <p>Уже есть аккаунт? 
            <span 
              className="switch-link" 
              onClick={onSwitchToLogin}
            >
              Войти
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  const renderCredentialsForm = () => (
    <div className="register-container">
      <div className="sphere-1"></div>
      <div className="sphere-2"></div>
      <div className="sphere-3"></div>
      
      <div className="header-sphere">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={prevStep}
            type="button"
          >
            ← Назад
          </button>
          <h1 className="register-title">Создание аккаунта</h1>
          <div className="step-indicator">Шаг 2 из 4</div>
        </div>
      </div>
      
      <div className="register-form">
        <form className="form-registration">
          <div className="form-group">
            <input
              className='inputlol'
              type="text"
              id="nick"
              name="nick"
              value={formData.nick}
              onChange={handleChange}
              placeholder="Введите ваш никнейм (необязательно)"
            />
          </div>

          <div className="form-group">
            <input
              className='inputlol'
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Введите пароль (мин. 6 символов)*"
            />
          </div>

          <div className="form-group">
            <input
              className='inputlol'
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Повторите пароль*"
            />
          </div>

          {error && <div className={`error-message ${isSuccess ? 'success' : ''}`}>{error}</div>}

          <button 
            type="button" 
            className="register-button"
            onClick={nextStep}
          >
            Продолжить
          </button>
        </form>

        <div className="switch-auth">
          <p>Уже есть аккаунт? 
            <span 
              className="switch-link" 
              onClick={onSwitchToLogin}
            >
              Войти
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  const renderCategoriesForm = () => (
    <div className="register-container">
      <div className="sphere-1"></div>
      <div className="sphere-2"></div>
      <div className="sphere-3"></div>
      
      <div className="header-sphere">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={prevStep}
            type="button"
          >
            ← Назад
          </button>
          <h1 className="register-title">Выбор интересов</h1>
          <div className="step-indicator">Шаг 3 из 4</div>
        </div>
      </div>
      
      <div className="register-form">
        <div className="categories-description">
          Выберите категории, которые вас интересуют (можно выбрать несколько):
        </div>
        
        <div className="categories-grid">
          {availableCategories.map(category => (
            <div
              key={category.id}
              className={`category-card ${formData.categories.includes(category.id) ? 'selected' : ''}`}
              onClick={() => handleCategoryToggle(category.id)}
            >
              <button
                className={`category-button ${formData.categories.includes(category.id) ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryToggle(category.id);
                }}
              >
                <div className="category-icon">{category.icon}</div>
                <div className="category-name">{category.name}</div>
              </button>
            </div>
          ))}
        </div>

        {error && <div className={`error-message ${isSuccess ? 'success' : ''}`}>{error}</div>}

        <button 
          type="button" 
          className="register-button"
          onClick={nextStep}
        >
          Продолжить
        </button>

        <div className="switch-auth">
          <p>Уже есть аккаунт? 
            <span 
              className="switch-link" 
              onClick={onSwitchToLogin}
            >
              Войти
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  const renderTermsForm = () => (
    <div className="register-container">
      <div className="sphere-1"></div>
      <div className="sphere-2"></div>
      <div className="sphere-3"></div>
      
      <div className="header-sphere">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={prevStep}
            type="button"
          >
            ← Назад
          </button>
          <h1 className="register-title">Завершение регистрации</h1>
          <div className="step-indicator">Шаг 4 из 4</div>
        </div>
      </div>
      
      <div className="register-form">
        <form className="form-registration" onSubmit={handleRegister}>
          <div className="terms-group">
            <label className="terms-label">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="terms-checkbox"
              />
              <span className="checkmark"></span>
              Я принимаю условия использования и даю согласие на обработку моих персональных данных
            </label>
          </div>

          {error && <div className={`error-message ${isSuccess ? 'success' : ''}`}>{error}</div>}

          <button 
            type="submit" 
            className="register-button"
            disabled={loading || !acceptedTerms}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="switch-auth">
          <p>Уже есть аккаунт? 
            <span 
              className="switch-link" 
              onClick={onSwitchToLogin}
            >
              Войти
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  switch (step) {
    case 'personal':
      return renderPersonalInfoForm();
    case 'credentials':
      return renderCredentialsForm();
    case 'categories':
      return renderCategoriesForm();
    case 'terms':
      return renderTermsForm();
    default:
      return renderPersonalInfoForm();
  }
};

export default Register;