-- Migration 005: Password Resets OTP table

CREATE TABLE IF NOT EXISTS password_resets (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  is_used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_email_otp (email, otp),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

