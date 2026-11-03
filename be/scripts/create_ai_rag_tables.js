const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('Creating AI RAG, Lead Intelligence, and Copilot Chat tables...');

    // 1. RAG Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_rag_settings (
        id INT(11) NOT NULL AUTO_INCREMENT,
        enable_rag TINYINT(1) NOT NULL DEFAULT 1,
        grounding_strictness VARCHAR(50) NOT NULL DEFAULT 'strict_crm_only',
        enable_hot_lead_identification TINYINT(1) NOT NULL DEFAULT 1,
        enable_next_engagement_recommendation TINYINT(1) NOT NULL DEFAULT 1,
        enable_qualification_reasoning TINYINT(1) NOT NULL DEFAULT 1,
        enable_external_company_search TINYINT(1) NOT NULL DEFAULT 1,
        external_search_provider VARCHAR(50) NOT NULL DEFAULT 'duckduckgo',
        external_search_api_key TEXT DEFAULT NULL,
        max_context_leads INT(11) NOT NULL DEFAULT 30,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Lead Intelligence Table (Precomputed & on-demand insights with outside company data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_lead_intelligence (
        id INT(11) NOT NULL AUTO_INCREMENT,
        lead_id INT(11) NOT NULL,
        lead_score INT(11) NOT NULL DEFAULT 70,
        is_hot_lead TINYINT(1) NOT NULL DEFAULT 0,
        hot_lead_reason TEXT DEFAULT NULL,
        qualification_status ENUM('interested', 'not_interested', 'pending', 'unqualified') NOT NULL DEFAULT 'pending',
        interest_reason TEXT DEFAULT NULL,
        next_engagement_action VARCHAR(255) DEFAULT NULL,
        next_engagement_timing VARCHAR(150) DEFAULT NULL,
        company_external_summary TEXT DEFAULT NULL,
        company_industry_tags VARCHAR(255) DEFAULT NULL,
        external_sources LONGTEXT DEFAULT NULL,
        last_analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_lead_intelligence_lead (lead_id),
        KEY idx_lead_intelligence_hot (is_hot_lead),
        KEY idx_lead_intelligence_status (qualification_status),
        CONSTRAINT fk_lead_intelligence_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. AI Copilot Chat Messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_copilot_messages (
        id INT(11) NOT NULL AUTO_INCREMENT,
        user_id INT(11) NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        query_type VARCHAR(50) NOT NULL DEFAULT 'custom',
        message TEXT NOT NULL,
        context_lead_ids TEXT DEFAULT NULL,
        structured_payload LONGTEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_copilot_user_time (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default RAG settings if not present
    const [existing] = await pool.query('SELECT id FROM ai_rag_settings LIMIT 1');
    if (existing.length === 0) {
      await pool.query(`
        INSERT INTO ai_rag_settings (
          enable_rag,
          grounding_strictness,
          enable_hot_lead_identification,
          enable_next_engagement_recommendation,
          enable_qualification_reasoning,
          enable_external_company_search,
          external_search_provider,
          max_context_leads
        ) VALUES (1, 'strict_crm_only', 1, 1, 1, 1, 'duckduckgo', 30)
      `);
      console.log('✅ Default AI RAG settings seeded.');
    }

    console.log('✅ AI RAG and Copilot database tables verified successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();

