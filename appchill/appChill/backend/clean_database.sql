-- ==================== ОЧИСТКА БД messenger_db ====================
-- Все таблицы останутся, удалятся только данные

-- Отключаем проверку внешних ключей
SET FOREIGN_KEY_CHECKS=0;

-- Очищаем все таблицы
TRUNCATE TABLE users;
TRUNCATE TABLE messages;
TRUNCATE TABLE groups;
TRUNCATE TABLE group_members;
TRUNCATE TABLE group_messages;
TRUNCATE TABLE friends;
TRUNCATE TABLE posts;
TRUNCATE TABLE comments;
TRUNCATE TABLE likes;
TRUNCATE TABLE hashtags;
TRUNCATE TABLE post_hashtags;
TRUNCATE TABLE message_read_status;
TRUNCATE TABLE group_message_read_status;
TRUNCATE TABLE message_status;
TRUNCATE TABLE calls;
TRUNCATE TABLE call_participants;
TRUNCATE TABLE pinned_chats;
TRUNCATE TABLE pinned_messages;
TRUNCATE TABLE communities;
TRUNCATE TABLE community_members;
TRUNCATE TABLE community_posts;
TRUNCATE TABLE community_post_likes;
TRUNCATE TABLE community_post_comments;
TRUNCATE TABLE community_categories;
TRUNCATE TABLE community_followers;
TRUNCATE TABLE community_bans;
TRUNCATE TABLE community_invites;
TRUNCATE TABLE community_hashtags;
TRUNCATE TABLE community_stats;
TRUNCATE TABLE support_categories;
TRUNCATE TABLE support_tickets;
TRUNCATE TABLE support_replies;
TRUNCATE TABLE support_ticket_read_status;
TRUNCATE TABLE post_views;
TRUNCATE TABLE bookmarks;
TRUNCATE TABLE user_interests;
TRUNCATE TABLE user_preferences;
TRUNCATE TABLE post_reports;
TRUNCATE TABLE push_tokens;
TRUNCATE TABLE verification_codes;

-- Включаем проверку внешних ключей
SET FOREIGN_KEY_CHECKS=1;

SELECT '✅ БД успешно очищена! Все таблицы пусты, структура сохранена.' AS Status;
