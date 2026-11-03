const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const { pool } = require('../config/database');
const mailService = require('../services/mailService');

/* ─── HELPERS ──────────────────────────────────────────────────────────── */
// Haversine distance in meters between two lat/lng points
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // earth radius in meters
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getSetting(key, fallback = null) {
  const [rows] = await pool.query('SELECT setting_value FROM app_settings WHERE setting_key=?', [key]);
  return rows.length ? rows[0].setting_value : fallback;
}

/* ─── AUTH ─────────────────────────────────────────────────────────────── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });
    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role_name FROM users u
       JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = TRUE`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role_name },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    await pool.query('UPDATE users SET last_login=NOW(), login_count=login_count+1 WHERE id=?', [user.id]);
    try {
      const [udRows] = await pool.query(
        `SELECT ud.domain_id, d.name AS domain_name
         FROM user_domains ud
         JOIN domains d ON ud.domain_id = d.id
         WHERE ud.user_id = ?`,
        [user.id]
      );
      user.domains = udRows || [];
      user.domain_ids = (udRows || []).map(x => x.domain_id);
    } catch (_) {
      user.domains = [];
      user.domain_ids = [];
    }
    const { password_hash, ...safe } = user;
    res.json({ success: true, token, user: safe });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getMe = (req, res) => {
  const { password_hash, ...safe } = req.user;
  res.json({ success: true, user: safe });
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const [r] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
    if (!(await bcrypt.compare(current_password, r[0].password_hash)))
      return res.status(400).json({ success: false, message: 'Current password wrong' });
    if (!new_password || new_password.length < 8)
      return res.status(400).json({ success: false, message: 'Min 8 characters' });
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(new_password, 12), req.user.id]);
    res.json({ success: true, message: 'Password changed' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/* ─── FORGOT PASSWORD (OTP FLOW) ─────────────────────────────────────────── */
exports.forgotPasswordSendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify user exists and is active
    const [users] = await pool.query(
      'SELECT id, name, email, is_active FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'No registered user found with this email' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Please contact support.' });
    }

    // 2. Invalidate any existing unused OTPs for this email
    await pool.query('UPDATE password_resets SET is_used = 1 WHERE email = ? AND is_used = 0', [normalizedEmail]);

    // 3. Generate secure random 6-digit number
    const otp = crypto.randomInt(100000, 999999).toString();

    // 4. Save new OTP with 2 minutes expiry (120 seconds)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await pool.query(
      'INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
      [normalizedEmail, otp, expiresAt]
    );

    // 5. Send Email via mailService
    const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">SAMPAT Sales CRM</h1>
    <p style="margin: 6px 0 0 0; color: #bfdbfe; font-size: 13px;">Security & Password Reset Verification</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px 0;">Hello <strong>${user.name}</strong>,</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
      We received a request to reset your password. Use the 6-digit verification code below to complete your password reset:
    </p>
    <div style="background: #f8fafc; border: 2px dashed #93c5fd; border-radius: 10px; padding: 22px; text-align: center; margin: 20px 0;">
      <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">${otp}</div>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">
        ⏱ Valid for 2 minutes only
      </p>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 16px 0;">
      For security reasons, do not share this code with anyone. If you did not initiate this request, you can safely ignore this email; your existing password will remain active.
    </p>
  </div>
  <div style="background: #f8fafc; padding: 14px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
    This is an automated system email from SAMPAT Sales CRM. Please do not reply.
  </div>
</div>`;

    const textBody = `Hello ${user.name},\n\nYour password reset OTP is: ${otp}\nThis code is valid for 2 minutes only.\n\nIf you did not request this, please ignore this message.`;

    const sendRes = await mailService.sendMail({
      to: user.email,
      toName: user.name,
      subject: `[SalesCRM] Password Reset OTP: ${otp}`,
      html: htmlBody,
      text: textBody,
      type: 'password_reset',
      userId: user.id
    });

    if (!sendRes.success && sendRes.status === 'failed') {
      return res.status(500).json({
        success: false,
        message: sendRes.error || 'Failed to send OTP email. Please ensure mail server configuration is valid.'
      });
    }

    return res.json({
      success: true,
      message: 'A 6-digit OTP has been sent to your email address.',
      expires_in: 120
    });
  } catch (err) {
    console.error('forgotPasswordSendOtp error:', err);
    res.status(500).json({ success: false, message: 'Server error generating OTP' });
  }
};

exports.forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const [rows] = await pool.query(
      `SELECT * FROM password_resets 
       WHERE email = ? AND otp = ? AND is_used = 0 
       ORDER BY id DESC LIMIT 1`,
      [normalizedEmail, cleanOtp]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    const resetRecord = rows[0];
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('forgotPasswordVerifyOtp error:', err);
    res.status(500).json({ success: false, message: 'Server error verifying OTP' });
  }
};

exports.forgotPasswordReset = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // Verify user exists and is active
    const [users] = await pool.query('SELECT id, is_active FROM users WHERE email = ?', [normalizedEmail]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!users[0].is_active) {
      return res.status(403).json({ success: false, message: 'User account is deactivated' });
    }

    // Verify OTP record
    const [rows] = await pool.query(
      `SELECT * FROM password_resets 
       WHERE email = ? AND otp = ? AND is_used = 0 
       ORDER BY id DESC LIMIT 1`,
      [normalizedEmail, cleanOtp]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    const resetRecord = rows[0];
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    // Hash new password
    const hash = await bcrypt.hash(new_password, 12);

    // Update password in users table
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, normalizedEmail]);

    // Mark OTP as used
    await pool.query('UPDATE password_resets SET is_used = 1 WHERE id = ?', [resetRecord.id]);

    return res.json({
      success: true,
      message: 'Password has been successfully updated! You can now log in.'
    });
  } catch (err) {
    console.error('forgotPasswordReset error:', err);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

/* ─── USERS ─────────────────────────────────────────────────────────────── */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const off = (page - 1) * limit;
    let w = ['1=1'], p = [];
    if (is_active !== undefined && is_active !== '') {
      w.push('u.is_active = ?');
      p.push(is_active === 'true' || is_active === '1' || is_active === 1 ? 1 : 0);
    }
    if (search) { w.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)'); p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const ws = w.join(' AND ');
    const [rows] = await pool.query(`SELECT u.id,u.uuid,u.name,u.email,u.phone,u.employee_id,u.department,u.territory,u.is_active,u.last_login,u.login_count,u.created_at,r.name AS role_name,r.id AS role_id,m.name AS manager_name FROM users u JOIN roles r ON u.role_id=r.id LEFT JOIN users m ON u.manager_id=m.id WHERE ${ws} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, [...p, parseInt(limit), off]);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u JOIN roles r ON u.role_id=r.id WHERE ${ws}`, p);

    if (rows.length > 0) {
      try {
        const userIds = rows.map(u => u.id);
        const [udRows] = await pool.query(
          `SELECT ud.user_id, ud.domain_id, d.name AS domain_name
           FROM user_domains ud
           JOIN domains d ON ud.domain_id = d.id
           WHERE ud.user_id IN (?)`,
          [userIds]
        );
        const udMap = {};
        for (const ud of udRows) {
          if (!udMap[ud.user_id]) udMap[ud.user_id] = [];
          udMap[ud.user_id].push({ id: ud.domain_id, name: ud.domain_name });
        }
        for (const u of rows) {
          u.domains = udMap[u.id] || [];
          u.domain_ids = (udMap[u.id] || []).map(d => d.id);
          u.domain_names = (udMap[u.id] || []).map(d => d.name).join(', ');
        }
      } catch (err) {
        console.error('getUsers domains lookup error:', err);
      }
    }

    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role_id, employee_id, department, territory, manager_id, domain_ids } = req.body;
    const [ex] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (ex.length) return res.status(400).json({ success: false, message: 'Email exists' });
    const hash = await bcrypt.hash(password || 'Welcome@123', 12);
    const [r] = await pool.query(
      'INSERT INTO users (uuid,name,email,phone,password_hash,role_id,employee_id,department,territory,manager_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(), name, email.toLowerCase(), phone, hash, role_id, employee_id, department, territory, manager_id || null]);
    const newUserId = r.insertId;

    if (Array.isArray(domain_ids) && domain_ids.length > 0) {
      const values = domain_ids.map(Number).filter(id => id > 0).map(did => [newUserId, did]);
      if (values.length > 0) {
        await pool.query('INSERT IGNORE INTO user_domains (user_id, domain_id) VALUES ?', [values]);
      }
    }

    res.status(201).json({ success: true, id: newUserId, message: 'User created' });
  } catch (e) { console.error('createUser error:', e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, phone, role_id, employee_id, department, territory, manager_id, is_active, domain_ids } = req.body;
    await pool.query('UPDATE users SET name=?,phone=?,role_id=?,employee_id=?,department=?,territory=?,manager_id=?,is_active=? WHERE id=?',
      [name, phone, role_id, employee_id, department, territory, manager_id || null, is_active, req.params.id]);

    if (domain_ids !== undefined) {
      await pool.query('DELETE FROM user_domains WHERE user_id=?', [req.params.id]);
      if (Array.isArray(domain_ids) && domain_ids.length > 0) {
        const values = domain_ids.map(Number).filter(id => id > 0).map(did => [Number(req.params.id), did]);
        if (values.length > 0) {
          await pool.query('INSERT IGNORE INTO user_domains (user_id, domain_id) VALUES ?', [values]);
        }
      }
    }

    res.json({ success: true, message: 'Updated' });
  } catch (e) { console.error('updateUser error:', e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.new_password || 'Welcome@123', 12);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.params.id]);
    res.json({ success: true, message: 'Password reset' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getRoles = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM roles ORDER BY id');
  res.json({ success: true, data: rows });
};

/* ─── CUSTOMERS ─────────────────────────────────────────────────────────── */
// Shared customer pool: every authenticated user can see all active customers.
// Anyone can create a customer; admin can deactivate/manage in Settings.
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, industry, assigned_to, group_id } = req.query;
    const off = (page - 1) * limit;
    let w = ['c.is_active=TRUE'], p = [];
    if (search) { w.push('(c.company_name LIKE ? OR c.contact_person LIKE ? OR c.phone LIKE ?)'); p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (industry) { w.push('c.industry=?'); p.push(industry); }
    if (assigned_to) { w.push('c.assigned_to=?'); p.push(assigned_to); }
    if (group_id) { w.push('c.group_id=?'); p.push(group_id); }
    const ws = w.join(' AND ');
    const [rows] = await pool.query(`
      SELECT
        c.*,
        ct.type AS customer_type,
        cg.name AS group_name,
        u.name AS assigned_to_name,
        cb.name AS created_by_name
      FROM customers c
      LEFT JOIN customer_types ct
        ON c.customer_type_id = ct.id
      LEFT JOIN customer_groups cg
        ON c.group_id = cg.id
      LEFT JOIN users u
        ON c.assigned_to = u.id
      LEFT JOIN users cb
        ON c.created_by = cb.id
      WHERE ${ws}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...p, parseInt(limit), off]);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM customers c WHERE ${ws}`, p);
    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getCustomer = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.*,
        ct.type AS customer_type,
        cg.name AS group_name,
        u.name AS assigned_to_name
      FROM customers c
      LEFT JOIN customer_types ct
        ON c.customer_type_id = ct.id
      LEFT JOIN customer_groups cg
        ON c.group_id = cg.id
      LEFT JOIN users u
        ON c.assigned_to = u.id
      WHERE c.id=?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const [leads] = await pool.query(`SELECT l.id,l.title,l.estimated_value,s.name AS stage_name,s.color FROM leads l JOIN lead_stages s ON l.stage_id=s.id WHERE l.customer_id=? ORDER BY l.created_at DESC LIMIT 5`, [req.params.id]);
    const [visits] = await pool.query(`SELECT vs.*,u.name AS user_name FROM visit_sessions vs JOIN users u ON vs.user_id=u.id WHERE vs.customer_id=? ORDER BY vs.check_in_time DESC LIMIT 5`, [req.params.id]);
    res.json({ success: true, data: { ...rows[0], leads, visits } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const {
      company_name,
      email,
      phone,
      alternate_phone,
      industry,
      customer_type_id,
      group_id,
      website,
      category,
      is_kam,
      kam_category,
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      latitude,
      longitude,
      assigned_to,
      notes
    } = req.body;
    const [r] = await pool.query(
      `INSERT INTO customers
      (
        uuid,
        company_name,
        email,
        phone,
        alternate_phone,
        industry,
        customer_type_id,
        group_id,
        website,
        category,
        is_kam,
        kam_category,
        address_line1,
        address_line2,
        city,
        state,
        country,
        pincode,
        latitude,
        longitude,
        assigned_to,
        created_by,
        notes
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uuid(),
        company_name,
        email,
        phone,
        alternate_phone,
        industry,
        customer_type_id || null,
        group_id || null,
        website,
        category || null,
        is_kam || 'No',
        is_kam === 'Yes' ? (kam_category || null) : null,
        address_line1,
        address_line2,
        city,
        state,
        country || 'India',
        pincode,
        latitude || null,
        longitude || null,
        assigned_to || req.user.id,
        req.user.id,
        notes
      ]
    );

    if (group_id) {
      await pool.query(
        'INSERT IGNORE INTO customer_group_members (group_id, customer_id) VALUES (?, ?)',
        [group_id, r.insertId]
      );
    }

    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateCustomer = async (req, res) => {
  try {
    const {
      company_name,
      email,
      phone,
      alternate_phone,
      industry,
      customer_type_id,
      group_id,
      website,
      category,
      is_kam,
      kam_category,
      address_line1,
      address_line2,
      city,
      state,
      country,
      pincode,
      latitude,
      longitude,
      assigned_to,
      notes
    } = req.body;
    await pool.query(
      `UPDATE customers SET
        company_name=?,
        email=?,
        phone=?,
        alternate_phone=?,
        industry=?,
        customer_type_id=?,
        group_id=?,
        website=?,
        category=?,
        is_kam=?,
        kam_category=?,
        address_line1=?,
        address_line2=?,
        city=?,
        state=?,
        country=?,
        pincode=?,
        latitude=?,
        longitude=?,
        assigned_to=?,
        notes=?
       WHERE id=?`,
      [
        company_name,
        email,
        phone,
        alternate_phone,
        industry,
        customer_type_id || null,
        group_id || null,
        website,
        category || null,
        is_kam || 'No',
        is_kam === 'Yes' ? (kam_category || null) : null,
        address_line1,
        address_line2,
        city,
        state,
        country || 'India',
        pincode,
        latitude || null,
        longitude || null,
        assigned_to || null,
        notes,
        req.params.id
      ]
    );

    await pool.query('DELETE FROM customer_group_members WHERE customer_id = ?', [req.params.id]);
    if (group_id) {
      await pool.query(
        'INSERT IGNORE INTO customer_group_members (group_id, customer_id) VALUES (?, ?)',
        [group_id, req.params.id]
      );
    }

    res.json({ success: true, message: 'Updated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteCustomer = async (req, res) => {
  await pool.query('UPDATE customers SET is_active=FALSE WHERE id=?', [req.params.id]);
  res.json({ success: true });
};

/* ─── LEADS ─────────────────────────────────────────────────────────────── */
exports.getLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 200,
      search,
      title,
      stage_id,
      priority,
      customer_id,
      group_id,
      scope,
      assigned_to,
      source,
      domain_id,
      lead_type,
      min_value,
      max_value,
      status_filter,
      date_field = 'expected_close_date',
      start_date,
      end_date,
      sort_by,
      order = 'desc'
    } = req.query;
    const off = (page - 1) * limit;
    const isAdmin = req.user && req.user.role_name === 'admin';
    const isSalesManager = req.user && req.user.role_name === 'sales_manager';
    const userDomainIds = req.user?.domain_ids || [];

    let w = [], p = [];
    if (isAdmin && scope === 'deleted') {
      w.push('l.is_active = FALSE');
    } else {
      w.push('l.is_active = TRUE');
    }

    // Helper to normalize single or multi-select parameters (array or comma-separated)
    const parseMulti = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.flatMap(v => String(v).split(',')).map(s => s.trim()).filter(Boolean);
      return String(val).split(',').map(s => s.trim()).filter(Boolean);
    };

    if (isAdmin) {
      if (scope === 'me') {
        w.push('l.assigned_to=?');
        p.push(req.user.id);
      } else if (assigned_to) {
        const assignees = parseMulti(assigned_to);
        const hasUnassigned = assignees.includes('unassigned');
        const userIds = assignees.filter(id => id !== 'unassigned');

        if (hasUnassigned && userIds.length > 0) {
          w.push(`(l.assigned_to IS NULL OR l.assigned_to IN (${userIds.map(() => '?').join(',')}))`);
          p.push(...userIds);
        } else if (hasUnassigned) {
          w.push('l.assigned_to IS NULL');
        } else if (userIds.length === 1) {
          w.push('l.assigned_to=?');
          p.push(userIds[0]);
        } else if (userIds.length > 1) {
          w.push(`l.assigned_to IN (${userIds.map(() => '?').join(',')})`);
          p.push(...userIds);
        }
      }
    } else if (isSalesManager) {
      if (scope === 'me') {
        w.push('l.assigned_to=?');
        p.push(req.user.id);
      } else {
        // Domain Leads: Strictly only leads belonging to the user's assigned domains
        if (userDomainIds.length > 0) {
          w.push(`l.domain_id IN (${userDomainIds.map(() => '?').join(',')})`);
          p.push(...userDomainIds);
        } else {
          w.push('1=0');
        }

        if (assigned_to) {
          const assignees = parseMulti(assigned_to);
          const hasUnassigned = assignees.includes('unassigned');
          const userIds = assignees.filter(id => id !== 'unassigned');

          if (hasUnassigned && userIds.length > 0) {
            w.push(`(l.assigned_to IS NULL OR l.assigned_to IN (${userIds.map(() => '?').join(',')}))`);
            p.push(...userIds);
          } else if (hasUnassigned) {
            w.push('l.assigned_to IS NULL');
          } else if (userIds.length === 1) {
            w.push('l.assigned_to=?');
            p.push(userIds[0]);
          } else if (userIds.length > 1) {
            w.push(`l.assigned_to IN (${userIds.map(() => '?').join(',')})`);
            p.push(...userIds);
          }
        }
      }
    } else {
      // Salesperson and other roles:
      if (scope === 'domain') {
        if (userDomainIds.length > 0) {
          w.push(`l.domain_id IN (${userDomainIds.map(() => '?').join(',')})`);
          p.push(...userDomainIds);
        } else {
          w.push('1=0');
        }
      } else {
        w.push('l.assigned_to=?');
        p.push(req.user.id);
      }
    }

    const rawSearch = [search, title].filter(Boolean).join(',');
    if (rawSearch && rawSearch.trim()) {
      const terms = rawSearch.split(',').map((s) => s.trim()).filter(Boolean);
      if (terms.length > 0) {
        const termClauses = [];
        for (const term of terms) {
          const q = `%${term}%`;
          termClauses.push(
            '(l.title LIKE ? OR l.contact_name LIKE ? OR c.company_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.city LIKE ?)'
          );
          p.push(q, q, q, q, q, q);
        }
        w.push(`(${termClauses.join(' OR ')})`);
      }
    }

    const stageIds = parseMulti(stage_id);
    if (stageIds.length === 1) {
      w.push('l.stage_id=?');
      p.push(stageIds[0]);
    } else if (stageIds.length > 1) {
      w.push(`l.stage_id IN (${stageIds.map(() => '?').join(',')})`);
      p.push(...stageIds);
    }

    const priorities = parseMulti(priority);
    if (priorities.length === 1) {
      w.push('l.priority=?');
      p.push(priorities[0]);
    } else if (priorities.length > 1) {
      w.push(`l.priority IN (${priorities.map(() => '?').join(',')})`);
      p.push(...priorities);
    }

    const customerIds = parseMulti(customer_id);
    if (customerIds.length === 1) {
      w.push('l.customer_id=?');
      p.push(customerIds[0]);
    } else if (customerIds.length > 1) {
      w.push(`l.customer_id IN (${customerIds.map(() => '?').join(',')})`);
      p.push(...customerIds);
    }

    const groupIds = parseMulti(group_id);
    if (groupIds.length === 1) {
      w.push('c.group_id=?');
      p.push(groupIds[0]);
    } else if (groupIds.length > 1) {
      w.push(`c.group_id IN (${groupIds.map(() => '?').join(',')})`);
      p.push(...groupIds);
    }

    const sources = parseMulti(source);
    if (sources.length === 1) {
      w.push('l.source=?');
      p.push(sources[0]);
    } else if (sources.length > 1) {
      w.push(`l.source IN (${sources.map(() => '?').join(',')})`);
      p.push(...sources);
    }

    const domainIds = parseMulti(domain_id);
    if (domainIds.length === 1) {
      w.push('l.domain_id=?');
      p.push(domainIds[0]);
    } else if (domainIds.length > 1) {
      w.push(`l.domain_id IN (${domainIds.map(() => '?').join(',')})`);
      p.push(...domainIds);
    }

    if (lead_type) { w.push('l.lead_type=?'); p.push(lead_type); }

    if (min_value !== undefined && min_value !== '') {
      w.push('l.estimated_value >= ?');
      p.push(Number(min_value));
    }
    if (max_value !== undefined && max_value !== '') {
      w.push('l.estimated_value <= ?');
      p.push(Number(max_value));
    }

    if (status_filter === 'open') {
      w.push('s.is_closed = FALSE');
    } else if (status_filter === 'won') {
      w.push('s.is_won = TRUE');
    } else if (status_filter === 'lost') {
      w.push('s.is_closed = TRUE AND s.is_won = FALSE');
    }

    // Date range filters
    const validDateFields = {
      expected_close_date: 'l.expected_close_date',
      created_at: 'DATE(l.created_at)',
      next_visit: 'l.next_visit',
      actual_close_date: 'l.actual_close_date',
      updated_at: 'DATE(l.updated_at)'
    };
    const col = validDateFields[date_field] || 'l.expected_close_date';
    if (start_date) {
      w.push(`${col} >= ?`);
      p.push(start_date);
    }
    if (end_date) {
      w.push(`${col} <= ?`);
      p.push(end_date);
    }
    const ws = w.join(' AND ');

    const sortColumnMap = {
      title: 'l.title',
      customer: 'c.company_name',
      customer_company: 'c.company_name',
      domain: 'dom.name',
      domain_name: 'dom.name',
      stage: 's.name',
      stage_name: 's.name',
      estimated_value: 'l.estimated_value',
      amount: 'l.estimated_value',
      priority: 'FIELD(l.priority, "low", "medium", "high", "critical")',
      assigned: 'u.name',
      assigned_to_name: 'u.name',
      expected_close_date: 'l.expected_close_date',
      close_date: 'l.expected_close_date',
      next_visit: 'l.next_visit',
      created_at: 'l.created_at',
      created_time: 'l.created_at',
      updated_at: 'l.updated_at',
      modified_time: 'l.updated_at',
      description: 'l.description',
    };

    const sortDirection = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    let orderClause = 'ORDER BY l.created_at DESC';
    if (sort_by && sortColumnMap[sort_by]) {
      orderClause = `ORDER BY ${sortColumnMap[sort_by]} ${sortDirection}, l.created_at DESC`;
    }

    const [rows] = await pool.query(
      `SELECT l.*, s.name AS stage_name, s.color AS stage_color, s.is_won, s.is_closed,
              u.name AS assigned_to_name,
              c.company_name AS customer_company, c.city AS customer_city,
              cg.name AS customer_group_name,
              dom.name AS domain_name
       FROM leads l
       JOIN lead_stages s ON l.stage_id=s.id
       LEFT JOIN users u ON l.assigned_to=u.id
       LEFT JOIN customers c ON l.customer_id=c.id
       LEFT JOIN customer_groups cg ON c.group_id=cg.id
       LEFT JOIN domains dom ON l.domain_id=dom.id
       WHERE ${ws}
       ${orderClause} LIMIT ? OFFSET ?`,
      [...p, parseInt(limit), off]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM leads l
       JOIN lead_stages s ON l.stage_id=s.id
       LEFT JOIN customers c ON l.customer_id=c.id
       LEFT JOIN customer_groups cg ON c.group_id=cg.id
       WHERE ${ws}`,
      p
    );
    res.json({ success: true, data: rows, total });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getAdjacentLeads = async (req, res) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }

    const [currentRows] = await pool.query(
      'SELECT id, title, created_at, domain_id, assigned_to FROM leads WHERE id = ?',
      [leadId]
    );

    if (!currentRows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const currentLead = currentRows[0];
    const isLeadAdmin = req.user.role_name === 'admin';
    const isLeadManager = req.user.role_name === 'sales_manager';
    const leadUserDomainIds = req.user.domain_ids || [];

    let scopeSql = 'l.is_active = TRUE';
    const scopeParams = [];

    if (isLeadAdmin) {
      // Admin sees all active leads
    } else if (isLeadManager) {
      if (leadUserDomainIds.length > 0) {
        scopeSql += ` AND (l.domain_id IN (${leadUserDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?)`;
        scopeParams.push(...leadUserDomainIds, req.user.id);
      } else {
        scopeSql += ' AND l.assigned_to = ?';
        scopeParams.push(req.user.id);
      }
    } else {
      scopeSql += ' AND l.assigned_to = ?';
      scopeParams.push(req.user.id);
    }

    // Previous lead (newer in DESC ordering)
    const [prevRows] = await pool.query(
      `SELECT l.id, l.title
       FROM leads l
       WHERE ${scopeSql} AND (l.created_at > ? OR (l.created_at = ? AND l.id > ?))
       ORDER BY l.created_at ASC, l.id ASC
       LIMIT 1`,
      [...scopeParams, currentLead.created_at, currentLead.created_at, currentLead.id]
    );

    // Next lead (older in DESC ordering)
    const [nextRows] = await pool.query(
      `SELECT l.id, l.title
       FROM leads l
       WHERE ${scopeSql} AND (l.created_at < ? OR (l.created_at = ? AND l.id < ?))
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 1`,
      [...scopeParams, currentLead.created_at, currentLead.created_at, currentLead.id]
    );

    res.json({
      success: true,
      data: {
        prev: prevRows.length ? prevRows[0] : null,
        next: nextRows.length ? nextRows[0] : null,
      }
    });
  } catch (e) {
    console.error('getAdjacentLeads error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getLead = async (req, res) => {
  try {

    const [rows] = await pool.query(
      `
      SELECT
        l.*,
        COALESCE(NULLIF(l.contact_phone, ''), ct.phone, NULLIF(c.phone, '-')) AS contact_phone,
        COALESCE(NULLIF(l.contact_email, ''), ct.email, c.email) AS contact_email,
        COALESCE(NULLIF(l.contact_name, ''), ct.contact_name, c.contact_person) AS contact_name,

        s.name AS stage_name,
        s.color AS stage_color,
        s.is_won,
        s.is_closed,

        u.name AS assigned_to_name,

        c.company_name AS customer_company,
        c.city AS customer_city,
        c.contact_person AS customer_contact_person,
        c.phone AS customer_phone,
        c.email AS customer_email,

        d.name AS domain_name

      FROM leads l

      JOIN lead_stages s
        ON l.stage_id = s.id

      LEFT JOIN users u
        ON l.assigned_to = u.id

      LEFT JOIN customers c
        ON l.customer_id = c.id

      LEFT JOIN contacts ct ON (
        ct.id = (
          SELECT id FROM contacts 
          WHERE customer_id = l.customer_id 
            AND (
              LOWER(TRIM(contact_name)) = LOWER(TRIM(l.contact_name))
              OR (l.contact_name IS NULL AND id = (SELECT MIN(id) FROM contacts WHERE customer_id = l.customer_id))
            )
          ORDER BY (phone IS NOT NULL AND phone != '' AND phone != '-') DESC, id ASC
          LIMIT 1
        )
      )

      LEFT JOIN domains d
        ON l.domain_id = d.id

      WHERE l.id = ?
      `,
      [req.params.id]
    );


    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    const isLeadAdmin = req.user.role_name === 'admin';
    if (!rows[0].is_active && !isLeadAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or has been deleted'
      });
    }
    const isLeadManager = req.user.role_name === 'sales_manager';
    const leadUserDomainIds = req.user.domain_ids || [];
    const hasLeadDomainAccess = isLeadManager && rows[0].domain_id && leadUserDomainIds.includes(rows[0].domain_id);

    if (!isLeadAdmin && rows[0].assigned_to !== req.user.id && !hasLeadDomainAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this lead'
      });
    }


    /*
     * Lead products
     */
    const [products] = await pool.query(
      `
      SELECT
        lp.id,
        lp.uuid,
        lp.category,

        p.id AS product_id,
        p.name AS product_name,

        sd.id AS subdomain_id,
        sd.name AS subdomain_name,

        d.id AS domain_id,
        d.name AS domain_name

      FROM lead_products lp

      INNER JOIN products p
        ON lp.product_id = p.id

      INNER JOIN subdomains sd
        ON p.subdomain_id = sd.id

      INNER JOIN domains d
        ON sd.domain_id = d.id

      WHERE lp.lead_id = ?

      ORDER BY lp.id ASC
      `,
      [req.params.id]
    );


    const [history] = await pool.query(
      `
      SELECT
        lh.*,
        u.name AS changed_by_name

      FROM lead_history lh

      JOIN users u
        ON lh.changed_by = u.id

      WHERE lh.lead_id = ?

      ORDER BY lh.changed_at DESC

      LIMIT 20
      `,
      [req.params.id]
    );


    const [activities] = await pool.query(
      `
      SELECT
        a.*,
        u.name AS user_name

      FROM activities a

      JOIN users u
        ON a.user_id = u.id

      WHERE a.lead_id = ?

      ORDER BY a.created_at DESC
      `,
      [req.params.id]
    );

    const [edit_history] = await pool.query(
      `
      SELECT
        leh.*,
        u.name AS changed_by_name

      FROM lead_edit_history leh

      JOIN users u
        ON leh.changed_by = u.id

      WHERE leh.lead_id = ?

      ORDER BY leh.changed_at DESC, leh.id DESC

      LIMIT 100
      `,
      [req.params.id]
    );


    res.json({
      success: true,

      data: {
        ...rows[0],
        products,
        history,
        activities,
        edit_history
      }
    });

  } catch (e) {

    console.error('Get lead error:', e);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.createLead = async (req, res) => {
  try {
    const {
      title,
      customer_id,
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      source,
      stage_id,
      assigned_to,
      estimated_value,
      currency,
      probability,
      expected_close_date,

      actual_scheduled_week,
      rescheduled_week,
      lead_type,
      next_visit,
      pipeline,
      domain_id,

      description,
      priority,
      on_hold_reason,

      products
    } = req.body;


    if (!title || !stage_id) {
      return res.status(400).json({
        success: false,
        message: 'Lead name and lead stage are required'
      });
    }


    if (!domain_id) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }


    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product is required'
      });
    }


    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();


      /*
       * Auto-resolve contact phone & email from customer contacts if empty
       */
      let finalContactPhone = contact_phone || null;
      let finalContactEmail = contact_email || null;
      if ((!finalContactPhone || !finalContactEmail) && customer_id) {
        if (contact_name) {
          const [ctRows] = await connection.query(
            'SELECT phone, email FROM contacts WHERE customer_id = ? AND LOWER(TRIM(contact_name)) = LOWER(TRIM(?)) LIMIT 1',
            [customer_id, contact_name]
          );
          if (ctRows.length) {
            if (!finalContactPhone && ctRows[0].phone) finalContactPhone = ctRows[0].phone;
            if (!finalContactEmail && ctRows[0].email) finalContactEmail = ctRows[0].email;
          }
        }
        if (!finalContactPhone || !finalContactEmail) {
          const [cRows] = await connection.query('SELECT phone, email FROM customers WHERE id = ?', [customer_id]);
          if (cRows.length) {
            if (!finalContactPhone && cRows[0].phone && cRows[0].phone !== '-') finalContactPhone = cRows[0].phone;
            if (!finalContactEmail && cRows[0].email) finalContactEmail = cRows[0].email;
          }
        }
      }

      /*
       * Create Lead
       */
      const leadUuid = uuid();

      const [result] = await connection.query(
        `
        INSERT INTO leads
        (
          uuid,
          title,
          customer_id,
          contact_name,
          contact_email,
          contact_phone,
          company_name,
          source,
          stage_id,
          assigned_to,
          created_by,
          estimated_value,
          currency,
          probability,
          expected_close_date,

          actual_scheduled_week,
          rescheduled_week,
          lead_type,
          next_visit,
          pipeline,
          domain_id,

          description,
          priority,
          on_hold_reason
        )
        VALUES
        (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
        `,
        [
          leadUuid,
          title.trim(),

          customer_id || null,
          contact_name || null,
          finalContactEmail,
          finalContactPhone,
          company_name || null,

          source || 'other',
          stage_id,

          assigned_to || req.user.id,
          req.user.id,

          estimated_value || null,
          currency || 'INR',
          probability || 20,

          expected_close_date || null,

          actual_scheduled_week || null,
          rescheduled_week || null,
          lead_type || null,
          next_visit || null,
          pipeline || 'Standard Pipeline',
          domain_id,

          description || null,
          priority || 'medium',
          on_hold_reason || null
        ]
      );


      const leadId = result.insertId;


      /*
       * Insert Lead Products
       */
      for (const product of products) {

        if (!product.product_id) {
          continue;
        }

        await connection.query(
          `
          INSERT INTO lead_products
          (
            uuid,
            lead_id,
            product_id,
            category
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            uuid(),
            leadId,
            product.product_id,
            product.category || null
          ]
        );
      }


      /*
       * Lead history
       */
      await connection.query(
        `
        INSERT INTO lead_history
        (
          lead_id,
          changed_by,
          field_changed,
          new_value,
          note
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          leadId,
          req.user.id,
          'status',
          'Created',
          'Lead created'
        ]
      );


      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        id: leadId,
        uuid: leadUuid
      });

    } catch (error) {

      await connection.rollback();
      throw error;

    } finally {

      connection.release();

    }

  } catch (e) {

    console.error('Create lead error:', e);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.updateLead = async (req, res) => {
  try {

    const {
      title,
      customer_id,
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      source,
      stage_id,
      assigned_to,
      estimated_value,
      probability,
      expected_close_date,

      actual_scheduled_week,
      rescheduled_week,
      lead_type,
      next_visit,
      pipeline,
      domain_id,

      description,
      priority,
      won_reason,
      lost_reason,
      on_hold_reason,

      products
    } = req.body;


    const connection = await pool.getConnection();

    try {

      await connection.beginTransaction();


      /*
       * Existing lead with names for human-readable audit
       */
      const [existingRows] = await connection.query(
        `
        SELECT l.*,
               c.company_name AS customer_company_name,
               s.name AS stage_name,
               u.name AS assigned_to_name,
               d.name AS domain_name
        FROM leads l
        LEFT JOIN customers c ON l.customer_id = c.id
        LEFT JOIN lead_stages s ON l.stage_id = s.id
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN domains d ON l.domain_id = d.id
        WHERE l.id = ?
        `,
        [req.params.id]
      );


      if (!existingRows.length) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const existing = existingRows[0];

      const isLeadAdmin = req.user.role_name === 'admin';
      const isLeadManager = req.user.role_name === 'sales_manager';
      const leadUserDomainIds = req.user.domain_ids || [];
      const hasLeadDomainAccess = isLeadManager && existing.domain_id && leadUserDomainIds.includes(existing.domain_id);

      if (!isLeadAdmin && existing.assigned_to !== req.user.id && !hasLeadDomainAccess) {
        await connection.rollback();

        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to update this lead'
        });
      }

      const [existingProducts] = await connection.query(
        `
        SELECT lp.product_id, p.name AS product_name, lp.category
        FROM lead_products lp
        LEFT JOIN products p ON lp.product_id = p.id
        WHERE lp.lead_id = ?
        ORDER BY lp.id ASC
        `,
        [req.params.id]
      );


      /*
       * Detect changed fields for lead_edit_history (only for fields present in req.body)
       */
      let newCustomerName = null;
      if ('customer_id' in req.body && customer_id && String(customer_id) !== String(existing.customer_id || '')) {
        const [[custRow]] = await connection.query('SELECT company_name FROM customers WHERE id = ?', [customer_id]);
        newCustomerName = custRow?.company_name || String(customer_id);
      }

      let newStageName = null;
      if ('stage_id' in req.body && stage_id && Number(stage_id) !== Number(existing.stage_id)) {
        const [[stgRow]] = await connection.query('SELECT name FROM lead_stages WHERE id = ?', [stage_id]);
        newStageName = stgRow?.name || String(stage_id);
      }

      let newAssigneeName = null;
      if ('assigned_to' in req.body && assigned_to && Number(assigned_to) !== Number(existing.assigned_to || 0)) {
        const [[usrRow]] = await connection.query('SELECT name FROM users WHERE id = ?', [assigned_to]);
        newAssigneeName = usrRow?.name || String(assigned_to);
      }

      let newDomainName = null;
      if ('domain_id' in req.body && domain_id && Number(domain_id) !== Number(existing.domain_id || 0)) {
        const [[domRow]] = await connection.query('SELECT name FROM domains WHERE id = ?', [domain_id]);
        newDomainName = domRow?.name || String(domain_id);
      }

      const fieldDiffs = [];

      const toDateStr = (val) => {
        if (!val) return '';
        try {
          const d = new Date(val);
          return isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0];
        } catch {
          return String(val);
        }
      };

      const checkField = (field, label, oldVal, newVal) => {
        const cleanOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
        const cleanNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();
        if (cleanOld !== cleanNew) {
          fieldDiffs.push({
            field,
            label,
            old: cleanOld || 'None',
            new: cleanNew || 'None',
          });
        }
      };

      if ('title' in req.body) checkField('title', 'Lead Name', existing.title, title);

      if ('customer_id' in req.body && String(customer_id || '') !== String(existing.customer_id || '')) {
        fieldDiffs.push({
          field: 'customer_id',
          label: 'Customer',
          old: existing.customer_company_name || 'None',
          new: newCustomerName || (customer_id ? String(customer_id) : 'None'),
        });
      }

      if ('contact_name' in req.body) checkField('contact_name', 'Contact Name', existing.contact_name, contact_name);
      if ('contact_email' in req.body) checkField('contact_email', 'Contact Email', existing.contact_email, contact_email);
      if ('contact_phone' in req.body) checkField('contact_phone', 'Contact Phone', existing.contact_phone, contact_phone);
      if ('company_name' in req.body) checkField('company_name', 'Company Name', existing.company_name, company_name);
      if ('source' in req.body) checkField('source', 'Deal Source', existing.source, source);

      if ('stage_id' in req.body && Number(stage_id) !== Number(existing.stage_id)) {
        fieldDiffs.push({
          field: 'stage_id',
          label: 'Lead Stage',
          old: existing.stage_name || 'None',
          new: newStageName || String(stage_id),
        });
      }

      if ('assigned_to' in req.body && String(assigned_to || '') !== String(existing.assigned_to || '')) {
        fieldDiffs.push({
          field: 'assigned_to',
          label: 'Lead Owner',
          old: existing.assigned_to_name || 'Unassigned',
          new: newAssigneeName || (assigned_to ? String(assigned_to) : 'Unassigned'),
        });
      }

      if ('estimated_value' in req.body && Number(estimated_value || 0) !== Number(existing.estimated_value || 0)) {
        fieldDiffs.push({
          field: 'estimated_value',
          label: 'Amount',
          old: existing.estimated_value ? String(existing.estimated_value) : '0',
          new: estimated_value ? String(estimated_value) : '0',
        });
      }

      if ('probability' in req.body && Number(probability || 0) !== Number(existing.probability || 0)) {
        fieldDiffs.push({
          field: 'probability',
          label: 'Probability (%)',
          old: `${existing.probability || 0}%`,
          new: `${probability || 0}%`,
        });
      }

      if ('expected_close_date' in req.body) {
        const oldClose = toDateStr(existing.expected_close_date);
        const newClose = toDateStr(expected_close_date);
        if (oldClose !== newClose) {
          fieldDiffs.push({
            field: 'expected_close_date',
            label: 'Closing Date',
            old: oldClose || 'None',
            new: newClose || 'None',
          });
        }
      }

      if ('actual_scheduled_week' in req.body) checkField('actual_scheduled_week', 'Actual Scheduled Week', existing.actual_scheduled_week, actual_scheduled_week);
      if ('rescheduled_week' in req.body) checkField('rescheduled_week', 'Re-Scheduled Week', existing.rescheduled_week, rescheduled_week);
      if ('lead_type' in req.body) checkField('lead_type', 'Lead Type', existing.lead_type, lead_type);

      if ('next_visit' in req.body) {
        const oldVisit = toDateStr(existing.next_visit);
        const newVisit = toDateStr(next_visit);
        if (oldVisit !== newVisit) {
          fieldDiffs.push({
            field: 'next_visit',
            label: 'Next Visit Date',
            old: oldVisit || 'None',
            new: newVisit || 'None',
          });
        }
      }

      if ('pipeline' in req.body) checkField('pipeline', 'Lead Pipeline', existing.pipeline, pipeline);

      if ('domain_id' in req.body && String(domain_id || '') !== String(existing.domain_id || '')) {
        fieldDiffs.push({
          field: 'domain_id',
          label: 'Domain',
          old: existing.domain_name || 'None',
          new: newDomainName || (domain_id ? String(domain_id) : 'None'),
        });
      }

      if ('priority' in req.body) checkField('priority', 'Priority', existing.priority, priority);
      if ('description' in req.body) checkField('description', 'Description', existing.description, description);
      if ('won_reason' in req.body) checkField('won_reason', 'Won Reason', existing.won_reason, won_reason);
      if ('lost_reason' in req.body) checkField('lost_reason', 'Lost Reason', existing.lost_reason, lost_reason);
      if ('on_hold_reason' in req.body) checkField('on_hold_reason', 'On Hold Reason', existing.on_hold_reason, on_hold_reason);

      // Check product changes (only if products is passed)
      if ('products' in req.body && Array.isArray(products)) {
        let newProdSummary = '';
        if (products.length > 0) {
          const pids = products.map(p => p.product_id).filter(Boolean);
          if (pids.length > 0) {
            const [pRows] = await connection.query('SELECT id, name FROM products WHERE id IN (?)', [pids]);
            const pMap = Object.fromEntries(pRows.map(r => [r.id, r.name]));
            newProdSummary = products
              .filter(p => p.product_id)
              .map(p => `${pMap[p.product_id] || p.product_id} (${p.category || 'PRODUCT'})`)
              .join(', ');
          }
        }
        const oldProdSummary = existingProducts
          .map(p => `${p.product_name || p.product_id} (${p.category || 'PRODUCT'})`)
          .join(', ');

        if (oldProdSummary !== newProdSummary) {
          fieldDiffs.push({
            field: 'products',
            label: 'Products',
            old: oldProdSummary || 'None',
            new: newProdSummary || 'None',
          });
        }
      }


      /*
       * Coalesce fields for update (so single-field edits keep existing values)
       */
      const finalTitle = 'title' in req.body ? title : existing.title;
      const finalCustomerId = 'customer_id' in req.body ? (customer_id || null) : existing.customer_id;
      const finalContactName = 'contact_name' in req.body ? (contact_name || null) : existing.contact_name;
      const finalContactEmail = 'contact_email' in req.body ? (contact_email || null) : existing.contact_email;
      const finalContactPhone = 'contact_phone' in req.body ? (contact_phone || null) : existing.contact_phone;
      const finalCompanyName = 'company_name' in req.body ? (company_name || null) : existing.company_name;
      const finalSource = 'source' in req.body ? (source || 'other') : existing.source;
      const finalStageId = 'stage_id' in req.body ? stage_id : existing.stage_id;
      const finalAssignedTo = 'assigned_to' in req.body ? (assigned_to || null) : existing.assigned_to;
      const finalEstimatedValue = 'estimated_value' in req.body ? (estimated_value || null) : existing.estimated_value;
      const finalProbability = 'probability' in req.body ? (probability || 20) : existing.probability;
      const finalExpectedCloseDate = 'expected_close_date' in req.body ? (expected_close_date || null) : existing.expected_close_date;
      const finalActualScheduledWeek = 'actual_scheduled_week' in req.body ? (actual_scheduled_week || null) : existing.actual_scheduled_week;
      const finalRescheduledWeek = 'rescheduled_week' in req.body ? (rescheduled_week || null) : existing.rescheduled_week;
      const finalLeadType = 'lead_type' in req.body ? (lead_type || null) : existing.lead_type;
      const finalNextVisit = 'next_visit' in req.body ? (next_visit || null) : existing.next_visit;
      const finalPipeline = 'pipeline' in req.body ? (pipeline || 'Standard Pipeline') : existing.pipeline;
      const finalDomainId = 'domain_id' in req.body ? (domain_id || null) : existing.domain_id;
      const finalDescription = 'description' in req.body ? (description || null) : existing.description;
      const finalPriority = 'priority' in req.body ? (priority || 'medium') : existing.priority;
      const finalWonReason = 'won_reason' in req.body ? (won_reason || null) : existing.won_reason;
      const finalLostReason = 'lost_reason' in req.body ? (lost_reason || null) : existing.lost_reason;
      const finalOnHoldReason = 'on_hold_reason' in req.body ? (on_hold_reason || null) : existing.on_hold_reason;

      await connection.query(
        `
        UPDATE leads
        SET
          title = ?,
          customer_id = ?,
          contact_name = ?,
          contact_email = ?,
          contact_phone = ?,
          company_name = ?,
          source = ?,
          stage_id = ?,
          assigned_to = ?,
          estimated_value = ?,
          probability = ?,
          expected_close_date = ?,

          actual_scheduled_week = ?,
          rescheduled_week = ?,
          lead_type = ?,
          next_visit = ?,
          pipeline = ?,
          domain_id = ?,

          description = ?,
          priority = ?,
          won_reason = ?,
          lost_reason = ?,
          on_hold_reason = ?

        WHERE id = ?
        `,
        [
          finalTitle,
          finalCustomerId,
          finalContactName,
          finalContactEmail,
          finalContactPhone,
          finalCompanyName,
          finalSource,
          finalStageId,
          finalAssignedTo,
          finalEstimatedValue,
          finalProbability,
          finalExpectedCloseDate,

          finalActualScheduledWeek,
          finalRescheduledWeek,
          finalLeadType,
          finalNextVisit,
          finalPipeline,
          finalDomainId,

          finalDescription,
          finalPriority,
          finalWonReason,
          finalLostReason,
          finalOnHoldReason,

          req.params.id
        ]
      );


      /*
       * Replace lead products (only if products is provided in req.body)
       */
      if ('products' in req.body && Array.isArray(products)) {

        await connection.query(
          `
          DELETE FROM lead_products
          WHERE lead_id = ?
          `,
          [req.params.id]
        );


        for (const product of products) {

          if (!product.product_id) {
            continue;
          }

          await connection.query(
            `
            INSERT INTO lead_products
            (
              uuid,
              lead_id,
              product_id,
              category
            )
            VALUES (?, ?, ?, ?)
            `,
            [
              uuid(),
              req.params.id,
              product.product_id,
              product.category || null
            ]
          );
        }
      }


      /*
       * Stage history (lead_history)
       */
      if (
        'stage_id' in req.body &&
        stage_id &&
        Number(stage_id) !== Number(existing.stage_id)
      ) {
        if (!newStageName) {
          const [[stgRow]] = await connection.query('SELECT name FROM lead_stages WHERE id = ?', [stage_id]);
          newStageName = stgRow?.name || String(stage_id);
        }
        await connection.query(
          `
          INSERT INTO lead_history
          (
            lead_id,
            changed_by,
            field_changed,
            old_value,
            new_value
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            req.params.id,
            req.user.id,
            'stage',
            existing.stage_name || 'Unknown',
            newStageName || String(stage_id)
          ]
        );
      }


      /*
       * Record all field changes in lead_edit_history
       */
      for (const diff of fieldDiffs) {
        await connection.query(
          `
          INSERT INTO lead_edit_history
          (
            lead_id,
            field_name,
            field_label,
            old_value,
            new_value,
            changed_by,
            changed_at
          )
          VALUES (?, ?, ?, ?, ?, ?, NOW())
          `,
          [
            req.params.id,
            diff.field,
            diff.label,
            diff.old,
            diff.new,
            req.user.id
          ]
        );
      }


      await connection.commit();


      res.json({
        success: true,
        message: 'Lead updated successfully',
        changes_count: fieldDiffs.length
      });

    } catch (error) {

      await connection.rollback();
      throw error;

    } finally {

      connection.release();

    }

  } catch (e) {

    console.error('Update lead error:', e);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Fallback map — used only if lead_stages.probability column is missing/null
const STAGE_PROBABILITY_FALLBACK = {
  new: 10,
  contacted: 20,
  qualified: 40,
  proposal: 60,
  won: 100,
  lost: 0,
};

exports.updateStage = async (req, res) => {
  try {
    const { stage_id, note, won_reason, lost_reason } = req.body;

    const [ex] = await pool.query(
      'SELECT stage_id, assigned_to, domain_id FROM leads WHERE id=?',
      [req.params.id]
    );

    if (!ex.length) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const isStageAdmin = req.user.role_name === 'admin';
    const isStageManager = req.user.role_name === 'sales_manager';
    const stageUserDomainIds = req.user.domain_ids || [];
    const hasStageDomainAccess = isStageManager && ex[0].domain_id && stageUserDomainIds.includes(ex[0].domain_id);

    if (!isStageAdmin && ex[0].assigned_to !== req.user.id && !hasStageDomainAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to update this lead',
      });
    }

    const [[stage]] = await pool.query(
      'SELECT * FROM lead_stages WHERE id=?',
      [stage_id]
    );

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }
    
    let probability;

    if (stage.is_won) {
      probability = 100;
    } else if (stage.is_closed) {
      probability = 0;
    } else if (stage.probability !== undefined && stage.probability !== null) {
      probability = stage.probability;
    } else {
      const key = (stage.code || '').split('_')[0].toLowerCase();
      probability = STAGE_PROBABILITY_FALLBACK[key] ?? 20;
    }

    const close_date = stage.is_closed ? new Date() : null;

    await pool.query(
      `UPDATE leads
       SET stage_id=?, probability=?, won_reason=?, lost_reason=?, actual_close_date=?
       WHERE id=?`,
      [
        stage_id,
        probability,
        won_reason,
        lost_reason,
        close_date,
        req.params.id,
      ]
    );

    const [[os]] = await pool.query(
      'SELECT name FROM lead_stages WHERE id=?',
      [ex[0].stage_id]
    );

    await pool.query(
      'INSERT INTO lead_history (lead_id,changed_by,field_changed,old_value,new_value,note) VALUES (?,?,?,?,?,?)',
      [req.params.id, req.user.id, 'stage', os?.name, stage.name, note]
    );

    // Also record in lead_edit_history
    if (ex[0].stage_id !== Number(stage_id)) {
      await pool.query(
        `INSERT INTO lead_edit_history (lead_id, field_name, field_label, old_value, new_value, changed_by, changed_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [req.params.id, 'stage_id', 'Pipeline Stage', os?.name || 'Unknown', stage.name || 'Unknown', req.user.id]
      );
    }
    if (won_reason) {
      await pool.query(
        `INSERT INTO lead_edit_history (lead_id, field_name, field_label, old_value, new_value, changed_by, changed_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [req.params.id, 'won_reason', 'Won Reason', '', won_reason, req.user.id]
      );
    }
    if (lost_reason) {
      await pool.query(
        `INSERT INTO lead_edit_history (lead_id, field_name, field_label, old_value, new_value, changed_by, changed_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [req.params.id, 'lost_reason', 'Lost Reason', '', lost_reason, req.user.id]
      );
    }

    res.json({ success: true, stage, probability });
  } catch (e) {
    console.error('Update stage error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getLeadEditHistory = async (req, res) => {
  try {
    const [lead] = await pool.query('SELECT assigned_to FROM leads WHERE id = ?', [req.params.id]);
    if (!lead.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    if (req.user.role_name !== 'admin' && lead[0].assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to view this lead' });
    }
    const [rows] = await pool.query(
      `SELECT leh.*, u.name AS changed_by_name
       FROM lead_edit_history leh
       JOIN users u ON leh.changed_by = u.id
       WHERE leh.lead_id = ?
       ORDER BY leh.changed_at DESC, leh.id DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Get lead edit history error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const [rows] = await pool.query('SELECT id, title, is_active FROM leads WHERE id = ?', [leadId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    await pool.query('UPDATE leads SET is_active = FALSE WHERE id = ?', [leadId]);
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (e) {
    console.error('deleteLead error:', e);
    res.status(500).json({ success: false, message: 'Server error deleting lead' });
  }
};

exports.restoreLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const [rows] = await pool.query('SELECT id, title, is_active FROM leads WHERE id = ?', [leadId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    await pool.query('UPDATE leads SET is_active = TRUE WHERE id = ?', [leadId]);
    res.json({ success: true, message: 'Lead restored successfully' });
  } catch (e) {
    console.error('restoreLead error:', e);
    res.status(500).json({ success: false, message: 'Server error restoring lead' });
  }
};

exports.bulkUpdateLeads = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { lead_ids, field, value } = req.body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads selected for update' });
    }

    const ALLOWED_BULK_FIELDS = {
      title: { label: 'Lead Name', column: 'title' },
      stage_id: { label: 'Lead Stage', column: 'stage_id', isInt: true },
      expected_close_date: { label: 'Closing Date', column: 'expected_close_date', isDate: true },
      lead_type: { label: 'Lead Type', column: 'lead_type' },
      description: { label: 'Description', column: 'description' },
      next_visit: { label: 'Next Visit Date', column: 'next_visit', isDate: true },
      actual_scheduled_week: { label: 'Actual Scheduled Week', column: 'actual_scheduled_week' },
      domain_id: { label: 'Domain', column: 'domain_id', isInt: true },
      rescheduled_week: { label: 'Re-Scheduled Week', column: 'rescheduled_week' },
      on_hold_reason: { label: 'On Hold Reason', column: 'on_hold_reason' },
      assigned_to: { label: 'Change Ownership', column: 'assigned_to', isInt: true, adminOnly: true },
    };

    const fieldConfig = ALLOWED_BULK_FIELDS[field];
    if (!fieldConfig) {
      return res.status(400).json({ success: false, message: 'Invalid field specified for bulk update' });
    }

    // Sanitize value according to field type
    let sanitizedValue = value;
    if (fieldConfig.isDate) {
      if (!value || String(value).trim() === '') {
        sanitizedValue = null;
      } else {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid date provided' });
        }
        sanitizedValue = d.toISOString().split('T')[0];
      }
    } else if (fieldConfig.isInt) {
      if (!value || String(value).trim() === '') {
        sanitizedValue = null;
      } else {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          return res.status(400).json({ success: false, message: 'Invalid integer value provided' });
        }
        sanitizedValue = num;
      }
    } else {
      if (value === null || value === undefined) {
        sanitizedValue = null;
      } else {
        sanitizedValue = String(value).trim();
      }
    }

    await connection.beginTransaction();

    const isLeadAdmin = req.user.role_name === 'admin';

    // Permission check for admin-only bulk fields (e.g. Change Ownership)
    if (fieldConfig.adminOnly && !isLeadAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only administrators can change lead ownership'
      });
    }

    // Query existing leads with domain name and assigned user name for audit
    const [existingLeads] = await connection.query(
      `SELECT l.*, d.name AS domain_name, u.name AS assigned_user_name, s.name AS stage_name
       FROM leads l
       LEFT JOIN domains d ON l.domain_id = d.id
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN lead_stages s ON l.stage_id = s.id
       WHERE l.id IN (?) AND l.is_active = 1`,
      [lead_ids]
    );

    if (!existingLeads.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'No matching active leads found' });
    }
    const isLeadManager = req.user.role_name === 'sales_manager';
    const leadUserDomainIds = req.user.domain_ids || [];

    const authorizedLeads = existingLeads.filter(lead => {
      if (isLeadAdmin) return true;
      if (isLeadManager && lead.domain_id && leadUserDomainIds.includes(lead.domain_id)) return true;
      return lead.assigned_to === req.user.id;
    });

    if (!authorizedLeads.length) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to update the selected leads',
      });
    }

    let newStageRow = null;
    if (field === 'stage_id' && sanitizedValue) {
      const [[sRow]] = await connection.query('SELECT * FROM lead_stages WHERE id = ?', [sanitizedValue]);
      if (!sRow) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Invalid stage selected' });
      }
      newStageRow = sRow;
    }

    let newDomainName = null;
    if (field === 'domain_id' && sanitizedValue) {
      const [[domRow]] = await connection.query('SELECT name FROM domains WHERE id = ?', [sanitizedValue]);
      newDomainName = domRow?.name || String(sanitizedValue);
    }

    let newUserName = null;
    if (field === 'assigned_to' && sanitizedValue) {
      const [[userRow]] = await connection.query('SELECT name FROM users WHERE id = ?', [sanitizedValue]);
      newUserName = userRow?.name || String(sanitizedValue);
    }

    const auditEntries = [];
    const idsToUpdate = [];

    const toDateStr = (val) => {
      if (!val) return '';
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0];
      } catch {
        return String(val);
      }
    };

    for (const lead of authorizedLeads) {
      const oldVal = lead[field];
      let oldDisplay = oldVal;
      let newDisplay = sanitizedValue;

      if (fieldConfig.isDate) {
        oldDisplay = toDateStr(oldVal);
        newDisplay = sanitizedValue || '';
      } else if (field === 'stage_id') {
        oldDisplay = lead.stage_name || (oldVal ? String(oldVal) : 'None');
        newDisplay = newStageRow?.name || (sanitizedValue ? String(sanitizedValue) : 'None');
      } else if (field === 'domain_id') {
        oldDisplay = lead.domain_name || (oldVal ? String(oldVal) : 'None');
        newDisplay = newDomainName || 'None';
      } else if (field === 'assigned_to') {
        oldDisplay = lead.assigned_user_name || (oldVal ? String(oldVal) : 'Unassigned');
        newDisplay = newUserName || 'Unassigned';
      }

      const cleanOld = oldDisplay === null || oldDisplay === undefined ? '' : String(oldDisplay).trim();
      const cleanNew = newDisplay === null || newDisplay === undefined ? '' : String(newDisplay).trim();

      idsToUpdate.push(lead.id);

      if (cleanOld !== cleanNew) {
        auditEntries.push([
          lead.id,
          field,
          fieldConfig.label,
          cleanOld || 'None',
          cleanNew || 'None',
          req.user.id,
        ]);
      }
    }

    if (idsToUpdate.length > 0) {
      if (field === 'stage_id' && newStageRow) {
        let stageProbability = null;
        if (newStageRow.is_won) {
          stageProbability = 100;
        } else if (newStageRow.is_closed) {
          stageProbability = 0;
        } else if (newStageRow.probability !== undefined && newStageRow.probability !== null) {
          stageProbability = newStageRow.probability;
        } else {
          const key = (newStageRow.code || '').split('_')[0].toLowerCase();
          stageProbability = STAGE_PROBABILITY_FALLBACK[key] ?? 20;
        }
        const stageActualCloseDate = newStageRow.is_closed ? new Date() : null;

        await connection.query(
          `UPDATE leads SET stage_id = ?, probability = ?, actual_close_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (?)`,
          [sanitizedValue, stageProbability, stageActualCloseDate, idsToUpdate]
        );

        // Also insert into lead_history for timeline
        const historyEntries = authorizedLeads.map(lead => [
          lead.id,
          req.user.id,
          'stage',
          lead.stage_name || 'Unknown',
          newStageRow.name,
          'Bulk stage update'
        ]);
        if (historyEntries.length > 0) {
          await connection.query(
            'INSERT INTO lead_history (lead_id, changed_by, field_changed, old_value, new_value, note) VALUES ?',
            [historyEntries]
          );
        }
      } else {
        await connection.query(
          `UPDATE leads SET ${fieldConfig.column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (?)`,
          [sanitizedValue, idsToUpdate]
        );
      }

      if (auditEntries.length > 0) {
        await connection.query(
          `INSERT INTO lead_edit_history (lead_id, field_name, field_label, old_value, new_value, changed_by) VALUES ?`,
          [auditEntries]
        );
      }

      if (field === 'assigned_to' && sanitizedValue && Number(sanitizedValue) !== req.user.id) {
        try {
          await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
            [
              sanitizedValue,
              'Leads Reassigned',
              `You have been assigned ${idsToUpdate.length} lead${idsToUpdate.length === 1 ? '' : 's'} by ${req.user.name || 'Admin'}.`,
              'info',
              '/leads'
            ]
          );
        } catch (notifErr) {
          // non-blocking
        }
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `Successfully updated ${idsToUpdate.length} lead${idsToUpdate.length === 1 ? '' : 's'}`,
      updatedCount: idsToUpdate.length,
      skippedCount: lead_ids.length - idsToUpdate.length,
    });
  } catch (err) {
    await connection.rollback();
    console.error('bulkUpdateLeads error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error bulk updating leads' });
  } finally {
    connection.release();
  }
};

exports.getStages = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM lead_stages ORDER BY order_position');
  res.json({ success: true, data: rows });
};

// ── Admin: dynamic stage management ──
exports.createStage = async (req, res) => {
  try {
    const { name, color, description, is_closed, is_won } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const code = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const [[{ maxPos }]] = await pool.query('SELECT COALESCE(MAX(order_position),0) AS maxPos FROM lead_stages');
    const [r] = await pool.query(
      'INSERT INTO lead_stages (name,code,color,order_position,is_closed,is_won,description) VALUES (?,?,?,?,?,?,?)',
      [name, `${code}_${Date.now()}`, color || '#2563eb', maxPos + 1, !!is_closed, !!is_won, description || null]
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateStageDef = async (req, res) => {
  try {
    const { name, color, description, is_closed, is_won } = req.body;
    await pool.query('UPDATE lead_stages SET name=?,color=?,description=?,is_closed=?,is_won=? WHERE id=?',
      [name, color, description || null, !!is_closed, !!is_won, req.params.id]);
    res.json({ success: true, message: 'Stage updated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteStage = async (req, res) => {
  try {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM leads WHERE stage_id=?', [req.params.id]);
    if (cnt > 0) return res.status(400).json({ success: false, message: `Cannot delete: ${cnt} lead(s) are in this stage. Move them first.` });
    await pool.query('DELETE FROM lead_stages WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Stage deleted' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.reorderStages = async (req, res) => {
  try {
    const { order } = req.body; // array of stage ids in desired order
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'order array required' });
    for (let i = 0; i < order.length; i++) {
      await pool.query('UPDATE lead_stages SET order_position=? WHERE id=?', [i + 1, order[i]]);
    }
    res.json({ success: true, message: 'Order updated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/* ─── SETTINGS ─────────────────────────────────────────────────────────── */
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM app_settings');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, data: settings });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const entries = Object.entries(req.body || {});
    for (const [key, value] of entries) {
      await pool.query(
        'INSERT INTO app_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?',
        [key, String(value), String(value)]
      );
    }
    res.json({ success: true, message: 'Settings updated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getPipeline = async (req, res) => {
  try {
    let uf = '', p = [];
    if (req.user.role_name !== 'admin') { uf = 'AND l.assigned_to=?'; p.push(req.user.id); }
    const [rows] = await pool.query(`SELECT s.*,COUNT(l.id) AS lead_count,COALESCE(SUM(l.estimated_value),0) AS total_value FROM lead_stages s LEFT JOIN leads l ON l.stage_id=s.id AND l.is_active=TRUE ${uf} GROUP BY s.id ORDER BY s.order_position`, p);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/* ─── VISITS ─────────────────────────────────────────────────────────────── */
exports.checkIn = async (req, res) => {
  try {
    const { customer_id, latitude, longitude, accuracy, address, notes, purpose } = req.body;
    if (!customer_id || !latitude || !longitude) return res.status(400).json({ success: false, message: 'customer_id, latitude, longitude required' });
    const [active] = await pool.query('SELECT id FROM visit_sessions WHERE user_id=? AND customer_id=? AND check_out_id IS NULL', [req.user.id, customer_id]);
    if (active.length) return res.status(400).json({ success: false, message: 'Already checked in. Check out first.' });

    // Geofence check against the customer's registered location
    const [[customer]] = await pool.query('SELECT latitude, longitude FROM customers WHERE id=?', [customer_id]);
    let distance = null, withinGeofence = null;
    if (customer && customer.latitude != null && customer.longitude != null) {
      distance = Math.round(distanceMeters(customer.latitude, customer.longitude, latitude, longitude));
      const radius = parseFloat(await getSetting('checkin_radius_meters', '250'));
      withinGeofence = distance <= radius;
    }

    const now = new Date();
    const vid = uuid(), sid = uuid();
    const [vi] = await pool.query('INSERT INTO visits (uuid,user_id,customer_id,visit_type,latitude,longitude,accuracy,address,timestamp,notes) VALUES (?,?,?,?,?,?,?,?,?,?)', [vid, req.user.id, customer_id, 'check_in', latitude, longitude, accuracy, address, now, notes]);
    const [si] = await pool.query('INSERT INTO visit_sessions (uuid,user_id,customer_id,check_in_id,check_in_time,check_in_lat,check_in_lng,purpose,distance_meters,within_geofence) VALUES (?,?,?,?,?,?,?,?,?,?)', [sid, req.user.id, customer_id, vi.insertId, now, latitude, longitude, purpose, distance, withinGeofence]);
    res.status(201).json({ success: true, visit_id: vi.insertId, session_id: si.insertId, timestamp: now, distance_meters: distance, within_geofence: withinGeofence });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.checkOut = async (req, res) => {
  try {
    const { session_id, latitude, longitude, accuracy, address, notes, outcome, follow_up_date } = req.body;
    if (!session_id || !latitude || !longitude) return res.status(400).json({ success: false, message: 'session_id, latitude, longitude required' });
    const [ss] = await pool.query('SELECT * FROM visit_sessions WHERE id=? AND user_id=? AND check_out_id IS NULL', [session_id, req.user.id]);
    if (!ss.length) return res.status(404).json({ success: false, message: 'Active session not found' });

    // Geofence check at checkout too
    const [[customer]] = await pool.query('SELECT latitude, longitude FROM customers WHERE id=?', [ss[0].customer_id]);
    let checkoutDistance = null, checkoutWithinGeofence = null;
    if (customer && customer.latitude != null && customer.longitude != null) {
      checkoutDistance = Math.round(distanceMeters(customer.latitude, customer.longitude, latitude, longitude));
      const radius = parseFloat(await getSetting('checkin_radius_meters', '250'));
      checkoutWithinGeofence = checkoutDistance <= radius;
    }

    const now = new Date();
    const dur = Math.round((now - new Date(ss[0].check_in_time)) / 60000);
    const [vi] = await pool.query(
      'INSERT INTO visits (uuid,user_id,customer_id,visit_type,latitude,longitude,accuracy,address,timestamp,notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(), req.user.id, ss[0].customer_id, 'check_out', latitude, longitude, accuracy, address, now, notes]
    );
    await pool.query(
      'UPDATE visit_sessions SET check_out_id=?,check_out_time=?,duration_minutes=?,check_out_lat=?,check_out_lng=?,outcome=?,follow_up_date=?,checkout_distance_meters=?,checkout_within_geofence=? WHERE id=?',
      [vi.insertId, now, dur, latitude, longitude, outcome, follow_up_date || null, checkoutDistance, checkoutWithinGeofence, session_id]
    );
    res.json({ success: true, duration_minutes: dur, timestamp: now, checkout_distance_meters: checkoutDistance, checkout_within_geofence: checkoutWithinGeofence });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const uid = req.user.role_name !== 'admin' ? req.user.id : (req.query.user_id || req.user.id);
    const [rows] = await pool.query(`SELECT vs.*,c.company_name,c.contact_person,c.city,u.name AS user_name FROM visit_sessions vs JOIN customers c ON vs.customer_id=c.id JOIN users u ON vs.user_id=u.id WHERE vs.user_id=? AND vs.check_out_id IS NULL ORDER BY vs.check_in_time DESC`, [uid]);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getVisitHistory = async (req, res) => {
  try {
    const { page = 1, limit = 25, date_from, date_to, user_id } = req.query;
    const off = (page - 1) * limit;
    let w = ['1=1'], p = [];
    if (req.user.role_name !== 'admin') { w.push('vs.user_id=?'); p.push(req.user.id); }
    else if (user_id) { w.push('vs.user_id=?'); p.push(user_id); }
    if (date_from) { w.push('vs.check_in_time>=?'); p.push(date_from); }
    if (date_to) { w.push('vs.check_in_time<=?'); p.push(date_to + ' 23:59:59'); }
    const ws = w.join(' AND ');
    const [rows] = await pool.query(
      `SELECT vs.*,
              c.company_name, c.contact_person, c.city,
              c.latitude AS customer_lat, c.longitude AS customer_lng,
              u.name AS user_name
       FROM visit_sessions vs
       JOIN customers c ON vs.customer_id = c.id
       JOIN users u ON vs.user_id = u.id
       WHERE ${ws}
       ORDER BY vs.check_in_time DESC
       LIMIT ? OFFSET ?`,
      [...p, parseInt(limit), off]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM visit_sessions vs WHERE ${ws}`, p);
    res.json({ success: true, data: rows, total, page: parseInt(page) });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getLiveTracking = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT vs.user_id,u.name,vs.check_in_lat AS lat,vs.check_in_lng AS lng,vs.check_in_time,c.company_name,c.city,vs.id AS session_id FROM visit_sessions vs JOIN users u ON vs.user_id=u.id JOIN customers c ON vs.customer_id=c.id WHERE vs.check_out_id IS NULL ORDER BY vs.check_in_time DESC`);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/* ─── ACTIVITIES ─────────────────────────────────────────────────────────── */
exports.getActivities = async (req, res) => {
  try {
    const { lead_id, customer_id } = req.query;
    let w = ['1=1'], p = [];
    if (req.user.role_name !== 'admin') { w.push('a.user_id=?'); p.push(req.user.id); }
    if (lead_id) { w.push('a.lead_id=?'); p.push(lead_id); }
    if (customer_id) { w.push('a.customer_id=?'); p.push(customer_id); }
    const [rows] = await pool.query(`SELECT a.*,u.name AS user_name FROM activities a JOIN users u ON a.user_id=u.id WHERE ${w.join(' AND ')} ORDER BY a.created_at DESC LIMIT 50`, p);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createActivity = async (req, res) => {
  try {
    const { type, title, description, lead_id, customer_id, scheduled_at, outcome } = req.body;
    const [r] = await pool.query(
      'INSERT INTO activities (uuid,type,title,description,lead_id,customer_id,user_id,scheduled_at,outcome) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(), type, title, description, lead_id || null, customer_id || null, req.user.id, scheduled_at || null, outcome || null]
    );

    const related_to_type = lead_id ? 'Lead' : (customer_id ? 'Customer' : null);
    const related_to_id = lead_id || customer_id || null;

    let validDate = null;
    if (scheduled_at) {
      const d = new Date(scheduled_at);
      if (!isNaN(d.getTime())) validDate = d;
    }
    if (!validDate) validDate = new Date();

    const pad = n => String(n).padStart(2, '0');
    const toMysqlDatetime = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const toMysqlDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dateStr = toMysqlDatetime(validDate);
    const toDate = new Date(validDate.getTime() + 60 * 60 * 1000);
    const toDateStr = toMysqlDatetime(toDate);
    const dueDateStr = toMysqlDate(validDate);

    const actType = (type || '').toLowerCase();

    if (actType === 'meeting') {
      const meetingStatus = outcome ? 'Completed' : 'Not Started';
      await pool.query(`
        INSERT INTO meetings (
          meeting_subject, from_date, to_date, meeting_status, customer_type,
          meeting_type, participants_reminder, reminder, all_day,
          meeting_owner_id, related_to_type, related_to_id, description,
          created_by, modified_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title || 'Meeting',
        dateStr,
        toDateStr,
        meetingStatus,
        'New',
        'In Person',
        'None',
        'None',
        0,
        req.user.id,
        related_to_type,
        related_to_id,
        description ? description.trim() : null,
        req.user.id,
        req.user.id
      ]);
    } else if (actType === 'task') {
      const taskStatus = outcome ? 'Completed' : 'Not Started';
      await pool.query(`
        INSERT INTO tasks (
          task_subject, due_date, task_status, reminder, priority,
          task_owner_id, related_to_type, related_to_id, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title || 'Task',
        dueDateStr,
        taskStatus,
        0,
        'Medium',
        req.user.id,
        related_to_type,
        related_to_id,
        description ? description.trim() : null
      ]);
    } else if (actType === 'call') {
      const callStatus = outcome ? 'Completed' : 'Scheduled';
      const validResults = ['Interested', 'Not Interested', 'No response/Busy', 'Requested more info', 'Requested call back', 'Invalid number'];
      const matchedResult = validResults.find(r => r.toLowerCase() === (outcome || '').trim().toLowerCase()) || null;
      const fullDesc = outcome && !matchedResult
        ? (description ? `${description}\nOutcome: ${outcome}` : `Outcome: ${outcome}`)
        : (description ? description.trim() : null);

      await pool.query(`
        INSERT INTO calls (
          call_subject, call_type, call_status, start_time,
          duration_minutes, duration_seconds, call_purpose, call_result,
          reminder, call_owner_id, related_to_type, related_to_id,
          description, created_by, modified_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title || 'Call',
        'Outbound',
        callStatus,
        dateStr,
        0,
        0,
        'Prospecting',
        matchedResult,
        'None',
        req.user.id,
        related_to_type,
        related_to_id,
        fullDesc,
        req.user.id,
        req.user.id
      ]);
    }

    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) {
    console.error('Create activity error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ─── ANALYTICS ─────────────────────────────────────────────────────────── */
exports.getDashboard = async (req, res) => {
  try {
    const uid = req.user.id, role = req.user.role_name;
    const isRestricted = role !== 'admin';

    // Each query below uses its own alias-correct WHERE fragment.
    const leadFilter = isRestricted ? 'AND assigned_to=?' : '';
    const leadFilterAliased = isRestricted ? 'AND l.assigned_to=?' : '';
    const visitFilter = isRestricted ? 'AND vs.user_id=?' : '';
    const args = isRestricted ? [uid] : [];

    const [[tl]] = await pool.query(`SELECT COUNT(*) AS v FROM leads WHERE is_active=TRUE ${leadFilter}`, args);
    const [[al]] = await pool.query(`SELECT COUNT(*) AS v FROM leads l JOIN lead_stages s ON l.stage_id=s.id WHERE l.is_active=TRUE AND s.is_closed=FALSE ${leadFilterAliased}`, args);
    const [[wl]] = await pool.query(`SELECT COUNT(*) AS v,COALESCE(SUM(l.estimated_value),0) AS rev FROM leads l JOIN lead_stages s ON l.stage_id=s.id WHERE l.is_active=TRUE AND s.is_won=TRUE AND MONTH(l.actual_close_date)=MONTH(NOW()) AND YEAR(l.actual_close_date)=YEAR(NOW()) ${leadFilterAliased}`, args);
    const [[pv]] = await pool.query(`SELECT COALESCE(SUM(l.estimated_value),0) AS v FROM leads l JOIN lead_stages s ON l.stage_id=s.id WHERE l.is_active=TRUE AND s.is_closed=FALSE ${leadFilterAliased}`, args);

    // Customers and visits: filtered for non-admin to their assigned or created customers
    const custFilter = isRestricted ? 'AND (assigned_to=? OR created_by=?)' : '';
    const custArgs = isRestricted ? [uid, uid] : [];
    const [[tc]] = await pool.query(`SELECT COUNT(*) AS v FROM customers WHERE is_active=TRUE ${custFilter}`, custArgs);
    const [[vt]] = await pool.query(`SELECT COUNT(*) AS v FROM visit_sessions vs WHERE DATE(vs.check_in_time)=CURDATE() ${visitFilter}`, args);

    const [byStage] = await pool.query(
      `SELECT s.name,s.color,s.order_position,COUNT(l.id) AS count,COALESCE(SUM(l.estimated_value),0) AS value
       FROM lead_stages s
       LEFT JOIN leads l ON l.stage_id=s.id AND l.is_active=TRUE ${leadFilterAliased}
       GROUP BY s.id ORDER BY s.order_position`, args);

    const [monthLeads] = await pool.query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,COUNT(*) AS total,COALESCE(SUM(estimated_value),0) AS value
       FROM leads WHERE is_active=TRUE AND created_at>=DATE_SUB(NOW(),INTERVAL 12 MONTH) ${leadFilter}
       GROUP BY month ORDER BY month`, args);

    const [monthRev] = await pool.query(
      `SELECT DATE_FORMAT(l.actual_close_date,'%Y-%m') AS month,COUNT(*) AS deals,COALESCE(SUM(l.estimated_value),0) AS revenue
       FROM leads l JOIN lead_stages s ON l.stage_id=s.id
       WHERE l.is_active=TRUE AND s.is_won=TRUE AND l.actual_close_date>=DATE_SUB(NOW(),INTERVAL 12 MONTH) ${leadFilterAliased}
       GROUP BY month ORDER BY month`, args);

    const [bySrc] = await pool.query(`SELECT source,COUNT(*) AS count FROM leads WHERE is_active=TRUE ${leadFilter} GROUP BY source`, args);
    const [byPri] = await pool.query(`SELECT priority,COUNT(*) AS count FROM leads WHERE is_active=TRUE ${leadFilter} GROUP BY priority`, args);

    const [visitTrend] = await pool.query(
      `SELECT DATE(vs.check_in_time) AS date,COUNT(*) AS visits,ROUND(AVG(vs.duration_minutes),0) AS avg_dur
       FROM visit_sessions vs WHERE vs.check_in_time>=DATE_SUB(NOW(),INTERVAL 30 DAY) ${visitFilter}
       GROUP BY date ORDER BY date`, args);

    const [byCity] = await pool.query(
      `SELECT city,COUNT(*) AS count FROM customers WHERE is_active=TRUE AND city IS NOT NULL AND city!='' ${custFilter} GROUP BY city ORDER BY count DESC LIMIT 8`,
      custArgs
    );

    let topPerformers = [];
    if (!isRestricted) {
      [topPerformers] = await pool.query(`SELECT u.id,u.name,u.department,COUNT(DISTINCT l.id) AS total_leads,COUNT(DISTINCT CASE WHEN s.is_won THEN l.id END) AS won_leads,COALESCE(SUM(CASE WHEN s.is_won THEN l.estimated_value END),0) AS revenue,COUNT(DISTINCT vs.id) AS visits FROM users u LEFT JOIN leads l ON l.assigned_to=u.id AND l.is_active=TRUE LEFT JOIN lead_stages s ON l.stage_id=s.id LEFT JOIN visit_sessions vs ON vs.user_id=u.id AND vs.check_in_time>=DATE_SUB(NOW(),INTERVAL 30 DAY) WHERE u.is_active=TRUE AND u.role_id!=1 GROUP BY u.id ORDER BY revenue DESC LIMIT 8`);
    }

    const [recentActivity] = await pool.query(
      `SELECT lh.*,u.name AS user_name,l.title AS lead_title FROM lead_history lh
       JOIN users u ON lh.changed_by=u.id JOIN leads l ON lh.lead_id=l.id
       ${isRestricted ? 'WHERE (lh.changed_by=? OR l.assigned_to=?)' : ''} ORDER BY lh.changed_at DESC LIMIT 10`,
      isRestricted ? [uid, uid] : []
    );

    res.json({ success: true, data: {
      kpis: { totalLeads: tl.v, activeLeads: al.v, wonThisMonth: wl.v, revenueThisMonth: wl.rev, totalCustomers: tc.v, visitsToday: vt.v, pipelineValue: pv.v },
      charts: { byStage, monthLeads, monthRev, bySrc, byPri, visitTrend, byCity },
      topPerformers, recentActivity,
    }});
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Pending / stale leads: leads that have not changed stage for N+ days ──
exports.getStaleLeads = async (req, res) => {
  try {
    const days = parseInt(req.query.days || '7');
    const uid = req.user.id, isRestricted = req.user.role_name !== 'admin';

    let w = ['l.is_active=TRUE', 's.is_closed=FALSE'], p = [];
    if (isRestricted) { w.push('l.assigned_to=?'); p.push(uid); }
    const ws = w.join(' AND ');

    // last stage-change time per lead (fallback to created_at if no history)
    const [rows] = await pool.query(
      `SELECT l.id,l.title,l.company_name,l.estimated_value,l.priority,s.name AS stage_name,s.color AS stage_color,
              u.name AS assigned_to_name,
              COALESCE(
                (SELECT MAX(lh.changed_at) FROM lead_history lh WHERE lh.lead_id=l.id AND lh.field_changed='stage'),
                l.created_at
              ) AS stage_since
       FROM leads l
       JOIN lead_stages s ON l.stage_id=s.id
       LEFT JOIN users u ON l.assigned_to=u.id
       WHERE ${ws}
       HAVING stage_since <= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY stage_since ASC`,
      [...p, days]
    );

    const withDays = rows.map(r => ({
      ...r,
      days_in_stage: Math.floor((Date.now() - new Date(r.stage_since).getTime()) / 86400000),
    }));

    // grouped summary by stage
    const grouped = {};
    withDays.forEach(r => {
      if (!grouped[r.stage_name]) grouped[r.stage_name] = { stage_name: r.stage_name, color: r.stage_color, count: 0, value: 0 };
      grouped[r.stage_name].count += 1;
      grouped[r.stage_name].value += Number(r.estimated_value) || 0;
    });

    res.json({ success: true, data: { leads: withDays, summary: Object.values(grouped), days_threshold: days } });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── Dynamic chart builder ──
const DIMENSIONS = {
  stage:    { select: "s.name AS label", join: 'JOIN lead_stages s ON l.stage_id=s.id', group: 's.name', table: 'leads' },
  source:   { select: 'l.source AS label', join: '', group: 'l.source', table: 'leads' },
  priority: { select: 'l.priority AS label', join: '', group: 'l.priority', table: 'leads' },
  assignee: { select: 'COALESCE(u.name,"Unassigned") AS label', join: 'LEFT JOIN users u ON l.assigned_to=u.id', group: 'u.name', table: 'leads' },
  month:    { select: "DATE_FORMAT(l.created_at,'%Y-%m') AS label", join: '', group: 'label', table: 'leads' },
  city:     { select: 'COALESCE(c.city,"Unknown") AS label', join: 'LEFT JOIN customers c ON l.customer_id=c.id', group: 'c.city', table: 'leads' },
  industry: { select: 'COALESCE(c.industry,"Unknown") AS label', join: 'LEFT JOIN customers c ON l.customer_id=c.id', group: 'c.industry', table: 'leads' },
};
const METRICS = {
  count:        'COUNT(l.id) AS value',
  value_sum:    'COALESCE(SUM(l.estimated_value),0) AS value',
  value_avg:    'COALESCE(AVG(l.estimated_value),0) AS value',
  probability_avg: 'COALESCE(AVG(l.probability),0) AS value',
};

exports.getCustomAnalytics = async (req, res) => {
  try {
    const { dimension = 'stage', metric = 'count', date_from, date_to } = req.query;
    const dim = DIMENSIONS[dimension];
    const met = METRICS[metric];
    if (!dim || !met) return res.status(400).json({ success: false, message: 'Invalid dimension or metric' });

    const isRestricted = req.user.role_name !== 'admin';
    let w = ['l.is_active=TRUE'], p = [];
    if (isRestricted) { w.push('l.assigned_to=?'); p.push(req.user.id); }
    if (date_from) { w.push('l.created_at>=?'); p.push(date_from); }
    if (date_to) { w.push('l.created_at<=?'); p.push(date_to + ' 23:59:59'); }

    const sql = `SELECT ${dim.select}, ${met} FROM leads l ${dim.join} WHERE ${w.join(' AND ')} GROUP BY ${dim.group} ORDER BY value DESC LIMIT 25`;
    const [rows] = await pool.query(sql, p);
    res.json({ success: true, data: rows.filter(r => r.label !== null && r.label !== ''), dimension, metric });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getLeadReport = async (req, res) => {
  try {
    const { date_from, date_to, assigned_to } = req.query;
    let w = ['l.is_active=TRUE'], p = [];
    const isReportAdmin = req.user.role_name === 'admin';
    const isReportManager = req.user.role_name === 'sales_manager';
    const reportUserDomainIds = req.user.domain_ids || [];

    if (isReportAdmin) {
      if (assigned_to) {
        w.push('l.assigned_to=?');
        p.push(assigned_to);
      }
    } else if (isReportManager) {
      if (assigned_to) {
        if (reportUserDomainIds.length > 0) {
          w.push(`l.assigned_to=? AND (l.domain_id IN (${reportUserDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?)`);
          p.push(assigned_to, ...reportUserDomainIds, req.user.id);
        } else {
          w.push('l.assigned_to=?');
          p.push(req.user.id);
        }
      } else {
        if (reportUserDomainIds.length > 0) {
          w.push(`(l.domain_id IN (${reportUserDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?)`);
          p.push(...reportUserDomainIds, req.user.id);
        } else {
          w.push('l.assigned_to=?');
          p.push(req.user.id);
        }
      }
    } else {
      w.push('l.assigned_to=?');
      p.push(req.user.id);
    }
    if (date_from) {
      w.push('l.created_at>=?');
      p.push(date_from);
    }
    if (date_to) {
      w.push('l.created_at<=?');
      p.push(date_to + ' 23:59:59');
    }

    const [rows] = await pool.query(
      `SELECT 
        l.id,
        l.title,
        COALESCE(c.company_name, l.company_name) AS company_name,
        l.contact_name,
        l.contact_phone,
        l.contact_email,
        s.name AS stage,
        l.estimated_value,
        l.probability,
        l.priority,
        l.source,
        l.lead_type,
        l.pipeline,
        d.name AS domain,
        l.expected_close_date,
        l.next_visit,
        l.actual_close_date,
        l.actual_scheduled_week,
        l.rescheduled_week,
        u.name AS assigned_to,
        creator.name AS created_by,
        l.description,
        l.on_hold_reason,
        l.won_reason,
        l.lost_reason,
        l.created_at,
        l.updated_at
      FROM leads l
      JOIN lead_stages s ON l.stage_id=s.id
      LEFT JOIN customers c ON l.customer_id=c.id
      LEFT JOIN domains d ON l.domain_id=d.id
      LEFT JOIN users u ON l.assigned_to=u.id
      LEFT JOIN users creator ON l.created_by=creator.id
      WHERE ${w.join(' AND ')}
      ORDER BY l.created_at DESC`,
      p
    );

    // Meetings for the same period and scope
    let mw = ['1=1'], mp = [];
    if (isReportAdmin) {
      if (assigned_to) {
        mw.push('(m.meeting_owner_id=? OR m.created_by=?)');
        mp.push(assigned_to, assigned_to);
      }
    } else if (isReportManager) {
      if (assigned_to) {
        mw.push('(m.meeting_owner_id=? OR m.created_by=?)');
        mp.push(assigned_to, assigned_to);
      } else {
        if (reportUserDomainIds.length > 0) {
          mw.push(`(m.meeting_owner_id IN (
            SELECT DISTINCT ud.user_id FROM user_domains ud WHERE ud.domain_id IN (${reportUserDomainIds.map(() => '?').join(',')})
          ) OR m.meeting_owner_id = ? OR m.created_by = ?)`);
          mp.push(...reportUserDomainIds, req.user.id, req.user.id);
        } else {
          mw.push('(m.meeting_owner_id=? OR m.created_by=?)');
          mp.push(req.user.id, req.user.id);
        }
      }
    } else {
      mw.push('(m.meeting_owner_id=? OR m.created_by=?)');
      mp.push(req.user.id, req.user.id);
    }
    if (date_from) {
      mw.push('m.from_date>=?');
      mp.push(date_from);
    }
    if (date_to) {
      mw.push('m.from_date<=?');
      mp.push(date_to + ' 23:59:59');
    }

    const [meetingRows] = await pool.query(
      `SELECT 
        m.id,
        m.meeting_subject AS subject,
        COALESCE(cu.company_name, l.title, c.contact_name, m.meeting_subject) AS related_name,
        m.related_to_type,
        m.customer_type,
        m.meeting_type,
        m.meeting_status AS status,
        m.location,
        m.meeting_venue AS venue,
        m.from_date AS start_time,
        m.to_date AS end_time,
        m.all_day,
        u.name AS meeting_owner,
        creator.name AS created_by,
        m.description,
        m.created_at,
        m.updated_at
      FROM meetings m
      LEFT JOIN users u ON m.meeting_owner_id = u.id
      LEFT JOIN users creator ON m.created_by = creator.id
      LEFT JOIN contacts c ON m.meeting_to_type = 'Contact' AND m.meeting_to_id = c.id
      LEFT JOIN customers cu ON m.related_to_type = 'Customer' AND m.related_to_id = cu.id
      LEFT JOIN leads l ON m.related_to_type = 'Lead' AND m.related_to_id = l.id
      WHERE ${mw.join(' AND ')}
      ORDER BY m.from_date DESC`,
      mp
    );

    res.json({ success: true, data: rows, meetings: meetingRows });
  } catch (e) {
    console.error('getLeadReport error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getVisitReport = async (req, res) => {
  try {
    const { date_from, date_to, user_id, assigned_to } = req.query;
    const targetUserId = user_id || assigned_to;
    let w = ['1=1'], p = [];
    const isReportAdmin = req.user.role_name === 'admin';
    const isReportManager = req.user.role_name === 'sales_manager';
    const reportUserDomainIds = req.user.domain_ids || [];

    if (isReportAdmin) {
      if (targetUserId) {
        w.push('vs.user_id=?');
        p.push(targetUserId);
      }
    } else if (isReportManager) {
      if (targetUserId) {
        if (reportUserDomainIds.length > 0) {
          w.push(`vs.user_id=? AND (vs.user_id IN (
            SELECT DISTINCT ud.user_id FROM user_domains ud WHERE ud.domain_id IN (${reportUserDomainIds.map(() => '?').join(',')})
          ) OR vs.user_id = ?)`);
          p.push(targetUserId, ...reportUserDomainIds, req.user.id);
        } else {
          w.push('vs.user_id=?');
          p.push(req.user.id);
        }
      } else {
        if (reportUserDomainIds.length > 0) {
          w.push(`(vs.user_id IN (
            SELECT DISTINCT ud.user_id FROM user_domains ud WHERE ud.domain_id IN (${reportUserDomainIds.map(() => '?').join(',')})
          ) OR vs.user_id = ?)`);
          p.push(...reportUserDomainIds, req.user.id);
        } else {
          w.push('vs.user_id=?');
          p.push(req.user.id);
        }
      }
    } else {
      w.push('vs.user_id=?');
      p.push(req.user.id);
    }
    if (date_from) { w.push('vs.check_in_time>=?'); p.push(date_from); }
    if (date_to) { w.push('vs.check_in_time<=?'); p.push(date_to + ' 23:59:59'); }
    const [rows] = await pool.query(`SELECT vs.*,u.name AS salesperson,c.company_name,c.city FROM visit_sessions vs JOIN users u ON vs.user_id=u.id JOIN customers c ON vs.customer_id=c.id WHERE ${w.join(' AND ')} ORDER BY vs.check_in_time DESC`, p);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/* ─── MASTER DATA: STATES & CITIES ─────────────────────────────────────── */
exports.getStates = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_states ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getCities = async (req, res) => {
  try {
    const { state_id } = req.query;
    let sql = 'SELECT c.*,s.name AS state_name FROM master_cities c JOIN master_states s ON c.state_id=s.id';
    const params = [];
    if (state_id) { sql += ' WHERE c.state_id=?'; params.push(state_id); }
    sql += ' ORDER BY c.name';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createState = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [r] = await pool.query('INSERT INTO master_states (name,code) VALUES (?,?)', [name.trim(), code?.trim() || null]);
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'State already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCity = async (req, res) => {
  try {
    const { name, state_id } = req.body;
    if (!name || !state_id) return res.status(400).json({ success: false, message: 'Name and state_id required' });
    const [r] = await pool.query('INSERT INTO master_cities (name,state_id) VALUES (?,?)', [name.trim(), state_id]);
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'City already exists in this state' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteState = async (req, res) => {
  try {
    await pool.query('DELETE FROM master_states WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteCity = async (req, res) => {
  try {
    await pool.query('DELETE FROM master_cities WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

/* ─── CUSTOMER TYPES ───────────────────────────────────────────────────── */

exports.getCustomerTypes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, uuid, type, created_at, updated_at FROM customer_types ORDER BY type'
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.createCustomerType = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer type is required'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM customer_types WHERE type=?',
      [type.trim()]
    );

    if (existing.length) {
      return res.status(400).json({
        success: false,
        message: 'Customer type already exists'
      });
    }

    const [r] = await pool.query(
      'INSERT INTO customer_types (uuid, type) VALUES (?, ?)',
      [uuid(), type.trim()]
    );

    res.status(201).json({
      success: true,
      id: r.insertId,
      message: 'Customer type created'
    });

  } catch (e) {
    console.error(e);

    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Customer type already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.updateCustomerType = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer type is required'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM customer_types WHERE type=? AND id!=?',
      [type.trim(), req.params.id]
    );

    if (existing.length) {
      return res.status(400).json({
        success: false,
        message: 'Customer type already exists'
      });
    }

    const [result] = await pool.query(
      'UPDATE customer_types SET type=? WHERE id=?',
      [type.trim(), req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer type not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer type updated'
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.deleteCustomerType = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM customer_types WHERE id=?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer type not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer type deleted'
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

//////////////////////////CONTACTS////////////////////////
// GET ALL CONTACTS
exports.getContacts = async (req, res) => {
  try {
      const {
          page = 1,
          limit = 20,
          search,
          customer_id,
          contact_owner
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let where = ['c.deleted_at IS NULL'];
      let params = [];

      // Search
      if (search) {
          where.push(`
              (
                  c.contact_name LIKE ?
                  OR c.phone LIKE ?
                  OR c.email LIKE ?
                  OR cu.company_name LIKE ?
              )
          `);

          const searchValue = `%${search}%`;

          params.push(
              searchValue,
              searchValue,
              searchValue,
              searchValue
          );
      }

      // Customer filter
      if (customer_id) {
          where.push('c.customer_id = ?');
          params.push(customer_id);
      }

      // Owner filter
      if (contact_owner) {
          where.push('c.contact_owner = ?');
          params.push(contact_owner);
      }

      const whereClause = where.join(' AND ');

      const [rows] = await pool.query(
          `
          SELECT
              c.id,
              c.uuid,
              c.contact_name,
              c.phone,
              c.email,
              c.alternate_email,
              c.customer_id,
              cu.company_name AS customer_name,
              c.designation,
              c.contact_owner,
              u.name AS contact_owner_name,
              c.description,
              c.created_at,
              c.updated_at

          FROM contacts c

          LEFT JOIN customers cu
              ON c.customer_id = cu.id

          LEFT JOIN users u
              ON c.contact_owner = u.id

          WHERE ${whereClause}

          ORDER BY c.updated_at DESC

          LIMIT ? OFFSET ?
          `,
          [
              ...params,
              parseInt(limit),
              offset
          ]
      );

      // Total count
      const [countRows] = await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM contacts c
          LEFT JOIN customers cu
              ON c.customer_id = cu.id
          WHERE ${whereClause}
          `,
          params
      );

      res.json({
          success: true,
          data: rows,
          total: countRows[0].total,
          page: parseInt(page),
          limit: parseInt(limit)
      });

  } catch (error) {

      console.error('Get contacts error:', error);

      res.status(500).json({
          success: false,
          message: 'Server error'
      });
  }
};

// GET SINGLE CONTACT
exports.getContact = async (req, res) => {
  try {

      const [rows] = await pool.query(
          `
          SELECT
              c.id,
              c.uuid,
              c.contact_name,
              c.phone,
              c.email,
              c.alternate_email,
              c.customer_id,
              cu.company_name AS customer_name,
              c.designation,
              c.contact_owner,
              u.name AS contact_owner_name,
              c.description,
              c.created_at,
              c.updated_at

          FROM contacts c

          LEFT JOIN customers cu
              ON c.customer_id = cu.id

          LEFT JOIN users u
              ON c.contact_owner = u.id

          WHERE c.id = ?
          AND c.deleted_at IS NULL
          `,
          [req.params.id]
      );

      if (!rows.length) {
          return res.status(404).json({
              success: false,
              message: 'Contact not found'
          });
      }
      
      res.json({
          success: true,
          data: rows[0]
      });

  } catch (error) {

      console.error('Get contact error:', error);

      res.status(500).json({
          success: false,
          message: 'Server error'
      });
  }
};

// CREATE CONTACT
exports.createContact = async (req, res) => {
  try {

      const {
          contact_name,
          phone,
          email,
          alternate_email,
          customer_id,
          designation,
          contact_owner,
          description
      } = req.body;

      if (!contact_name || !phone || !customer_id) {
          return res.status(400).json({
              success: false,
              message: 'Contact name, phone and customer are required'
          });
      }

      // Verify customer exists
      const [customer] = await pool.query(
          `
          SELECT id
          FROM customers
          WHERE id = ?
          AND is_active = TRUE
          `,
          [customer_id]
      );

      if (!customer.length) {
          return res.status(400).json({
              success: false,
              message: 'Customer not found'
          });
      }

      const contactUuid = uuid();

      const [result] = await pool.query(
          `
          INSERT INTO contacts
          (
              uuid,
              contact_name,
              phone,
              email,
              alternate_email,
              customer_id,
              designation,
              contact_owner,
              description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
              contactUuid,
              contact_name,
              phone,
              email || null,
              alternate_email || null,
              customer_id,
              designation || null,
              contact_owner || req.user.id,
              description || null
          ]
      );

      res.status(201).json({
          success: true,
          message: 'Contact created successfully',
          id: result.insertId,
          uuid: contactUuid
      });

  } catch (error) {

      console.error('Create contact error:', error);

      res.status(500).json({
          success: false,
          message: 'Server error'
      });
  }
};

// UPDATE CONTACT
exports.updateContact = async (req, res) => {
  try {

      const {
          contact_name,
          phone,
          email,
          alternate_email,
          customer_id,
          designation,
          contact_owner,
          description
      } = req.body;

      if (!contact_name || !phone || !customer_id) {
          return res.status(400).json({
              success: false,
              message: 'Contact name, phone and customer are required'
          });
      }

      const [existing] = await pool.query(
          `
          SELECT id
          FROM contacts
          WHERE id = ?
          AND deleted_at IS NULL
          `,
          [req.params.id]
      );

      if (!existing.length) {
          return res.status(404).json({
              success: false,
              message: 'Contact not found'
          });
      }

      await pool.query(
          `
          UPDATE contacts
          SET
              contact_name = ?,
              phone = ?,
              email = ?,
              alternate_email = ?,
              customer_id = ?,
              designation = ?,
              contact_owner = ?,
              description = ?
          WHERE id = ?
          `,
          [
              contact_name,
              phone,
              email || null,
              alternate_email || null,
              customer_id,
              designation || null,
              contact_owner || null,
              description || null,
              req.params.id
          ]
      );

      res.json({
          success: true,
          message: 'Contact updated successfully'
      });

  } catch (error) {

      console.error('Update contact error:', error);

      res.status(500).json({
          success: false,
          message: 'Server error'
      });
  }
};

// DELETE CONTACT
exports.deleteContact = async (req, res) => {
  try {

      const [result] = await pool.query(
          `
          UPDATE contacts
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE id = ?
          AND deleted_at IS NULL
          `,
          [req.params.id]
      );

      if (result.affectedRows === 0) {
          return res.status(404).json({
              success: false,
              message: 'Contact not found'
          });
      }

      res.json({
          success: true,
          message: 'Contact deleted successfully'
      });

  } catch (error) {

      console.error('Delete contact error:', error);

      res.status(500).json({
          success: false,
          message: 'Server error'
      });
  }
};

/* ─── CUSTOMER GROUPS ───────────────────────────────────────────────────────── */
exports.getCustomerGroups = async (req, res) => {
  try {
    const { search } = req.query;
    let w = ['cg.is_active = TRUE'];
    let p = [];
    if (search && search.trim()) {
      w.push('(cg.name LIKE ? OR cg.description LIKE ?)');
      p.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    const ws = w.join(' AND ');

    const [groups] = await pool.query(
      `SELECT 
        cg.*,
        COUNT(DISTINCT cgm.customer_id) AS customers_count
       FROM customer_groups cg
       LEFT JOIN customer_group_members cgm ON cg.id = cgm.group_id
       LEFT JOIN customers c ON cgm.customer_id = c.id AND c.is_active = TRUE
       WHERE ${ws}
       GROUP BY cg.id
       ORDER BY cg.name ASC`,
      p
    );

    if (groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      const [members] = await pool.query(
        `SELECT 
          cgm.group_id,
          c.id AS customer_id,
          c.company_name,
          c.email,
          c.phone,
          c.city
         FROM customer_group_members cgm
         JOIN customers c ON cgm.customer_id = c.id
         WHERE cgm.group_id IN (?) AND c.is_active = TRUE
         ORDER BY c.company_name ASC`,
        [groupIds]
      );

      const membersMap = {};
      members.forEach(m => {
        if (!membersMap[m.group_id]) membersMap[m.group_id] = [];
        membersMap[m.group_id].push(m);
      });

      groups.forEach(g => {
        g.customers = membersMap[g.id] || [];
      });
    }

    res.json({ success: true, data: groups });
  } catch (e) {
    console.error('getCustomerGroups error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getCustomerGroupById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM customer_groups WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    const group = rows[0];
    const [customers] = await pool.query(
      `SELECT 
        c.id AS customer_id,
        c.company_name,
        c.email,
        c.phone,
        c.city
       FROM customer_group_members cgm
       JOIN customers c ON cgm.customer_id = c.id
       WHERE cgm.group_id = ? AND c.is_active = TRUE
       ORDER BY c.company_name ASC`,
      [req.params.id]
    );
    group.customers = customers;
    res.json({ success: true, data: group });
  } catch (e) {
    console.error('getCustomerGroupById error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCustomerGroup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, customer_ids = [] } = req.body;

    if (!name || !name.trim()) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const [existing] = await conn.query(
      'SELECT id FROM customer_groups WHERE name = ? AND is_active = TRUE',
      [name.trim()]
    );
    if (existing.length) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Group name already exists' });
    }

    const [r] = await conn.query(
      'INSERT INTO customer_groups (uuid, name, description) VALUES (?, ?, ?)',
      [uuid(), name.trim(), description ? description.trim() : null]
    );
    const groupId = r.insertId;

    if (Array.isArray(customer_ids) && customer_ids.length > 0) {
      const validIds = customer_ids.filter(id => Boolean(id));
      if (validIds.length > 0) {
        const memberRows = validIds.map(cid => [groupId, cid]);
        await conn.query(
          'INSERT IGNORE INTO customer_group_members (group_id, customer_id) VALUES ?',
          [memberRows]
        );
        await conn.query(
          'UPDATE customers SET group_id = ? WHERE id IN (?)',
          [groupId, validIds]
        );
      }
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ success: true, id: groupId, message: 'Group created successfully' });
  } catch (e) {
    await conn.rollback();
    conn.release();
    console.error('createCustomerGroup error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateCustomerGroup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const groupId = req.params.id;
    const { name, description, customer_ids = [] } = req.body;

    if (!name || !name.trim()) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const [existing] = await conn.query(
      'SELECT id FROM customer_groups WHERE name = ? AND id != ? AND is_active = TRUE',
      [name.trim(), groupId]
    );
    if (existing.length) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Group name already exists' });
    }

    await conn.query(
      'UPDATE customer_groups SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description ? description.trim() : null, groupId]
    );

    // Unassign old members from this group
    await conn.query('UPDATE customers SET group_id = NULL WHERE group_id = ?', [groupId]);
    await conn.query('DELETE FROM customer_group_members WHERE group_id = ?', [groupId]);

    if (Array.isArray(customer_ids) && customer_ids.length > 0) {
      const validIds = customer_ids.filter(id => Boolean(id));
      if (validIds.length > 0) {
        const memberRows = validIds.map(cid => [groupId, cid]);
        await conn.query(
          'INSERT IGNORE INTO customer_group_members (group_id, customer_id) VALUES ?',
          [memberRows]
        );
        await conn.query(
          'UPDATE customers SET group_id = ? WHERE id IN (?)',
          [groupId, validIds]
        );
      }
    }

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Group updated successfully' });
  } catch (e) {
    await conn.rollback();
    conn.release();
    console.error('updateCustomerGroup error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCustomerGroup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const groupId = req.params.id;

    await conn.query('UPDATE customers SET group_id = NULL WHERE group_id = ?', [groupId]);
    await conn.query('DELETE FROM customer_group_members WHERE group_id = ?', [groupId]);
    await conn.query('DELETE FROM customer_groups WHERE id = ?', [groupId]);

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (e) {
    await conn.rollback();
    conn.release();
    console.error('deleteCustomerGroup error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};