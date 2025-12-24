-- ⭐ Таблица для SMS верификации
CREATE TABLE IF NOT EXISTS verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email_phone (email, phone),
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_expires_at (expires_at)
);

-- Индекс для быстрого поиска активных кодов верификации
CREATE INDEX IF NOT EXISTS idx_active_codes ON verification_codes(email, phone, is_verified);

-- Удаляем старые истёкшие коды (опционально)
DELETE FROM verification_codes WHERE expires_at < NOW();
