-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: allbirds
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cart`
--

DROP TABLE IF EXISTS `cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart` (
  `cart_id` int NOT NULL AUTO_INCREMENT COMMENT '장바구니 ID',
  `user_id` int NOT NULL COMMENT '사용자 ID',
  `option_id` int NOT NULL COMMENT '상품 옵션 ID',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '수량',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  PRIMARY KEY (`cart_id`),
  UNIQUE KEY `unique_user_option` (`user_id`,`option_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_option_id` (`option_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='장바구니';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart`
--

LOCK TABLES `cart` WRITE;
/*!40000 ALTER TABLE `cart` DISABLE KEYS */;
INSERT INTO `cart` VALUES (7,1,130,6,'2025-12-11 20:33:55','2025-12-11 20:34:13'),(8,1,113,1,'2025-12-11 20:34:28','2025-12-11 20:34:28'),(9,1,114,1,'2025-12-11 20:37:47','2025-12-11 20:37:47'),(10,1,111,2,'2025-12-11 20:39:53','2025-12-11 22:22:32'),(11,1,112,1,'2025-12-11 20:42:14','2025-12-11 20:42:14'),(12,1,120,1,'2025-12-11 20:44:08','2025-12-11 20:44:08'),(13,1,124,1,'2025-12-11 20:44:16','2025-12-11 20:44:16'),(14,1,129,1,'2025-12-11 22:23:08','2025-12-11 22:23:08');
/*!40000 ALTER TABLE `cart` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'러닝화'),(2,'일상화'),(3,'슬립온');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_cards`
--

DROP TABLE IF EXISTS `content_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_cards` (
  `card_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `link_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sort_order` int DEFAULT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_cards`
--

LOCK TABLES `content_cards` WRITE;
/*!40000 ALTER TABLE `content_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `content_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `material_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`material_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materials`
--

LOCK TABLES `materials` WRITE;
/*!40000 ALTER TABLE `materials` DISABLE KEYS */;
INSERT INTO `materials` VALUES (1,'WOOL','메리노 울','부드럽고 통기성이 좋은 천연 울 소재',NULL),(2,'TREE','유칼립투스 섬유','지속 가능한 친환경 소재',NULL),(3,'SUGAR','사탕수수 폼','재생 가능한 쿠션 소재',NULL);
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT COMMENT '주문 ID (기본 키)',
  `user_id` bigint NOT NULL COMMENT '주문한 사용자 ID (users 테이블 참조)',
  `total_amount` decimal(10,2) NOT NULL COMMENT '주문 총 금액 (원)',
  `shipping_address` varchar(500) NOT NULL COMMENT '배송 주소',
  `payment_method` varchar(50) NOT NULL COMMENT '결제 방법 (예: 카드, 계좌이체)',
  `status` varchar(20) DEFAULT 'pending' COMMENT '주문 상태 (pending: 대기, paid: 결제완료, shipped: 배송중, delivered: 배송완료, cancelled: 취소)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '주문 생성 일시',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '주문 정보 최종 수정 일시',
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='주문 정보 테이블';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT COMMENT '주문 상품 ID (기본 키)',
  `order_id` int NOT NULL COMMENT '주문 ID (orders 테이블 참조)',
  `option_id` bigint NOT NULL COMMENT '상품 옵션 ID (색상+사이즈 조합, product_options 테이블 참조)',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '주문 수량',
  `price` decimal(10,2) NOT NULL COMMENT '주문 시점의 개당 가격 (할인 적용된 가격)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '주문 상품 생성 일시',
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `option_id` (`option_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `product_options` (`option_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='주문 상세 항목 테이블 (주문에 포함된 각 상품 정보)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_category_map`
--

DROP TABLE IF EXISTS `product_category_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_category_map` (
  `product_id` bigint NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`product_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `product_category_map_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `product_category_map_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_category_map`
--

LOCK TABLES `product_category_map` WRITE;
/*!40000 ALTER TABLE `product_category_map` DISABLE KEYS */;
INSERT INTO `product_category_map` VALUES (1,1),(2,1),(3,1),(4,1),(7,1),(9,1),(5,2),(6,2),(5,3),(6,3),(8,3);
/*!40000 ALTER TABLE `product_category_map` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_details`
--

DROP TABLE IF EXISTS `product_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_details` (
  `detail_id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `section_title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `sort_order` int DEFAULT NULL,
  PRIMARY KEY (`detail_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_details_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_details`
--

LOCK TABLES `product_details` WRITE;
/*!40000 ALTER TABLE `product_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `image_id` bigint NOT NULL AUTO_INCREMENT,
  `variant_id` bigint NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`image_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_options`
--

DROP TABLE IF EXISTS `product_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_options` (
  `option_id` bigint NOT NULL AUTO_INCREMENT,
  `variant_id` bigint NOT NULL,
  `size` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `stock_quantity` int DEFAULT '0',
  PRIMARY KEY (`option_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `product_options_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=244 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_options`
--

LOCK TABLES `product_options` WRITE;
/*!40000 ALTER TABLE `product_options` DISABLE KEYS */;
INSERT INTO `product_options` VALUES (1,101,'250',10),(2,101,'255',15),(3,101,'260',20),(4,101,'265',18),(5,101,'270',25),(6,101,'275',12),(7,101,'280',8),(8,101,'285',5),(9,101,'290',3),(10,102,'250',8),(11,102,'255',12),(12,102,'260',15),(13,102,'265',14),(14,102,'270',20),(15,102,'275',10),(16,102,'280',6),(17,102,'285',4),(18,102,'290',2),(19,103,'250',5),(20,103,'255',10),(21,103,'260',12),(22,103,'265',10),(23,103,'270',15),(24,103,'275',8),(25,103,'280',4),(26,103,'285',2),(27,103,'290',1),(28,201,'250',12),(29,201,'255',18),(30,201,'260',22),(31,201,'265',20),(32,201,'270',28),(33,201,'275',15),(34,201,'280',10),(35,201,'285',6),(36,201,'290',4),(37,202,'250',10),(38,202,'255',15),(39,202,'260',18),(40,202,'265',16),(41,202,'270',22),(42,202,'275',12),(43,202,'280',8),(44,202,'285',5),(45,202,'290',3),(46,203,'250',6),(47,203,'255',10),(48,203,'260',12),(49,203,'265',10),(50,203,'270',14),(51,203,'275',8),(52,203,'280',5),(53,203,'285',3),(54,203,'290',2),(55,301,'250',15),(56,301,'255',20),(57,301,'260',25),(58,301,'265',22),(59,301,'270',30),(60,301,'275',18),(61,301,'280',12),(62,301,'285',8),(63,301,'290',5),(64,302,'250',10),(65,302,'255',14),(66,302,'260',18),(67,302,'265',15),(68,302,'270',20),(69,302,'275',12),(70,302,'280',8),(71,302,'285',5),(72,302,'290',3),(73,303,'250',8),(74,303,'255',12),(75,303,'260',15),(76,303,'265',12),(77,303,'270',18),(78,303,'275',10),(79,303,'280',6),(80,303,'285',4),(81,303,'290',2),(82,401,'250',20),(83,401,'255',25),(84,401,'260',30),(85,401,'265',28),(86,401,'270',35),(87,401,'275',22),(88,401,'280',15),(89,401,'285',10),(90,401,'290',6),(91,402,'250',18),(92,402,'255',22),(93,402,'260',28),(94,402,'265',25),(95,402,'270',32),(96,402,'275',20),(97,402,'280',12),(98,402,'285',8),(99,402,'290',5),(100,403,'250',10),(101,403,'255',15),(102,403,'260',18),(103,403,'265',16),(104,403,'270',22),(105,403,'275',14),(106,403,'280',8),(107,403,'285',5),(108,403,'290',3),(109,501,'250',8),(110,501,'255',12),(111,501,'260',15),(112,501,'265',14),(113,501,'270',18),(114,501,'275',10),(115,501,'280',6),(116,501,'285',4),(117,501,'290',2),(118,502,'250',6),(119,502,'255',10),(120,502,'260',12),(121,502,'265',10),(122,502,'270',15),(123,502,'275',8),(124,502,'280',5),(125,502,'285',3),(126,502,'290',2),(127,503,'250',5),(128,503,'255',8),(129,503,'260',10),(130,503,'265',8),(131,503,'270',12),(132,503,'275',6),(133,503,'280',4),(134,503,'285',2),(135,503,'290',1),(136,601,'250',12),(137,601,'255',16),(138,601,'260',20),(139,601,'265',18),(140,601,'270',24),(141,601,'275',14),(142,601,'280',10),(143,601,'285',6),(144,601,'290',4),(145,602,'250',10),(146,602,'255',14),(147,602,'260',18),(148,602,'265',15),(149,602,'270',20),(150,602,'275',12),(151,602,'280',8),(152,602,'285',5),(153,602,'290',3),(154,603,'250',8),(155,603,'255',12),(156,603,'260',15),(157,603,'265',12),(158,603,'270',18),(159,603,'275',10),(160,603,'280',6),(161,603,'285',4),(162,603,'290',2),(163,701,'250',6),(164,701,'255',10),(165,701,'260',12),(166,701,'265',10),(167,701,'270',15),(168,701,'275',8),(169,701,'280',5),(170,701,'285',3),(171,701,'290',2),(172,702,'250',5),(173,702,'255',8),(174,702,'260',10),(175,702,'265',8),(176,702,'270',12),(177,702,'275',6),(178,702,'280',4),(179,702,'285',2),(180,702,'290',1),(181,703,'250',4),(182,703,'255',6),(183,703,'260',8),(184,703,'265',7),(185,703,'270',10),(186,703,'275',5),(187,703,'280',3),(188,703,'285',2),(189,703,'290',1),(190,801,'250',10),(191,801,'255',14),(192,801,'260',18),(193,801,'265',15),(194,801,'270',20),(195,801,'275',12),(196,801,'280',8),(197,801,'285',5),(198,801,'290',3),(199,802,'250',8),(200,802,'255',12),(201,802,'260',15),(202,802,'265',12),(203,802,'270',18),(204,802,'275',10),(205,802,'280',6),(206,802,'285',4),(207,802,'290',2),(208,803,'250',6),(209,803,'255',10),(210,803,'260',12),(211,803,'265',10),(212,803,'270',14),(213,803,'275',8),(214,803,'280',5),(215,803,'285',3),(216,803,'290',2),(217,901,'250',15),(218,901,'255',20),(219,901,'260',25),(220,901,'265',22),(221,901,'270',28),(222,901,'275',16),(223,901,'280',10),(224,901,'285',6),(225,901,'290',4),(226,902,'250',12),(227,902,'255',18),(228,902,'260',22),(229,902,'265',20),(230,902,'270',25),(231,902,'275',14),(232,902,'280',8),(233,902,'285',5),(234,902,'290',3),(235,903,'250',8),(236,903,'255',12),(237,903,'260',15),(238,903,'265',14),(239,903,'270',18),(240,903,'275',10),(241,903,'280',6),(242,903,'285',4),(243,903,'290',2);
/*!40000 ALTER TABLE `product_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `variant_id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `color_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `color_hex` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `representative_image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount_rate` int DEFAULT '0',
  `sale_start_date` date DEFAULT NULL,
  `sale_end_date` date DEFAULT NULL,
  `registration_date` date DEFAULT (curdate()),
  `sold_count` int DEFAULT '0',
  PRIMARY KEY (`variant_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=904 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (101,1,'내추럴 블랙','#212121','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',0,NULL,NULL,'2024-01-15',1520),(102,1,'내추럴 그레이','#9E9E9E','https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',0,NULL,NULL,'2024-01-15',980),(103,1,'내추럴 화이트','#FAFAFA','https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800',10,'2024-12-01','2025-02-28','2024-01-15',1200),(201,2,'트루 블랙','#000000','https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',0,NULL,NULL,'2024-02-01',2100),(202,2,'다크 네이비','#1A237E','https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',0,NULL,NULL,'2024-02-01',1800),(203,2,'포레스트 그린','#2E7D32','https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800',15,'2024-12-01','2025-01-31','2024-02-01',950),(301,3,'차콜','#424242','https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800',0,NULL,NULL,'2024-03-10',1650),(302,3,'카키','#827717','https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',0,NULL,NULL,'2024-03-10',1100),(303,3,'베이지','#D7CCC8','https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800',0,NULL,NULL,'2024-03-10',890),(401,4,'블리자드 화이트','#FFFFFF','https://images.unsplash.com/photo-1579338559194-a162d19bf842?w=800',0,NULL,NULL,'2024-11-01',750),(402,4,'이클립스 블랙','#121212','https://images.unsplash.com/photo-1491553895911-0055uj1e40f9?w=800',0,NULL,NULL,'2024-11-01',620),(403,4,'플레임 레드','#D32F2F','https://images.unsplash.com/photo-1562183241-b937e95585b6?w=800',0,NULL,NULL,'2024-11-01',430),(501,5,'네이비','#303F9F','https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800',20,'2024-12-01','2025-01-31','2024-04-01',680),(502,5,'그레이','#757575','https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800',20,'2024-12-01','2025-01-31','2024-04-01',520),(503,5,'브라운','#5D4037','https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800',20,'2024-12-01','2025-01-31','2024-04-01',410),(601,6,'올리브','#689F38','https://images.unsplash.com/photo-1465453869711-7e174808ace9?w=800',30,'2024-11-15','2025-02-28','2024-05-01',920),(602,6,'스톤 그레이','#BDBDBD','https://images.unsplash.com/photo-1604671801908-6f0c6a092c05?w=800',30,'2024-11-15','2025-02-28','2024-05-01',780),(603,6,'미드나잇','#1A1A2E','https://images.unsplash.com/photo-1539185441755-769473a23570?w=800',30,'2024-11-15','2025-02-28','2024-05-01',650),(701,7,'클래식 블랙','#1C1C1C','https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800',0,NULL,NULL,'2024-06-01',340),(702,7,'크림','#FFFDE7','https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800',0,NULL,NULL,'2024-06-01',280),(703,7,'버건디','#880E4F','https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800',10,'2024-12-01','2025-01-15','2024-06-01',190),(801,8,'샌드','#E0E0E0','https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800',0,NULL,NULL,'2024-07-01',450),(802,8,'오션 블루','#0288D1','https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800',0,NULL,NULL,'2024-07-01',380),(803,8,'코랄','#FF7043','https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800',0,NULL,NULL,'2024-07-01',290),(901,9,'퓨어 화이트','#FFFFFF','https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800',0,NULL,NULL,'2024-10-15',520),(902,9,'스텔스 블랙','#0D0D0D','https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800',0,NULL,NULL,'2024-10-15',480),(903,9,'네온 옐로우','#FFEB3B','https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800',0,NULL,NULL,'2024-10-15',350);
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `base_price` decimal(10,2) NOT NULL,
  `gender` enum('MEN','WOMEN','UNISEX') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'UNISEX',
  `material_id` int DEFAULT NULL,
  `badge` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_recommended` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `materials` (`material_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'남성 울 러너','메리노 울로 만든 클래식 러닝화. 부드럽고 따뜻하며 발을 편안하게 감싸줍니다.',159000.00,'MEN',1,NULL,1,'2025-12-11 01:34:26'),(2,'남성 울 러너 미즐','방수 기능이 추가된 울 러너. 비오는 날에도 발을 보호합니다.',179000.00,'MEN',1,'BEST',1,'2025-12-11 01:34:26'),(3,'남성 트리 러너','유칼립투스 섬유로 만든 가볍고 통기성 좋은 러닝화.',159000.00,'MEN',2,NULL,1,'2025-12-11 01:34:26'),(4,'남성 트리 대셔 2','러닝을 위해 설계된 경량 퍼포먼스 슈즈.',179000.00,'MEN',2,'NEW',1,'2025-12-11 01:34:26'),(5,'남성 울 라운저','집에서도 밖에서도 편안한 라운지 슬립온.',139000.00,'MEN',1,NULL,0,'2025-12-11 01:34:26'),(6,'남성 트리 라운저','가볍고 시원한 트리 소재의 라운지 슬립온.',139000.00,'MEN',2,'SALE',0,'2025-12-11 01:34:26'),(7,'남성 울 파이퍼','클래식한 디자인의 캐주얼 스니커즈.',149000.00,'MEN',1,NULL,0,'2025-12-11 01:34:26'),(8,'남성 트리 스키퍼','여름에 딱 맞는 초경량 슬립온.',129000.00,'MEN',2,NULL,0,'2025-12-11 01:34:26'),(9,'남성 슈퍼라이트 트리 러너','올버즈 역사상 가장 가벼운 신발.',169000.00,'MEN',2,'NEW',1,'2025-12-11 01:34:26');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `review_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `product_id` bigint NOT NULL,
  `order_item_id` int DEFAULT NULL,
  `rating` int DEFAULT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` date DEFAULT (curdate()),
  PRIMARY KEY (`review_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  KEY `order_item_id` (`order_item_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`),
  CONSTRAINT `reviews_chk_1` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,1,1,NULL,5,'정말 편해요!','처음 신었을 때부터 발이 너무 편했습니다. 매일 신고 다녀요.','2024-11-20'),(2,2,1,NULL,4,'가볍고 좋아요','무게가 가벼워서 오래 걸어도 피곤하지 않습니다.','2024-11-15'),(3,1,2,NULL,5,'비 오는 날 필수템','방수가 잘 되면서도 통기성이 좋아서 발이 답답하지 않아요.','2024-11-18'),(4,3,3,NULL,5,'여름에 딱이에요','통기성이 좋아서 발이 시원합니다. 강추!','2024-10-25'),(5,2,4,NULL,5,'러닝화로 최고','가볍고 쿠셔닝이 좋아서 달리기할 때 정말 좋습니다.','2024-12-01'),(6,1,5,NULL,4,'집에서 신기 좋아요','슬리퍼 대신 신기 좋습니다. 편안해요.','2024-09-10'),(7,3,6,NULL,5,'세일 때 득템!','할인 받아서 샀는데 품질이 너무 좋아요.','2024-12-05'),(8,2,9,NULL,5,'역대급 가벼움','정말 신발 신은 느낌이 안 날 정도로 가벼워요!','2024-11-28');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('USER','ADMIN') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'USER',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'test@allbirds.com','$2b$10$dummy.hash.for.testing.only','테스트 사용자','010-1234-5678','USER','2025-12-09 02:08:29'),(2,'user2@test.com','$2b$10$dummy_hash_2','이영희','010-2345-6789','USER','2025-12-11 01:34:26'),(3,'user3@test.com','$2b$10$dummy_hash_3','박민수','010-3456-7890','USER','2025-12-11 01:34:26'),(4,'admin@allbirds.com','$2b$10$dummy_hash_admin','관리자','010-0000-0000','ADMIN','2025-12-11 01:34:26');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-11 22:33:37
