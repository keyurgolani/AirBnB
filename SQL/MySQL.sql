CREATE DATABASE IF NOT EXISTS airbnb;

USE airbnb;

DROP TABLE IF EXISTS `account_details`;
CREATE TABLE `account_details` (
  `user_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `email` varchar(45) NOT NULL,
  `f_name` varchar(45) NOT NULL,
  `l_name` varchar(45) NOT NULL,
  `secret` varchar(255) NULL,
  `salt` varchar(255) NULL,
  `last_login` DATETIME DEFAULT NULL,
  `active` BOOLEAN DEFAULT TRUE NOT NULL,
  PRIMARY KEY (`user_id`)
);

DROP TABLE IF EXISTS `profile_details`;
CREATE TABLE `profile_details` (
  `profile_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `user_id` INT(10) ZEROFILL NOT NULL,
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

DROP TABLE IF EXISTS `property_types`;
CREATE TABLE `property_types` (
  `property_type_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `property_type` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`property_type_id`)
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
  `property_type_id` INT(10) ZEROFILL NOT NULL,
  `house_rules` VARCHAR(10000) NULL,
  `longitude` FLOAT(10,6) NOT NULL,
  `latitude` FLOAT(10,6) NOT NULL,
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
  `room_type_id` INT(10) ZEROFILL NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `is_bid` BOOLEAN DEFAULT FALSE NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `daily_price` DECIMAL(5,2) NOT NULL,
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
  `checkin` TIME NULL,
  `checkout` TIME NULL,
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
  `no_of_guests` INT NOT NULL AFTER `bidder_id`;
  `bid_amount` DECIMAL(5,2) NOT NULL,
  `listing_id` INT(10) ZEROFILL NOT NULL,
  `bidder_id` INT(10) ZEROFILL NOT NULL,
  `checkin` DATETIME NULL,
  `checkout` DATETIME NULL,
  PRIMARY KEY (`bid_id`)
);

DROP TABLE IF EXISTS `trip_details`;
CREATE TABLE `trip_details` (
  `trip_id` INT(10) ZEROFILL NOT NULL AUTO_INCREMENT,
  `trip_amount` DECIMAL(5,2) NOT NULL,
  `listing_id` INT(10) ZEROFILL NOT NULL,
  `user_id` INT(10) ZEROFILL NOT NULL,
  `deposit` DECIMAL(5,2) NULL,
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

DROP TABLE IF EXISTS `external_authentication`;
CREATE TABLE `external_authentication` (
  `external_id` VARCHAR(50),
  `user_id` INT(10) ZEROFILL NOT NULL,
  `website` ENUM('facebook', 'google', 'twitter') NOT NULL,
  PRIMARY KEY (`external_id`)
);

INSERT INTO `property_types` SET `property_type` = 'House';
INSERT INTO `property_types` SET `property_type` = 'Apartment';
INSERT INTO `property_types` SET `property_type` = 'Bed & Breakfast';
INSERT INTO `property_types` SET `property_type` = 'Boutique hotel';
INSERT INTO `property_types` SET `property_type` = 'Nature lodge';
INSERT INTO `property_types` SET `property_type` = 'Hostel';
INSERT INTO `property_types` SET `property_type` = 'Timeshare';
INSERT INTO `property_types` SET `property_type` = 'Serviced apartment';
INSERT INTO `property_types` SET `property_type` = 'Minsu (Taiwan)';
INSERT INTO `property_types` SET `property_type` = 'Ryokan (Japan)';
INSERT INTO `property_types` SET `property_type` = 'Pension (Korea)';
INSERT INTO `property_types` SET `property_type` = 'Heritage hotel (India)';
INSERT INTO `property_types` SET `property_type` = 'Boat';
INSERT INTO `property_types` SET `property_type` = 'Bungalow';
INSERT INTO `property_types` SET `property_type` = 'Cabin';
INSERT INTO `property_types` SET `property_type` = 'Castle';
INSERT INTO `property_types` SET `property_type` = 'Cave';
INSERT INTO `property_types` SET `property_type` = 'Chalet';
INSERT INTO `property_types` SET `property_type` = 'Condominium';
INSERT INTO `property_types` SET `property_type` = 'Dorm';
INSERT INTO `property_types` SET `property_type` = 'Earth House';
INSERT INTO `property_types` SET `property_type` = 'Guesthouse';
INSERT INTO `property_types` SET `property_type` = 'Hut';
INSERT INTO `property_types` SET `property_type` = 'Igloo';
INSERT INTO `property_types` SET `property_type` = 'Island';
INSERT INTO `property_types` SET `property_type` = 'Lighthouse';
INSERT INTO `property_types` SET `property_type` = 'Loft';
INSERT INTO `property_types` SET `property_type` = 'Plane';
INSERT INTO `property_types` SET `property_type` = 'Camper/RV';
INSERT INTO `property_types` SET `property_type` = 'Tent';
INSERT INTO `property_types` SET `property_type` = 'Tipi';
INSERT INTO `property_types` SET `property_type` = 'Townhouse';
INSERT INTO `property_types` SET `property_type` = 'Train';
INSERT INTO `property_types` SET `property_type` = 'Treehouse';
INSERT INTO `property_types` SET `property_type` = 'Villa';
INSERT INTO `property_types` SET `property_type` = 'Yurt';
INSERT INTO `property_types` SET `property_type` = 'Other';

INSERT INTO `room_types` SET `room_type` = 'Entire home/apt';
INSERT INTO `room_types` SET `room_type` = 'Private room';
INSERT INTO `room_types` SET `room_type` = 'Shared room';

INSERT INTO `amenities` SET `amenity` = 'Pool';
INSERT INTO `amenities` SET `amenity` = 'Gym';
INSERT INTO `amenities` SET `amenity` = 'Smoking allowed';
INSERT INTO `amenities` SET `amenity` = 'Doorman';
INSERT INTO `amenities` SET `amenity` = 'Breakfast';
INSERT INTO `amenities` SET `amenity` = 'Free parking on premises';
INSERT INTO `amenities` SET `amenity` = 'Cable TV';
INSERT INTO `amenities` SET `amenity` = 'Pets allowed';
INSERT INTO `amenities` SET `amenity` = 'Suitable for events';
INSERT INTO `amenities` SET `amenity` = 'Indoor fireplace';
INSERT INTO `amenities` SET `amenity` = 'Wheelchair accessible';
INSERT INTO `amenities` SET `amenity` = 'Dryer';
INSERT INTO `amenities` SET `amenity` = 'TV';
INSERT INTO `amenities` SET `amenity` = 'Buzzer/wireless intercom';
INSERT INTO `amenities` SET `amenity` = 'Hangers';
INSERT INTO `amenities` SET `amenity` = 'Hair dryer';
INSERT INTO `amenities` SET `amenity` = 'Iron';
INSERT INTO `amenities` SET `amenity` = 'Shampoo';
INSERT INTO `amenities` SET `amenity` = 'Elevator in building';
INSERT INTO `amenities` SET `amenity` = 'Internet';
INSERT INTO `amenities` SET `amenity` = 'Heating';
INSERT INTO `amenities` SET `amenity` = 'Laptop friendly workspace';
INSERT INTO `amenities` SET `amenity` = 'Washer';
INSERT INTO `amenities` SET `amenity` = 'Family/kid friendly';
INSERT INTO `amenities` SET `amenity` = 'Essentials';
INSERT INTO `amenities` SET `amenity` = 'Wireless Internet';
INSERT INTO `amenities` SET `amenity` = 'Kitchen';
INSERT INTO `amenities` SET `amenity` = 'Air conditioning';
INSERT INTO `amenities` SET `amenity` = 'Hot tub';
INSERT INTO `amenities` SET `amenity` = 'Smoke detector';
INSERT INTO `amenities` SET `amenity` = 'Carbon monoxide detector';
INSERT INTO `amenities` SET `amenity` = 'First aid kit';
INSERT INTO `amenities` SET `amenity` = 'Safety card';
INSERT INTO `amenities` SET `amenity` = 'Fire extinguisher';
INSERT INTO `amenities` SET `amenity` = 'Lock on bedroom door';

INSERT INTO airbnb.listings (property_id, room_type_id, title, is_bid, start_date, end_date, daily_price, bedrooms, accommodations, active) VALUES (1, 2, 'Luxury Resort for the Superbowl', 1, '2016-12-18', '2016-12-23', 200.20, 2, 5, 1);
INSERT INTO airbnb.listings (property_id, room_type_id, title, is_bid, start_date, end_date, daily_price, bedrooms, accommodations, active) VALUES (1, 3, 'Super Bowl House w/ Pool and Spa', 1, '2016-12-11', '2016-12-20', 45.22, 1, 2, 1);
INSERT INTO airbnb.listings (property_id, room_type_id, title, is_bid, start_date, end_date, daily_price, bedrooms, accommodations, active) VALUES (2, 1, '10 mins to Levi''s in luxurious apt', 1, '2016-11-26', '2016-12-06', 200.00, 2, 4, 1);
INSERT INTO airbnb.listings (property_id, room_type_id, title, is_bid, start_date, end_date, daily_price, bedrooms, accommodations, active) VALUES (3, 2, '2 bed/1bth in quiet home, full bfst', 1, '2016-11-30', '2016-12-11', 120.90, 2, 2, 1);
INSERT INTO airbnb.listings (property_id, room_type_id, title, is_bid, start_date, end_date, daily_price, bedrooms, accommodations, active) VALUES (4, 2, 'Entire Apartment for Super Bowl 50', 1, '2016-12-12', '2016-12-27', 200.00, 3, 5, 1);
INSERT INTO airbnb.listings (property_id, room_type_id, title, is_bid, start_date, end_date, daily_price, bedrooms, accommodations, active) VALUES (4, 2, 'Beautiful San Jose court house', 1, '2016-12-04', '2016-12-27', 230.00, 4, 7, 1);
INSERT INTO airbnb.listing_details (listing_id, description, bathrooms, beds, checkin, checkout) VALUES (1, 'Your Lucky Day 4miles to Levi, Beautiful Superbowl Weekend Resort Setting with heated pool and Cabana, Fine Dining On Site, plus High-Speed Internet, Business Center, Flat Screen Entertainment Center, 24 Hour staff and security', 2, 3, '02:00:00', '11:00:00');
INSERT INTO airbnb.listing_details (listing_id, description, bathrooms, beds, checkin, checkout) VALUES (2, '3 br/1 ba home located in San Jose''s beautiful rose garden area with pool and spa. Located 7 miles from Levi Stadium. Take Uber, light rail or Cal Train to the big game. Sleeps up to 5. Refrigerator, microwave, gas range, garage gym, pool, spa.', 1, 2, '02:00:00', '11:00:00');
INSERT INTO airbnb.listing_details (listing_id, description, bathrooms, beds, checkin, checkout) VALUES (3, 'One bedroom w/ den smoke & pet free apt. in brand new complex. Sleeps 4 people (queen + pull out). 15 mins to SJO airport, 10 mins to Levi''s stadium with access to pool, playground, Starbucks, restaurants etc. Excellent amenities. Family friendly.', 2, 4, '02:00:00', '11:00:00');
INSERT INTO airbnb.listing_details (listing_id, description, bathrooms, beds, checkin, checkout) VALUES (4, 'Great location near light rail, shopping and highways 85 and 87. Quiet neighborhood. 1800 sq ft house with pool, deck, fire pit, patio seating and a barbecue. Modern kitchen access, washer dryer, iron, towels. Free parking and wifi.', 1, 2, '02:00:00', '11:00:00');
INSERT INTO airbnb.listing_details (listing_id, description, bathrooms, beds, checkin, checkout) VALUES (5, 'This is a furnished Luxury apartment located 2mi from Levis stadium and the Outlet Great Mall, just steps from the VTA. Experience resort style with premium amenities like pool, gym, and jacuzzi. The apartment is on the top floor with a great view.', 2, 5, '02:00:00', '11:00:00');
INSERT INTO airbnb.listing_details (listing_id, description, bathrooms, beds, checkin, checkout) VALUES (6, '- 20 min drive from Levi''s stadium - Spacious front and back yard - Free Wifi - New furniture and beds - Very safe neighborhood - 4 bedrooms - 2 bathrooms', 3, 4, '02:00:00', '11:00:00');
INSERT INTO airbnb.property_details (owner_id, property_type_id, house_rules, longitude, latitude, st_address, apt, city, state, zip, active) VALUES (1, 1, 'No Smoking. No pets allowed. No dirt.', -121.88633, 37.338207, 'Perfect Location for the Superbowl, San Jose, CA, United States', '234', 'San Jose', 'California', 95134, 1);
INSERT INTO airbnb.property_details (owner_id, property_type_id, house_rules, longitude, latitude, st_address, apt, city, state, zip, active) VALUES (1, 1, 'Want minimal to no activity after 10PM. Want a tidy house. Smoking allowed. Pets are allowed.', -121.932396, 37.37373, '1659 Airport Boulevard', '223', 'San Jose', 'California', 95110, 1);
INSERT INTO airbnb.property_details (owner_id, property_type_id, house_rules, longitude, latitude, st_address, apt, city, state, zip, active) VALUES (1, 3, 'Refer Super 8 Motels Website for the list of rules.', -121.92162, 37.340446, '1860 The Alameda', '214', 'San Jose', 'California', 95126, 1);
INSERT INTO airbnb.property_details (owner_id, property_type_id, house_rules, longitude, latitude, st_address, apt, city, state, zip, active) VALUES (1, 5, 'Tidy community. No smoking allowed. Please visit leasing office for pets policy. No subleasing is allowed.', -121.912476, 37.332733, '1300 The Alameda', '1322260', 'San Jose', 'California', 95126, 1);
