const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('Creating AI Gateway settings and history tables...');

    // 1. Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_gateway_settings (
        id INT(11) NOT NULL AUTO_INCREMENT,
        current_version INT(11) NOT NULL DEFAULT 1,

        -- LLM Provider & Parameters
        llm_provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
        llm_model VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-pro',
        llm_api_key TEXT DEFAULT NULL,
        llm_base_url VARCHAR(255) DEFAULT 'https://generativelanguage.googleapis.com',
        llm_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
        llm_max_tokens INT(11) NOT NULL DEFAULT 2048,
        llm_timeout_seconds INT(11) NOT NULL DEFAULT 30,
        llm_custom_headers TEXT DEFAULT NULL,

        -- WhatsApp Gateway
        whatsapp_provider VARCHAR(50) NOT NULL DEFAULT 'meta',
        whatsapp_phone_number_id VARCHAR(100) DEFAULT NULL,
        whatsapp_business_account_id VARCHAR(100) DEFAULT NULL,
        whatsapp_api_key TEXT DEFAULT NULL,
        whatsapp_api_endpoint VARCHAR(255) DEFAULT 'https://graph.facebook.com/v19.0',
        whatsapp_webhook_url VARCHAR(255) DEFAULT NULL,
        whatsapp_webhook_verify_token VARCHAR(255) DEFAULT NULL,

        -- Telephony & Voice Agent Gateway
        telephony_provider VARCHAR(50) NOT NULL DEFAULT 'exotel',
        telephony_account_sid VARCHAR(100) DEFAULT NULL,
        telephony_auth_token TEXT DEFAULT NULL,
        telephony_caller_id VARCHAR(50) DEFAULT NULL,
        telephony_base_url VARCHAR(255) DEFAULT 'https://api.exotel.com/v1',
        telephony_voice_id VARCHAR(100) DEFAULT 'en-IN-Wavenet-B',
        telephony_max_call_duration_seconds INT(11) NOT NULL DEFAULT 300,

        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT(11) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_ai_gateway_updated_by (updated_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Settings History Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_gateway_history (
        id INT(11) NOT NULL AUTO_INCREMENT,
        version INT(11) NOT NULL,
        section VARCHAR(50) NOT NULL DEFAULT 'all',
        changed_by INT(11) DEFAULT NULL,
        changed_by_name VARCHAR(100) NOT NULL DEFAULT 'System Admin',
        change_reason VARCHAR(255) DEFAULT 'Initial configuration setup',
        change_summary TEXT DEFAULT NULL,
        diff_details LONGTEXT DEFAULT NULL,
        snapshot LONGTEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_ai_history_version (version),
        KEY idx_ai_history_changed_by (changed_by),
        KEY idx_ai_history_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if initial row exists
    const [existing] = await pool.query('SELECT id, current_version FROM ai_gateway_settings LIMIT 1');
    if (existing.length === 0) {
      const [insertRes] = await pool.query(`
        INSERT INTO ai_gateway_settings (
          current_version,
          llm_provider,
          llm_model,
          llm_base_url,
          llm_temperature,
          llm_max_tokens,
          whatsapp_provider,
          whatsapp_api_endpoint,
          telephony_provider,
          telephony_base_url,
          telephony_caller_id,
          is_active
        ) VALUES (
          1,
          'gemini',
          'gemini-1.5-pro',
          'https://generativelanguage.googleapis.com',
          0.70,
          2048,
          'meta',
          'https://graph.facebook.com/v19.0',
          'exotel',
          'https://api.exotel.com/v1',
          '+919000000000',
          1
        )
      `);

      // Insert initial history record
      const initialSnapshot = {
        llm_provider: 'gemini',
        llm_model: 'gemini-1.5-pro',
        llm_base_url: 'https://generativelanguage.googleapis.com',
        llm_temperature: 0.70,
        llm_max_tokens: 2048,
        llm_timeout_seconds: 30,
        whatsapp_provider: 'meta',
        whatsapp_api_endpoint: 'https://graph.facebook.com/v19.0',
        telephony_provider: 'exotel',
        telephony_base_url: 'https://api.exotel.com/v1',
        telephony_caller_id: '+919000000000',
        telephony_max_call_duration_seconds: 300,
      };

      await pool.query(`
        INSERT INTO ai_gateway_history (
          version,
          section,
          changed_by,
          changed_by_name,
          change_reason,
          change_summary,
          diff_details,
          snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1,
        'all',
        1,
        'System Admin',
        'Initial system baseline configuration',
        'Initialized default production baseline with Gemini 1.5 Pro, Meta WhatsApp Cloud API, and Exotel Telephony.',
        JSON.stringify({ baseline: 'Initial installation' }),
        JSON.stringify(initialSnapshot),
      ]);

      console.log('✅ Default settings and baseline history v1 seeded.');
    }

    console.log('✅ AI Gateway tables created and verified successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
