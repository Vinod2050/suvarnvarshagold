-- Suvarnavarsha Gold website - database tables (MySQL 8 / MariaDB 10.6+)
-- Import once: GoDaddy cPanel -> phpMyAdmin -> choose the database -> Import -> this file, then seed.sql.
-- Safe to import again: every table is created only if it does not exist.
-- All DATETIME values are UTC; DATE values (effective_date) are Indian calendar dates.

SET NAMES utf8mb4;

-- Admin users (passwords are bcrypt hashes; the first admin is created on the setup screen or with npm run create-admin)
CREATE TABLE IF NOT EXISTS admin_users (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL,
  password_hash  VARCHAR(100) NOT NULL,
  display_name   VARCHAR(100) NOT NULL DEFAULT '',
  status         ENUM('active','disabled') NOT NULL DEFAULT 'active',
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

-- Failed sign-ins, for the 15-minute lock after 5 wrong tries
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
