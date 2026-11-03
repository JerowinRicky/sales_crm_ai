const { pool } = require('../src/config/database');

async function migrateMailTemplates() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mail_templates (
        id INT(11) NOT NULL AUTO_INCREMENT,
        template_key VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        placeholders TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ mail_templates table ready');

    const defaultTemplates = [
      {
        template_key: 'notification',
        name: 'Lead Push Notification',
        description: 'Sent to a salesperson when an admin pushes an urgent alert or update regarding a lead.',
        subject: '[SalesCRM Alert] {{title}}',
        placeholders: '{{title}}, {{lead_title}}, {{salesperson_name}}, {{sender_name}}, {{message}}, {{lead_url}}',
        body_html: `<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #2563eb; margin-top: 0;">{{title}}</h2>
  <p>Hello <strong>{{salesperson_name}}</strong>,</p>
  <p>Admin <strong>{{sender_name}}</strong> has pushed an update regarding lead <strong>{{lead_title}}</strong>:</p>
  <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; font-size: 14px; border-radius: 4px; line-height: 1.5;">
    {{message}}
  </div>
  <p style="font-size: 13px; color: #64748b;">
    Please sign in to your SalesCRM portal to review and take action.
  </p>
</div>`,
      },
      {
        template_key: 'daily_schedule',
        name: 'Daily Morning Lead Schedule (09:00 AM)',
        description: 'Sent everyday at 09:00 AM with active leads having scheduled Next Visits and Target Closing Dates.',
        subject: '[Daily Digest] Lead Visits & Closing Schedule - {{date}}',
        placeholders: '{{salesperson_name}}, {{date}}, {{leads_table}}, {{total_leads}}',
        body_html: `<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 680px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="color: #1e293b; margin: 0;">SalesCRM Morning Lead Schedule</h2>
    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">{{date}} — 09:00 AM Daily Briefing</p>
  </div>
  <p>Hello <strong>{{salesperson_name}}</strong>,</p>
  <p>Here is your daily overview of active leads with upcoming <strong>Next Visits</strong> and <strong>Target Closing Dates</strong>. Please review and ensure timely follow-ups:</p>
  {{leads_table}}
  <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
    This email was generated automatically by the SalesCRM Morning Reminder Engine.
  </p>
</div>`,
      },
      {
        template_key: 'test',
        name: 'SMTP Connection Test Email',
        description: 'Sent when the admin tests SMTP connectivity and diagnostics.',
        subject: '[SalesCRM Test] SMTP Configuration Verified - {{date}}',
        placeholders: '{{smtp_host}}, {{smtp_port}}, {{from_name}}, {{from_email}}, {{date}}',
        body_html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; line-height: 1.6;">
  <h2 style="color: #2563eb; margin-top: 0;">SalesCRM Mail Configuration Test</h2>
  <p>Congratulations! Your outgoing SMTP email server settings are working properly.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
    <strong>Configuration Details:</strong>
    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
      <li>SMTP Host: <code>{{smtp_host}}</code></li>
      <li>Port: <code>{{smtp_port}}</code></li>
      <li>From Name: {{from_name}}</li>
      <li>From Email: {{from_email}}</li>
      <li>Verified At: {{date}}</li>
    </ul>
  </div>
  <p style="font-size: 12px; color: #64748b;">Sent automatically by SalesCRM System Admin.</p>
</div>`,
      },
      {
        template_key: 'closing_reminder',
        name: 'Lead Target Closing Date Alert',
        description: 'Alert sent when a lead closing date is approaching or overdue.',
        subject: '[Action Required] Target Closing Date Alert: {{lead_title}}',
        placeholders: '{{salesperson_name}}, {{lead_title}}, {{closing_date}}, {{stage_name}}, {{estimated_value}}, {{customer_company}}',
        body_html: `<div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #f59e0b; border-radius: 8px;">
  <h2 style="color: #d97706; margin-top: 0;">Target Closing Date Reminder</h2>
  <p>Hello <strong>{{salesperson_name}}</strong>,</p>
  <p>This is a reminder that the expected closing date for lead <strong>{{lead_title}}</strong> is set for <strong>{{closing_date}}</strong>.</p>
  <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 12px 14px; border-radius: 6px; margin: 14px 0; font-size: 13px;">
    <div><strong>Customer:</strong> {{customer_company}}</div>
    <div><strong>Current Stage:</strong> {{stage_name}}</div>
    <div><strong>Estimated Deal Value:</strong> {{estimated_value}}</div>
  </div>
  <p style="font-size: 13px; color: #64748b;">Please review the pipeline and log your latest activity or meeting notes.</p>
</div>`,
      },
    ];

    for (const t of defaultTemplates) {
      await pool.query(
        `INSERT INTO mail_templates (template_key, name, description, subject, body_html, placeholders)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), placeholders = VALUES(placeholders)`,
        [t.template_key, t.name, t.description, t.subject, t.body_html, t.placeholders]
      );
    }
    console.log('✅ Default mail templates initialized');
    process.exit(0);
  } catch (err) {
    console.error('❌ Template migration error:', err);
    process.exit(1);
  }
}

migrateMailTemplates();

