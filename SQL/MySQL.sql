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

DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE `user_profile` (
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
