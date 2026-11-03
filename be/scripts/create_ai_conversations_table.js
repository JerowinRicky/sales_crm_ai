const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('Creating ai_copilot_conversations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_copilot_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_updated (user_id, updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if conversation_id column exists in ai_copilot_messages
    const [cols] = await pool.query("SHOW COLUMNS FROM ai_copilot_messages LIKE 'conversation_id'");
    if (cols.length === 0) {
      console.log('Adding conversation_id column to ai_copilot_messages...');
      await pool.query(`
        ALTER TABLE ai_copilot_messages 
        ADD COLUMN conversation_id INT NULL AFTER user_id,
        ADD INDEX idx_conversation_id (conversation_id);
      `);
    }

    console.log('ai_copilot_conversations migration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit();
  }
}

migrate();

