const { pool } = require('../config/database');
const mailService = require('../services/mailService');

// GET /api/v1/mail/settings (Admin only)
exports.getSettings = async (req, res) => {
  try {
    const settings = await mailService.getMailSettings();
    // Mask password
    const safeSettings = {
      ...settings,
      smtp_pass_configured: Boolean(settings.smtp_pass),
      smtp_pass: settings.smtp_pass ? '••••••••' : '',
    };
    res.json({ success: true, data: safeSettings });
  } catch (err) {
    console.error('Get mail settings error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving mail settings' });
  }
};

// PUT /api/v1/mail/settings (Admin only)
exports.updateSettings = async (req, res) => {
  try {
    const {
      provider = 'smtp',
      smtp_host = '',
      smtp_port = 587,
      smtp_secure = false,
      smtp_user = '',
      smtp_pass,
      from_name = 'SalesCRM Notifications',
      from_email = '',
      daily_reminder_time = '09:00',
      enable_daily_reminder = true,
      enable_notification_mail = true,
      max_retries = 3,
    } = req.body;

    const current = await mailService.getMailSettings();

    // If password provided and not masked placeholder, update it; otherwise preserve
    let finalPass = current.smtp_pass || '';
    if (smtp_pass && smtp_pass !== '••••••••') {
      finalPass = smtp_pass;
    }

    await pool.query(
      `UPDATE mail_settings 
       SET provider = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, 
           smtp_user = ?, smtp_pass = ?, from_name = ?, from_email = ?, 
           daily_reminder_time = ?, enable_daily_reminder = ?, enable_notification_mail = ?, max_retries = ?
       WHERE id = ?`,
      [
        provider,
        smtp_host.trim(),
        parseInt(smtp_port) || 587,
        Boolean(smtp_secure),
        smtp_user.trim(),
        finalPass,
        from_name.trim(),
        from_email.trim() || smtp_user.trim(),
        daily_reminder_time || '09:00',
        Boolean(enable_daily_reminder),
        Boolean(enable_notification_mail),
        parseInt(max_retries) || 3,
        current.id,
      ]
    );

    res.json({ success: true, message: 'Mail configuration saved successfully' });
  } catch (err) {
    console.error('Update mail settings error:', err);
    res.status(500).json({ success: false, message: 'Server error updating mail settings' });
  }
};

// POST /api/v1/mail/test (Admin only)
exports.testMail = async (req, res) => {
  try {
    const targetEmail = req.body.to_email || req.user.email;
    const { custom_subject, custom_html, template_key } = req.body;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required for test' });
    }

    let result;
    if (custom_subject || custom_html) {
      result = await mailService.sendMail({
        to: targetEmail,
        toName: req.user.name || 'Admin Recipient',
        subject: custom_subject || '[SalesCRM Test] Template Preview',
        html: custom_html || '<p>Template preview test email</p>',
        text: 'Template preview test email',
        type: template_key || 'test',
        userId: req.user.id,
      });
    } else {
      result = await mailService.sendTestMail(targetEmail);
    }

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${targetEmail}`,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Test email failed: ${result.error}`,
        data: result,
      });
    }
  } catch (err) {
    console.error('Test mail error:', err);
    res.status(400).json({ success: false, message: err.message || 'SMTP connection failed' });
  }
};

// GET /api/v1/mail/logs (Admin only)
exports.getLogs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    let whereClause = '1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND m.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause += ' AND (m.recipient_email LIKE ? OR m.subject LIKE ? OR m.error_message LIKE ? OR m.recipient_name LIKE ?)';
      params.push(q, q, q, q);
    }

    // Counts
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
        SUM(CASE WHEN status = 'retrying' THEN 1 ELSE 0 END) AS retrying_count,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued_count
      FROM mail_logs
    `);

    const stats = statsRows[0];

    // Filtered total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM mail_logs m WHERE ${whereClause}`,
      params
    );
    const filteredTotal = countRows[0].count;

    // Fetch logs
    const listParams = [...params, parseInt(limit), offset];
    const [rows] = await pool.query(
      `SELECT 
         m.*,
         u.name AS user_name, u.email AS user_email,
         ld.title AS lead_title
       FROM mail_logs m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN leads ld ON m.lead_id = ld.id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      listParams
    );

    res.json({
      success: true,
      data: rows,
      stats: {
        total: stats.total || 0,
        sent: stats.sent_count || 0,
        failed: stats.failed_count || 0,
        retrying: stats.retrying_count || 0,
        queued: stats.queued_count || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredTotal,
        pages: Math.ceil(filteredTotal / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get mail logs error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving mail logs' });
  }
};

// POST /api/v1/mail/logs/:id/retry (Admin only)
exports.retryLog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mailService.retryMail(parseInt(id));
    res.json({
      success: result.success,
      message: result.success ? 'Email sent successfully on retry' : `Retry attempt completed: ${result.status}`,
      data: result,
    });
  } catch (err) {
    console.error('Retry log error:', err);
    res.status(500).json({ success: false, message: err.message || 'Retry failed' });
  }
};

// POST /api/v1/mail/logs/retry-all (Admin only)
exports.retryAll = async (req, res) => {
  try {
    const result = await mailService.retryAllPending();
    res.json({
      success: true,
      message: `Retried ${result.retriedCount} pending email(s)`,
      data: result,
    });
  } catch (err) {
    console.error('Retry all error:', err);
    res.status(500).json({ success: false, message: err.message || 'Retry all failed' });
  }
};

// DELETE /api/v1/mail/logs/:id (Admin only)
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM mail_logs WHERE id = ?', [id]);
    res.json({ success: true, message: 'Mail log deleted' });
  } catch (err) {
    console.error('Delete log error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting mail log' });
  }
};

// POST /api/v1/mail/run-daily-check (Admin only - triggers the 9:00 AM check manually)
exports.runDailyCheck = async (req, res) => {
  try {
    const result = await mailService.checkAndSendDailyLeadReminders();
    res.json({
      success: true,
      message: 'Morning 9:00 AM lead visit & closing reminder check executed',
      data: result,
    });
  } catch (err) {
    console.error('Run daily check error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to run daily reminder check' });
  }
};

// GET /api/v1/mail/templates (Admin only)
exports.getTemplates = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mail_templates ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get mail templates error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving mail templates' });
  }
};

// GET /api/v1/mail/templates/:key (Admin only)
exports.getTemplateByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const template = await mailService.getTemplateByKey(key);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (err) {
    console.error('Get mail template error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving mail template' });
  }
};

// PUT /api/v1/mail/templates/:key (Admin only)
exports.updateTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const { subject, body_html, is_active = true } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (!body_html || !body_html.trim()) {
      return res.status(400).json({ success: false, message: 'Body HTML is required' });
    }

    const [result] = await pool.query(
      `UPDATE mail_templates 
       SET subject = ?, body_html = ?, is_active = ? 
       WHERE template_key = ?`,
      [subject.trim(), body_html, Boolean(is_active), key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Template not found to update' });
    }

    const updated = await mailService.getTemplateByKey(key);
    res.json({ success: true, message: 'Template updated successfully', data: updated });
  } catch (err) {
    console.error('Update mail template error:', err);
    res.status(500).json({ success: false, message: 'Server error updating mail template' });
  }
};

// POST /api/v1/mail/templates/:key/reset (Admin only)
exports.resetTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const defaultTpl = mailService.DEFAULT_TEMPLATES[key];
    if (!defaultTpl) {
      return res.status(404).json({ success: false, message: 'No default found for this template' });
    }

    await pool.query(
      `UPDATE mail_templates 
       SET subject = ?, body_html = ?, is_active = TRUE 
       WHERE template_key = ?`,
      [defaultTpl.subject, defaultTpl.body_html, key]
    );

    const updated = await mailService.getTemplateByKey(key);
    res.json({ success: true, message: 'Template restored to factory default', data: updated });
  } catch (err) {
    console.error('Reset mail template error:', err);
    res.status(500).json({ success: false, message: 'Server error resetting mail template' });
  }
};

// POST /api/v1/mail/templates/:key/preview (Admin only)
exports.previewTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const { subject, body_html } = req.body;

    const sampleData = {
      notification: {
        title: 'Urgent Client Follow-up Required',
        lead_title: 'Enterprise ERP Modernization - Acme Corp',
        salesperson_name: 'Alex Johnson',
        sender_name: 'Sarah Admin',
        message: 'Client mentioned budget sign-off is scheduled for this Friday. Please submit the revised proposal by tomorrow afternoon.',
        lead_url: '/leads/101',
      },
      daily_schedule: {
        salesperson_name: 'Alex Johnson',
        date: new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }),
        total_leads: '2',
        leads_table: `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
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
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">Acme Corp Cloud Expansion<div style="font-size: 11px; font-weight: normal; color: #64748b;">Acme Industries</div></td>
              <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">Tomorrow, 10:00 AM</td>
              <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">Nov 15, 2026</td>
              <td style="padding: 10px 12px; color: #475569;">Proposal Sent</td>
              <td style="padding: 10px 12px; text-transform: capitalize; color: #334155;">High</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">CyberSecurity Suite Upgrade<div style="font-size: 11px; font-weight: normal; color: #64748b;">Globex Logistics</div></td>
              <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">Oct 28, 2026</td>
              <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">Oct 31, 2026</td>
              <td style="padding: 10px 12px; color: #475569;">Proposal</td>
              <td style="padding: 10px 12px; text-transform: capitalize; color: #334155;">Urgent</td>
            </tr>
          </tbody>
        </table>`,
      },
      test: {
        smtp_host: 'smtp.hostinger.com',
        smtp_port: '465',
        from_name: 'SalesCRM Notifications',
        from_email: 'admin@crm.com',
        date: new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      },
      closing_reminder: {
        salesperson_name: 'Alex Johnson',
        lead_title: 'Enterprise ERP Modernization - Acme Corp',
        closing_date: 'Nov 15, 2026',
        stage_name: 'Proposal Sent',
        estimated_value: '$45,000 USD',
        customer_company: 'Acme Industries',
      },
    };

    const vars = sampleData[key] || {};
    const renderedSubject = mailService.renderTemplateString(subject || '', vars);
    const renderedHtml = mailService.renderTemplateString(body_html || '', vars);

    res.json({
      success: true,
      data: {
        subject: renderedSubject,
        html: renderedHtml,
      },
    });
  } catch (err) {
    console.error('Preview mail template error:', err);
    res.status(500).json({ success: false, message: 'Server error previewing mail template' });
  }
};
