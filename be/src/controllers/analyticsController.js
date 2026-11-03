const { pool } = require('../config/database');

// Data Source schema definitions for safe queries
const DATA_SOURCES = {
  leads: {
    table: 'leads l',
    label: 'Leads & Pipeline',
    joins: 'LEFT JOIN lead_stages s ON l.stage_id = s.id LEFT JOIN users u ON l.assigned_to = u.id LEFT JOIN customers c ON l.customer_id = c.id LEFT JOIN domains dom ON l.domain_id = dom.id',
    baseWhere: 'l.is_active = TRUE',
    ownerColumn: 'l.assigned_to',
    dateFields: {
      created_at: { column: 'l.created_at', label: 'Created Date' },
      next_visit: { column: 'l.next_visit', label: 'Next Visit Date' },
      expected_close_date: { column: 'l.expected_close_date', label: 'Expected Close Date' },
      actual_close_date: { column: 'l.actual_close_date', label: 'Actual Close Date' },
      updated_at: { column: 'l.updated_at', label: 'Updated Date' }
    },
    metrics: {
      id: { column: 'l.id', label: 'Lead Count', aggregations: ['COUNT'] },
      estimated_value: { column: 'l.estimated_value', label: 'Estimated Value', aggregations: ['SUM', 'AVG', 'MIN', 'MAX'] },
      probability: { column: 'l.probability', label: 'Probability %', aggregations: ['AVG', 'MIN', 'MAX'] }
    },
    dimensions: {
      stage: { select: 'COALESCE(s.name, "Unassigned") AS label', group: 's.name', order: 'MIN(COALESCE(s.order_position, 999)) ASC, label ASC', label: 'Pipeline Stage' },
      domain: { select: 'COALESCE(dom.name, "Unassigned") AS label', group: 'dom.name', label: 'Domain' },
      source: { select: 'COALESCE(l.source, "Other") AS label', group: 'l.source', label: 'Lead Source' },
      priority: { select: 'COALESCE(l.priority, "Medium") AS label', group: 'l.priority', label: 'Priority' },
      owner: { select: 'COALESCE(u.name, "Unassigned") AS label', group: 'u.name', label: 'Lead Owner / Executive' },
      customer: { select: 'COALESCE(c.company_name, l.company_name, "Unknown") AS label', group: 'COALESCE(c.company_name, l.company_name, "Unknown")', label: 'Customer / Company' },
      created_month: { select: 'DATE_FORMAT(l.created_at, "%Y-%m") AS label', group: 'DATE_FORMAT(l.created_at, "%Y-%m")', label: 'Month Created' },
      created_date: { select: 'DATE(l.created_at) AS label', group: 'DATE(l.created_at)', label: 'Date Created' }
    }
  },
  customers: {
    table: 'customers c',
    label: 'Customers & Accounts',
    joins: 'LEFT JOIN users u ON c.assigned_to = u.id',
    baseWhere: 'c.is_active = TRUE',
    ownerColumn: 'c.assigned_to',
    dateFields: {
      created_at: { column: 'c.created_at', label: 'Created Date' },
      updated_at: { column: 'c.updated_at', label: 'Updated Date' }
    },
    metrics: {
      id: { column: 'c.id', label: 'Customer Count', aggregations: ['COUNT'] },
      annual_revenue: { column: 'c.annual_revenue', label: 'Annual Revenue', aggregations: ['SUM', 'AVG', 'MIN', 'MAX'] }
    },
    dimensions: {
      industry: { select: 'COALESCE(c.industry, "Unknown") AS label', group: 'c.industry', label: 'Industry' },
      city: { select: 'COALESCE(c.city, "Unknown") AS label', group: 'c.city', label: 'City' },
      state: { select: 'COALESCE(c.state, "Unknown") AS label', group: 'c.state', label: 'State' },
      category: { select: 'COALESCE(c.category, "General") AS label', group: 'c.category', label: 'Category' },
      company_size: { select: 'COALESCE(c.company_size, "Unknown") AS label', group: 'c.company_size', label: 'Company Size' },
      owner: { select: 'COALESCE(u.name, "Unassigned") AS label', group: 'u.name', label: 'Account Owner' },
      created_month: { select: 'DATE_FORMAT(c.created_at, "%Y-%m") AS label', group: 'label', label: 'Month Created' }
    }
  },
  visits: {
    table: 'visit_sessions vs',
    label: 'Field Visits & Check-Ins',
    joins: 'LEFT JOIN users u ON vs.user_id = u.id LEFT JOIN customers c ON vs.customer_id = c.id',
    baseWhere: '1=1',
    ownerColumn: 'vs.user_id',
    dateFields: {
      check_in_time: { column: 'vs.check_in_time', label: 'Check-In Time' },
      check_out_time: { column: 'vs.check_out_time', label: 'Check-Out Time' },
      created_at: { column: 'vs.created_at', label: 'Created Date' }
    },
    metrics: {
      id: { column: 'vs.id', label: 'Visit Count', aggregations: ['COUNT'] },
      duration_minutes: { column: 'vs.duration_minutes', label: 'Duration (Minutes)', aggregations: ['AVG', 'SUM', 'MAX'] }
    },
    dimensions: {
      owner: { select: 'COALESCE(u.name, "Unassigned") AS label', group: 'u.name', label: 'Salesperson / Rep' },
      customer: { select: 'COALESCE(c.company_name, "Unknown") AS label', group: 'c.company_name', label: 'Customer' },
      city: { select: 'COALESCE(c.city, "Unknown") AS label', group: 'c.city', label: 'Customer City' },
      within_geofence: { select: 'CASE WHEN vs.within_geofence = 1 THEN "Inside Geofence" ELSE "Outside Geofence" END AS label', group: 'vs.within_geofence', label: 'Geofence Status' },
      check_in_date: { select: 'DATE(vs.check_in_time) AS label', group: 'label', label: 'Visit Date' },
      check_in_month: { select: 'DATE_FORMAT(vs.check_in_time, "%Y-%m") AS label', group: 'label', label: 'Visit Month' }
    }
  },
  tasks: {
    table: 'tasks t',
    label: 'Tasks',
    joins: 'LEFT JOIN users u ON t.task_owner_id = u.id',
    baseWhere: '1=1',
    ownerColumn: 't.task_owner_id',
    dateFields: {
      due_date: { column: 't.due_date', label: 'Due Date' },
      completed_date: { column: 't.completed_date', label: 'Completed Date' },
      created_at: { column: 't.created_at', label: 'Created Date' }
    },
    metrics: {
      id: { column: 't.id', label: 'Task Count', aggregations: ['COUNT'] }
    },
    dimensions: {
      task_status: { select: 'COALESCE(t.task_status, "Not Started") AS label', group: 't.task_status', label: 'Task Status' },
      priority: { select: 'COALESCE(t.priority, "Medium") AS label', group: 't.priority', label: 'Priority' },
      owner: { select: 'COALESCE(u.name, "Unassigned") AS label', group: 'u.name', label: 'Task Owner' },
      related_to_type: { select: 'COALESCE(t.related_to_type, "General") AS label', group: 't.related_to_type', label: 'Related Entity Type' }
    }
  },
  calls: {
    table: 'calls ca',
    label: 'Calls & Telephony',
    joins: 'LEFT JOIN users u ON ca.call_owner_id = u.id',
    baseWhere: '1=1',
    ownerColumn: 'ca.call_owner_id',
    dateFields: {
      start_time: { column: 'ca.start_time', label: 'Call Start Time' },
      created_at: { column: 'ca.created_at', label: 'Created Date' }
    },
    metrics: {
      id: { column: 'ca.id', label: 'Call Count', aggregations: ['COUNT'] },
      duration_minutes: { column: 'ca.duration_minutes', label: 'Duration (Minutes)', aggregations: ['SUM', 'AVG', 'MAX'] }
    },
    dimensions: {
      call_type: { select: 'COALESCE(ca.call_type, "Outbound") AS label', group: 'ca.call_type', label: 'Call Type' },
      call_status: { select: 'COALESCE(ca.call_status, "Scheduled") AS label', group: 'ca.call_status', label: 'Call Status' },
      call_purpose: { select: 'COALESCE(ca.call_purpose, "General") AS label', group: 'ca.call_purpose', label: 'Call Purpose' },
      call_result: { select: 'COALESCE(ca.call_result, "Pending") AS label', group: 'ca.call_result', label: 'Call Result' },
      owner: { select: 'COALESCE(u.name, "Unassigned") AS label', group: 'u.name', label: 'Call Owner' }
    }
  },
  meetings: {
    table: 'meetings m',
    label: 'Meetings & Events',
    joins: 'LEFT JOIN users u ON m.meeting_owner_id = u.id',
    baseWhere: '1=1',
    ownerColumn: 'm.meeting_owner_id',
    dateFields: {
      from_date: { column: 'm.from_date', label: 'Meeting Date' },
      created_at: { column: 'm.created_at', label: 'Created Date' }
    },
    metrics: {
      id: { column: 'm.id', label: 'Meeting Count', aggregations: ['COUNT'] }
    },
    dimensions: {
      meeting_status: { select: 'COALESCE(m.meeting_status, "Not Started") AS label', group: 'm.meeting_status', label: 'Meeting Status' },
      meeting_type: { select: 'COALESCE(m.meeting_type, "Online") AS label', group: 'm.meeting_type', label: 'Meeting Type' },
      customer_type: { select: 'COALESCE(m.customer_type, "New") AS label', group: 'm.customer_type', label: 'Customer Type' },
      owner: { select: 'COALESCE(u.name, "Unassigned") AS label', group: 'u.name', label: 'Meeting Owner' }
    }
  }
};

function buildDateCondition(dateFieldCol, dateRange, dateFrom, dateTo) {
  const currentClauses = [];
  const currentParams = [];
  const prevClauses = [];
  const prevParams = [];

  if (!dateFieldCol) return { currentClauses, currentParams, prevClauses, prevParams };

  switch (dateRange) {
    case 'today':
      currentClauses.push(`DATE(${dateFieldCol}) = CURDATE()`);
      prevClauses.push(`DATE(${dateFieldCol}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`);
      break;
    case 'yesterday':
      currentClauses.push(`DATE(${dateFieldCol}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`);
      prevClauses.push(`DATE(${dateFieldCol}) = DATE_SUB(CURDATE(), INTERVAL 2 DAY)`);
      break;
    case 'this_week':
      currentClauses.push(`YEARWEEK(${dateFieldCol}, 1) = YEARWEEK(CURDATE(), 1)`);
      prevClauses.push(`YEARWEEK(${dateFieldCol}, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)`);
      break;
    case 'this_month':
      currentClauses.push(`YEAR(${dateFieldCol}) = YEAR(CURDATE()) AND MONTH(${dateFieldCol}) = MONTH(CURDATE())`);
      prevClauses.push(`YEAR(${dateFieldCol}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(${dateFieldCol}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`);
      break;
    case 'last_month':
      currentClauses.push(`YEAR(${dateFieldCol}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(${dateFieldCol}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`);
      prevClauses.push(`YEAR(${dateFieldCol}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 2 MONTH)) AND MONTH(${dateFieldCol}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 2 MONTH))`);
      break;
    case 'this_quarter':
      currentClauses.push(`YEAR(${dateFieldCol}) = YEAR(CURDATE()) AND QUARTER(${dateFieldCol}) = QUARTER(CURDATE())`);
      prevClauses.push(`YEAR(${dateFieldCol}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 3 MONTH)) AND QUARTER(${dateFieldCol}) = QUARTER(DATE_SUB(CURDATE(), INTERVAL 3 MONTH))`);
      break;
    case 'this_year':
      currentClauses.push(`YEAR(${dateFieldCol}) = YEAR(CURDATE())`);
      prevClauses.push(`YEAR(${dateFieldCol}) = YEAR(CURDATE()) - 1`);
      break;
    case 'custom':
      if (dateFrom) {
        currentClauses.push(`${dateFieldCol} >= ?`);
        currentParams.push(dateFrom);
      }
      if (dateTo) {
        currentClauses.push(`${dateFieldCol} <= ?`);
        currentParams.push(dateTo + (dateTo.length === 10 ? ' 23:59:59' : ''));
      }
      break;
    case 'all':
    default:
      break;
  }

  return { currentClauses, currentParams, prevClauses, prevParams };
}

function applyDataScoping({ user, ds, dashboard_filters = {}, whereClauses, queryParams }) {
  const isAdmin = user.role_name === 'admin';
  const isSalesManager = user.role_name === 'sales_manager';
  const userDomainIds = user.domain_ids || [];
  const isLeadsSource = ds.table && ds.table.includes('leads');
  const isCustomersSource = ds.table && ds.table.includes('customers');
  const filterUserId = dashboard_filters.user_id ? Number(dashboard_filters.user_id) : null;
  const filterDomainId = dashboard_filters.domain_id ? Number(dashboard_filters.domain_id) : null;

  if (isAdmin) {
    if (filterUserId && ds.ownerColumn) {
      whereClauses.push(`${ds.ownerColumn} = ?`);
      queryParams.push(filterUserId);
    }
    if (filterDomainId) {
      if (isLeadsSource) {
        whereClauses.push(`l.domain_id = ?`);
        queryParams.push(filterDomainId);
      } else if (isCustomersSource) {
        whereClauses.push(`c.assigned_to IN (SELECT user_id FROM user_domains WHERE domain_id = ?)`);
        queryParams.push(filterDomainId);
      }
    }
  } else if (isSalesManager) {
    if (isLeadsSource) {
      if (filterDomainId) {
        if (filterUserId) {
          whereClauses.push(`l.domain_id = ? AND l.assigned_to = ?`);
          queryParams.push(filterDomainId, filterUserId);
        } else {
          whereClauses.push(`l.domain_id = ?`);
          queryParams.push(filterDomainId);
        }
      } else if (userDomainIds.length > 0) {
        if (filterUserId) {
          whereClauses.push(`((l.domain_id IN (${userDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?) AND l.assigned_to = ?)`);
          queryParams.push(...userDomainIds, user.id, filterUserId);
        } else {
          whereClauses.push(`(l.domain_id IN (${userDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?)`);
          queryParams.push(...userDomainIds, user.id);
        }
      } else {
        whereClauses.push(`l.assigned_to = ?`);
        queryParams.push(filterUserId || user.id);
      }
    } else if (ds.ownerColumn) {
      if (filterUserId) {
        whereClauses.push(`${ds.ownerColumn} = ?`);
        queryParams.push(filterUserId);
      } else if (filterDomainId) {
        whereClauses.push(`(${ds.ownerColumn} IN (SELECT user_id FROM user_domains WHERE domain_id = ?))`);
        queryParams.push(filterDomainId);
      } else if (userDomainIds.length > 0) {
        whereClauses.push(`(${ds.ownerColumn} IN (SELECT user_id FROM user_domains WHERE domain_id IN (${userDomainIds.map(() => '?').join(',')})) OR ${ds.ownerColumn} = ?)`);
        queryParams.push(...userDomainIds, user.id);
      } else {
        whereClauses.push(`${ds.ownerColumn} = ?`);
        queryParams.push(user.id);
      }
    }
  } else {
    // Salesperson & any other roles: strictly restricted to their own records
    if (ds.ownerColumn) {
      whereClauses.push(`${ds.ownerColumn} = ?`);
      queryParams.push(user.id);
    }
    if (filterDomainId && isLeadsSource) {
      whereClauses.push(`l.domain_id = ?`);
      queryParams.push(filterDomainId);
    }
  }
}

exports.getDashboards = async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user.role_name === 'admin';

    let sql = `
      SELECT d.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM analytics_dashboard_components c WHERE c.dashboard_id = d.id) AS component_count
      FROM analytics_dashboards d
      LEFT JOIN users u ON d.created_by = u.id
    `;
    const params = [];

    if (!isAdmin) {
      sql += ` WHERE d.visibility = 'public' OR d.created_by = ? OR (d.visibility = 'role' AND d.role_id = ?)`;
      params.push(user.id, user.role_id);
    }

    sql += ` ORDER BY d.is_default DESC, d.updated_at DESC`;
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getDashboards error:', e);
    res.status(500).json({ success: false, message: 'Server error loading dashboards' });
  }
};

exports.getDashboardById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const isAdmin = user.role_name === 'admin';

    const [dRows] = await pool.query(
      `SELECT d.*, u.name AS creator_name
       FROM analytics_dashboards d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`,
      [id]
    );

    if (!dRows.length) {
      return res.status(404).json({ success: false, message: 'Dashboard not found' });
    }

    const dashboard = dRows[0];

    if (!isAdmin && dashboard.visibility === 'private' && dashboard.created_by !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to private dashboard' });
    }
    if (!isAdmin && dashboard.visibility === 'role' && dashboard.role_id !== user.role_id && dashboard.created_by !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied for your role' });
    }

    const [cRows] = await pool.query(
      `SELECT * FROM analytics_dashboard_components
       WHERE dashboard_id = ?
       ORDER BY order_position ASC, id ASC`,
      [id]
    );

    const components = cRows.map(c => {
      let configuration = {};
      let layout = { x: 0, y: 0, width: 6, height: 4 };
      try {
        configuration = typeof c.configuration === 'string' ? JSON.parse(c.configuration) : c.configuration;
      } catch (e) {}
      try {
        layout = typeof c.layout === 'string' ? JSON.parse(c.layout) : c.layout;
      } catch (e) {}
      return {
        ...c,
        configuration,
        layout
      };
    });

    const [filters] = await pool.query(
      `SELECT filter_key, filter_value FROM analytics_dashboard_filters WHERE dashboard_id = ?`,
      [id]
    );

    dashboard.components = components;
    dashboard.filters = filters;

    res.json({ success: true, data: dashboard });
  } catch (e) {
    console.error('getDashboardById error:', e);
    res.status(500).json({ success: false, message: 'Server error loading dashboard' });
  }
};

exports.createDashboard = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, description = '', visibility = 'public', role_id = null, is_default = 0 } = req.body;
    if (!name || !name.trim()) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Dashboard name is required' });
    }

    await connection.beginTransaction();

    const makeDefault = is_default === 1 || is_default === true || is_default === '1' ? 1 : 0;
    if (makeDefault) {
      await connection.query(`UPDATE analytics_dashboards SET is_default = 0`);
    }

    const [result] = await connection.query(
      `INSERT INTO analytics_dashboards (name, description, created_by, visibility, role_id, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), description, req.user.id, visibility, role_id || null, makeDefault]
    );

    const newId = result.insertId;
    await connection.commit();
    connection.release();

    const [rows] = await pool.query(`SELECT * FROM analytics_dashboards WHERE id = ?`, [newId]);

    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      data: { ...rows[0], components: [] }
    });
  } catch (e) {
    await connection.rollback();
    connection.release();
    console.error('createDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error creating dashboard' });
  }
};

exports.updateDashboard = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { name, description, visibility, role_id, components, filters, is_default } = req.body;
    const user = req.user;
    const isAdmin = user.role_name === 'admin';

    const [existing] = await connection.query(`SELECT * FROM analytics_dashboards WHERE id = ?`, [id]);
    if (!existing.length) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Dashboard not found' });
    }

    if (!isAdmin && existing[0].created_by !== user.id) {
      connection.release();
      return res.status(403).json({ success: false, message: 'Permission denied to edit this dashboard' });
    }

    await connection.beginTransaction();

    const updates = [];
    const updateParams = [];
    if (name !== undefined) { updates.push('name = ?'); updateParams.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); updateParams.push(description); }
    if (visibility !== undefined) { updates.push('visibility = ?'); updateParams.push(visibility); }
    if (role_id !== undefined) { updates.push('role_id = ?'); updateParams.push(role_id || null); }
    if (is_default !== undefined) {
      const makeDefault = is_default === 1 || is_default === true || is_default === '1' ? 1 : 0;
      if (makeDefault) {
        await connection.query(`UPDATE analytics_dashboards SET is_default = 0`);
      }
      updates.push('is_default = ?');
      updateParams.push(makeDefault);
    }

    if (updates.length > 0) {
      updateParams.push(id);
      await connection.query(`UPDATE analytics_dashboards SET ${updates.join(', ')} WHERE id = ?`, updateParams);
    }

    if (Array.isArray(components)) {
      await connection.query(`DELETE FROM analytics_dashboard_components WHERE dashboard_id = ?`, [id]);

      for (let i = 0; i < components.length; i++) {
        const c = components[i];
        const title = c.title || 'Untitled Component';
        const type = c.component_type || 'chart';
        const desc = c.description || '';
        const configStr = typeof c.configuration === 'object' ? JSON.stringify(c.configuration) : (c.configuration || '{}');
        const layoutStr = typeof c.layout === 'object' ? JSON.stringify(c.layout) : (c.layout || '{}');
        const order = c.order_position !== undefined ? c.order_position : i;

        await connection.query(
          `INSERT INTO analytics_dashboard_components (dashboard_id, component_type, title, description, configuration, layout, order_position)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, type, title, desc, configStr, layoutStr, order]
        );
      }
    }

    if (Array.isArray(filters)) {
      await connection.query(`DELETE FROM analytics_dashboard_filters WHERE dashboard_id = ?`, [id]);
      for (const f of filters) {
        if (f.filter_key) {
          await connection.query(
            `INSERT INTO analytics_dashboard_filters (dashboard_id, filter_key, filter_value) VALUES (?, ?, ?)`,
            [id, f.filter_key, f.filter_value || '']
          );
        }
      }
    }

    await connection.commit();
    connection.release();

    const [dRows] = await pool.query(
      `SELECT d.*, u.name AS creator_name FROM analytics_dashboards d LEFT JOIN users u ON d.created_by = u.id WHERE d.id = ?`,
      [id]
    );
    const [cRows] = await pool.query(
      `SELECT * FROM analytics_dashboard_components WHERE dashboard_id = ? ORDER BY order_position ASC, id ASC`,
      [id]
    );

    const refreshedComponents = cRows.map(c => ({
      ...c,
      configuration: typeof c.configuration === 'string' ? JSON.parse(c.configuration) : c.configuration,
      layout: typeof c.layout === 'string' ? JSON.parse(c.layout) : c.layout
    }));

    res.json({
      success: true,
      message: 'Dashboard saved successfully',
      data: { ...dRows[0], components: refreshedComponents }
    });
  } catch (e) {
    await connection.rollback();
    connection.release();
    console.error('updateDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error saving dashboard' });
  }
};

exports.deleteDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const isAdmin = user.role_name === 'admin';

    const [existing] = await pool.query(`SELECT * FROM analytics_dashboards WHERE id = ?`, [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Dashboard not found' });
    }

    if (!isAdmin && existing[0].created_by !== user.id) {
      return res.status(403).json({ success: false, message: 'Permission denied to delete this dashboard' });
    }

    await pool.query(`DELETE FROM analytics_dashboards WHERE id = ?`, [id]);
    if (existing[0].is_default) {
      await pool.query(`UPDATE analytics_dashboards SET is_default = 1 ORDER BY updated_at DESC LIMIT 1`);
    }
    res.json({ success: true, message: 'Dashboard deleted successfully' });
  } catch (e) {
    console.error('deleteDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error deleting dashboard' });
  }
};

exports.setDefaultDashboard = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [existing] = await connection.query(`SELECT * FROM analytics_dashboards WHERE id = ?`, [id]);
    if (!existing.length) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Dashboard not found' });
    }

    await connection.beginTransaction();

    await connection.query(`UPDATE analytics_dashboards SET is_default = 0`);
    await connection.query(`UPDATE analytics_dashboards SET is_default = 1 WHERE id = ?`, [id]);

    await connection.commit();
    connection.release();

    const [rows] = await pool.query(
      `SELECT d.*, u.name AS creator_name FROM analytics_dashboards d LEFT JOIN users u ON d.created_by = u.id WHERE d.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: `"${existing[0].name}" set as default dashboard`,
      data: rows[0]
    });
  } catch (e) {
    await connection.rollback();
    connection.release();
    console.error('setDefaultDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error setting default dashboard' });
  }
};

exports.cloneDashboard = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [sourceRows] = await connection.query(`SELECT * FROM analytics_dashboards WHERE id = ?`, [id]);
    if (!sourceRows.length) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Source dashboard not found' });
    }

    const source = sourceRows[0];
    const cloneName = `${source.name} (Copy)`;

    await connection.beginTransaction();

    const [dashResult] = await connection.query(
      `INSERT INTO analytics_dashboards (name, description, created_by, visibility, role_id, is_default)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [cloneName, source.description, req.user.id, source.visibility, source.role_id]
    );

    const newDashId = dashResult.insertId;

    const [components] = await connection.query(
      `SELECT * FROM analytics_dashboard_components WHERE dashboard_id = ? ORDER BY order_position ASC`,
      [id]
    );

    for (const c of components) {
      await connection.query(
        `INSERT INTO analytics_dashboard_components (dashboard_id, component_type, title, description, configuration, layout, order_position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newDashId, c.component_type, c.title, c.description, c.configuration, c.layout, c.order_position]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: 'Dashboard cloned successfully',
      data: { id: newDashId, name: cloneName }
    });
  } catch (e) {
    await connection.rollback();
    connection.release();
    console.error('cloneDashboard error:', e);
    res.status(500).json({ success: false, message: 'Server error cloning dashboard' });
  }
};

exports.getComponentData = async (req, res) => {
  try {
    const {
      component_type = 'chart',
      configuration = {},
      dashboard_filters = {}
    } = req.body;

    const {
      data_source = 'leads',
      metric = 'id',
      aggregation = 'COUNT',
      group_by = null,
      date_field = null,
      date_range = 'all',
      date_from = null,
      date_to = null,
      sort_order = 'DESC',
      limit = 20,
      style = 'dial_gauge',
      target_type = 'static',
      target_value = 0,
      target_id = null,
      thresholds = { red: 50, amber: 80, green: 100 },
      prefix = '',
      suffix = '',
      decimals = 0
    } = configuration;

    const ds = DATA_SOURCES[data_source];
    if (!ds) {
      return res.status(400).json({ success: false, message: `Invalid data source: ${data_source}` });
    }

    const metricDef = ds.metrics[metric] || ds.metrics.id || Object.values(ds.metrics)[0];
    const allowedAggs = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
    const agg = allowedAggs.includes((aggregation || '').toUpperCase()) ? aggregation.toUpperCase() : 'COUNT';
    const aggExpr = agg === 'COUNT' ? `COUNT(${metricDef.column})` : `COALESCE(${agg}(${metricDef.column}), 0)`;

const isAdmin = req.user.role_name === 'admin';
    const isSalesManager = req.user.role_name === 'sales_manager';
    const isSalesperson = !isAdmin && !isSalesManager;
    const userDomainIds = req.user.domain_ids || [];
    const filteredUserId = isSalesperson ? req.user.id : (dashboard_filters.user_id ? Number(dashboard_filters.user_id) : null);
    const filteredDomainId = dashboard_filters.domain_id ? Number(dashboard_filters.domain_id) : null;

    const whereClauses = [ds.baseWhere];
    const queryParams = [];

    applyDataScoping({ user: req.user, ds, dashboard_filters, whereClauses, queryParams });

    const activeDateFieldKey = date_field || Object.keys(ds.dateFields)[0];
    const dateDef = ds.dateFields[activeDateFieldKey];
    const activeDateRange = dashboard_filters.date_range || date_range || 'all';
    const activeDateFrom = dashboard_filters.date_from || date_from;
    const activeDateTo = dashboard_filters.date_to || date_to;

    const { currentClauses, currentParams, prevClauses, prevParams } = buildDateCondition(
      dateDef ? dateDef.column : null,
      activeDateRange,
      activeDateFrom,
      activeDateTo
    );

    // Stage Filtering for Leads data source (default to Won - PO Receipt for individual revenue / targets / calculations)
    const isStageComponent = component_type === 'stage_funnel' || group_by === 'stage';
    const stageClauses = [];
    const stageParams = [];
    let stageLabel = 'All Stages';

    const activeStage = dashboard_filters.stage_id !== undefined
      ? dashboard_filters.stage_id
      : (configuration.stage_id !== undefined ? configuration.stage_id : 'won_po_receipt');

    if (!isStageComponent && ds.table.includes('leads')) {
      if (activeStage === 'won_po_receipt' || activeStage === 'Won - PO Receipt' || activeStage === '8' || activeStage === 8) {
        stageClauses.push('(s.is_won = 1 OR s.name LIKE "%Won%PO%" OR l.stage_id = 8)');
        stageLabel = 'Won - PO Receipt';
      } else if (activeStage === 'all') {
        stageLabel = 'All Stages';
      } else if (activeStage) {
        if (!isNaN(Number(activeStage)) && Number(activeStage) > 0) {
          stageClauses.push('l.stage_id = ?');
          stageParams.push(Number(activeStage));
          try {
            const [stgRows] = await pool.query('SELECT name FROM lead_stages WHERE id = ?', [Number(activeStage)]);
            if (stgRows.length > 0) stageLabel = stgRows[0].name;
          } catch (_) {}
        } else if (typeof activeStage === 'string' && activeStage.trim() !== '') {
          stageClauses.push('s.name = ?');
          stageParams.push(activeStage.trim());
          stageLabel = activeStage.trim();
        }
      }
    } else if (isStageComponent) {
      stageLabel = 'All Stages';
    }

    if (currentClauses.length > 0) {
      whereClauses.push(...currentClauses);
      queryParams.push(...currentParams);
    }

    if (stageClauses.length > 0) {
      whereClauses.push(...stageClauses);
      queryParams.push(...stageParams);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    if (component_type === 'kpi') {
      const sqlCurrent = `SELECT ${aggExpr} AS main_value FROM ${ds.table} ${ds.joins} ${whereSql}`;
      const [curRows] = await pool.query(sqlCurrent, queryParams);
      const mainVal = Number(curRows[0]?.main_value || 0);

      let prevVal = null;
      let trendPercent = null;
      let trendDirection = 'neutral';

      if (prevClauses.length > 0 && dateDef) {
        const prevWhereClauses = [ds.baseWhere];
        const prevParamsList = [];
        applyDataScoping({ user: req.user, ds, dashboard_filters, whereClauses: prevWhereClauses, queryParams: prevParamsList });
        if (stageClauses.length > 0) {
          prevWhereClauses.push(...stageClauses);
          prevParamsList.push(...stageParams);
        }
        prevWhereClauses.push(...prevClauses);
        prevParamsList.push(...prevParams);

        const sqlPrev = `SELECT ${aggExpr} AS prev_value FROM ${ds.table} ${ds.joins} WHERE ${prevWhereClauses.join(' AND ')}`;
        const [prevRows] = await pool.query(sqlPrev, prevParamsList);
        prevVal = Number(prevRows[0]?.prev_value || 0);

        if (prevVal > 0) {
          trendPercent = Number((((mainVal - prevVal) / prevVal) * 100).toFixed(1));
          trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral';
        } else if (mainVal > 0) {
          trendPercent = 100;
          trendDirection = 'up';
        } else {
          trendPercent = 0;
          trendDirection = 'neutral';
        }
      }

      return res.json({
        success: true,
        data: {
          value: mainVal,
          previous_value: prevVal,
          trend_percent: trendPercent,
          trend_direction: trendDirection,
          stage_label: stageLabel,
          prefix,
          suffix,
          decimals
        }
      });
    }

    if (component_type === 'target_meter') {
      let numericTarget = Number(target_value || 0);
      let targetRecord = null;

      if (target_type === 'database' && target_id) {
        const [targetRows] = await pool.query(`SELECT * FROM analytics_targets WHERE id = ?`, [target_id]);
        if (targetRows.length > 0) {
          targetRecord = targetRows[0];
          numericTarget = Number(targetRecord.target_value || 0);
        }
      }

      const targetPeriod = targetRecord?.target_period || configuration.target_period || 'monthly';
      const targetMetric = targetRecord?.metric || `${data_source}_${metric}`;
      const filteredUserId = isSalesperson ? req.user.id : (dashboard_filters.user_id ? Number(dashboard_filters.user_id) : null);

      const thRed = Number(thresholds?.red ?? 50);
      const thAmber = Number(thresholds?.amber ?? 80);

      // Check if a specific single user is selected
      if (filteredUserId) {
        // Fetch user name
        const [userRows] = await pool.query(`SELECT id, name, email FROM users WHERE id = ?`, [filteredUserId]);
        const userName = userRows[0]?.name || 'Assigned User';

        // Check if there is an individual target configured for this specific user
        const [indivTgt] = await pool.query(
          `SELECT * FROM analytics_targets
           WHERE user_id = ? AND (metric = ? OR metric = 'leads_estimated_value' OR id = ?)
           ORDER BY updated_at DESC, id DESC LIMIT 1`,
          [filteredUserId, targetMetric, target_id || 0]
        );

        let userTargetVal = numericTarget;
        if (indivTgt.length > 0) {
          userTargetVal = Number(indivTgt[0].target_value || 0);
        }

        const sqlActual = `SELECT ${aggExpr} AS actual_value FROM ${ds.table} ${ds.joins} ${whereSql}`;
        const [actualRows] = await pool.query(sqlActual, queryParams);
        const actualVal = Number(actualRows[0]?.actual_value || 0);

        const progressPercent = userTargetVal > 0 ? Number(((actualVal / userTargetVal) * 100).toFixed(2)) : 0;

        let statusColor = 'green';
        if (progressPercent < thRed) {
          statusColor = 'red';
        } else if (progressPercent < thAmber) {
          statusColor = 'amber';
        }

        return res.json({
          success: true,
          data: {
            style,
            actual: actualVal,
            target: userTargetVal,
            progress: progressPercent,
            status: statusColor,
            thresholds: { red: thRed, amber: thAmber, green: Number(thresholds?.green ?? 100) },
            achieved: progressPercent >= 100,
            is_single_user: true,
            user_id: filteredUserId,
            user_name: userName,
            target_period: targetPeriod,
            stage_label: stageLabel,
            prefix,
            suffix
          }
        });
      }

      // "ALL USERS" Case: Calculate overall team metrics PLUS each user's target and actual breakdown
      let usersSql = `
        SELECT DISTINCT u.id, u.name, u.email, r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
      `;
      const usersParams = [];
      if (filteredDomainId) {
        usersSql += `
          LEFT JOIN user_domains ud ON u.id = ud.user_id
          WHERE u.is_active = 1 AND ud.domain_id = ?
        `;
        usersParams.push(filteredDomainId);
      } else if (isSalesManager && userDomainIds.length > 0) {
        usersSql += `
          LEFT JOIN user_domains ud ON u.id = ud.user_id
          WHERE u.is_active = 1 AND (ud.domain_id IN (${userDomainIds.map(() => '?').join(',')}) OR u.id = ?)
        `;
        usersParams.push(...userDomainIds, req.user.id);
      } else {
        usersSql += ` WHERE u.is_active = 1`;
      }
      usersSql += ` ORDER BY u.name ASC`;
      const [allActiveUsers] = await pool.query(usersSql, usersParams);

      // Query individual targets for this metric
      const [allUserTargets] = await pool.query(
        `SELECT * FROM analytics_targets WHERE user_id IS NOT NULL ORDER BY updated_at DESC, id DESC`
      );
      const userTargetMap = {};
      allUserTargets.forEach(t => {
        if (t.user_id && (t.metric === targetMetric || t.metric === 'leads_estimated_value' || t.metric === 'estimated_value')) {
          if (userTargetMap[t.user_id] === undefined || t.target_period === targetPeriod) {
            userTargetMap[t.user_id] = Number(t.target_value);
          }
        }
      });

      // Query each user's actual value
      const userActualMap = {};
      if (ds.ownerColumn) {
        const uWhereClauses = [ds.baseWhere, ...currentClauses];
        const uQueryParams = [...currentParams];
        applyDataScoping({ user: req.user, ds, dashboard_filters: {}, whereClauses: uWhereClauses, queryParams: uQueryParams });
        if (stageClauses.length > 0) {
          uWhereClauses.push(...stageClauses);
          uQueryParams.push(...stageParams);
        }
        const uSql = `
          SELECT ${ds.ownerColumn} AS user_id, ${aggExpr} AS actual_value
          FROM ${ds.table} ${ds.joins}
          ${uWhereClauses.length > 0 ? `WHERE ${uWhereClauses.join(' AND ')}` : ''}
          GROUP BY ${ds.ownerColumn}
        `;
        const [uRows] = await pool.query(uSql, uQueryParams);
        uRows.forEach(r => {
          if (r.user_id) userActualMap[r.user_id] = Number(r.actual_value || 0);
        });
      }

      // Build user breakdown array
      const userBreakdown = allActiveUsers.map(u => {
        const userActual = userActualMap[u.id] || 0;
        // User target: specific target if defined, otherwise team benchmark or distributed target
        const userTarget = userTargetMap[u.id] !== undefined
          ? userTargetMap[u.id]
          : (numericTarget > 0 ? (allActiveUsers.length > 1 ? Math.round(numericTarget / allActiveUsers.length) : numericTarget) : 0);

        const userProgress = userTarget > 0 ? Number(((userActual / userTarget) * 100).toFixed(1)) : 0;
        let userStatus = 'green';
        if (userProgress < thRed) userStatus = 'red';
        else if (userProgress < thAmber) userStatus = 'amber';

        return {
          user_id: u.id,
          user_name: u.name,
          actual: userActual,
          target: userTarget,
          progress: userProgress,
          status: userStatus,
          achieved: userProgress >= 100
        };
      });

      // Overall Team Target:
      // Priority 1: Check database team target (analytics_targets where user_id IS NULL)
      // Priority 2: Check static numericTarget from component configuration
      // Priority 3: Sum of all user targets
      const [teamTargets] = await pool.query(
        `SELECT * FROM analytics_targets WHERE user_id IS NULL AND (metric = ? OR metric = 'leads_estimated_value' OR metric = 'estimated_value') ORDER BY updated_at DESC, id DESC LIMIT 1`,
        [targetMetric]
      );
      const dbTeamTarget = teamTargets.length > 0 ? Number(teamTargets[0].target_value || 0) : 0;
      const sumUserTargets = Object.values(userTargetMap).reduce((a, b) => a + b, 0);

      let totalTeamTarget = 0;
      if (dbTeamTarget > 0) {
        totalTeamTarget = dbTeamTarget;
      } else if (numericTarget > 0) {
        totalTeamTarget = numericTarget;
      } else {
        totalTeamTarget = sumUserTargets;
      }

      // Overall Team Actual
      const sqlActual = `SELECT ${aggExpr} AS actual_value FROM ${ds.table} ${ds.joins} ${whereSql}`;
      const [actualRows] = await pool.query(sqlActual, queryParams);
      const teamActualVal = Number(actualRows[0]?.actual_value || 0);

      const teamProgress = totalTeamTarget > 0 ? Number(((teamActualVal / totalTeamTarget) * 100).toFixed(2)) : 0;
      let teamStatus = 'green';
      if (teamProgress < thRed) teamStatus = 'red';
      else if (teamProgress < thAmber) teamStatus = 'amber';

      if (style === 'multiple_bar') {
        const items = userBreakdown.map(u => ({
          label: u.user_name,
          user_id: u.user_id,
          actual: u.actual,
          target: u.target,
          progress: u.progress,
          status: u.status,
          achieved: u.achieved
        }));

        return res.json({
          success: true,
          data: {
            style,
            target: totalTeamTarget,
            actual: teamActualVal,
            progress: teamProgress,
            items,
            user_breakdown: userBreakdown,
            is_all_users: true,
            target_period: targetPeriod,
            thresholds: thresholds || { red: 50, amber: 80, green: 100 },
            stage_label: stageLabel,
            prefix,
            suffix
          }
        });
      }

      return res.json({
        success: true,
        data: {
          style,
          actual: teamActualVal,
          target: totalTeamTarget,
          progress: teamProgress,
          status: teamStatus,
          thresholds: { red: thRed, amber: thAmber, green: Number(thresholds?.green ?? 100) },
          achieved: teamProgress >= 100,
          is_all_users: true,
          user_breakdown: userBreakdown,
          target_period: targetPeriod,
          stage_label: stageLabel,
          prefix,
          suffix
        }
      });
    }

    if (component_type === 'stage_funnel') {
      const sql = `
        SELECT s.id AS stage_id, s.name AS stage_name, s.color, s.order_position,
               COUNT(l.id) AS lead_count,
               COALESCE(SUM(l.estimated_value), 0) AS stage_value
        FROM lead_stages s
        LEFT JOIN leads l ON l.stage_id = s.id AND ${whereClauses.join(' AND ')}
        GROUP BY s.id, s.name, s.color, s.order_position
        ORDER BY s.order_position ASC
      `;
      const [funnelRows] = await pool.query(sql, queryParams);

      const maxCount = Math.max(...funnelRows.map(r => Number(r.lead_count || 0)), 1);
      const totalValue = funnelRows.reduce((sum, r) => sum + Number(r.stage_value || 0), 0);

      const data = funnelRows.map((r, idx) => {
        const count = Number(r.lead_count || 0);
        const value = Number(r.stage_value || 0);
        const prevCount = idx > 0 ? Number(funnelRows[idx - 1].lead_count || 0) : count;
        const conversionRate = prevCount > 0 ? Number(((count / prevCount) * 100).toFixed(1)) : 0;
        const overallRate = maxCount > 0 ? Number(((count / maxCount) * 100).toFixed(1)) : 0;

        return {
          id: r.stage_id,
          name: r.stage_name,
          color: r.color || '#2563EB',
          count,
          value,
          conversion_rate: conversionRate,
          overall_rate: overallRate
        };
      });

      return res.json({
        success: true,
        data: {
          items: data,
          total_value: totalValue,
          max_count: maxCount,
          prefix: '₹'
        }
      });
    }

    if (component_type === 'leaderboard') {
      const activePeriod = dashboard_filters.period || configuration.period || 'monthly';
      let lDateRange = activeDateRange;
      if (dashboard_filters.period) {
        lDateRange = dashboard_filters.period === 'weekly' ? 'this_week'
          : dashboard_filters.period === 'monthly' ? 'this_month'
          : dashboard_filters.period === 'quarterly' ? 'this_quarter'
          : dashboard_filters.period === 'yearly' ? 'this_year'
          : dashboard_filters.period === 'all' ? 'all'
          : activeDateRange;
      } else if (configuration.period && activeDateRange === 'all') {
        lDateRange = configuration.period === 'weekly' ? 'this_week'
          : configuration.period === 'monthly' ? 'this_month'
          : configuration.period === 'quarterly' ? 'this_quarter'
          : configuration.period === 'yearly' ? 'this_year'
          : 'this_month';
      }

      const { currentClauses: lDateClauses, currentParams: lDateParams } = buildDateCondition(
        dateDef ? dateDef.column : 'l.created_at',
        lDateRange,
        dashboard_filters.date_from || date_from,
        dashboard_filters.date_to || date_to
      );

      const lLeadClauses = ['l.is_active = TRUE'];
      const lLeadParams = [];

      if (lDateClauses.length > 0) {
        lLeadClauses.push(...lDateClauses);
        lLeadParams.push(...lDateParams);
      }

      if (activeStage === 'won_po_receipt' || activeStage === 'Won - PO Receipt' || activeStage === '8' || activeStage === 8) {
        lLeadClauses.push('(l.stage_id = 8 OR l.stage_id IN (SELECT id FROM lead_stages WHERE is_won = 1 OR name LIKE "%Won%PO%"))');
      } else if (activeStage !== 'all' && activeStage) {
        if (!isNaN(Number(activeStage)) && Number(activeStage) > 0) {
          lLeadClauses.push('l.stage_id = ?');
          lLeadParams.push(Number(activeStage));
        } else if (typeof activeStage === 'string' && activeStage.trim() !== '') {
          lLeadClauses.push('l.stage_id IN (SELECT id FROM lead_stages WHERE name = ?)');
          lLeadParams.push(activeStage.trim());
        }
      }

      let userWhereClause = 'WHERE u.is_active = 1';
      const userWhereParams = [];

      if (isSalesperson) {
        userWhereClause += ' AND u.id = ?';
        userWhereParams.push(req.user.id);
        lLeadClauses.push('l.assigned_to = ?');
        lLeadParams.push(req.user.id);
      } else if (isSalesManager) {
        if (filteredUserId) {
          userWhereClause += ' AND u.id = ?';
          userWhereParams.push(filteredUserId);
          lLeadClauses.push('l.assigned_to = ?');
          lLeadParams.push(filteredUserId);
        } else if (filteredDomainId) {
          userWhereClause += ` AND (u.id IN (SELECT user_id FROM user_domains WHERE domain_id = ?) OR u.id = ?)`;
          userWhereParams.push(filteredDomainId, req.user.id);
          lLeadClauses.push(`(l.domain_id = ? OR l.assigned_to = ?)`);
          lLeadParams.push(filteredDomainId, req.user.id);
        } else if (userDomainIds.length > 0) {
          userWhereClause += ` AND (u.id IN (SELECT user_id FROM user_domains WHERE domain_id IN (${userDomainIds.map(() => '?').join(',')})) OR u.id = ?)`;
          userWhereParams.push(...userDomainIds, req.user.id);
          lLeadClauses.push(`(l.domain_id IN (${userDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?)`);
          lLeadParams.push(...userDomainIds, req.user.id);
        } else {
          userWhereClause += ' AND u.id = ?';
          userWhereParams.push(req.user.id);
          lLeadClauses.push('l.assigned_to = ?');
          lLeadParams.push(req.user.id);
        }
      } else {
        // Admin
        if (filteredUserId) {
          userWhereClause += ' AND u.id = ?';
          userWhereParams.push(filteredUserId);
          lLeadClauses.push('l.assigned_to = ?');
          lLeadParams.push(filteredUserId);
        }
        if (filteredDomainId) {
          userWhereClause += ` AND u.id IN (SELECT user_id FROM user_domains WHERE domain_id = ?)`;
          userWhereParams.push(filteredDomainId);
          lLeadClauses.push('l.domain_id = ?');
          lLeadParams.push(filteredDomainId);
        }
      }

      const limitNum = Math.min(Math.max(parseInt(configuration.limit || limit) || 15, 1), 50);

      const lSql = `
        SELECT 
          u.id AS user_id,
          u.name AS user_name,
          u.email,
          r.name AS role_name,
          COALESCE(SUM(l.estimated_value), 0) AS total_revenue,
          COUNT(l.id) AS deals_won,
          COALESCE(AVG(l.estimated_value), 0) AS avg_deal_size
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN leads l ON l.assigned_to = u.id AND ${lLeadClauses.join(' AND ')}
        ${userWhereClause}
        GROUP BY u.id, u.name, u.email, r.name
        ORDER BY total_revenue DESC, deals_won DESC, u.name ASC
        LIMIT ${limitNum}
      `;

      const [leaderboardRows] = await pool.query(lSql, [...lLeadParams, ...userWhereParams]);

      // Fetch targets for these users
      const [allUserTargets] = await pool.query(
        `SELECT * FROM analytics_targets WHERE user_id IS NOT NULL ORDER BY updated_at DESC, id DESC`
      );
      const userTargetMap = {};
      allUserTargets.forEach(t => {
        if (t.user_id && (t.metric === 'leads_estimated_value' || t.metric === 'estimated_value')) {
          if (userTargetMap[t.user_id] === undefined || t.target_period === activePeriod) {
            userTargetMap[t.user_id] = Number(t.target_value);
          }
        }
      });

      const totalTeamRevenue = leaderboardRows.reduce((sum, r) => sum + Number(r.total_revenue || 0), 0);
      const totalDealsWon = leaderboardRows.reduce((sum, r) => sum + Number(r.deals_won || 0), 0);

      const items = leaderboardRows.map((r, idx) => {
        const rev = Number(r.total_revenue || 0);
        const userTarget = userTargetMap[r.user_id] || 0;
        const progress = userTarget > 0 ? Number(((rev / userTarget) * 100).toFixed(1)) : 0;

        return {
          rank: idx + 1,
          user_id: r.user_id,
          user_name: r.user_name,
          email: r.email,
          role_name: r.role_name || 'Sales Representative',
          revenue: rev,
          deals_won: Number(r.deals_won || 0),
          avg_deal_size: Number(r.avg_deal_size || 0),
          target: userTarget,
          progress,
          stage_label: stageLabel
        };
      });

      return res.json({
        success: true,
        data: {
          items,
          period: activePeriod,
          stage_label: stageLabel,
          total_revenue: totalTeamRevenue,
          total_deals: totalDealsWon,
          prefix: prefix || '₹',
          suffix: suffix || ''
        }
      });
    }

    if (component_type === 'next_visits') {
      const visitRange = configuration.visit_range || 'today_and_tomorrow';
      const limitNum = Math.min(Math.max(parseInt(configuration.limit || limit) || 10, 1), 50);

      const vWhereClauses = ['l.is_active = TRUE', 'l.next_visit IS NOT NULL'];
      const vQueryParams = [];

      applyDataScoping({ user: req.user, ds: DATA_SOURCES.leads, dashboard_filters, whereClauses: vWhereClauses, queryParams: vQueryParams });

      if (stageClauses.length > 0) {
        vWhereClauses.push(...stageClauses);
        vQueryParams.push(...stageParams);
      }

      // Query counts for Today and Tomorrow within scoped leads
      const [todayCountRows] = await pool.query(
        `SELECT COUNT(l.id) AS cnt FROM leads l LEFT JOIN lead_stages s ON l.stage_id = s.id WHERE ${vWhereClauses.join(' AND ')} AND DATE(l.next_visit) = CURDATE()`,
        vQueryParams
      );
      const todayCount = Number(todayCountRows[0]?.cnt || 0);

      const [tomorrowCountRows] = await pool.query(
        `SELECT COUNT(l.id) AS cnt FROM leads l LEFT JOIN lead_stages s ON l.stage_id = s.id WHERE ${vWhereClauses.join(' AND ')} AND DATE(l.next_visit) = CURDATE() + INTERVAL 1 DAY`,
        vQueryParams
      );
      const tomorrowCount = Number(tomorrowCountRows[0]?.cnt || 0);

      // Now apply the active range condition
      const itemClauses = [...vWhereClauses];
      const itemParams = [...vQueryParams];

      if (visitRange === 'today') {
        itemClauses.push('DATE(l.next_visit) = CURDATE()');
      } else if (visitRange === 'tomorrow') {
        itemClauses.push('DATE(l.next_visit) = CURDATE() + INTERVAL 1 DAY');
      } else if (visitRange === 'upcoming_7_days') {
        itemClauses.push('DATE(l.next_visit) BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY');
      } else if (visitRange === 'all_upcoming') {
        itemClauses.push('DATE(l.next_visit) >= CURDATE()');
      } else {
        // default: today_and_tomorrow
        itemClauses.push('DATE(l.next_visit) IN (CURDATE(), CURDATE() + INTERVAL 1 DAY)');
      }

      const [totalCountRows] = await pool.query(
        `SELECT COUNT(l.id) AS cnt FROM leads l LEFT JOIN lead_stages s ON l.stage_id = s.id WHERE ${itemClauses.join(' AND ')}`,
        itemParams
      );
      const totalCount = Number(totalCountRows[0]?.cnt || 0);

      const itemSql = `
        SELECT 
          l.id, l.title, l.company_name, l.contact_name, l.contact_phone, l.contact_email,
          l.next_visit, l.estimated_value, l.priority,
          s.name AS stage_name, s.color AS stage_color,
          u.name AS assigned_to_name,
          dom.name AS domain_name,
          CASE 
            WHEN DATE(l.next_visit) = CURDATE() THEN 'today'
            WHEN DATE(l.next_visit) = CURDATE() + INTERVAL 1 DAY THEN 'tomorrow'
            WHEN DATE(l.next_visit) < CURDATE() THEN 'overdue'
            ELSE 'upcoming'
          END AS visit_timing
        FROM leads l
        LEFT JOIN lead_stages s ON l.stage_id = s.id
        LEFT JOIN users u ON l.assigned_to = u.id
        LEFT JOIN domains dom ON l.domain_id = dom.id
        WHERE ${itemClauses.join(' AND ')}
        ORDER BY l.next_visit ASC
        LIMIT ?
      `;

      const [items] = await pool.query(itemSql, [...itemParams, limitNum]);

      return res.json({
        success: true,
        data: {
          today_count: todayCount,
          tomorrow_count: tomorrowCount,
          total_count: totalCount,
          visit_range: visitRange,
          items: items
        }
      });
    }

    if (component_type === 'domain_leads') {
      const dWhereClauses = ['l.is_active = TRUE'];
      const dQueryParams = [];

      applyDataScoping({ user: req.user, ds: DATA_SOURCES.leads, dashboard_filters, whereClauses: dWhereClauses, queryParams: dQueryParams });

      if (currentClauses.length > 0) {
        dWhereClauses.push(...currentClauses);
        dQueryParams.push(...currentParams);
      }

      if (stageClauses.length > 0) {
        dWhereClauses.push(...stageClauses);
        dQueryParams.push(...stageParams);
      }

      const domainSql = `
        SELECT 
          COALESCE(dom.id, 0) AS domain_id,
          COALESCE(dom.name, 'Unassigned') AS domain_name,
          COUNT(l.id) AS lead_count,
          COALESCE(SUM(l.estimated_value), 0) AS total_value,
          COALESCE(AVG(l.estimated_value), 0) AS avg_deal_size,
          SUM(CASE WHEN s.is_won = 1 OR s.name LIKE '%Won%PO%' OR l.stage_id = 8 THEN 1 ELSE 0 END) AS won_count,
          SUM(CASE WHEN s.is_won = 1 OR s.name LIKE '%Won%PO%' OR l.stage_id = 8 THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS won_value
        FROM leads l
        LEFT JOIN domains dom ON l.domain_id = dom.id
        LEFT JOIN lead_stages s ON l.stage_id = s.id
        WHERE ${dWhereClauses.join(' AND ')}
        GROUP BY dom.id, dom.name
        ORDER BY total_value DESC, lead_count DESC
      `;

      const [domainRows] = await pool.query(domainSql, dQueryParams);

      const totalLeads = domainRows.reduce((sum, r) => sum + Number(r.lead_count || 0), 0);
      const totalPipelineValue = domainRows.reduce((sum, r) => sum + Number(r.total_value || 0), 0);
      const totalWonValue = domainRows.reduce((sum, r) => sum + Number(r.won_value || 0), 0);
      const totalWonDeals = domainRows.reduce((sum, r) => sum + Number(r.won_count || 0), 0);

      const items = domainRows.map(r => ({
        domain_id: r.domain_id,
        domain_name: r.domain_name,
        lead_count: Number(r.lead_count || 0),
        total_value: Number(r.total_value || 0),
        avg_deal_size: Number(r.avg_deal_size || 0),
        won_count: Number(r.won_count || 0),
        won_value: Number(r.won_value || 0),
        share_percent: totalLeads > 0 ? Number(((Number(r.lead_count || 0) / totalLeads) * 100).toFixed(1)) : 0,
        value_share_percent: totalPipelineValue > 0 ? Number(((Number(r.total_value || 0) / totalPipelineValue) * 100).toFixed(1)) : 0
      }));

      return res.json({
        success: true,
        data: {
          items,
          total_leads: totalLeads,
          total_pipeline_value: totalPipelineValue,
          total_won_value: totalWonValue,
          total_won_deals: totalWonDeals,
          domains_count: items.length,
          display_type: configuration.display_type || 'cards',
          metric: configuration.metric || 'both',
          prefix: configuration.prefix || '₹'
        }
      });
    }

    if (component_type === 'individual_lptqc') {
      const limitNum = Math.min(Math.max(parseInt(configuration.limit || limit) || 20, 1), 100);
      const sortBy = configuration.sort_by || 'total_value';

      const lptqcLeadClauses = ['l.is_active = TRUE'];
      const lptqcLeadParams = [];

      if (currentClauses.length > 0) {
        lptqcLeadClauses.push(...currentClauses);
        lptqcLeadParams.push(...currentParams);
      }

      if (dashboard_filters.domain_id) {
        lptqcLeadClauses.push('l.domain_id = ?');
        lptqcLeadParams.push(Number(dashboard_filters.domain_id));
      }

      let userWhereClause = 'WHERE u.is_active = 1';
      const userWhereParams = [];

      if (isSalesperson) {
        userWhereClause += ' AND u.id = ?';
        userWhereParams.push(req.user.id);
      } else if (isSalesManager) {
        if (filteredUserId) {
          userWhereClause += ' AND u.id = ?';
          userWhereParams.push(filteredUserId);
        } else if (userDomainIds.length > 0) {
          userWhereClause += ` AND (u.id IN (SELECT user_id FROM user_domains WHERE domain_id IN (${userDomainIds.map(() => '?').join(',')})) OR u.id = ?)`;
          userWhereParams.push(...userDomainIds, req.user.id);
        } else {
          userWhereClause += ' AND u.id = ?';
          userWhereParams.push(req.user.id);
        }
      } else if (filteredUserId) {
        userWhereClause += ' AND u.id = ?';
        userWhereParams.push(filteredUserId);
      }

      const sortOrderSql = sortBy === 'c_value' ? 'c_value DESC, total_value DESC'
        : sortBy === 'total_count' ? 'total_count DESC, total_value DESC'
        : sortBy === 'l_count' ? 'l_count DESC, total_value DESC'
        : 'total_value DESC, total_count DESC';

      const lptqcSql = `
        SELECT 
          u.id AS user_id,
          u.name AS user_name,
          u.email,
          r.name AS role_name,
          -- L: Lead (Stage 1 New Lead)
          SUM(CASE WHEN l.stage_id = 1 THEN 1 ELSE 0 END) AS l_count,
          SUM(CASE WHEN l.stage_id = 1 THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS l_value,
          -- P: Prospect (Stage 3 Prospect)
          SUM(CASE WHEN l.stage_id = 3 THEN 1 ELSE 0 END) AS p_count,
          SUM(CASE WHEN l.stage_id = 3 THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS p_value,
          -- T: Technical / Demo - POC (Stage 4 Demo - POC)
          SUM(CASE WHEN l.stage_id = 4 THEN 1 ELSE 0 END) AS t_count,
          SUM(CASE WHEN l.stage_id = 4 THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS t_value,
          -- Q: Quotation / Proposal (Stage 5 Proposal)
          SUM(CASE WHEN l.stage_id = 5 THEN 1 ELSE 0 END) AS q_count,
          SUM(CASE WHEN l.stage_id = 5 THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS q_value,
          -- C: Closed / Won / PO (Stage 8 Won - PO Receipt, Stage 11 PO Scheduled)
          SUM(CASE WHEN l.stage_id IN (8, 11) THEN 1 ELSE 0 END) AS c_count,
          SUM(CASE WHEN l.stage_id IN (8, 11) THEN COALESCE(l.estimated_value, 0) ELSE 0 END) AS c_value,
          COUNT(l.id) AS total_count,
          SUM(COALESCE(l.estimated_value, 0)) AS total_value
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN leads l ON l.assigned_to = u.id AND ${lptqcLeadClauses.join(' AND ')}
        ${userWhereClause}
        GROUP BY u.id, u.name, u.email, r.name
        ORDER BY ${sortOrderSql}
        LIMIT ${limitNum}
      `;

      const [lptqcRows] = await pool.query(lptqcSql, [...lptqcLeadParams, ...userWhereParams]);

      const items = lptqcRows.map(r => ({
        user_id: r.user_id,
        user_name: r.user_name,
        email: r.email,
        role_name: r.role_name || 'Sales Representative',
        L: { count: Number(r.l_count || 0), value: Number(r.l_value || 0) },
        P: { count: Number(r.p_count || 0), value: Number(r.p_value || 0) },
        T: { count: Number(r.t_count || 0), value: Number(r.t_value || 0) },
        Q: { count: Number(r.q_count || 0), value: Number(r.q_value || 0) },
        C: { count: Number(r.c_count || 0), value: Number(r.c_value || 0) },
        total_count: Number(r.total_count || 0),
        total_value: Number(r.total_value || 0)
      }));

      const stageTotals = {
        L: { count: items.reduce((s, i) => s + i.L.count, 0), value: items.reduce((s, i) => s + i.L.value, 0) },
        P: { count: items.reduce((s, i) => s + i.P.count, 0), value: items.reduce((s, i) => s + i.P.value, 0) },
        T: { count: items.reduce((s, i) => s + i.T.count, 0), value: items.reduce((s, i) => s + i.T.value, 0) },
        Q: { count: items.reduce((s, i) => s + i.Q.count, 0), value: items.reduce((s, i) => s + i.Q.value, 0) },
        C: { count: items.reduce((s, i) => s + i.C.count, 0), value: items.reduce((s, i) => s + i.C.value, 0) },
        total_count: items.reduce((s, i) => s + i.total_count, 0),
        total_value: items.reduce((s, i) => s + i.total_value, 0)
      };

      const stagesLegend = [
        { code: 'L', label: 'Lead', fullName: 'New Lead', color: '#6366f1', stage_id: 1 },
        { code: 'P', label: 'Prospect', fullName: 'Prospect', color: '#0ea5e9', stage_id: 3 },
        { code: 'T', label: 'Technical', fullName: 'Demo - POC', color: '#f59e0b', stage_id: 4 },
        { code: 'Q', label: 'Quotation', fullName: 'Proposal', color: '#f97316', stage_id: 5 },
        { code: 'C', label: 'Closed', fullName: 'Won / PO Scheduled', color: '#16a34a', stage_id: 8 }
      ];

      return res.json({
        success: true,
        data: {
          items,
          stage_totals: stageTotals,
          stages_legend: stagesLegend,
          default_metric: configuration.default_metric || 'count',
          is_single_user: Boolean(filteredUserId || isSalesperson),
          prefix: configuration.prefix || '₹'
        }
      });
    }

    const dimDef = group_by && ds.dimensions[group_by] ? ds.dimensions[group_by] : Object.values(ds.dimensions)[0];
    const orderSql = dimDef.order || `value ${sort_order === 'ASC' ? 'ASC' : 'DESC'}`;
    const limitNum = Math.min(Math.max(parseInt(limit) || 15, 1), 50);

    const chartSql = `
      SELECT ${dimDef.select}, ${aggExpr} AS value
      FROM ${ds.table} ${ds.joins}
      ${whereSql}
      GROUP BY ${dimDef.group}
      ORDER BY ${orderSql}
      LIMIT ${limitNum}
    `;

    const [rows] = await pool.query(chartSql, queryParams);
    const chartData = rows.map(r => ({
      label: r.label === null || r.label === '' ? 'Unassigned' : String(r.label),
      value: Number(r.value || 0)
    }));

    res.json({
      success: true,
      data: chartData,
      metric_label: metricDef.label,
      dimension_label: dimDef.label,
      stage_label: stageLabel,
      prefix,
      suffix
    });

  } catch (e) {
    console.error('getComponentData error:', e);
    res.status(500).json({ success: false, message: 'Server error calculating analytics data' });
  }
};

exports.getSchemaMetadata = async (req, res) => {
  try {
    const isAdmin = req.user.role_name === 'admin';
    const isSalesManager = req.user.role_name === 'sales_manager';
    const isSalesperson = !isAdmin && !isSalesManager;
    const userDomainIds = req.user.domain_ids || [];

    let usersSql = `SELECT DISTINCT u.id, u.name, u.email, u.department FROM users u`;
    const usersParams = [];
    if (isSalesManager && userDomainIds.length > 0) {
      usersSql += `
        LEFT JOIN user_domains ud ON u.id = ud.user_id
        WHERE u.is_active = TRUE AND (ud.domain_id IN (${userDomainIds.map(() => '?').join(',')}) OR u.id = ?)
      `;
      usersParams.push(...userDomainIds, req.user.id);
    } else if (isSalesperson) {
      usersSql += ` WHERE u.is_active = TRUE AND u.id = ?`;
      usersParams.push(req.user.id);
    } else {
      usersSql += ` WHERE u.is_active = TRUE`;
    }
    usersSql += ` ORDER BY u.name ASC`;

    const [users] = await pool.query(usersSql, usersParams);
    const [stages] = await pool.query(`SELECT id, name, color, order_position, is_won FROM lead_stages ORDER BY order_position ASC`);
    const [domains] = await pool.query(`SELECT id, name FROM domains WHERE is_active = 1 ORDER BY name ASC`);
    const [targets] = await pool.query(`SELECT id, name, metric, target_value, target_period FROM analytics_targets ORDER BY name ASC`);

    const sources = Object.entries(DATA_SOURCES).map(([key, def]) => ({
      key,
      label: def.label,
      date_fields: Object.entries(def.dateFields).map(([k, d]) => ({ key: k, label: d.label })),
      metrics: Object.entries(def.metrics).map(([k, m]) => ({ key: k, label: m.label, aggregations: m.aggregations })),
      dimensions: Object.entries(def.dimensions).map(([k, dim]) => ({ key: k, label: dim.label }))
    }));

    res.json({
      success: true,
      data: {
        sources,
        users,
        stages,
        targets,
        domains,
        date_ranges: [
          { key: 'all', label: 'All Time' },
          { key: 'today', label: 'Today' },
          { key: 'yesterday', label: 'Yesterday' },
          { key: 'this_week', label: 'This Week' },
          { key: 'this_month', label: 'This Month' },
          { key: 'last_month', label: 'Last Month' },
          { key: 'this_quarter', label: 'This Quarter' },
          { key: 'this_year', label: 'This Year' },
          { key: 'custom', label: 'Custom Range' }
        ]
      }
    });
  } catch (e) {
    console.error('getSchemaMetadata error:', e);
    res.status(500).json({ success: false, message: 'Server error loading metadata' });
  }
};

exports.getTargets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, u.name AS user_name
       FROM analytics_targets t
       LEFT JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getTargets error:', e);
    res.status(500).json({ success: false, message: 'Server error loading targets' });
  }
};

exports.createTarget = async (req, res) => {
  try {
    const { name, metric, target_value, target_period = 'monthly', user_id = null, start_date = null, end_date = null } = req.body;
    if (!name || !metric || target_value === undefined) {
      return res.status(400).json({ success: false, message: 'Name, metric, and target_value are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO analytics_targets (name, metric, target_value, target_period, user_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), metric, Number(target_value), target_period, user_id || null, start_date || null, end_date || null]
    );

    const [created] = await pool.query(`SELECT * FROM analytics_targets WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, message: 'Target created successfully', data: created[0] });
  } catch (e) {
    console.error('createTarget error:', e);
    res.status(500).json({ success: false, message: 'Server error creating target' });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, metric, target_value, target_period, user_id, start_date, end_date } = req.body;

    await pool.query(
      `UPDATE analytics_targets
       SET name = COALESCE(?, name),
           metric = COALESCE(?, metric),
           target_value = COALESCE(?, target_value),
           target_period = COALESCE(?, target_period),
           user_id = ?,
           start_date = ?,
           end_date = ?
       WHERE id = ?`,
      [name, metric, target_value, target_period, user_id || null, start_date || null, end_date || null, id]
    );

    const [updated] = await pool.query(`SELECT * FROM analytics_targets WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Target updated successfully', data: updated[0] });
  } catch (e) {
    console.error('updateTarget error:', e);
    res.status(500).json({ success: false, message: 'Server error updating target' });
  }
};

exports.deleteTarget = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM analytics_targets WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Target deleted successfully' });
  } catch (e) {
    console.error('deleteTarget error:', e);
    res.status(500).json({ success: false, message: 'Server error deleting target' });
  }
};

exports.upsertTarget = async (req, res) => {
  try {
    const { user_id = null, metric = 'leads_estimated_value', target_value, target_period = 'monthly', name } = req.body;
    if (target_value === undefined || isNaN(Number(target_value))) {
      return res.status(400).json({ success: false, message: 'Valid target_value is required' });
    }

    const numValue = Number(target_value);
    const period = target_period || 'monthly';
    const metricKey = metric || 'leads_estimated_value';

    if (user_id) {
      const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [user_id]);
      const userName = userRows[0]?.name || `User #${user_id}`;
      const targetName = name || `${userName} Target`;

      const [existing] = await pool.query(
        'SELECT id FROM analytics_targets WHERE user_id = ? AND metric = ? ORDER BY id DESC LIMIT 1',
        [user_id, metricKey]
      );

      if (existing.length > 0) {
        await pool.query(
          'UPDATE analytics_targets SET target_value = ?, target_period = ?, name = COALESCE(?, name), updated_at = NOW() WHERE id = ?',
          [numValue, period, name || null, existing[0].id]
        );
        const [updated] = await pool.query('SELECT * FROM analytics_targets WHERE id = ?', [existing[0].id]);
        return res.json({ success: true, message: 'User target updated successfully', data: updated[0] });
      } else {
        const [result] = await pool.query(
          'INSERT INTO analytics_targets (name, metric, target_value, target_period, user_id) VALUES (?, ?, ?, ?, ?)',
          [targetName, metricKey, numValue, period, user_id]
        );
        const [created] = await pool.query('SELECT * FROM analytics_targets WHERE id = ?', [result.insertId]);
        return res.json({ success: true, message: 'User target created successfully', data: created[0] });
      }
    } else {
      const targetName = name || 'Overall Team Target';
      const [existing] = await pool.query(
        'SELECT id FROM analytics_targets WHERE user_id IS NULL AND (metric = ? OR metric = "leads_estimated_value" OR metric = "estimated_value") ORDER BY id DESC LIMIT 1',
        [metricKey]
      );

      if (existing.length > 0) {
        await pool.query(
          'UPDATE analytics_targets SET target_value = ?, target_period = ?, name = COALESCE(?, name), updated_at = NOW() WHERE id = ?',
          [numValue, period, name || null, existing[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO analytics_targets (name, metric, target_value, target_period, user_id) VALUES (?, ?, ?, ?, NULL)',
          [targetName, metricKey, numValue, period]
        );
      }

      // Also sync target_meter components
      if (req.body.component_id) {
        const [compRows] = await pool.query(
          'SELECT id, configuration FROM analytics_dashboard_components WHERE id = ?',
          [req.body.component_id]
        );
        if (compRows.length > 0) {
          let conf = {};
          try {
            conf = typeof compRows[0].configuration === 'string' ? JSON.parse(compRows[0].configuration) : (compRows[0].configuration || {});
          } catch (e) { conf = {}; }
          conf.target_value = numValue;
          conf.target_period = period;
          await pool.query(
            'UPDATE analytics_dashboard_components SET configuration = ? WHERE id = ?',
            [JSON.stringify(conf), req.body.component_id]
          );
        }
      }

      const [updated] = await pool.query('SELECT * FROM analytics_targets WHERE user_id IS NULL ORDER BY updated_at DESC, id DESC LIMIT 1');
      return res.json({ success: true, message: 'Overall target updated successfully', data: updated[0] });
    }
  } catch (e) {
    console.error('upsertTarget error:', e);
    res.status(500).json({ success: false, message: 'Server error saving target' });
  }
};

exports.saveTargetsBatch = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { overall_target, target_period = 'monthly', metric = 'leads_estimated_value', user_targets = [] } = req.body;

    // 1. Overall Team Target if provided
    if (overall_target !== undefined && overall_target !== null && !isNaN(Number(overall_target))) {
      const numVal = Number(overall_target);
      const [existing] = await connection.query(
        'SELECT id FROM analytics_targets WHERE user_id IS NULL AND (metric = ? OR metric = "leads_estimated_value" OR metric = "estimated_value") ORDER BY id DESC LIMIT 1',
        [metric]
      );
      if (existing.length > 0) {
        await connection.query(
          'UPDATE analytics_targets SET target_value = ?, target_period = ?, updated_at = NOW() WHERE id = ?',
          [numVal, target_period, existing[0].id]
        );
      } else {
        await connection.query(
          'INSERT INTO analytics_targets (name, metric, target_value, target_period, user_id) VALUES (?, ?, ?, ?, NULL)',
          ['Overall Team Target', metric, numVal, target_period]
        );
      }

      // Also update any target_meter components so the component's internal configuration matches
      if (req.body.component_id) {
        const [compRows] = await connection.query(
          'SELECT id, configuration FROM analytics_dashboard_components WHERE id = ?',
          [req.body.component_id]
        );
        if (compRows.length > 0) {
          let conf = {};
          try {
            conf = typeof compRows[0].configuration === 'string'
              ? JSON.parse(compRows[0].configuration)
              : (compRows[0].configuration || {});
          } catch (e) {
            conf = {};
          }
          conf.target_value = numVal;
          conf.target_period = target_period;
          await connection.query(
            'UPDATE analytics_dashboard_components SET configuration = ? WHERE id = ?',
            [JSON.stringify(conf), req.body.component_id]
          );
        }
      } else {
        const [targetMeters] = await connection.query(
          "SELECT id, configuration FROM analytics_dashboard_components WHERE component_type = 'target_meter'"
        );
        for (const tm of targetMeters) {
          let conf = {};
          try {
            conf = typeof tm.configuration === 'string' ? JSON.parse(tm.configuration) : (tm.configuration || {});
          } catch (e) {
            conf = {};
          }
          conf.target_value = numVal;
          conf.target_period = target_period;
          await connection.query(
            'UPDATE analytics_dashboard_components SET configuration = ? WHERE id = ?',
            [JSON.stringify(conf), tm.id]
          );
        }
      }
    }

    // 2. Individual User Targets
    if (Array.isArray(user_targets)) {
      for (const ut of user_targets) {
        if (ut.user_id && ut.target_value !== undefined && !isNaN(Number(ut.target_value))) {
          const uVal = Number(ut.target_value);
          const uPeriod = ut.target_period || target_period || 'monthly';
          const [uRows] = await connection.query('SELECT name FROM users WHERE id = ?', [ut.user_id]);
          const uName = uRows[0]?.name || `User #${ut.user_id}`;

          const [existing] = await connection.query(
            'SELECT id FROM analytics_targets WHERE user_id = ? AND metric = ? ORDER BY id DESC LIMIT 1',
            [ut.user_id, metric]
          );

          if (existing.length > 0) {
            await connection.query(
              'UPDATE analytics_targets SET target_value = ?, target_period = ?, updated_at = NOW() WHERE id = ?',
              [uVal, uPeriod, existing[0].id]
            );
          } else {
            await connection.query(
              'INSERT INTO analytics_targets (name, metric, target_value, target_period, user_id) VALUES (?, ?, ?, ?, ?)',
              [`${uName} Target`, metric, uVal, uPeriod, ut.user_id]
            );
          }
        }
      }
    }

    await connection.commit();
    connection.release();
    res.json({ success: true, message: 'Targets saved successfully' });
  } catch (e) {
    await connection.rollback();
    connection.release();
    console.error('saveTargetsBatch error:', e);
    res.status(500).json({ success: false, message: 'Server error saving targets' });
  }
};
