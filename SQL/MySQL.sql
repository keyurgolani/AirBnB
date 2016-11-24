CREATE DATABASE  IF NOT EXISTS `airbnb` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `airbnb`;
-- MySQL dump 10.13  Distrib 5.7.12, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: airbnb
-- ------------------------------------------------------
-- Server version 5.7.16-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_details`
--

DROP TABLE IF EXISTS `account_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_details` (
  `user_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `email` varchar(45) NOT NULL,
  `f_name` varchar(45) NOT NULL,
  `l_name` varchar(45) NOT NULL,
  `secret` varchar(255) DEFAULT NULL,
  `salt` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_details`
--

LOCK TABLES `account_details` WRITE;
/*!40000 ALTER TABLE `account_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `amenities`
--

DROP TABLE IF EXISTS `amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `amenities` (
  `amenity_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `amenity` varchar(50) NOT NULL,
  PRIMARY KEY (`amenity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `amenities`
--

LOCK TABLES `amenities` WRITE;
/*!40000 ALTER TABLE `amenities` DISABLE KEYS */;
INSERT INTO `amenities` VALUES (0000000001,'Pool'),(0000000002,'Gym'),(0000000003,'Smoking allowed'),(0000000004,'Doorman'),(0000000005,'Breakfast'),(0000000006,'Free parking on premises'),(0000000007,'Cable TV'),(0000000008,'Pets allowed'),(0000000009,'Suitable for events'),(0000000010,'Indoor fireplace'),(0000000011,'Wheelchair accessible'),(0000000012,'Dryer'),(0000000013,'TV'),(0000000014,'Buzzer/wireless intercom'),(0000000015,'Hangers'),(0000000016,'Hair dryer'),(0000000017,'Iron'),(0000000018,'Shampoo'),(0000000019,'Elevator in building'),(0000000020,'Internet'),(0000000021,'Heating'),(0000000022,'Laptop friendly workspace'),(0000000023,'Washer'),(0000000024,'Family/kid friendly'),(0000000025,'Essentials'),(0000000026,'Wireless Internet'),(0000000027,'Kitchen'),(0000000028,'Air conditioning'),(0000000029,'Hot tub'),(0000000030,'Smoke detector'),(0000000031,'Carbon monoxide detector'),(0000000032,'First aid kit'),(0000000033,'Safety card'),(0000000034,'Fire extinguisher'),(0000000035,'Lock on bedroom door');
/*!40000 ALTER TABLE `amenities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bid_details`
--

DROP TABLE IF EXISTS `bid_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bid_details` (
  `bid_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `bid_amount` decimal(2,2) NOT NULL,
  `listing_id` int(10) unsigned zerofill NOT NULL,
  `bidder_id` int(10) unsigned zerofill NOT NULL,
  PRIMARY KEY (`bid_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bid_details`
--

LOCK TABLES `bid_details` WRITE;
/*!40000 ALTER TABLE `bid_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `bid_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_details`
--

DROP TABLE IF EXISTS `bill_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bill_details` (
  `bill_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `trip_id` int(10) unsigned zerofill NOT NULL,
  `receipt_id` int(10) unsigned zerofill NOT NULL,
  `cc_id` int(10) unsigned zerofill NOT NULL,
  PRIMARY KEY (`bill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_details`
--

LOCK TABLES `bill_details` WRITE;
/*!40000 ALTER TABLE `bill_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `bill_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `card_details`
--

DROP TABLE IF EXISTS `card_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `card_details` (
  `card_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned zerofill NOT NULL,
  `card_number` decimal(16,0) NOT NULL,
  `exp` varchar(4) NOT NULL,
  `cvv` decimal(4,0) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `card_details`
--

LOCK TABLES `card_details` WRITE;
/*!40000 ALTER TABLE `card_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `card_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `external_authentication`
--

DROP TABLE IF EXISTS `external_authentication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `external_authentication` (
  `external_id` varchar(50) NOT NULL,
  `user_id` int(10) unsigned zerofill NOT NULL,
  `website` enum('facebook','google','twitter') NOT NULL,
  PRIMARY KEY (`external_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_authentication`
--

LOCK TABLES `external_authentication` WRITE;
/*!40000 ALTER TABLE `external_authentication` DISABLE KEYS */;
/*!40000 ALTER TABLE `external_authentication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listing_amenity_mapping`
--

DROP TABLE IF EXISTS `listing_amenity_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listing_amenity_mapping` (
  `listing_id` int(10) unsigned zerofill NOT NULL,
  `amenity_id` int(10) unsigned zerofill NOT NULL,
  PRIMARY KEY (`listing_id`,`amenity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listing_amenity_mapping`
--

LOCK TABLES `listing_amenity_mapping` WRITE;
/*!40000 ALTER TABLE `listing_amenity_mapping` DISABLE KEYS */;
/*!40000 ALTER TABLE `listing_amenity_mapping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listing_details`
--

DROP TABLE IF EXISTS `listing_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listing_details` (
  `listing_details_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `listing_id` int(10) unsigned zerofill NOT NULL,
  `description` varchar(10000) NOT NULL,
  `bathrooms` int(2) NOT NULL,
  `beds` int(2) NOT NULL,
  `checkin` time DEFAULT NULL,
  `checkout` time DEFAULT NULL,
  PRIMARY KEY (`listing_details_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listing_details`
--

LOCK TABLES `listing_details` WRITE;
/*!40000 ALTER TABLE `listing_details` DISABLE KEYS */;
INSERT INTO `listing_details` VALUES (0000000001,0000000001,'Cool Place Nice Place',2,1,'02:00:00','11:00:00'),(0000000002,0000000002,'Good place nice place',1,1,'02:00:00','11:00:00'),(0000000003,0000000003,'Nice Place cool palce',1,1,'02:00:00','11:00:00'),(0000000004,0000000004,'coolest place',1,1,'02:00:00','11:00:00'),(0000000005,0000000005,'wake up with chirping',1,1,'02:00:00','11:00:00'),(0000000006,0000000006,'Wake up with nature',1,1,'02:00:00','11:00:00'),(0000000007,0000000007,'Nice to live',3,2,'02:00:00','11:00:00'),(0000000008,0000000008,'best place to sleep',1,1,'02:00:00','11:00:00'),(0000000009,0000000009,'Athens Park, Los Angeles, CA, United States',1,1,'02:00:00','11:00:00');
/*!40000 ALTER TABLE `listing_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listings` (
  `listing_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `property_id` int(10) unsigned zerofill NOT NULL,
  `room_type_id` int(10) unsigned zerofill NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_bid` tinyint(1) NOT NULL DEFAULT '0',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `daily_price` decimal(5,2) NOT NULL,
  `bedrooms` int(2) NOT NULL,
  `accommodations` int(2) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`listing_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listings`
--

LOCK TABLES `listings` WRITE;
/*!40000 ALTER TABLE `listings` DISABLE KEYS */;
INSERT INTO `listings` VALUES (0000000002,0000000001,0000000002,'My Place',1,'2016-11-09','2016-11-12',34.00,1,1,1),(0000000003,0000000002,0000000003,'Patio Appt',1,'2016-11-23','2016-11-26',45.00,1,1,1),(0000000004,0000000003,0000000002,'pool front',1,'2016-11-02','2016-11-10',35.00,1,1,1),(0000000008,0000000005,0000000002,'Little kingdom',1,'2016-11-10','2016-11-19',900.00,1,1,1),(0000000009,0000000006,0000000002,'Athens Park, Los Angeles, CA, United States',1,'2016-11-17','2016-11-26',220.00,1,1,1);
/*!40000 ALTER TABLE `listings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile_details`
--

DROP TABLE IF EXISTS `profile_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profile_details` (
  `profile_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned zerofill NOT NULL,
  `phone` decimal(12,0) DEFAULT NULL,
  `dob` date NOT NULL,
  `st_address` varchar(255) NOT NULL,
  `apt` varchar(20) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `zip` decimal(5,0) NOT NULL,
  `description` varchar(10000) DEFAULT NULL,
  PRIMARY KEY (`profile_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile_details`
--

LOCK TABLES `profile_details` WRITE;
/*!40000 ALTER TABLE `profile_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `profile_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_details`
--

DROP TABLE IF EXISTS `property_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_details` (
  `property_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `owner_id` int(10) unsigned zerofill NOT NULL,
  `property_type_id` int(10) unsigned zerofill NOT NULL,
  `house_rules` varchar(10000) DEFAULT NULL,
  `longitude` float(10,6) NOT NULL,
  `latitude` float(10,6) NOT NULL,
  `st_address` varchar(255) NOT NULL,
  `apt` varchar(20) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `zip` decimal(5,0) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`property_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_details`
--

LOCK TABLES `property_details` WRITE;
/*!40000 ALTER TABLE `property_details` DISABLE KEYS */;
INSERT INTO `property_details` VALUES (0000000001,0000000001,0000000002,'No smoking',-121.884590,37.333324,'201 South 4th Street','411','San Jose','California',95112,1),(0000000002,0000000001,0000000002,'no pets',-121.910881,37.334084,'1322 The Alameda','234','San Jose','California',95126,1),(0000000003,0000000001,0000000003,'no party',-121.887733,37.335819,'33 South 3rd Street','342','San Jose','California',95113,1),(0000000004,0000000001,0000000003,'no alcohol',-117.149048,32.735317,'2920 Zoo Drive','233','San Diego','California',92101,1),(0000000005,0000000001,0000000005,'no adults',-118.271133,33.918518,'224 East 126th Street','445','Los Angeles County','United States',2315,1),(0000000006,0000000001,0000000010,'Athens Park, Los Angeles, CA, United States',-118.279556,33.918247,'12603 South Broadway','345','Los Angeles County','United States',1212,1);
/*!40000 ALTER TABLE `property_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `property_types`
--

DROP TABLE IF EXISTS `property_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `property_types` (
  `property_type_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `property_type` varchar(50) NOT NULL,
  PRIMARY KEY (`property_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `property_types`
--

LOCK TABLES `property_types` WRITE;
/*!40000 ALTER TABLE `property_types` DISABLE KEYS */;
INSERT INTO `property_types` VALUES (0000000001,'House'),(0000000002,'Apartment'),(0000000003,'Bed & Breakfast'),(0000000004,'Boutique hotel'),(0000000005,'Nature lodge'),(0000000006,'Hostel'),(0000000007,'Timeshare'),(0000000008,'Serviced apartment'),(0000000009,'Minsu (Taiwan)'),(0000000010,'Ryokan (Japan)'),(0000000011,'Pension (Korea)'),(0000000012,'Heritage hotel (India)'),(0000000013,'Boat'),(0000000014,'Bungalow'),(0000000015,'Cabin'),(0000000016,'Castle'),(0000000017,'Cave'),(0000000018,'Chalet'),(0000000019,'Condominium'),(0000000020,'Dorm'),(0000000021,'Earth House'),(0000000022,'Guesthouse'),(0000000023,'Hut'),(0000000024,'Igloo'),(0000000025,'Island'),(0000000026,'Lighthouse'),(0000000027,'Loft'),(0000000028,'Plane'),(0000000029,'Camper/RV'),(0000000030,'Tent'),(0000000031,'Tipi'),(0000000032,'Townhouse'),(0000000033,'Train'),(0000000034,'Treehouse'),(0000000035,'Villa'),(0000000036,'Yurt'),(0000000037,'Other');
/*!40000 ALTER TABLE `property_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ratings` (
  `rating_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `trip_id` int(10) unsigned zerofill NOT NULL,
  `host_rating` int(1) DEFAULT NULL,
  `host_review` int(1) DEFAULT NULL,
  `traveller_rating` int(1) DEFAULT NULL,
  `traveller_review` int(1) DEFAULT NULL,
  PRIMARY KEY (`rating_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_types`
--

DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `room_types` (
  `room_type_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `room_type` varchar(50) NOT NULL,
  PRIMARY KEY (`room_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_types`
--

LOCK TABLES `room_types` WRITE;
/*!40000 ALTER TABLE `room_types` DISABLE KEYS */;
INSERT INTO `room_types` VALUES (0000000001,'Entire home/apt'),(0000000002,'Private room'),(0000000003,'Shared room');
/*!40000 ALTER TABLE `room_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_details`
--

DROP TABLE IF EXISTS `trip_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_details` (
  `trip_id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `listing_id` int(10) unsigned zerofill NOT NULL,
  `user_id` int(10) unsigned zerofill NOT NULL,
  `deposit` decimal(2,2) DEFAULT NULL,
  `checkin` datetime DEFAULT NULL,
  `checkout` datetime DEFAULT NULL,
  `no_of_guests` int(2) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`trip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_details`
--

LOCK TABLES `trip_details` WRITE;
/*!40000 ALTER TABLE `trip_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_details` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2016-11-23 20:15:57