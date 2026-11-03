-- Migration 004: Customer Groups hierarchy

CREATE TABLE IF NOT EXISTS customer_groups (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_group_members (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  group_id INT(11) NOT NULL,
  customer_id INT(11) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_group_customer (group_id, customer_id),
  KEY idx_group (group_id),
  KEY idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add group_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS group_id INT(11) NULL AFTER customer_type_id;

