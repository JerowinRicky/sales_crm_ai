const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

// Push notification (Admin only)
exports.pushNotification = async (req, res) => {
  try {
    const { lead_id, user_id, title, message } = req.body;

    if (!lead_id) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    // Fetch lead details
    const [leads] = await pool.query(
      `SELECT l.id, l.title, l.assigned_to, u.name AS assigned_to_name 
       FROM leads l 
       LEFT JOIN users u ON l.assigned_to = u.id 
       WHERE l.id = ?`,
      [lead_id]
    );

    if (!leads.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const lead = leads[0];
    const targetUserId = user_id ? parseInt(user_id) : lead.assigned_to;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'No user is assigned to this lead. Please select a user to send the notification to.',
      });
    }

    // Verify target user exists and is active
    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE id = ? AND is_active = TRUE',
      [targetUserId]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found or inactive',
      });
    }

    const targetUser = users[0];
    const notifTitle = (title && title.trim()) ? title.trim() : `Lead Update: ${lead.title}`;
    const notifMessage = (message && message.trim())
      ? message.trim()
      : `Admin ${req.user.name} pushed an update regarding lead "${lead.title}".`;
    const notifUuid = uuidv4();
    const link = `/leads/${lead.id}`;

    const [result] = await pool.query(
      `INSERT INTO notifications 
       (uuid, user_id, sender_id, title, message, type, entity_type, entity_id, link, is_read) 
       VALUES (?, ?, ?, ?, ?, 'lead_push', 'lead', ?, ?, FALSE)`,
      [notifUuid, targetUserId, req.user.id, notifTitle, notifMessage, lead.id, link]
    );

    const [createdRows] = await pool.query(
      `SELECT n.*, s.name AS sender_name, s.email AS sender_email, l.title AS lead_title
       FROM notifications n
       LEFT JOIN users s ON n.sender_id = s.id
       LEFT JOIN leads l ON n.entity_id = l.id
       WHERE n.id = ?`,
      [result.insertId]
    );

    // Send email notification asynchronously
    try {
      const mailService = require('../services/mailService');
      const mailSettings = await mailService.getMailSettings();
      if (mailSettings.enable_notification_mail && targetUser.email) {
        const template = await mailService.getTemplateByKey('notification');
        const vars = {
          title: notifTitle,
          lead_title: lead.title,
          salesperson_name: targetUser.name,
          sender_name: req.user.name,
          message: notifMessage,
          lead_url: `/leads/${lead.id}`,
        };

        let emailSubject = `[SalesCRM Alert] ${notifTitle}`;
        let emailHtml = mailService.DEFAULT_TEMPLATES.notification.body_html;
        if (template) {
          emailSubject = mailService.renderTemplateString(template.subject, vars);
          emailHtml = mailService.renderTemplateString(template.body_html, vars);
        }

        mailService.sendMail({
          to: targetUser.email,
          toName: targetUser.name,
          subject: emailSubject,
          html: emailHtml,
          text: `${notifTitle}\n\n${notifMessage}`,
          type: 'notification',
          userId: targetUserId,
          leadId: lead.id,
        }).catch(e => console.error('Notification email trigger error:', e));
      }
    } catch (mErr) {
      console.error('Mail dispatch error:', mErr);
    }

    res.status(201).json({
      success: true,
      message: `Notification pushed successfully to ${targetUser.name}`,
      data: createdRows[0],
    });
  } catch (err) {
    console.error('Push notification error:', err);
    res.status(500).json({ success: false, message: 'Server error pushing notification' });
  }
};

// Get notifications for authenticated user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user && req.user.role_name === 'admin';
    const { is_read, page = 1, limit = 15, search = '', type = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 15));
    const offset = (pageNum - 1) * limitNum;

    const baseConditions = ['n.user_id = ?'];
    const baseParams = [userId];

    const whereConditions = [...baseConditions];
    const params = [...baseParams];

    if (is_read !== undefined && is_read !== '' && is_read !== 'all') {
      const boolVal = (is_read === 'true' || is_read === '1' || is_read === true);
      whereConditions.push('n.is_read = ?');
      params.push(boolVal ? 1 : 0);
    }

    if (type && type !== 'all') {
      whereConditions.push('(n.type = ? OR n.entity_type = ?)');
      params.push(type, type);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereConditions.push('(n.title LIKE ? OR n.message LIKE ? OR l.title LIKE ? OR s.name LIKE ?)');
      params.push(q, q, q, q);
    }

    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

    // Get total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM notifications n 
       LEFT JOIN users s ON n.sender_id = s.id
       LEFT JOIN leads l ON n.entity_type = 'lead' AND n.entity_id = l.id
       WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Get unread count
    const [unreadRows] = await pool.query(
      `SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    const unreadCount = unreadRows[0].unread_count;

    // Fetch items with sender and lead details
    const listParams = [...params, limitNum, offset];
    const [rows] = await pool.query(
      `SELECT 
         n.*,
         s.name AS sender_name,
         s.email AS sender_email,
         l.title AS lead_title
       FROM notifications n
       LEFT JOIN users s ON n.sender_id = s.id
       LEFT JOIN leads l ON n.entity_type = 'lead' AND n.entity_id = l.id
       WHERE ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      listParams
    );

    // Get overall counts for tabs
    const [allCountRows] = await pool.query(
      `SELECT 
         COUNT(*) AS count_all,
         SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) AS count_unread,
         SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) AS count_read
       FROM notifications
       WHERE user_id = ?`,
      [userId]
    );

    const counts = {
      all: Number(allCountRows[0]?.count_all || 0),
      unread: Number(allCountRows[0]?.count_unread || 0),
      read: Number(allCountRows[0]?.count_read || 0),
    };

    res.json({
      success: true,
      data: rows,
      unread_count: unreadCount,
      counts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

// Get unread notifications for popup and badges
exports.getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT 
         n.*,
         s.name AS sender_name,
         s.email AS sender_email,
         l.title AS lead_title
       FROM notifications n
       LEFT JOIN users s ON n.sender_id = s.id
       LEFT JOIN leads l ON n.entity_type = 'lead' AND n.entity_id = l.id
       WHERE n.user_id = ? AND n.is_read = FALSE
       ORDER BY n.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('Get unread notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

