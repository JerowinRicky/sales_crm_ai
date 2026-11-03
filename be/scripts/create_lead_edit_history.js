const { pool } = require('../src/config/database');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_edit_history (
        id INT(11) NOT NULL AUTO_INCREMENT,
        lead_id INT(11) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        field_label VARCHAR(100) DEFAULT NULL,
        old_value TEXT DEFAULT NULL,
        new_value TEXT DEFAULT NULL,
        changed_by INT(11) NOT NULL,
        changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_lead_edit_history_lead (lead_id),
        KEY idx_lead_edit_history_user (changed_by),
        KEY idx_lead_edit_history_time (changed_at),
        CONSTRAINT fk_lead_edit_history_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_lead_edit_history_user FOREIGN KEY (changed_by) REFERENCES users (id) ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('lead_edit_history table created successfully');
    const [desc] = await pool.query('DESCRIBE lead_edit_history');
    console.log(desc);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

