const { pool } = require('../config/database');

/*
 * GET /saved-filters
 * Get all saved filters for the authenticated user and optional module (default: 'leads')
 */
exports.getSavedFilters = async (req, res) => {
  try {
    const userId = req.user.id;
    const { module = 'leads' } = req.query;

    const [rows] = await pool.query(
      `SELECT id, user_id, module, name, criteria, is_default, created_at, updated_at
       FROM saved_filters
       WHERE user_id = ? AND module = ?
       ORDER BY is_default DESC, created_at DESC`,
      [userId, module]
    );

    const data = rows.map((r) => {
      let parsedCriteria = r.criteria;
      if (typeof r.criteria === 'string') {
        try {
          parsedCriteria = JSON.parse(r.criteria);
        } catch (e) {
          parsedCriteria = {};
        }
      }
      return {
        ...r,
        criteria: parsedCriteria,
        is_default: Boolean(r.is_default),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching saved filters:', err);
    res.status(500).json({ success: false, message: 'Server error fetching saved filters' });
  }
};

/*
 * POST /saved-filters
 * Save a new filter template
 */
exports.createSavedFilter = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, module = 'leads', criteria, is_default = false } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Filter name is required' });
    }

    if (!criteria || typeof criteria !== 'object') {
      return res.status(400).json({ success: false, message: 'Filter criteria are required' });
    }

    // If setting as default, clear existing default for this user and module
    if (is_default) {
      await pool.query(
        `UPDATE saved_filters SET is_default = FALSE WHERE user_id = ? AND module = ?`,
        [userId, module]
      );
    }

    const criteriaString = JSON.stringify(criteria);

    const [result] = await pool.query(
      `INSERT INTO saved_filters (user_id, module, name, criteria, is_default)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, module, name.trim(), criteriaString, is_default ? 1 : 0]
    );

    const newId = result.insertId;

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        user_id: userId,
        module,
        name: name.trim(),
        criteria,
        is_default: Boolean(is_default),
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error creating saved filter:', err);
    res.status(500).json({ success: false, message: 'Server error saving filter' });
  }
};

/*
 * PUT /saved-filters/:id
 * Update an existing saved filter
 */
exports.updateSavedFilter = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, criteria, is_default } = req.body;

    // Check ownership
    const [existing] = await pool.query(
      `SELECT * FROM saved_filters WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Saved filter not found' });
    }

    if (existing[0].user_id !== userId && req.user.role_name !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (criteria !== undefined) {
      updates.push('criteria = ?');
      params.push(JSON.stringify(criteria));
    }

    if (is_default !== undefined) {
      if (is_default) {
        await pool.query(
          `UPDATE saved_filters SET is_default = FALSE WHERE user_id = ? AND module = ?`,
          [existing[0].user_id, existing[0].module]
        );
      }
      updates.push('is_default = ?');
      params.push(is_default ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE saved_filters SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updated] = await pool.query(
      `SELECT id, user_id, module, name, criteria, is_default, created_at, updated_at
       FROM saved_filters WHERE id = ?`,
      [id]
    );

    let parsedCriteria = updated[0].criteria;
    if (typeof updated[0].criteria === 'string') {
      try {
        parsedCriteria = JSON.parse(updated[0].criteria);
      } catch (e) {
        parsedCriteria = {};
      }
    }

    res.json({
      success: true,
      data: {
        ...updated[0],
        criteria: parsedCriteria,
        is_default: Boolean(updated[0].is_default),
      },
    });
  } catch (err) {
    console.error('Error updating saved filter:', err);
    res.status(500).json({ success: false, message: 'Server error updating filter' });
  }
};

/*
 * DELETE /saved-filters/:id
 * Delete a saved filter
 */
exports.deleteSavedFilter = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [existing] = await pool.query(
      `SELECT * FROM saved_filters WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Saved filter not found' });
    }

    if (existing[0].user_id !== userId && req.user.role_name !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    await pool.query(`DELETE FROM saved_filters WHERE id = ?`, [id]);

    res.json({ success: true, message: 'Filter template deleted successfully' });
  } catch (err) {
    console.error('Error deleting saved filter:', err);
    res.status(500).json({ success: false, message: 'Server error deleting filter' });
  }
};

