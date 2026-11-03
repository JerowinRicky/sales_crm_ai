const { pool } = require('../src/config/database');

async function migrateMailTables() {
  try {
    // 1. mail_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mail_settings (
        id INT(11) NOT NULL AUTO_INCREMENT,
        provider VARCHAR(50) DEFAULT 'smtp',
        smtp_host VARCHAR(255) DEFAULT '',
        smtp_port INT(11) DEFAULT 587,
        smtp_secure BOOLEAN DEFAULT FALSE,
        smtp_user VARCHAR(255) DEFAULT '',
        smtp_pass VARCHAR(255) DEFAULT '',
        from_name VARCHAR(150) DEFAULT 'SalesCRM Notifications',
        from_email VARCHAR(255) DEFAULT '',
        daily_reminder_time VARCHAR(10) DEFAULT '09:00',
        enable_daily_reminder BOOLEAN DEFAULT TRUE,
        enable_notification_mail BOOLEAN DEFAULT TRUE,
        max_retries INT(11) DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ mail_settings table ready');

    // Seed default settings row if none exists
    const [existingSettings] = await pool.query('SELECT id FROM mail_settings LIMIT 1');
    if (!existingSettings.length) {
      await pool.query(`
        INSERT INTO mail_settings 
        (provider, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_name, from_email, daily_reminder_time, enable_daily_reminder, enable_notification_mail, max_retries)
        VALUES 
        ('smtp', 'smtp.gmail.com', 587, FALSE, '', '', 'SalesCRM Notifications', 'notifications@crm.com', '09:00', TRUE, TRUE, 3)
      `);
      console.log('✅ Default mail_settings seeded');
    }

    // 2. mail_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mail_logs (
        id INT(11) NOT NULL AUTO_INCREMENT,
        uuid VARCHAR(36) NOT NULL UNIQUE,
        mail_type VARCHAR(50) NOT NULL DEFAULT 'notification',
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(150) DEFAULT NULL,
        user_id INT(11) DEFAULT NULL,
        lead_id INT(11) DEFAULT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT DEFAULT NULL,
        body_text TEXT DEFAULT NULL,
        status ENUM('queued', 'sending', 'sent', 'failed', 'retrying') DEFAULT 'queued',
        attempt_count INT(11) DEFAULT 0,
        max_attempts INT(11) DEFAULT 3,
        error_message TEXT DEFAULT NULL,
        last_attempt_at TIMESTAMP NULL DEFAULT NULL,
        sent_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_mail_logs_status (status),
        KEY idx_mail_logs_created (created_at),
        KEY idx_mail_logs_recipient (recipient_email),
        KEY idx_mail_logs_type (mail_type),
        CONSTRAINT fk_mail_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_mail_logs_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ mail_logs table ready');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateMailTables();
