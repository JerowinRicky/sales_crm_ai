require('dotenv').config();
const { pool } = require('../config/database');

async function migrate() {
  console.log('Running AI token analytics migration...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_token_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      default_user_quota INT NOT NULL DEFAULT 50000,
      default_quota_period ENUM('daily', 'weekly', 'monthly', 'total') NOT NULL DEFAULT 'monthly',
      enforce_quotas TINYINT(1) NOT NULL DEFAULT 1,
      warning_threshold_pct INT NOT NULL DEFAULT 80,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [sRows] = await pool.query('SELECT id FROM ai_token_settings LIMIT 1');
  if (sRows.length === 0) {
    await pool.query(
      "INSERT INTO ai_token_settings (default_user_quota, default_quota_period, enforce_quotas, warning_threshold_pct) VALUES (50000, 'monthly', 1, 80)"
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_user_quotas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      token_quota INT NOT NULL DEFAULT 50000,
      quota_period ENUM('daily', 'weekly', 'monthly', 'total') NOT NULL DEFAULT 'monthly',
      is_restricted TINYINT(1) NOT NULL DEFAULT 1,
      is_blocked TINYINT(1) NOT NULL DEFAULT 0,
      tokens_used_current_period INT NOT NULL DEFAULT 0,
      last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_token_usage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      conversation_id INT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
      model VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-pro',
      prompt_tokens INT NOT NULL DEFAULT 0,
      completion_tokens INT NOT NULL DEFAULT 0,
      total_tokens INT NOT NULL DEFAULT 0,
      query_type VARCHAR(50) NOT NULL DEFAULT 'copilot',
      status VARCHAR(20) NOT NULL DEFAULT 'success',
      estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_date (user_id, created_at),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Backfill if empty
  const [existingUsage] = await pool.query('SELECT COUNT(*) as count FROM ai_token_usage');
  if (existingUsage[0].count === 0) {
    const [msgs] = await pool.query("SELECT m.id, m.user_id, m.conversation_id, m.message, m.query_type, m.created_at FROM ai_copilot_messages m WHERE m.role = 'assistant'");
    for (const m of msgs) {
      const compTokens = Math.max(25, Math.ceil((m.message || '').length / 4));
      const promptTokens = Math.floor(compTokens * 1.8) + 120;
      const totalTokens = promptTokens + compTokens;
      await pool.query(
        "INSERT INTO ai_token_usage (user_id, conversation_id, provider, model, prompt_tokens, completion_tokens, total_tokens, query_type, status, estimated_cost, created_at) VALUES (?, ?, 'gemini', 'gemini-1.5-pro', ?, ?, ?, ?, 'success', ?, ?)",
        [m.user_id, m.conversation_id, promptTokens, compTokens, totalTokens, m.query_type || 'copilot', totalTokens * 0.0000015, m.created_at]
      );
    }
  }

  // Ensure all active users have quotas initialized
  const [users] = await pool.query('SELECT id FROM users WHERE is_active = 1');
  for (const u of users) {
    const [usage] = await pool.query('SELECT COALESCE(SUM(total_tokens), 0) as total FROM ai_token_usage WHERE user_id = ?', [u.id]);
    await pool.query(
      "INSERT INTO ai_user_quotas (user_id, token_quota, quota_period, is_restricted, is_blocked, tokens_used_current_period) VALUES (?, 50000, 'monthly', 1, 0, ?) ON DUPLICATE KEY UPDATE tokens_used_current_period = VALUES(tokens_used_current_period)",
      [u.id, usage[0].total]
    );
  }

  console.log('✅ AI Token Analytics tables created & synced successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
