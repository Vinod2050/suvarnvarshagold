-- Suvarnavarsha Gold - complete database setup in ONE file (tables + starting content).
-- Only needed if the app cannot create its tables by itself on start (see DEPLOY-GODADDY.md).
-- Import into the EMPTY hosted database (phpMyAdmin / database console -> Import). Safe to run again:
-- tables are created only if missing and rows use INSERT IGNORE, so nothing is duplicated or overwritten.
-- No accounts are in this file (see DEPLOY-GODADDY.md: SUPERADMIN_PASSWORD / ADMIN_PASSWORD settings).
-- Made from database/schema.sql + database/seed.sql; if you change those, rebuild this file.


-- Suvarnavarsha Gold website - database tables (MySQL 8 / MariaDB 10.6+)
-- Import once: GoDaddy cPanel -> phpMyAdmin -> choose the database -> Import -> this file, then seed.sql.
-- Safe to import again: every table is created only if it does not exist.
-- All DATETIME values are UTC; DATE values (effective_date) are Indian calendar dates.

SET NAMES utf8mb4;

-- Admin users (passwords are bcrypt hashes). Older databases get the role / failed_attempts / last_failed_at / locked_at
-- columns added on start by src/config/migrate.js.
CREATE TABLE IF NOT EXISTS admin_users (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL,
  password_hash  VARCHAR(100) NOT NULL,
  display_name   VARCHAR(100) NOT NULL DEFAULT '',
  role           ENUM('superadmin','admin') NOT NULL DEFAULT 'admin',  -- superadmin: everything incl. users and settings
  status         ENUM('active','disabled') NOT NULL DEFAULT 'active',
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,   -- wrong passwords in a row
  last_failed_at DATETIME NULL,                     -- time of the last wrong password (for the wait timers)
  locked_at      DATETIME NULL,                     -- set after 8 wrong passwords in a row; a super admin unlocks
  last_login_at  DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gold and silver rates. Every save is a new row (history); the website shows the newest row
-- whose effective_date is today or earlier.
CREATE TABLE IF NOT EXISTS gold_rates (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  effective_date  DATE NOT NULL,
  gold_24k        DECIMAL(10,2) NOT NULL,         -- Rs per gram, 24K (999)
  gold_22k        DECIMAL(10,2) NOT NULL,         -- Rs per gram
  gold_18k        DECIMAL(10,2) NULL,             -- Rs per gram, optional
  silver_kg       DECIMAL(12,2) NULL,             -- Rs per kg, optional
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_rates_effective (effective_date, id),
  CONSTRAINT fk_rates_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_rates_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advertisement videos (YouTube links only)
CREATE TABLE IF NOT EXISTS advertisements (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  youtube_id      CHAR(11) NOT NULL,
  is_short        TINYINT(1) NOT NULL DEFAULT 0,  -- upright (Shorts) video
  title_en        VARCHAR(150) NOT NULL,
  title_mr        VARCHAR(150) NOT NULL DEFAULT '',
  description_en  VARCHAR(500) NOT NULL DEFAULT '',
  description_mr  VARCHAR(500) NOT NULL DEFAULT '',
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order      INT NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_ads_status (status, sort_order, id),
  CONSTRAINT fk_ads_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_ads_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer feedback videos (YouTube). Shown only when approved AND the customer gave consent.
CREATE TABLE IF NOT EXISTS customer_feedback (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_name   VARCHAR(100) NOT NULL,
  youtube_id      CHAR(11) NOT NULL,
  is_short        TINYINT(1) NOT NULL DEFAULT 0,
  title_en        VARCHAR(150) NOT NULL DEFAULT '',
  title_mr        VARCHAR(150) NOT NULL DEFAULT '',
  consent         TINYINT(1) NOT NULL DEFAULT 0,  -- customer agreed to be shown on the website
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  sort_order      INT NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_feedback_status (status, sort_order, id),
  CONSTRAINT fk_feedback_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store products: 24K coins, bars, Vedhani. No prices (customers ask on WhatsApp).
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40) NOT NULL,
  category        ENUM('coin','bar','biscuit') NOT NULL,
  weight_grams    DECIMAL(8,3) NOT NULL,
  image           VARCHAR(255) NOT NULL DEFAULT '',  -- web path, e.g. /uploads/products/ab12.webp
  name_en         VARCHAR(150) NOT NULL,
  name_mr         VARCHAR(150) NOT NULL DEFAULT '',
  description_en  VARCHAR(1000) NOT NULL DEFAULT '',
  description_mr  VARCHAR(1000) NOT NULL DEFAULT '',
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order      INT NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_code (code),
  KEY ix_products_status (status, category, sort_order, id),
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Frequently asked questions, in English and Marathi
CREATE TABLE IF NOT EXISTS faqs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category        ENUM('selling','pledged','buying','general') NOT NULL DEFAULT 'general',
  question_en     VARCHAR(300) NOT NULL,
  answer_en       TEXT NOT NULL,
  question_mr     VARCHAR(300) NOT NULL DEFAULT '',
  answer_mr       TEXT NULL,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order      INT NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_faqs_status (status, sort_order, id),
  CONSTRAINT fk_faqs_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_faqs_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Website settings (business name, phones, address, links, hours, switches)
CREATE TABLE IF NOT EXISTS website_settings (
  skey            VARCHAR(50) NOT NULL PRIMARY KEY,
  svalue          TEXT NOT NULL,
  updated_by      INT UNSIGNED NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What admins did (shown on the dashboard)
CREATE TABLE IF NOT EXISTS activity_logs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id        INT UNSIGNED NULL,
  action          VARCHAR(30) NOT NULL,          -- create, update, delete, status, login, logout, password
  entity          VARCHAR(30) NOT NULL,          -- gold_rate, advertisement, feedback, product, faq, settings, account
  entity_id       INT UNSIGNED NULL,
  details         VARCHAR(300) NOT NULL DEFAULT '',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_activity_created (created_at),
  KEY ix_activity_admin (admin_id),
  CONSTRAINT fk_activity_admin FOREIGN KEY (admin_id) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed sign-ins per device (at most 20 wrong tries in 15 minutes)
CREATE TABLE IF NOT EXISTS login_attempts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_hash         CHAR(64) NOT NULL,
  username        VARCHAR(50) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_attempts_ip (ip_hash, created_at),
  KEY ix_attempts_user (username, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin login sessions (used by express-mysql-session)
CREATE TABLE IF NOT EXISTS sessions (
  session_id      VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires         INT UNSIGNED NOT NULL,
  data            MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  KEY ix_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Uploaded images (logo, product photos). Kept in the database, not on disk, so they survive every new
-- ZIP upload on hosting where the app folder is replaced. Served at /uploads/<path>.
CREATE TABLE IF NOT EXISTS uploaded_files (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  path            VARCHAR(255) NOT NULL,          -- e.g. products/ab12cd34.webp
  mime            VARCHAR(50) NOT NULL,
  data            MEDIUMBLOB NOT NULL,            -- up to 2 MB (checked on upload)
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_uploaded_path (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===================== starting content =====================

-- Suvarnavarsha Gold website - starting content (after schema.sql).
-- Safe to import again: rows use fixed ids / keys with INSERT IGNORE, so nothing is duplicated or overwritten.
--
-- The app runs this file by itself on start (see src/config/migrate.js); importing it by hand is not needed.
-- No admin or password is stored here. The first admin comes from the ADMIN_PASSWORD hosting setting
-- (see src/config/migrate.js) or `npm run create-admin`.
--
-- Content below is the client's real content from the current website. Test-only rows (sample
-- videos) are in sample-data.sql, which must never be imported on the live site.

SET NAMES utf8mb4;


INSERT IGNORE INTO website_settings (skey, svalue) VALUES
  ('business_name_en', 'Suvarnavarsha Gold'),
  ('business_name_mr', 'सुवर्णवर्षा गोल्ड'),
  ('company_name_en', 'Suvarnavarsha Gold Ventures Pvt. Ltd.'),
  ('company_name_mr', 'सुवर्णवर्षा गोल्ड व्हेंचर्स प्रा. लि.'),
  ('logo_path', '/logo/suvarnavarsha-logo-v2-transparent-384.webp'),
  ('phone_primary', '8805942424'),
  ('phone_secondary', '8805982424'),
  ('whatsapp_number', '918805942424'),
  ('email', ''),
  ('address_en', 'Second Floor – 239, VTP Altitude, Near Shell Petrol Pump, Dange Chowk, Pune – 411033, Maharashtra'),
  ('address_mr', 'दुसरा मजला – 239, व्हीटीपी अल्टिट्यूड, शेल पेट्रोल पंपाजवळ, डांगे चौक, पुणे – 411033, महाराष्ट्र'),
  ('map_link', 'https://www.google.com/maps/search/?api=1&query=VTP+Altitude+Dange+Chowk+Pune+411033'),
  ('map_embed_url', 'https://www.google.com/maps?q=VTP+Altitude,+Dange+Chowk,+Pune+411033&output=embed'),
  ('hours_en', ''),
  ('hours_mr', ''),
  ('facebook_url', ''),
  ('instagram_url', ''),
  ('youtube_url', ''),
  ('show_silver', '1'),
  ('show_18k', '1'),
  ('saturday_offer_active', '1');

-- Sample rate so the rate block is not empty on day one. Enter the real rate in the admin panel before launch.
INSERT IGNORE INTO gold_rates (id, effective_date, gold_24k, gold_22k, gold_18k, silver_kg) VALUES
  (1, '2026-10-15', 12650.00, 11450.00, 9375.00, 155000.00);

-- The client's 10 g coin (from the current website)
INSERT IGNORE INTO products (id, code, category, weight_grams, image, name_en, name_mr, description_en, description_mr, status, sort_order) VALUES
  (1, 'SG-C-010', 'coin', 10.000, '/images/media/lakshmi-ganesha-coins-800x533.webp',
   '24K Gold Coin, 10 g', '24 कॅरेट सोन्याचे नाणे, 10 ग्रॅम',
   'A 10 g 24K (999) Lakshmi and Ganesha coin. BIS Hallmark and HUID certified.',
   'लक्ष्मी आणि गणपतीचे 10 ग्रॅम 24 कॅरेट (999) सोन्याचे नाणे. BIS हॉलमार्क आणि HUID प्रमाणित.',
   'active', 10);

-- FAQs (same questions and answers as the current website)
INSERT IGNORE INTO faqs (id, category, question_en, answer_en, question_mr, answer_mr, status, sort_order) VALUES
  (1, 'selling', 'Which documents do I need to sell gold?',
   'Please carry a valid government photo identity proof such as your Aadhaar card. For higher-value transactions the law may also require your PAN. Our team will confirm the exact documents when you call.',
   'सोने विकण्यासाठी कोणती कागदपत्रे लागतात?',
   'कृपया आधार कार्डसारखा वैध सरकारी फोटो ओळखपत्र सोबत आणा. मोठ्या रकमेच्या व्यवहारासाठी कायद्यानुसार पॅन कार्डही लागू शकते. तुम्ही कॉल केल्यावर आमची टीम नेमकी कागदपत्रे सांगेल.',
   'active', 10),
  (2, 'selling', 'How is the price of my gold calculated?',
   'Price = weight × purity × today’s rate. We weigh your gold and test its purity in front of you, then calculate the value using the day’s rate.',
   'माझ्या सोन्याची किंमत कशी ठरते?',
   'किंमत = वजन × शुद्धता × आजचा दर. आम्ही तुमच्या समोर सोन्याचे वजन करतो आणि शुद्धता तपासतो, त्यानंतर त्या दिवसाच्या दराने किंमत काढतो.',
   'active', 20),
  (3, 'selling', 'How do you test the purity?',
   'We use a German-technology purity testing machine. The test is done in front of you, so you can see the result yourself.',
   'शुद्धता कशी तपासली जाते?',
   'आम्ही जर्मन तंत्रज्ञानाच्या मशीनने शुद्धता तपासतो. तपासणी तुमच्या समोरच होते, त्यामुळे निकाल तुम्ही स्वतः पाहू शकता.',
   'active', 30),
  (4, 'selling', 'Is there any charge for valuation or testing?',
   'No. Valuation and purity testing are free. You are under no obligation to sell after the test.',
   'मूल्यांकन किंवा तपासणीसाठी काही शुल्क आहे का?',
   'नाही. मूल्यांकन आणि शुद्धता तपासणी मोफत आहे. तपासणीनंतर विक्री करणे बंधनकारक नाही.',
   'active', 40),
  (5, 'selling', 'How soon will I get my payment?',
   'Once you accept the price, payment is made in about 5 minutes by bank transfer, or in cash within the limits allowed by law.',
   'पैसे किती वेळात मिळतात?',
   'तुम्ही किंमत मान्य केल्यावर सुमारे 5 मिनिटांत बँक ट्रान्सफरने, किंवा कायद्याने परवानगी असलेल्या मर्यादेत रोख स्वरूपात पैसे दिले जातात.',
   'active', 50),
  (6, 'selling', 'Which karat gold do you buy?',
   'We buy gold of any karat: jewellery, coins and bars, including old or broken items.',
   'तुम्ही कोणत्या कॅरेटचे सोने खरेदी करता?',
   'आम्ही कोणत्याही कॅरेटचे सोने खरेदी करतो: दागिने, नाणी आणि बार, जुने किंवा तुटलेले असले तरी.',
   'active', 60),
  (7, 'selling', 'Can I sell gold without the purchase bill?',
   'Yes. The purchase bill is not mandatory, but a valid identity proof is required.',
   'खरेदीचे बिल नसताना सोने विकता येते का?',
   'होय. खरेदीचे बिल बंधनकारक नाही, परंतु वैध ओळखपत्र आवश्यक आहे.',
   'active', 70),
  (8, 'selling', 'Do you also buy silver?',
   'Yes, we buy old silver as well. The process is the same: testing, weighing and payment as per the day’s rate.',
   'तुम्ही चांदीही खरेदी करता का?',
   'होय, आम्ही जुनी चांदीही खरेदी करतो. प्रक्रिया तीच आहे: तपासणी, वजन आणि त्या दिवसाच्या दराने पेमेंट.',
   'active', 80),
  (9, 'pledged', 'My gold is pledged with a bank. Can you help?',
   'Yes. We pay the outstanding amount to the lender so that your gold is released. The gold is then tested and weighed in front of you, and you receive the balance amount.',
   'माझे सोने बँकेत गहाण आहे. तुम्ही मदत करू शकता का?',
   'होय. आम्ही कर्जाची थकबाकी संबंधित संस्थेला भरतो, त्यामुळे तुमचे सोने सुटते. त्यानंतर सोने तुमच्या समोर तपासले व वजन केले जाते आणि उरलेली रक्कम तुम्हाला मिळते.',
   'active', 90),
  (10, 'buying', 'What gold can I buy from you?',
   'We sell 24K gold coins, bars and Vedhani from 0.5 g to 100 g, certified with BIS Hallmark and HUID. Stock is limited, so please register in advance. Registration is free.',
   'तुमच्याकडून कोणते सोने खरेदी करता येते?',
   'आम्ही 0.5 ग्रॅम ते 100 ग्रॅमपर्यंत 24 कॅरेट सोन्याची नाणी, बार आणि वेढणी विकतो. ती BIS हॉलमार्क आणि HUID प्रमाणित आहेत. साठा मर्यादित असल्याने कृपया आधी नोंदणी करा. नोंदणी मोफत आहे.',
   'active', 100),
  (11, 'general', 'Are the rates shown on the website final?',
   'The rates are indicative and are updated by our team. The final price is decided at the branch after purity testing and weighing.',
   'वेबसाइटवर दाखवलेले दर अंतिम असतात का?',
   'हे दर सूचक आहेत आणि आमची टीम ते अपडेट करते. अंतिम किंमत शाखेत शुद्धता तपासणी आणि वजनानंतर ठरते.',
   'active', 110),
  (12, 'general', 'Is there gold that you do not accept?',
   'We do not accept stolen or fake gold, and such cases are reported to the authorities. Persons below 18 years of age cannot sell gold.',
   'असे कोणते सोने आहे जे तुम्ही स्वीकारत नाही?',
   'आम्ही चोरीचे किंवा बनावट सोने स्वीकारत नाही आणि अशा प्रकरणांची माहिती अधिकाऱ्यांना दिली जाते. 18 वर्षांखालील व्यक्ती सोने विकू शकत नाही.',
   'active', 120);
