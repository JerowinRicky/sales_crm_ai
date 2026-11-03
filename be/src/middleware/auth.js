const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticate = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token' });
  try {
    const d = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT u.*, r.name AS role_name FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.is_active = TRUE`, [d.id]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'User inactive' });
    const user = rows[0];
    try {
      const [udRows] = await pool.query(
        `SELECT ud.domain_id, d.name AS domain_name
         FROM user_domains ud
         JOIN domains d ON ud.domain_id = d.id
         WHERE ud.user_id = ?`,
        [d.id]
      );
      user.domains = udRows || [];
      user.domain_ids = (udRows || []).map(x => x.domain_id);
    } catch (_) {
      user.domains = [];
      user.domain_ids = [];
    }
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ success: false, message: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role_name) ? next()
    : res.status(403).json({ success: false, message: 'Access denied' });

const requireAdmin   = requireRole('admin');
const requireManager = requireRole('admin', 'sales_manager');

module.exports = { authenticate, requireRole, requireAdmin, requireManager };
