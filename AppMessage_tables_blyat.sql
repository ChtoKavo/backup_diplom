/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.22-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: AppMessage
-- ------------------------------------------------------
-- Server version	10.6.22-MariaDB-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_participants`
--

DROP TABLE IF EXISTS `chat_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_participants` (
  `participant_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_admin` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`participant_id`),
  UNIQUE KEY `unique_chat_user` (`chat_id`,`user_id`),
  KEY `idx_chat_id` (`chat_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `chat_participants_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE,
  CONSTRAINT `chat_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chats` (
  `chat_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_type` enum('private','group') DEFAULT 'private',
  `chat_name` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`chat_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `chats_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comment_likes`
--

DROP TABLE IF EXISTS `comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_likes` (
  `like_id` int(11) NOT NULL AUTO_INCREMENT,
  `comment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `unique_comment_like` (`comment_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE,
  CONSTRAINT `comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `comment_id` int(11) NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `parent_comment_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `likes_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`comment_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_id` (`parent_comment_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_messages`
--

DROP TABLE IF EXISTS `deleted_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_messages` (
  `delete_id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`delete_id`),
  KEY `message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `deleted_messages_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `deleted_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `followers`
--

DROP TABLE IF EXISTS `followers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `followers` (
  `follow_id` int(11) NOT NULL AUTO_INCREMENT,
  `follower_id` int(11) NOT NULL,
  `following_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`follow_id`),
  UNIQUE KEY `unique_follow` (`follower_id`,`following_id`),
  KEY `idx_follower_id` (`follower_id`),
  KEY `idx_following_id` (`following_id`),
  CONSTRAINT `followers_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `followers_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `friendships`
--

DROP TABLE IF EXISTS `friendships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `friendships` (
  `friendship_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id1` int(11) NOT NULL,
  `user_id2` int(11) NOT NULL,
  `status` enum('pending','accepted','rejected','blocked') DEFAULT 'pending',
  `action_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`friendship_id`),
  UNIQUE KEY `unique_friendship` (`user_id1`,`user_id2`),
  KEY `action_user_id` (`action_user_id`),
  KEY `idx_user_id1` (`user_id1`),
  KEY `idx_user_id2` (`user_id2`),
  KEY `idx_status` (`status`),
  CONSTRAINT `friendships_ibfk_1` FOREIGN KEY (`user_id1`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_ibfk_2` FOREIGN KEY (`user_id2`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_ibfk_3` FOREIGN KEY (`action_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` int(11) NOT NULL,
  `is_edited` tinyint(1) DEFAULT 0,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `duration` int(11) DEFAULT 0,
  `message_type` enum('text','image','file','video','voice') DEFAULT 'text',
  `attachment_url` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`message_id`),
  KEY `idx_chat_id` (`chat_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_duration` (`duration`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`chat_id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `from_user_id` int(11) NOT NULL,
  `type` enum('like','comment','friend_request','friend_accept','mention','share','follow') NOT NULL,
  `post_id` int(11) DEFAULT NULL,
  `comment_id` int(11) DEFAULT NULL,
  `friendship_id` int(11) DEFAULT NULL,
  `follow_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `from_user_id` (`from_user_id`),
  KEY `post_id` (`post_id`),
  KEY `comment_id` (`comment_id`),
  KEY `follow_id` (`follow_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`comment_id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_ibfk_5` FOREIGN KEY (`follow_id`) REFERENCES `followers` (`follow_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_images`
--

DROP TABLE IF EXISTS `post_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_images` (
  `image_id` int(11) NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `image_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`image_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_image_order` (`image_order`),
  CONSTRAINT `post_images_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_likes`
--

DROP TABLE IF EXISTS `post_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_likes` (
  `like_id` int(11) NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `unique_post_like` (`post_id`,`user_id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `post_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT 1,
  `title` varchar(500) NOT NULL,
  `likes_count` int(11) DEFAULT 0,
  `comments_count` int(11) DEFAULT 0,
  `shares_count` int(11) DEFAULT 0,
  `is_public` tinyint(1) DEFAULT 1,
  `is_published` tinyint(1) DEFAULT 1,
  `content` text NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `video_thumbnail` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `posts_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_categories`
--

DROP TABLE IF EXISTS `user_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_categories` (
  `user_category_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_category_id`),
  UNIQUE KEY `unique_user_category` (`user_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `user_categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_gallery`
--

DROP TABLE IF EXISTS `user_gallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_gallery` (
  `gallery_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`gallery_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `user_gallery_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `nick` varchar(255) DEFAULT NULL,
  `banner_url` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `user_status` enum('online','offline','away','dnd','sleep') DEFAULT 'offline',
  `is_active` tinyint(1) DEFAULT 1,
  `status_message` varchar(255) DEFAULT NULL,
  `is_confirmed` tinyint(1) DEFAULT 0,
  `confirmation_code` varchar(6) DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `auto_away` tinyint(1) DEFAULT 0,
  `email_verified` tinyint(1) DEFAULT 0,
  `avatar_url` varchar(255) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT 0,
  `last_seen` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-24 14:38:01
