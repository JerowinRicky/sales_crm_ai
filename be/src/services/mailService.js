const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

const DEFAULT_TEMPLATES = {
  notification: {
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
  daily_schedule: {
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
  <p>Here is your daily overview of active leads with upcoming <strong>Next Visits</strong> and <strong>Target Closing Dates</strong>. Total pending leads: <strong>{{total_leads}}</strong>.</p>
  {{leads_table}}
  <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
    This email was generated automatically by the SalesCRM Morning Reminder Engine.
  </p>
</div>`,
  },
  test: {
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
  closing_reminder: {
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
};

function renderTemplateString(str, data = {}) {
  if (!str) return '';
  return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return data[key] !== undefined && data[key] !== null ? data[key] : match;
  });
}

async function getTemplateByKey(key) {
  try {
    const [rows] = await pool.query('SELECT * FROM mail_templates WHERE template_key = ?', [key]);
    if (rows && rows.length) {
      return rows[0];
    }
  } catch (err) {
    console.error('Error fetching template from DB:', err.message);
  }
  return DEFAULT_TEMPLATES[key] || null;
}

// Retrieve mail settings from database
async function getMailSettings() {
  const [rows] = await pool.query('SELECT * FROM mail_settings ORDER BY id ASC LIMIT 1');
  if (!rows.length) {
    // Fallback default
    return {
      provider: 'smtp',
      smtp_host: '',
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: '',
      smtp_pass: '',
      from_name: 'SalesCRM Notifications',
      from_email: 'notifications@crm.com',
      daily_reminder_time: '09:00',
      enable_daily_reminder: true,
      enable_notification_mail: true,
      max_retries: 3,
    };
  }
  return rows[0];
}

// Create nodemailer transport from current settings
function createTransporter(settings) {
  if (!settings.smtp_host) {
    return null;
  }

  const port = parseInt(settings.smtp_port) || 587;
  const isSecure = Boolean(settings.smtp_secure) || port === 465;

  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: port,
    secure: isSecure,
    auth: {
      user: settings.smtp_user || '',
      pass: settings.smtp_pass || '',
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

// Queue and attempt to send mail
async function sendMail({
  to,
  toName = '',
  subject,
  html,
  text,
  type = 'notification',
  userId = null,
  leadId = null,
}) {
  const settings = await getMailSettings();
  const maxAttempts = settings.max_retries || 3;
  const mailUuid = uuidv4();

  // Insert initial log
  const [insertRes] = await pool.query(
    `INSERT INTO mail_logs 
     (uuid, mail_type, recipient_email, recipient_name, user_id, lead_id, subject, body_html, body_text, status, attempt_count, max_attempts) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?)`,
    [mailUuid, type, to, toName, userId, leadId, subject, html || text, text || '', maxAttempts]
  );

  const logId = insertRes.insertId;

  // Execute delivery immediately
  return await executeSend(logId);
}

// Execute send attempt for a specific log entry
async function executeSend(logId) {
  const [logs] = await pool.query('SELECT * FROM mail_logs WHERE id = ?', [logId]);
  if (!logs.length) {
    return { success: false, message: 'Log not found' };
  }

  const log = logs[0];
  const settings = await getMailSettings();
  const nextAttempt = log.attempt_count + 1;
  const maxAttempts = log.max_attempts || 3;

  const transporter = createTransporter(settings);
  if (!transporter) {
    const errorMsg = 'SMTP not configured. Host is empty in Mail Settings.';
    const finalStatus = nextAttempt >= maxAttempts ? 'failed' : 'retrying';

    await pool.query(
      `UPDATE mail_logs 
       SET attempt_count = ?, status = ?, error_message = ?, last_attempt_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nextAttempt, finalStatus, errorMsg, logId]
    );

    return {
      success: false,
      status: finalStatus,
      attempts: nextAttempt,
      error: errorMsg,
    };
  }

  try {
    const fromAddress = `"${settings.from_name || 'SalesCRM'}" <${settings.from_email || settings.smtp_user || 'no-reply@crm.com'}>`;
    
    const info = await transporter.sendMail({
      from: fromAddress,
      to: log.recipient_email,
      subject: log.subject,
      text: log.body_text || '',
      html: log.body_html || log.body_text || '',
    });

    await pool.query(
      `UPDATE mail_logs 
       SET attempt_count = ?, status = 'sent', sent_at = CURRENT_TIMESTAMP, error_message = NULL, last_attempt_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nextAttempt, logId]
    );

    return {
      success: true,
      status: 'sent',
      attempts: nextAttempt,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(`Mail send failed for log ${logId} (attempt ${nextAttempt}/${maxAttempts}):`, err.message);
    const finalStatus = nextAttempt >= maxAttempts ? 'failed' : 'retrying';

    await pool.query(
      `UPDATE mail_logs 
       SET attempt_count = ?, status = ?, error_message = ?, last_attempt_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nextAttempt, finalStatus, err.message, logId]
    );

    return {
      success: false,
      status: finalStatus,
      attempts: nextAttempt,
      error: err.message,
    };
  }
}

// Retry a specific failed or retrying mail
async function retryMail(logId) {
  const [logs] = await pool.query('SELECT * FROM mail_logs WHERE id = ?', [logId]);
  if (!logs.length) {
    throw new Error('Mail log not found');
  }

  const log = logs[0];
  if (log.status === 'sent') {
    return { success: true, message: 'Already sent' };
  }

  return await executeSend(logId);
}

// Retry all pending retrying mails (up to max 3 attempts)
async function retryAllPending() {
  const [pending] = await pool.query(
    "SELECT id FROM mail_logs WHERE status = 'retrying' AND attempt_count < max_attempts"
  );

  const results = [];
  for (const row of pending) {
    const r = await executeSend(row.id);
    results.push({ id: row.id, ...r });
  }

  return {
    retriedCount: pending.length,
    results,
  };
}

// Send a test mail to verify configuration
async function sendTestMail(targetEmail) {
  const settings = await getMailSettings();
  const transporter = createTransporter(settings);

  if (!transporter) {
    throw new Error('Please enter SMTP Host in settings before sending test mail');
  }

  // Verify connection first
  await transporter.verify();

  const template = await getTemplateByKey('test');
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const vars = {
    smtp_host: settings.smtp_host,
    smtp_port: settings.smtp_port,
    from_name: settings.from_name,
    from_email: settings.from_email || settings.smtp_user,
    date: dateStr,
  };

  let testSubject = `[SalesCRM Test] SMTP Configuration Verified - ${dateStr}`;
  let testHtml = DEFAULT_TEMPLATES.test.body_html;

  if (template) {
    testSubject = renderTemplateString(template.subject, vars);
    testHtml = renderTemplateString(template.body_html, vars);
  }

  return await sendMail({
    to: targetEmail,
    toName: 'Test Recipient',
    subject: testSubject,
    html: testHtml,
    text: `SalesCRM Mail Configuration Test: Your SMTP settings are working properly. Host: ${settings.smtp_host}:${settings.smtp_port}`,
    type: 'test',
  });
}

// Check lead next visit & closing date and send morning daily digest
async function checkAndSendDailyLeadReminders() {
  const settings = await getMailSettings();
  if (!settings.enable_daily_reminder) {
    console.log('Daily lead reminder email is disabled in settings.');
    return { skipped: true, reason: 'Disabled in mail settings' };
  }

  // Fetch all active leads with next_visit OR expected_close_date assigned to active users
  const [leads] = await pool.query(`
    SELECT 
      l.id, l.title, l.next_visit, l.expected_close_date, l.stage_id, 
      l.estimated_value, l.currency, l.priority,
      s.name AS stage_name, s.color AS stage_color,
      u.id AS user_id, u.name AS user_name, u.email AS user_email,
      c.company_name AS customer_company
    FROM leads l
    JOIN users u ON l.assigned_to = u.id
    LEFT JOIN lead_stages s ON l.stage_id = s.id
    LEFT JOIN customers c ON l.customer_id = c.id
    WHERE l.is_active = TRUE 
      AND (l.next_visit IS NOT NULL OR l.expected_close_date IS NOT NULL)
      AND u.is_active = TRUE
      AND u.email IS NOT NULL AND u.email != ''
    ORDER BY u.id, l.expected_close_date ASC
  `);

  if (!leads.length) {
    return { success: true, message: 'No leads with scheduled next visit or closing dates', count: 0 };
  }

  // Group by salesperson
  const userLeadsMap = new Map();
  for (const lead of leads) {
    if (!userLeadsMap.has(lead.user_id)) {
      userLeadsMap.set(lead.user_id, {
        userId: lead.user_id,
        userName: lead.user_name,
        userEmail: lead.user_email,
        leads: [],
      });
    }
    userLeadsMap.get(lead.user_id).leads.push(lead);
  }

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const template = await getTemplateByKey('daily_schedule');
  const sendResults = [];

  for (const [userId, userGroup] of userLeadsMap.entries()) {
    const { userName, userEmail, leads: userLeads } = userGroup;

    // Generate HTML Digest
    let leadsRowsHtml = '';
    for (const l of userLeads) {
      const nextVisitStr = l.next_visit
        ? new Date(l.next_visit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';
      const closingDateStr = l.expected_close_date
        ? new Date(l.expected_close_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';

      leadsRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">
            ${l.title}
            <div style="font-size: 11px; font-weight: normal; color: #64748b;">${l.customer_company || 'No Company'}</div>
          </td>
          <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">${nextVisitStr}</td>
          <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">${closingDateStr}</td>
          <td style="padding: 10px 12px; color: #475569;">${l.stage_name || 'Stage'}</td>
          <td style="padding: 10px 12px; text-transform: capitalize; color: #334155;">${l.priority || 'Medium'}</td>
        </tr>
      `;
    }

    const leadsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; color: #475569; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 10px 12px;">Lead & Company</th>
            <th style="padding: 10px 12px;">Next Visit</th>
            <th style="padding: 10px 12px;">Closing Date</th>
            <th style="padding: 10px 12px;">Stage</th>
            <th style="padding: 10px 12px;">Priority</th>
          </tr>
        </thead>
        <tbody>
          ${leadsRowsHtml}
        </tbody>
      </table>
    `;

    const vars = {
      salesperson_name: userName,
      date: todayStr,
      leads_table: leadsTableHtml,
      total_leads: userLeads.length,
    };

    let emailSubject = `[Daily Digest] Lead Visits & Closing Schedule - ${todayStr}`;
    let emailHtml = DEFAULT_TEMPLATES.daily_schedule.body_html;
    if (template) {
      emailSubject = renderTemplateString(template.subject, vars);
      emailHtml = renderTemplateString(template.body_html, vars);
    }

    const sendRes = await sendMail({
      to: userEmail,
      toName: userName,
      subject: emailSubject,
      html: emailHtml,
      text: `Hello ${userName}, you have ${userLeads.length} leads with scheduled next visits or closing dates. Please check your CRM dashboard.`,
      type: 'daily_lead_reminder',
      userId: userId,
    });

    sendResults.push({ userId, userName, userEmail, count: userLeads.length, ...sendRes });
  }

  return {
    success: true,
    totalLeads: leads.length,
    usersNotified: userLeadsMap.size,
    results: sendResults,
  };
}

module.exports = {
  getMailSettings,
  createTransporter,
  sendMail,
  executeSend,
  retryMail,
  retryAllPending,
  sendTestMail,
  checkAndSendDailyLeadReminders,
  getTemplateByKey,
  renderTemplateString,
  DEFAULT_TEMPLATES,
};
