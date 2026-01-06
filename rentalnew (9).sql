-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 06, 2026 at 02:01 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rentalnew`
--

-- --------------------------------------------------------

--
-- Table structure for table `amenities`
--

CREATE TABLE `amenities` (
  `amenity_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `value` varchar(150) NOT NULL,
  `category` varchar(50) NOT NULL,
  `icon_class` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `amenities`
--

INSERT INTO `amenities` (`amenity_id`, `name`, `value`, `category`, `icon_class`) VALUES
(6, 'Wi-Fi', 'wifi', 'Internet', 'fa-wifi'),
(7, 'High-Speed Internet', 'highspeedinternet', 'Internet', 'fa-network-wired'),
(8, 'Smart TV', 'tv', 'Internet', 'fa-tv'),
(9, 'Work Desk', 'workdesk', 'Internet', 'fa-laptop'),
(10, 'Parking', 'parking', 'Transport', 'fa-car'),
(11, 'Free Parking', 'freeparking', 'Transport', 'fa-parking'),
(12, 'Airport Shuttle', 'airportshuttle', 'Transport', 'fa-bus'),
(13, 'Air Conditioning', 'airconditioning', 'Comfort', 'fa-snowflake'),
(14, 'Heating', 'heating', 'Comfort', 'fa-thermometer-half'),
(15, 'Ceiling Fan', 'ceilingfan', 'Comfort', 'fa-fan'),
(16, 'Blackout Curtains', 'blackoutcurtains', 'Comfort', 'fa-window-maximize'),
(17, 'Kitchen', 'kitchen', 'Kitchen', 'fa-utensils'),
(18, 'Refrigerator', 'refrigerator', 'Kitchen', 'fa-snowflake'),
(19, 'Microwave', 'microwave', 'Kitchen', 'fa-microchip'),
(20, 'Coffee Maker', 'coffeemaker', 'Kitchen', 'fa-coffee'),
(21, 'Dishwasher', 'washer', 'Kitchen', 'fa-drum'),
(22, 'Swimming Pool', 'pool', 'Recreation', 'fa-swimming-pool'),
(23, 'Gym', 'gym', 'Recreation', 'fa-dumbbell'),
(24, 'Spa', 'spa', 'Recreation', 'fa-spa'),
(25, 'Game Room', 'gameroom', 'Recreation', 'fa-gamepad'),
(26, 'Playground', 'playground', 'Recreation', 'fa-child'),
(27, 'Fire Extinguisher', 'fireextinguisher', 'Safety', 'fa-fire-extinguisher'),
(28, 'Smoke Alarm', 'smokealarm', 'Safety', 'fa-bell'),
(29, 'First Aid Kit', 'firstaidkit', 'Safety', 'fa-kit-medical'),
(30, 'CCTV Security', 'cctvsecurity', 'Safety', 'fa-video'),
(31, '24/7 Security', 'security24x7', 'Safety', 'fa-shield-alt'),
(32, 'Washing Machine', 'washingmachine', 'Laundry', 'fa-soap'),
(33, 'Dryer', 'dryer', 'Laundry', 'fa-tshirt'),
(34, 'Iron', 'iron', 'Laundry', 'fa-iron'),
(35, 'Clothes Rack', 'clothesrack', 'Laundry', 'fa-hanger'),
(36, 'Hot Water', 'hotwater', 'Bathroom', 'fa-tint'),
(37, 'Bathtub', 'bathtub', 'Bathroom', 'fa-bath'),
(38, 'Hair Dryer', 'hairdryer', 'Bathroom', 'fa-wind'),
(39, 'Towels', 'towels', 'Bathroom', 'fa-toilet-paper'),
(40, 'Wardrobe', 'wardrobe', 'Bedroom', 'fa-archive'),
(41, 'Extra Pillows & Blankets', 'extrapillowsblankets', 'Bedroom', 'fa-bed'),
(42, 'Mosquito Net', 'mosquitonet', 'Bedroom', 'fa-bug'),
(43, 'Pet Friendly', 'petfriendly', 'Policies', 'fa-paw'),
(44, 'Smoking Allowed', 'smokingallowed', 'Policies', 'fa-smoking'),
(45, 'Family Friendly', 'familyfriendly', 'Policies', 'fa-users'),
(46, 'Balcony', 'balcony', 'Outdoor', 'fa-building'),
(47, 'Garden', 'garden', 'Outdoor', 'fa-tree'),
(48, 'Terrace', 'terrace', 'Outdoor', 'fa-sun'),
(49, 'BBQ Grill', 'bbqgrill', 'Outdoor', 'fa-fire'),
(50, 'Paid Parking', 'paidparking', 'Transport', 'fa-parking'),
(51, 'Dedicated Workshop', 'dedicatedworkshop', 'Internet', 'fa-laptop'),
(52, 'Hot Tub', 'hottub', 'Bathroom', 'fa-bath'),
(53, 'Patio', 'patio', 'Recreation', 'fa-bath'),
(54, 'Outdoor Dining Area', 'outdoordiningarea', 'Comfort', ''),
(55, 'Firepit', 'firepit', 'Outdoor', 'fa-fire'),
(56, 'Pool Table', 'pooltable', 'Recreation', ''),
(57, 'Indoorfire Place', 'indoorfireplace', 'Comfort', ''),
(58, 'Security Camera', 'securitycamera', 'Safety', 'fa-video'),
(59, 'Piano', 'piano', 'Recreation', 'fa-music'),
(60, 'Exercise Equipment', 'exerciseequipment', 'Recreation', 'fa-dumbbell'),
(61, 'Lake Access', 'lakeaccess', 'Outdoor', 'fa-water'),
(62, 'Beach Access', 'beachaccess', 'Outdoor', 'fa-umbrella-beach'),
(63, 'Ski-in/Ski-out', 'skiinskiout', 'Recreation', 'fa-skiing'),
(64, 'Outdoor Shower', 'outdoorshower', 'Bathroom', 'fa-shower'),
(65, 'Carbon Monoxide Alarm', 'carboonmo0xidealarm', 'Safety', 'fa-exclamation-triangle'),
(67, 'Noise Decibel Monitor', 'noicedecibel', 'Safety', 'fa-volume-up'),
(68, 'Weapon Detection', 'weapon', 'Safety', 'fa-shield-alt'),
(69, 'Peaceful', 'peaceful', 'Theme', 'fa-peace'),
(70, 'Unique Thing', 'unique_thing', 'Theme', 'fa-star'),
(72, 'Stylish', 'stylish', 'Theme', 'fa-gem'),
(73, 'Central', 'central', 'Theme', 'fa-city'),
(74, 'Spacious', 'spacious', 'Theme', 'fa-expand'),
(75, 'Noise Decibel', 'noisedecibel', 'Safety', 'fa-shield-alt'),
(76, 'Family Friendly', 'family-friendly', 'Policies', 'fa-users'),
(77, 'First and kit', 'firstandkit', 'placehastooffer', 'fa-wifi'),
(78, 'Pia', 'pia0', 'placehastooffer', 'fa-wifi'),
(79, 'Unique Thing', 'unique', 'Theme', 'fa-star');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `order_id` varchar(200) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` int(11) DEFAULT 0 COMMENT '''pending=0'',''completed=1'',''confirmed=2'',''cancelled=3''',
  `guests_count` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `check_in_time` time DEFAULT NULL,
  `check_out_time` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `property_id`, `guest_id`, `order_id`, `payment_id`, `check_in_date`, `check_out_date`, `total_price`, `status`, `guests_count`, `created_at`, `updated_at`, `check_in_time`, `check_out_time`) VALUES
(1, 53, 6, '0', 0, '2025-12-03', '2025-12-04', 2500.00, 0, 1, '2025-12-03 06:57:25', '2025-12-03 12:52:38', NULL, NULL),
(2, 53, 6, '0', 0, '2025-12-03', '2025-12-05', 5000.00, 0, 1, '2025-12-03 07:03:27', '2025-12-03 12:52:42', NULL, NULL),
(3, 53, 6, 'order_RnR24O8sqpqjom', 0, '2025-12-04', '2025-12-06', 5000.00, 1, 3, '2025-12-04 06:29:41', '2025-12-04 06:29:41', NULL, NULL),
(4, 53, 6, 'order_Rnph9fT5jJ5NgC', 0, '2025-12-05', '2025-12-06', 2500.00, 1, 1, '2025-12-05 06:35:26', '2025-12-05 06:35:26', NULL, NULL),
(5, 53, 6, 'order_RvKEwcNNidvpCL', 0, '2025-12-24', '2025-12-25', 2500.00, 1, 1, '2025-12-24 05:00:48', '2025-12-24 05:00:48', NULL, NULL),
(6, 53, 1, 'order_RvPfPbBGqGTtpK', 0, '2025-12-29', '2025-12-30', 2500.00, 1, 3, '2025-12-24 10:19:24', '2025-12-24 10:19:24', NULL, NULL),
(7, 53, 1, 'order_RvPhuFJnaTiXyj', 0, '2025-12-28', '2025-12-29', 2500.00, 1, 4, '2025-12-24 10:21:57', '2025-12-24 10:21:57', NULL, NULL),
(8, 54, 1, 'order_RvQIyMbeB7RQbn', 0, '2025-12-24', '2025-12-26', 9250.00, 1, 4, '2025-12-24 10:57:42', '2025-12-24 10:57:42', NULL, NULL),
(9, 54, 1, 'order_RvQpyvhRilorFh', 0, '2025-12-24', '2025-12-26', 9250.00, 1, 7, '2025-12-24 11:28:40', '2025-12-24 11:28:40', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `document_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `property_id` int(11) DEFAULT NULL,
  `type` tinyint(4) NOT NULL COMMENT '1 = user, 2 = property',
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0=pending,1=approved,2=rejected,3=archived',
  `is_deleted` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0=no,1=yes',
  `uploaded_by` varchar(100) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `favourites`
--

CREATE TABLE `favourites` (
  `user_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `favourites`
--

INSERT INTO `favourites` (`user_id`, `property_id`, `created_at`) VALUES
(1, 53, '2025-11-20 04:48:16'),
(2, 4, '2025-09-16 11:03:36'),
(6, 53, '2025-12-04 09:50:33'),
(6, 54, '2025-12-08 13:00:00'),
(6, 55, '2025-12-08 12:45:23'),
(6, 56, '2025-12-03 11:56:00'),
(6, 57, '2025-12-08 12:45:26');

-- --------------------------------------------------------

--
-- Table structure for table `host_addresses`
--

CREATE TABLE `host_addresses` (
  `address_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `host_id` int(11) NOT NULL DEFAULT 0,
  `country` varchar(100) DEFAULT NULL,
  `flat` varchar(255) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `district` varchar(200) NOT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `street_address` varchar(255) DEFAULT NULL,
  `state_province` varchar(255) NOT NULL,
  `full_address` text DEFAULT NULL,
  `landmark` varchar(30) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `host_addresses`
--

INSERT INTO `host_addresses` (`address_id`, `user_id`, `host_id`, `country`, `flat`, `state`, `city`, `district`, `zip_code`, `street_address`, `state_province`, `full_address`, `landmark`, `latitude`, `longitude`) VALUES
(9, NULL, 1, 'India', NULL, NULL, 'Jaipur', '', NULL, NULL, 'Jaipur ', NULL, '', NULL, NULL),
(10, NULL, 1, 'India', NULL, NULL, 'Jaipur', '', NULL, NULL, 'Jaipur ', NULL, '', NULL, NULL),
(11, NULL, 1, 'India', NULL, NULL, 'Jaipur', '', NULL, NULL, 'Jaipur ', NULL, '', NULL, NULL),
(12, NULL, 5, 'India', NULL, NULL, 'Jaipur ', 'Jaipur ', NULL, NULL, 'Rajasthan ', NULL, 'India', NULL, NULL),
(13, NULL, 5, 'India', NULL, NULL, 'Jaiour', 'Jaipur', NULL, NULL, 'Rajasthan ', NULL, 'India', NULL, NULL),
(16, NULL, 5, 'Indis', NULL, NULL, 'Ccc', 'Ccc', NULL, NULL, 'Ccc', NULL, 'Nxcnc', NULL, NULL),
(17, NULL, 5, 'Lastdddd', 'Lastdxxxdx', NULL, 'Last xcc', 'Lastxxxx', '302033', 'Lastxxxx', 'Lastxxxxx', NULL, 'Lastxxxx', NULL, NULL),
(18, NULL, 5, 'India ', 'Hbb', NULL, 'Uvivi', 'Iivv', '6839', 'Hhbh', 'Uviv', NULL, 'Ucc', NULL, NULL),
(19, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(20, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(21, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(22, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(23, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(24, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(25, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(26, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(27, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(28, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(29, NULL, 5, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(30, NULL, 5, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(31, NULL, 5, 'India', '', NULL, 'Jaipur', 'Jaipur', '', '', 'Rajasthan', NULL, 'India', NULL, NULL),
(32, NULL, 5, 'India', 'Jaipur', NULL, 'Jaipur', 'Jaipur', '302033', 'Ha ', 'Rajasthan ', NULL, 'Tubs', NULL, NULL),
(33, NULL, 5, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(34, NULL, 5, 'India', '', NULL, 'India', '', '302833', 'India', 'India', NULL, '', NULL, NULL),
(35, NULL, 1, 'Idnia', '', NULL, 'Jaipu ', '', '302033', 'Idnia', 'Rajasthan ', NULL, '', NULL, NULL),
(36, NULL, 1, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(37, NULL, 1, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(38, NULL, 1, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(39, NULL, 1, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(40, NULL, 1, 'india', 'india', NULL, 'india', 'india', '302033', 'india', 'indai', NULL, 'india', NULL, NULL),
(41, NULL, 1, '', '', NULL, '', '', '', '', '', NULL, '', NULL, NULL),
(42, NULL, 1, 'India', '', NULL, 'SANGANER,JAIPUR', '', '302033', '182/35 sector 18 pratapnagar sanganer jaipur', 'Rajasthan', NULL, '', NULL, NULL),
(43, NULL, 5, 'India', '', NULL, 'SANGANER,JAIPUR', '', '302033', '182/35 sector 18 pratapnagar sanganer jaipur', 'Rajasthan', NULL, '', NULL, NULL),
(44, NULL, 5, 'India', '', NULL, 'SANGANER,JAIPUR', '', '302033', '182/35 sector 18 pratapnagar sanganer jaipur', 'Rajasthan', NULL, '', NULL, NULL),
(45, NULL, 5, 'India', '', NULL, 'Jaipur ', 'Jaipur ', '', '', 'Rajasthan ', NULL, 'India', NULL, NULL),
(46, NULL, 5, 'India', '', NULL, 'SANGANER,JAIPUR', '', '302033', '182/35 sector 18 pratapnagar sanganer jaipur', 'Rajasthan', NULL, '', NULL, NULL),
(47, NULL, 5, 'India', '', NULL, 'SANGANER,JAIPUR', '', '302033', '182/35 sector 18 pratapnagar sanganer jaipur', 'Rajasthan', NULL, '', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `host_profiles`
--

CREATE TABLE `host_profiles` (
  `host_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT 1 COMMENT '1=host,2=broker',
  `profile` varchar(255) NOT NULL,
  `host_name` varchar(255) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `language_spoken` varchar(255) DEFAULT NULL,
  `response_time` varchar(100) DEFAULT NULL,
  `host_since` date DEFAULT NULL,
  `govt_id_verified` tinyint(1) DEFAULT 0,
  `profile_complete` tinyint(1) DEFAULT 0,
  `status` int(11) DEFAULT 0 COMMENT '''0=pending'',''1=approved'',''2=rejected''',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `host_profiles`
--

INSERT INTO `host_profiles` (`host_id`, `user_id`, `type`, `profile`, `host_name`, `email`, `phone_number`, `headline`, `bio`, `language_spoken`, `response_time`, `host_since`, `govt_id_verified`, `profile_complete`, `status`, `created_at`) VALUES
(5, 1, 1, '', 'Yuvraj Singh', NULL, NULL, 'okk', 'tests', 'okk', NULL, NULL, 0, 0, 1, '2025-08-18 14:23:54'),
(6, 0, 2, '/uploads/new/logo/1766056731724.jpg', 'okkk', 'tets@gmail.com', '9876543210', '', '', '', NULL, NULL, 0, NULL, 1, '2025-12-18 16:49:20'),
(7, 0, 2, '/uploads/new/logo/1766057240926.jpg', 'fghdfg', 'fgdfgfd@gmail.com', '9876543210', '', '', '', NULL, NULL, 0, NULL, 1, '2025-12-18 16:57:43'),
(8, 7, 1, '', 'tetenew try', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '2025-12-20 15:04:39'),
(9, 6, 1, '', 'tets', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '2025-12-24 12:58:46');

-- --------------------------------------------------------

--
-- Table structure for table `host_verifications`
--

CREATE TABLE `host_verifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `document_url` text DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0,
  `verified_by_admin` tinyint(1) DEFAULT 0,
  `submitted_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `house_rules`
--

CREATE TABLE `house_rules` (
  `rule_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `no_pets` tinyint(1) DEFAULT 0,
  `no_smoking` tinyint(1) DEFAULT 0,
  `no_parties` tinyint(1) DEFAULT 0,
  `no_children` tinyint(1) DEFAULT 0,
  `check_in_time` time DEFAULT '15:00:00',
  `check_out_time` time DEFAULT '11:00:00',
  `other_rules` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('credit_card','paypal','bank_transfer','other') NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `properties`
--

CREATE TABLE `properties` (
  `property_id` int(11) NOT NULL,
  `host_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `property_type` varchar(100) NOT NULL COMMENT '''apartment'',''house'',''villa'',''condo'',''cabin'',''cottage'',''loft'',''townhouse'',''other''',
  `listing_type` varchar(255) NOT NULL,
  `describe_apartment` varchar(255) NOT NULL,
  `other_people` varchar(60) DEFAULT NULL,
  `room_type` varchar(100) NOT NULL COMMENT '''entire_home'',''private_room'',''shared_room''',
  `max_guests` int(11) NOT NULL,
  `floor` int(11) NOT NULL DEFAULT 0,
  `floor_listing` int(11) NOT NULL DEFAULT 0,
  `year_built` int(11) NOT NULL DEFAULT 0,
  `property_size` int(11) NOT NULL,
  `unit` varchar(200) NOT NULL,
  `bedrooms` int(11) NOT NULL,
  `bedroom_look` int(11) NOT NULL DEFAULT 1,
  `beds` int(11) NOT NULL,
  `bathrooms` decimal(3,1) NOT NULL,
  `attached_bathrooms` int(11) NOT NULL DEFAULT 0,
  `dedicated_bathrooms` int(11) NOT NULL DEFAULT 0,
  `shard_bathrooms` int(11) NOT NULL DEFAULT 0,
  `price_per_night` decimal(10,2) NOT NULL,
  `weekend_price` decimal(10,2) DEFAULT 0.00,
  `weekday_price` varchar(20) NOT NULL,
  `cleaning_fee` decimal(10,2) DEFAULT 0.00,
  `address_id` int(11) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `booking_setting` int(11) DEFAULT 0 COMMENT '"approve_your_first_five_bookings": "1",\r\n    "use_instant_book": "1",\r\n    "approve_all_booking": "1"',
  `discounts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`discounts`)),
  `weekly_discount` int(11) NOT NULL,
  `monthly_discount` int(11) NOT NULL,
  `safety_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`safety_details`)),
  `reservation_type` varchar(200) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `properties`
--

INSERT INTO `properties` (`property_id`, `host_id`, `title`, `description`, `property_type`, `listing_type`, `describe_apartment`, `other_people`, `room_type`, `max_guests`, `floor`, `floor_listing`, `year_built`, `property_size`, `unit`, `bedrooms`, `bedroom_look`, `beds`, `bathrooms`, `attached_bathrooms`, `dedicated_bathrooms`, `shard_bathrooms`, `price_per_night`, `weekend_price`, `weekday_price`, `cleaning_fee`, `address_id`, `latitude`, `longitude`, `is_active`, `booking_setting`, `discounts`, `weekly_discount`, `monthly_discount`, `safety_details`, `reservation_type`, `status`, `created_at`, `updated_at`) VALUES
(53, 5, 'tete new byyyyy yyyyyyyyyyy', 'This is short description oookk ttttt', 'Home', '', 'Apartment', 'Other guests', 'House', 8, 0, 0, 0, 0, '', 2, 1, 4, 7.0, 4, 1, 2, 2500.00, 2000.00, '15000', 0.00, 0, 26.91368840, 75.74023040, 1, NULL, NULL, 0, 0, NULL, 'any_guest', 0, '2025-09-16 05:28:53', '2025-12-24 07:36:46'),
(54, 5, '', '', 'Home', '', 'Apartment', 'Me', 'A shared room in a hostel', 1, 0, 0, 0, 0, '', 1, 1, 1, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 26.91369760, 75.74024830, 1, NULL, NULL, 0, 0, NULL, '', 0, '2025-10-27 05:24:04', '2025-10-27 05:24:04'),
(55, 5, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, NULL, NULL, 0, 0, NULL, '', 0, '2025-11-19 10:52:42', '2025-12-22 12:36:22'),
(56, 5, 'Title', 'Description ', 'Home', '', 'House', 'My Family', 'House', 1, 0, 0, 0, 0, '', 1, 1, 1, 3.0, 1, 1, 1, 0.00, 50.00, '250', 0.00, 0, 26.91371700, 75.74021230, 1, NULL, NULL, 0, 0, NULL, 'any_guest', 1, '2025-11-19 11:14:41', '2025-11-19 11:35:16'),
(57, 1, 'OKKK', 'TETE', '', '', '', '', '', 4, 0, 0, 0, 0, '', 7, 0, 7, 21.0, 7, 7, 7, 0.00, 777.00, '77', 0.00, 0, 99.99999999, 0.00000000, 1, 0, NULL, 0, 0, NULL, 'normal', 0, '2025-12-05 12:16:54', '2025-12-05 12:16:54'),
(58, 1, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-16 11:11:39', '2025-12-16 11:11:39'),
(59, 1, '', '', 'Home', '', 'Apartment', '', 'A room', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-16 11:13:12', '2025-12-16 11:13:12'),
(60, 1, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-16 11:13:16', '2025-12-16 11:13:16'),
(61, 5, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-17 06:14:27', '2025-12-17 06:14:27'),
(62, 1, '', '', 'Home', '', 'Cabin', 'Roommates', 'House', 1, 0, 0, 0, 0, '', 1, 0, 1, 3.0, 1, 1, 1, 0.00, 0.00, '0', 0.00, 0, 26.91371110, 75.74024440, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-17 07:55:57', '2025-12-17 07:55:57'),
(63, 1, '', '', 'Home', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-17 07:56:13', '2025-12-17 07:56:13'),
(64, 1, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-19 10:06:26', '2025-12-19 10:06:26'),
(65, 1, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-19 12:24:49', '2025-12-19 12:24:49'),
(66, 1, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-19 12:44:37', '2025-12-19 12:44:37'),
(67, 1, 'Now, let\'s give your apartment a title\n', '', 'Home', '', 'Riad', 'My Family', 'House', 1, 0, 0, 0, 0, '', 0, 1, 0, 0.0, 0, 0, 0, 0.00, 5120.00, '0', 0.00, 0, 28.00025600, 73.33806080, 1, 0, NULL, 0, 0, NULL, 'any_guest', 0, '2025-12-19 12:51:18', '2025-12-19 12:51:18'),
(68, 5, '', '', '', '', '', '', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 0.0, 0, 0, 0, 0.00, 0.00, '0', 0.00, 0, 0.00000000, 0.00000000, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-22 09:14:41', '2025-12-23 05:12:45'),
(69, 5, 'Test By Yashveer Soni', '', 'Home', '', 'Bed & Breakfast', 'My Family', 'House', 0, 0, 0, 0, 0, '', 0, 0, 0, 6.0, 2, 2, 2, 0.00, 6000.00, '5000', 0.00, 0, 26.90876230, 75.74513260, 1, 0, NULL, 0, 0, NULL, 'any_guest', 0, '2025-12-22 09:21:40', '2025-12-23 05:18:27'),
(70, 5, 'Test By Yashveer Soni', '', 'Home', '', '', 'My Family', '', 0, 0, 0, 0, 0, '', 0, 0, 0, 6.0, 2, 2, 2, 0.00, 6000.00, '0', 0.00, 0, 26.90876230, 75.74513260, 1, 0, NULL, 0, 0, NULL, '', 0, '2025-12-22 11:11:54', '2025-12-22 11:11:54'),
(71, 5, 'Now, let\'s give your apartment a title', 'Create your description', 'Home', '', 'Bed & Breakfast', 'Other guests', 'A shared room in a hostel', 1, 0, 0, 0, 0, '', 1, 0, 1, 3.0, 1, 1, 1, 0.00, 6000.00, '5000', 0.00, 0, 29.90690540, 73.87717860, 1, 0, NULL, 0, 0, NULL, 'any_guest', 0, '2025-12-23 05:40:46', '2025-12-23 05:40:46'),
(72, 5, 'hello', 'Create your description', 'Home', '', 'Cave', 'Me', '', 0, 0, 0, 0, 0, '', 0, 1, 0, 0.0, 0, 0, 0, 0.00, 5000.00, '5000', 0.00, 0, 25.33294080, 74.62912000, 1, 0, NULL, 0, 0, NULL, 'experienced_guest', 0, '2025-12-23 07:31:33', '2025-12-23 07:31:33');

-- --------------------------------------------------------

--
-- Table structure for table `property_addresses`
--

CREATE TABLE `property_addresses` (
  `address_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `street_address` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `district` varchar(200) DEFAULT NULL,
  `state_province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) NOT NULL,
  `latitude` varchar(60) DEFAULT NULL,
  `longitude` varchar(60) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `property_addresses`
--

INSERT INTO `property_addresses` (`address_id`, `property_id`, `street_address`, `city`, `district`, `state_province`, `postal_code`, `country`, `latitude`, `longitude`) VALUES
(48, 53, '182/35 sector and', 'Jaipur', '', 'Raamjast', '302033', 'India', '26.9136884', '75.7402304'),
(49, 54, 'Dhjd', 'Dhjd', '', 'Dydud', '302033', 'Hdhd', '26.9136976', '75.7402483'),
(50, 55, '', '', '', '', '', '', '', ''),
(51, 56, 'India deals online media', 'Jaipur', '', 'Rajasthan', '302033', 'India', '26.913717', '75.7402123'),
(52, 57, 'OKK', 'NEW', '', 'RAJSTHAN', '333', '', '54885', 'OKK'),
(53, 59, '', '', '', '', '', '', '', ''),
(54, 60, '', '', '', '', '', '', '', ''),
(55, 62, 'Jaiour', 'Xjjx', '', 'Jxjx', '302033', 'India', '26.9137111', '75.7402444'),
(56, 63, '', '', '', '', '', '', '', ''),
(57, 66, '', '', '', '', '', '', '', ''),
(58, 67, '', 'SANGANER,JAIPUR', '', 'Rajasthan', '', 'India', '28.000256', '73.3380608'),
(59, 68, '', '', '', '', '', '', '', ''),
(60, 69, '182/35 sector 18 pratapnagar sanganer jaipur', 'SANGANER,JAIPUR', '', 'Rajasthan', '302033', 'India', '26.9087623', '75.7451326'),
(61, 70, '', 'SANGANER,JAIPUR', '', 'Rajasthan', '', 'India', '26.9087623', '75.7451326'),
(62, 71, '182/35 sector 18 pratapnagar sanganer jaipur', 'SANGANER,JAIPUR', '', 'Rajasthan', '302033', 'India', '29.9069054', '73.8771786'),
(63, 72, '182/35 sector 18 pratapnagar sanganer jaipur', 'SANGANER,JAIPUR', '', 'Rajasthan', '302033', 'India', '25.3329408', '74.62912');

-- --------------------------------------------------------

--
-- Table structure for table `property_amenities`
--

CREATE TABLE `property_amenities` (
  `property_id` int(11) NOT NULL,
  `amenity_id` int(11) NOT NULL,
  `data_key` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `property_amenities`
--

INSERT INTO `property_amenities` (`property_id`, `amenity_id`, `data_key`) VALUES
(40, 8, 'placehastooffer'),
(40, 17, 'placehastooffer'),
(40, 21, 'placehastooffer'),
(40, 72, 'describeyourapartment'),
(40, 79, 'describeyourapartment'),
(41, 6, 'placehastooffer'),
(41, 8, 'placehastooffer'),
(41, 17, 'placehastooffer'),
(41, 21, 'placehastooffer'),
(41, 72, 'describeyourapartment'),
(41, 79, 'describeyourapartment'),
(42, 6, 'placehastooffer'),
(42, 8, 'placehastooffer'),
(42, 17, 'placehastooffer'),
(42, 21, 'placehastooffer'),
(42, 72, 'describeyourapartment'),
(42, 79, 'describeyourapartment'),
(43, 6, 'placehastooffer'),
(43, 8, 'placehastooffer'),
(43, 17, 'placehastooffer'),
(43, 21, 'placehastooffer'),
(43, 72, 'describeyourapartment'),
(43, 79, 'describeyourapartment'),
(44, 6, 'placehastooffer'),
(44, 8, 'placehastooffer'),
(44, 17, 'placehastooffer'),
(44, 21, 'placehastooffer'),
(44, 72, 'describeyourapartment'),
(44, 79, 'describeyourapartment'),
(45, 6, 'placehastooffer'),
(45, 8, 'placehastooffer'),
(45, 17, 'placehastooffer'),
(45, 21, 'placehastooffer'),
(45, 72, 'describeyourapartment'),
(45, 79, 'describeyourapartment'),
(46, 6, 'placehastooffer'),
(46, 13, 'placehastooffer'),
(46, 17, 'placehastooffer'),
(46, 76, 'describeyourapartment'),
(47, 6, 'placehastooffer'),
(47, 13, 'placehastooffer'),
(47, 17, 'placehastooffer'),
(47, 76, 'describeyourapartment'),
(48, 6, 'placehastooffer'),
(48, 13, 'placehastooffer'),
(48, 17, 'placehastooffer'),
(48, 76, 'describeyourapartment'),
(49, 6, 'placehastooffer'),
(49, 8, 'placehastooffer'),
(49, 17, 'placehastooffer'),
(49, 21, 'placehastooffer'),
(49, 72, 'describeyourapartment'),
(49, 79, 'describeyourapartment'),
(53, 17, 'placehastooffer'),
(53, 28, 'placehastooffer'),
(53, 29, 'placehastooffer'),
(53, 49, 'placehastooffer'),
(53, 52, 'placehastooffer'),
(53, 53, 'placehastooffer'),
(53, 54, 'placehastooffer'),
(53, 55, 'placehastooffer'),
(53, 56, 'placehastooffer'),
(53, 64, 'placehastooffer'),
(53, 76, 'describeyourapartment'),
(53, 79, 'describeyourapartment'),
(54, 13, 'placehastooffer'),
(54, 22, 'placehastooffer'),
(54, 52, 'placehastooffer'),
(56, 6, 'placehastooffer'),
(56, 8, 'placehastooffer'),
(56, 17, 'placehastooffer'),
(56, 21, 'placehastooffer'),
(56, 69, 'describeyourapartment'),
(56, 75, 'safetydetails'),
(56, 79, 'describeyourapartment'),
(62, 6, 'placehastooffer'),
(62, 8, 'placehastooffer'),
(62, 17, 'placehastooffer'),
(62, 21, 'placehastooffer'),
(69, 54, 'placehastooffer'),
(69, 59, 'placehastooffer'),
(71, 8, 'placehastooffer'),
(71, 13, 'placehastooffer'),
(71, 17, 'placehastooffer'),
(71, 58, 'safetydetails'),
(71, 75, 'safetydetails'),
(71, 76, 'describeyourapartment'),
(71, 79, 'describeyourapartment'),
(72, 54, 'placehastooffer'),
(72, 55, 'placehastooffer'),
(72, 59, 'placehastooffer'),
(72, 60, 'placehastooffer'),
(72, 76, 'describeyourapartment'),
(72, 79, 'describeyourapartment');

-- --------------------------------------------------------

--
-- Table structure for table `property_availability`
--

CREATE TABLE `property_availability` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `minimumavailability` int(11) DEFAULT NULL,
  `maximumnights` int(11) DEFAULT NULL,
  `date` varchar(30) DEFAULT NULL,
  `advancenotice` varchar(50) DEFAULT NULL,
  `samedayadvancenotice` varchar(50) DEFAULT NULL,
  `preparationtime` varchar(255) DEFAULT NULL,
  `availabilitywindow` varchar(50) DEFAULT NULL,
  `start_time` varchar(30) DEFAULT NULL,
  `end_time` varchar(30) DEFAULT NULL,
  `restricted_checkin` varchar(255) DEFAULT NULL,
  `restricted_checkout` varchar(255) DEFAULT NULL,
  `price` varchar(200) DEFAULT NULL,
  `discount` varchar(200) DEFAULT NULL,
  `is_available` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_booking_settings`
--

CREATE TABLE `property_booking_settings` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `approve5booking` enum('yes','no') DEFAULT 'no',
  `instantbook` enum('yes','no') DEFAULT 'no'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `property_booking_settings`
--

INSERT INTO `property_booking_settings` (`id`, `property_id`, `approve5booking`, `instantbook`) VALUES
(19, 56, '', ''),
(24, 55, '', ''),
(26, 69, '', ''),
(30, 72, '', ''),
(32, 53, '', '');

-- --------------------------------------------------------

--
-- Table structure for table `property_cancellation_policy`
--

CREATE TABLE `property_cancellation_policy` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `standardpolicy` varchar(50) DEFAULT NULL,
  `longtermstaypolicy` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_checkin`
--

CREATE TABLE `property_checkin` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `starttime` varchar(50) DEFAULT NULL,
  `endtime` varchar(50) DEFAULT NULL,
  `checkouttime` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_checkout`
--

CREATE TABLE `property_checkout` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `starttime` varchar(50) DEFAULT NULL,
  `endtime` varchar(50) DEFAULT NULL,
  `checkouttime` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_descriptions`
--

CREATE TABLE `property_descriptions` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `peaceful` int(1) DEFAULT NULL,
  `unique_thing` int(1) DEFAULT NULL,
  `family_friendly` int(1) DEFAULT NULL,
  `stylish` int(1) DEFAULT NULL,
  `central` int(1) DEFAULT NULL,
  `spacious` int(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_description_details`
--

CREATE TABLE `property_description_details` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `listingdescription` text DEFAULT NULL,
  `yourproperty` text DEFAULT NULL,
  `guestaccessdetails` text DEFAULT NULL,
  `interactionwithguests` text DEFAULT NULL,
  `otherdetails` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_discounts`
--

CREATE TABLE `property_discounts` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `newlistingpromotion` varchar(10) DEFAULT NULL,
  `lastminutediscount` varchar(10) DEFAULT NULL,
  `weeklydiscount` varchar(10) DEFAULT NULL,
  `monthlydiscount` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `property_discounts`
--

INSERT INTO `property_discounts` (`id`, `property_id`, `newlistingpromotion`, `lastminutediscount`, `weeklydiscount`, `monthlydiscount`) VALUES
(28, 54, '0', '0', '0', '0'),
(30, 56, '0', '0', '0', '0'),
(31, 59, '0', '0', '0', '0'),
(32, 60, '0', '0', '0', '0'),
(33, 62, '0', '0', '0', '0'),
(34, 63, '0', '0', '0', '0'),
(35, 66, '0', '0', '0', '0'),
(39, 55, '0', '0', '0', '0'),
(41, 69, '0', '0', '0', '0'),
(42, 71, '0', '0', '0', '0'),
(46, 72, '0', '0', '0', '0'),
(48, 53, '20', '10', '0', '0');

-- --------------------------------------------------------

--
-- Table structure for table `property_houserules`
--

CREATE TABLE `property_houserules` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `petsallowed` tinyint(1) DEFAULT NULL,
  `eventsallowed` tinyint(1) DEFAULT NULL,
  `smokingallowed` tinyint(1) DEFAULT NULL,
  `quiethours` tinyint(1) DEFAULT NULL,
  `commercialphotographyallowed` tinyint(1) DEFAULT NULL,
  `checkincheckouttimes` tinyint(1) DEFAULT NULL,
  `additionalrules` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `property_images`
--

CREATE TABLE `property_images` (
  `image_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `caption` varchar(255) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `property_images`
--

INSERT INTO `property_images` (`image_id`, `property_id`, `image_url`, `is_primary`, `caption`, `uploaded_at`) VALUES
(90, 54, '/uploads/images/1758000529790.jpg', 1, NULL, '2025-09-16 05:28:53'),
(91, 54, '/uploads/images/1758000530668.jpg', 0, NULL, '2025-09-16 05:28:53'),
(92, 54, '/uploads/images/1758000531520.jpg', 0, NULL, '2025-09-16 05:28:53'),
(93, 54, '/uploads/images/1758000532681.jpg', 0, NULL, '2025-09-16 05:28:53'),
(94, 54, '/uploads/images/1758000533519.jpg', 0, NULL, '2025-09-16 05:28:53'),
(95, 55, '/uploads/images/1763549152842.jpg', 1, NULL, '2025-11-19 10:52:42'),
(96, 55, '/uploads/images/1763549152857.jpg', 0, NULL, '2025-11-19 10:52:42'),
(97, 55, '/uploads/images/1763549152883.jpg', 0, NULL, '2025-11-19 10:52:42'),
(98, 55, '/uploads/images/1763549152910.jpg', 0, NULL, '2025-11-19 10:52:42'),
(99, 55, '/uploads/images/1763549152934.jpg', 0, NULL, '2025-11-19 10:52:42'),
(100, 56, '/uploads/images/1763550880845.jpg', 1, NULL, '2025-11-19 11:14:41'),
(101, 56, '/uploads/images/1763550880863.jpg', 0, NULL, '2025-11-19 11:14:41'),
(102, 56, '/uploads/images/1763550880891.jpg', 0, NULL, '2025-11-19 11:14:41'),
(103, 56, '/uploads/images/1763550880923.jpg', 0, NULL, '2025-11-19 11:14:41'),
(104, 56, '/uploads/images/1763550880957.jpg', 0, NULL, '2025-11-19 11:14:41'),
(105, 62, '/uploads/images/1765958157798.jpg', 1, NULL, '2025-12-17 07:55:57'),
(106, 62, '/uploads/images/1765958157817.jpg', 0, NULL, '2025-12-17 07:55:57'),
(107, 72, '/uploads/new/places/1766475615529-3263.png', 1, NULL, '2025-12-23 07:40:59'),
(108, 72, '/uploads/new/places/1766475615534-4632.jpg', 0, NULL, '2025-12-23 07:40:59'),
(109, 72, '/uploads/new/places/1766475615535-4999.jpg', 0, NULL, '2025-12-23 07:40:59'),
(110, 72, '/uploads/new/places/1766475615540-414.jpg', 0, NULL, '2025-12-23 07:40:59'),
(111, 72, '/uploads/new/places/1766475619560-1430.jpg', 0, NULL, '2025-12-23 07:40:59');

-- --------------------------------------------------------

--
-- Table structure for table `property_safety`
--

CREATE TABLE `property_safety` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `securitycamera` enum('yes','no') DEFAULT 'no',
  `noicedecibel` enum('yes','no') DEFAULT 'no',
  `weapon` enum('yes','no') DEFAULT 'no'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `review_id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `reviewed_id` int(11) NOT NULL,
  `review_type` enum('guest_review','property_review') NOT NULL,
  `rating` tinyint(4) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `legal_name` varchar(200) NOT NULL,
  `email` varchar(100) NOT NULL,
  `dob` varchar(30) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password` varchar(200) NOT NULL,
  `otp` int(11) NOT NULL,
  `otp_expiry` varchar(30) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(13) NOT NULL DEFAULT '0',
  `profile_picture_url` varchar(255) DEFAULT NULL,
  `about` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `host_id` int(11) NOT NULL,
  `is_host` tinyint(1) DEFAULT 0,
  `primary_address` varchar(255) DEFAULT NULL,
  `alternate_address` int(255) DEFAULT NULL,
  `is_verified_email` tinyint(1) DEFAULT 0,
  `government_id` varchar(255) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `legal_name`, `email`, `dob`, `password_hash`, `password`, `otp`, `otp_expiry`, `phone_number`, `emergency_contact`, `profile_picture_url`, `about`, `created_at`, `updated_at`, `host_id`, `is_host`, `primary_address`, `alternate_address`, `is_verified_email`, `government_id`, `status`) VALUES
(1, 'yuvraj', 'Yashveer ', 'yashveersoni12345@gmail.com', '', '$2b$10$mCU8.5yUoFMOhKVIaadqhOh2C/29lEgW4pxQGOjwJUtHfAuFigujW', '123456', 487219, '2025-12-25 13:15:30.909', '9876543210', '9414454702', '/uploads/profile/1757938376764.jpg', 'test try by yuvi', '2025-06-30 11:48:42', '2025-12-25 07:35:30', 5, 0, 'Jaipur', 0, 0, NULL, 1),
(2, 'yuvraj singh', '0', 'test1@gmail.com', '', '$2b$10$JgKAjnX14mVPxhP2Q9VtwuvoQyn17vr3lsS880nEew.7px17uiV0e', '123456', 0, '', '7976929440', '0', NULL, NULL, '2025-07-10 05:57:58', '2025-07-10 05:57:58', 0, 0, NULL, NULL, 0, NULL, 1),
(3, 'yuvraj singh', '0', 'test2@gmail.com', '', '$2b$10$peDpIQm82ufbPQk8QxqWFeGgK3SuKwXoCI/yFFH7uXlzdcYjsd5uG', '123456', 0, '', '7676929440', '0', NULL, NULL, '2025-07-10 05:59:13', '2025-07-10 05:59:13', 0, 0, NULL, NULL, 0, NULL, 1),
(4, '', '0', 'officialyashveersoni@gmail.com', '', '', '', 808107, '2025-09-02 12:02:50.155', NULL, '0', NULL, NULL, '2025-08-06 07:41:41', '2025-09-02 06:22:50', 0, 0, NULL, NULL, 0, NULL, 1),
(5, '', '0', 'admin@gmail.com', '', '', '', 830499, '2025-08-06 16:54:40.794', NULL, '0', NULL, NULL, '2025-08-06 07:43:17', '2025-08-06 11:14:40', 0, 0, NULL, NULL, 0, NULL, 1),
(6, 'okk', '', 'Ys0219599@gmail.com', '', '', '', 380235, '2025-12-24 11:22:46.824', '9413857012', '0', '/uploads/profile/1765283685289.jpeg', 'tete', '2025-11-19 11:10:33', '2025-12-24 07:28:46', 9, 0, NULL, NULL, 0, NULL, 1),
(7, '', '', 'ys0219599@gmailcom', '', '', '', 393016, '2025-12-20 13:37:44.291', NULL, '0', NULL, NULL, '2025-11-25 06:07:03', '2025-12-20 09:34:39', 8, 0, NULL, NULL, 0, NULL, 1),
(8, '', '', 'ys02195599@gmail.com', '', '', '', 212754, '2025-12-05 12:08:50.665', NULL, '0', NULL, NULL, '2025-12-05 06:28:46', '2025-12-05 06:28:50', 0, 0, NULL, NULL, 0, NULL, 1),
(9, '', '', 'ys021259599@gmail.com', '', '', '', 466212, '2025-12-16 16:09:25.007', NULL, '0', NULL, NULL, '2025-12-16 10:29:21', '2025-12-16 10:29:25', 0, 0, NULL, NULL, 0, NULL, 1),
(10, '', '', 'ys0219599@gmai.com', '', '', '', 338419, '2025-12-20 11:53:37.654', NULL, '0', NULL, NULL, '2025-12-20 06:13:34', '2025-12-20 06:13:37', 0, 0, NULL, NULL, 0, NULL, 1),
(11, '', '', 'ys0219599@gmai.om', '', '', '', 471781, '2025-12-24 14:49:57.599', NULL, '0', NULL, NULL, '2025-12-24 09:09:54', '2025-12-24 09:09:57', 0, 0, NULL, NULL, 0, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_additional_info`
--

CREATE TABLE `user_additional_info` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `info_key` varchar(100) NOT NULL,
  `info_value` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_additional_info`
--

INSERT INTO `user_additional_info` (`id`, `user_id`, `info_key`, `info_value`, `created_at`, `updated_at`) VALUES
(4, 1, 'MyWork', 'Yashveer Soni', '2025-09-15 10:13:44', '2025-09-15 10:40:26'),
(5, 1, 'DreamDestination', 'Pratapnagar Jaipur samachar ', '2025-09-15 10:36:40', '2025-09-15 12:00:47'),
(6, 1, 'Pets', 'Dogesh Bhai', '2025-09-15 10:40:57', '2025-09-15 10:40:57'),
(7, 1, 'Location', 'Jaipur', '2025-09-15 10:48:29', '2025-09-15 10:48:29'),
(8, 1, 'Obsession', 'Hhjjjjj', '2025-09-15 10:48:47', '2025-09-15 10:48:47');

-- --------------------------------------------------------

--
-- Table structure for table `user_addresses`
--

CREATE TABLE `user_addresses` (
  `address_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `street_address` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) NOT NULL,
  `is_default` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_addresses`
--

INSERT INTO `user_addresses` (`address_id`, `user_id`, `street_address`, `city`, `state`, `postal_code`, `country`, `is_default`) VALUES
(1, 1, '', 'jhn', 'nklg', '332023', 'india', 0),
(2, 1, '', 'jhn', 'nklg', '332023', 'india', 0),
(3, 6, '', 'jaipur', 'raj', '332023', 'india', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `amenities`
--
ALTER TABLE `amenities`
  ADD PRIMARY KEY (`amenity_id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `guest_id` (`guest_id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`document_id`);

--
-- Indexes for table `favourites`
--
ALTER TABLE `favourites`
  ADD PRIMARY KEY (`user_id`,`property_id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `host_addresses`
--
ALTER TABLE `host_addresses`
  ADD PRIMARY KEY (`address_id`);

--
-- Indexes for table `host_profiles`
--
ALTER TABLE `host_profiles`
  ADD PRIMARY KEY (`host_id`);

--
-- Indexes for table `host_verifications`
--
ALTER TABLE `host_verifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `house_rules`
--
ALTER TABLE `house_rules`
  ADD PRIMARY KEY (`rule_id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `recipient_id` (`recipient_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `properties`
--
ALTER TABLE `properties`
  ADD PRIMARY KEY (`property_id`);

--
-- Indexes for table `property_addresses`
--
ALTER TABLE `property_addresses`
  ADD PRIMARY KEY (`address_id`);

--
-- Indexes for table `property_amenities`
--
ALTER TABLE `property_amenities`
  ADD PRIMARY KEY (`property_id`,`amenity_id`);

--
-- Indexes for table `property_availability`
--
ALTER TABLE `property_availability`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_booking_settings`
--
ALTER TABLE `property_booking_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `property_cancellation_policy`
--
ALTER TABLE `property_cancellation_policy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_checkin`
--
ALTER TABLE `property_checkin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_checkout`
--
ALTER TABLE `property_checkout`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_descriptions`
--
ALTER TABLE `property_descriptions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_description_details`
--
ALTER TABLE `property_description_details`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_discounts`
--
ALTER TABLE `property_discounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `property_houserules`
--
ALTER TABLE `property_houserules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `property_images`
--
ALTER TABLE `property_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `property_safety`
--
ALTER TABLE `property_safety`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `reviewer_id` (`reviewer_id`),
  ADD KEY `reviewed_id` (`reviewed_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_additional_info`
--
ALTER TABLE `user_additional_info`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD PRIMARY KEY (`address_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `amenities`
--
ALTER TABLE `amenities`
  MODIFY `amenity_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=80;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `host_addresses`
--
ALTER TABLE `host_addresses`
  MODIFY `address_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `host_profiles`
--
ALTER TABLE `host_profiles`
  MODIFY `host_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `host_verifications`
--
ALTER TABLE `host_verifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `house_rules`
--
ALTER TABLE `house_rules`
  MODIFY `rule_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `properties`
--
ALTER TABLE `properties`
  MODIFY `property_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `property_addresses`
--
ALTER TABLE `property_addresses`
  MODIFY `address_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `property_availability`
--
ALTER TABLE `property_availability`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property_booking_settings`
--
ALTER TABLE `property_booking_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `property_cancellation_policy`
--
ALTER TABLE `property_cancellation_policy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property_checkin`
--
ALTER TABLE `property_checkin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property_checkout`
--
ALTER TABLE `property_checkout`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property_descriptions`
--
ALTER TABLE `property_descriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `property_description_details`
--
ALTER TABLE `property_description_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property_discounts`
--
ALTER TABLE `property_discounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `property_houserules`
--
ALTER TABLE `property_houserules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `property_images`
--
ALTER TABLE `property_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `property_safety`
--
ALTER TABLE `property_safety`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_additional_info`
--
ALTER TABLE `user_additional_info`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `user_addresses`
--
ALTER TABLE `user_addresses`
  MODIFY `address_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `property_booking_settings`
--
ALTER TABLE `property_booking_settings`
  ADD CONSTRAINT `property_booking_settings_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`) ON DELETE CASCADE;

--
-- Constraints for table `property_discounts`
--
ALTER TABLE `property_discounts`
  ADD CONSTRAINT `property_discounts_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`) ON DELETE CASCADE;

--
-- Constraints for table `property_safety`
--
ALTER TABLE `property_safety`
  ADD CONSTRAINT `property_safety_ibfk_1` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
