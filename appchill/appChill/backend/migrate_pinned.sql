-- Добавить поле для отслеживания видимости закрепа
ALTER TABLE pinned_messages ADD COLUMN is_visible_to_all BOOLEAN DEFAULT 1 AFTER chat_id;

-- Создать индекс для оптимизации
ALTER TABLE pinned_messages ADD INDEX idx_visible (chat_id, is_visible_to_all);
