CREATE DATABASE IF NOT EXISTS airbnb;

USE airbnb;

DROP TABLE IF EXISTS `account_details`;
CREATE TABLE `account_details` (
  `user_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `email` varchar(45) NOT NULL,
  `secret` varchar(255) NOT NULL,
  `salt` varchar(255) NOT NULL,
  `last_login` DATETIME DEFAULT NULL,
  `active` BOOLEAN DEFAULT TRUE NOT NULL,
  PRIMARY KEY (`user_id`)
);

DROP TABLE IF EXISTS `external_users`;
CREATE TABLE `airbnb`.`external_users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `website` VARCHAR(45) NOT NULL,
  `name` VARCHAR(45) NOT NULL,
  `email` VARCHAR(45) NOT NULL,
  `external_id` INT NOT NULL,
  PRIMARY KEY (`user_id`));

DROP TABLE IF EXISTS `profile_details`;
CREATE TABLE `profile_details` (
  `profile_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `user_id` INT(10) ZEROFILL NOT NULL,
  `f_name` varchar(45) NOT NULL,
  `l_name` varchar(45) NOT NULL,
  `phone` NUMERIC(12) NULL,
  `dob` DATE NOT NULL,
  `st_address` VARCHAR(255) NOT NULL,
  `apt` VARCHAR(20) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `zip` NUMERIC(5) NOT NULL,
  `description` VARCHAR(10000) DEFAULT NULL,
  PRIMARY KEY (`profile_id`)
);

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `category_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`category_id`)
);

DROP TABLE IF EXISTS `room_types`;
CREATE TABLE `room_types` (
  `room_type_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `room_type` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`room_type_id`)
);

DROP TABLE IF EXISTS `property_details`;
CREATE TABLE `property_details` (
  `property_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `owner_id` INT(10) ZEROFILL NOT NULL,
  `category_id` INT(10) ZEROFILL NOT NULL,
  `room_type_id` INT(10) ZEROFILL NOT NULL,
  `house_rules` VARCHAR(10000) NULL,
  `st_address` VARCHAR(255) NOT NULL,
  `apt` VARCHAR(20) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `zip` NUMERIC(5) NOT NULL,
  `active` BOOLEAN DEFAULT TRUE NOT NULL,
  PRIMARY KEY (`property_id`)
);

DROP TABLE IF EXISTS `listings`;
CREATE TABLE `listings` (
  `listing_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `property_id` INT(10) ZEROFILL NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `is_bid` BOOLEAN DEFAULT FALSE NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `daily_price` DECIMAL(2,2) NOT NULL,
  `bedrooms` INT(2) NOT NULL,
  `accommodations` INT(2) NOT NULL,
  `active` BOOLEAN DEFAULT TRUE NOT NULL,
  PRIMARY KEY (`listing_id`)
);

DROP TABLE IF EXISTS `listing_details`;
CREATE TABLE `listing_details` (
  `listing_details_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `listing_id` INT(10) ZEROFILL NOT NULL,
  `description` VARCHAR(10000) NOT NULL,
  `bathrooms` INT(2) NOT NULL,
  `beds` INT(2) NOT NULL,
  `checkin` TIMESTAMP NULL,
  `checkout` TIMESTAMP NULL,
  PRIMARY KEY (`listing_details_id`)
);

DROP TABLE IF EXISTS `amenities`;
CREATE TABLE `amenities` (
  `amenity_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `amenity` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`amenity_id`)
);

DROP TABLE IF EXISTS `listing_amenity_mapping`;
CREATE TABLE `listing_amenity_mapping` (
  `listing_id` INT(10) ZEROFILL NOT NULL,
  `amenity_id` INT(10) ZEROFILL NOT NULL,
  PRIMARY KEY (`listing_id`, `amenity_id`)
);

DROP TABLE IF EXISTS `bid_details`;
CREATE TABLE `bid_details` (
  `bid_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `bid_amount` DECIMAL(2,2) NOT NULL,
  `listing_id` INT(10) ZEROFILL NOT NULL,
  `bidder_id` INT(10) ZEROFILL NOT NULL,
  PRIMARY KEY (`bid_id`)
);

DROP TABLE IF EXISTS `trip_details`;
CREATE TABLE `trip_details` (
  `trip_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `listing_id` INT(10) ZEROFILL NOT NULL,
  `user_id` INT(10) ZEROFILL NOT NULL,
  `deposit` DECIMAL(2,2) NULL,
  `checkin` DATETIME NULL,
  `checkout` DATETIME NULL,
  `no_of_guests` INT(2) NOT NULL,
  `active` BOOLEAN DEFAULT TRUE NOT NULL,
  PRIMARY KEY (`trip_id`)
);

DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
  `rating_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `trip_id` INT(10) ZEROFILL NOT NULL,
  `host_rating` INT(1) NULL,
  `host_review` INT(1) NULL,
  `traveller_rating` INT(1) NULL,
  `traveller_review` INT(1) NULL,
  PRIMARY KEY (`rating_id`)
);

DROP TABLE IF EXISTS `bill_details`;
CREATE TABLE `bill_details` (
  `bill_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `trip_id` INT(10) ZEROFILL NOT NULL,
  `receipt_id` INT(10) ZEROFILL NOT NULL,
  `cc_id` INT(10) ZEROFILL NOT NULL,
  PRIMARY KEY (`bill_id`)
);

DROP TABLE IF EXISTS `card_details`;
CREATE TABLE `card_details` (
  `card_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `user_id` INT(10) ZEROFILL NOT NULL,
  `card_number` NUMERIC(16) NOT NULL,
  `exp` VARCHAR(4) NOT NULL,
  `cvv` NUMERIC(4) NOT NULL,
  PRIMARY KEY (`card_id`)
);