const { pool } = require('../config/database');

/* =====================================================================
 * MODULES & FIELD METADATA DEFINITIONS
 * ===================================================================== */
const MODULES_META = {
  Lead: {
    label: 'Lead',
    table: 'leads',
    alias: 'l',
    primaryKey: 'id',
    titleField: 'title',
    dateField: 'created_at',
    fields: [
      { key: 'title', label: 'Title', type: 'string', sql: 'l.title' },
      { key: 'company_name', label: 'Customer', type: 'string', sql: 'COALESCE(c.company_name, l.company_name)' },
      { key: 'domain_name', label: 'Domain', type: 'string', sql: 'd.name' },
      { key: 'stage_name', label: 'Stage', type: 'string', sql: 's.name' },
      { key: 'estimated_value', label: 'Amount (₹)', type: 'currency', sql: 'l.estimated_value' },
      { key: 'priority', label: 'Priority', type: 'string', sql: 'l.priority' },
      { key: 'assigned_to_name', label: 'Assigned', type: 'string', sql: 'u.name' },
      { key: 'expected_close_date', label: 'Close Date', type: 'date', sql: 'l.expected_close_date' },
      { key: 'next_visit', label: 'Next Visit', type: 'date', sql: 'l.next_visit' },
      { key: 'created_at', label: 'Created Time', type: 'datetime', sql: 'l.created_at' },
      { key: 'updated_at', label: 'Modified Time', type: 'datetime', sql: 'l.updated_at' },
      { key: 'description', label: 'Description', type: 'string', sql: 'l.description' },
      { key: 'contact_name', label: 'Contact Person', type: 'string', sql: 'l.contact_name' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'string', sql: "COALESCE(NULLIF(l.contact_phone, ''), ct.phone, NULLIF(c.phone, '-'))" },
      { key: 'contact_email', label: 'Contact Email', type: 'string', sql: "COALESCE(NULLIF(l.contact_email, ''), ct.email, c.email)" },
      { key: 'source', label: 'Lead Source', type: 'string', sql: 'l.source' },
      { key: 'lead_type', label: 'Lead Type', type: 'string', sql: 'l.lead_type' },
      { key: 'pipeline', label: 'Pipeline', type: 'string', sql: 'l.pipeline' },
      { key: 'probability', label: 'Win Probability (%)', type: 'number', sql: 'l.probability' },
      { key: 'actual_close_date', label: 'Actual Close Date', type: 'date', sql: 'l.actual_close_date' },
      { key: 'actual_scheduled_week', label: 'Scheduled Week', type: 'string', sql: 'l.actual_scheduled_week' },
      { key: 'rescheduled_week', label: 'Rescheduled Week', type: 'string', sql: 'l.rescheduled_week' },
      { key: 'created_by_name', label: 'Created By', type: 'string', sql: 'creator.name' },
      { key: 'on_hold_reason', label: 'On Hold Reason', type: 'string', sql: 'l.on_hold_reason' },
      { key: 'won_reason', label: 'Won Reason', type: 'string', sql: 'l.won_reason' },
      { key: 'lost_reason', label: 'Lost Reason', type: 'string', sql: 'l.lost_reason' }
    ],
    children: ['Product', 'Meeting', 'Task', 'Call']
  },

  Customer: {
    label: 'Customer',
    table: 'customers',
    alias: 'cust',
    primaryKey: 'id',
    titleField: 'company_name',
    dateField: 'created_at',
    fields: [
      { key: 'company_name', label: 'Company / Customer', type: 'string', sql: 'cust.company_name' },
      { key: 'contact_person', label: 'Primary Contact', type: 'string', sql: 'cust.contact_person' },
      { key: 'designation', label: 'Designation', type: 'string', sql: 'cust.designation' },
      { key: 'phone', label: 'Phone', type: 'string', sql: 'cust.phone' },
      { key: 'email', label: 'Email', type: 'string', sql: 'cust.email' },
      { key: 'industry', label: 'Industry', type: 'string', sql: 'cust.industry' },
      { key: 'city', label: 'City', type: 'string', sql: 'cust.city' },
      { key: 'state', label: 'State', type: 'string', sql: 'cust.state' },
      { key: 'country', label: 'Country', type: 'string', sql: 'cust.country' },
      { key: 'pincode', label: 'Pincode', type: 'string', sql: 'cust.pincode' },
      { key: 'assigned_to_name', label: 'Account Owner', type: 'string', sql: 'cust_owner.name' },
      { key: 'created_at', label: 'Created Date', type: 'datetime', sql: 'cust.created_at' }
    ],
    children: ['Contact', 'Lead', 'Visit', 'Meeting', 'Task']
  },

  Contact: {
    label: 'Contact',
    table: 'contacts',
    alias: 'ct_main',
    primaryKey: 'id',
    titleField: 'contact_name',
    dateField: 'created_at',
    fields: [
      { key: 'contact_name', label: 'Contact Name', type: 'string', sql: 'ct_main.contact_name' },
      { key: 'phone', label: 'Phone Number', type: 'string', sql: 'ct_main.phone' },
      { key: 'email', label: 'Email Address', type: 'string', sql: 'ct_main.email' },
      { key: 'designation', label: 'Designation', type: 'string', sql: 'ct_main.designation' },
      { key: 'customer_name', label: 'Company', type: 'string', sql: 'c_for_ct.company_name' },
      { key: 'created_at', label: 'Created Date', type: 'datetime', sql: 'ct_main.created_at' }
    ],
    children: ['Lead', 'Meeting', 'Task']
  },

  Product: {
    label: 'Product',
    table: 'products',
    alias: 'prod',
    primaryKey: 'id',
    titleField: 'name',
    dateField: 'created_at',
    fields: [
      { key: 'product_name', label: 'Product Name', type: 'string', sql: 'prod.name' },
      { key: 'product_code', label: 'Product Code', type: 'string', sql: 'prod.code' },
      { key: 'category', label: 'Category', type: 'string', sql: 'prod.category' },
      { key: 'price', label: 'Standard Price', type: 'currency', sql: 'prod.price' },
      { key: 'description', label: 'Description (Products)', type: 'string', sql: 'prod.description' }
    ],
    children: ['Lead']
  },

  Meeting: {
    label: 'Meeting',
    table: 'meetings',
    alias: 'm',
    primaryKey: 'id',
    titleField: 'meeting_subject',
    dateField: 'from_date',
    fields: [
      { key: 'subject', label: 'Meeting Subject', type: 'string', sql: 'm.meeting_subject' },
      { key: 'related_name', label: 'Related To', type: 'string', sql: 'COALESCE(m_cust.company_name, m_lead.title, m.meeting_subject)' },
      { key: 'meeting_type', label: 'Meeting Type', type: 'string', sql: 'm.meeting_type' },
      { key: 'status', label: 'Status', type: 'string', sql: 'm.meeting_status' },
      { key: 'location', label: 'Location', type: 'string', sql: 'm.location' },
      { key: 'venue', label: 'Venue', type: 'string', sql: 'm.meeting_venue' },
      { key: 'start_time', label: 'Start Time', type: 'datetime', sql: 'm.from_date' },
      { key: 'end_time', label: 'End Time', type: 'datetime', sql: 'm.to_date' },
      { key: 'meeting_owner_name', label: 'Meeting Owner', type: 'string', sql: 'm_owner.name' },
      { key: 'description', label: 'Meeting Notes', type: 'string', sql: 'm.description' },
      { key: 'created_at', label: 'Created Time', type: 'datetime', sql: 'm.created_at' }
    ],
    children: []
  },

  Task: {
    label: 'Task',
    table: 'tasks',
    alias: 't',
    primaryKey: 'id',
    titleField: 'title',
    dateField: 'due_date',
    fields: [
      { key: 'title', label: 'Task Title', type: 'string', sql: 't.title' },
      { key: 'status', label: 'Status', type: 'string', sql: 't.status' },
      { key: 'priority', label: 'Priority', type: 'string', sql: 't.priority' },
      { key: 'due_date', label: 'Due Date', type: 'date', sql: 't.due_date' },
      { key: 'assigned_to_name', label: 'Assigned To', type: 'string', sql: 't_user.name' },
      { key: 'created_at', label: 'Created Date', type: 'datetime', sql: 't.created_at' }
    ],
    children: []
  },

  Call: {
    label: 'Call',
    table: 'calls',
    alias: 'call_log',
    primaryKey: 'id',
    titleField: 'subject',
    dateField: 'created_at',
    fields: [
      { key: 'subject', label: 'Call Subject', type: 'string', sql: 'call_log.subject' },
      { key: 'call_type', label: 'Call Type', type: 'string', sql: 'call_log.call_type' },
      { key: 'duration', label: 'Duration (Seconds)', type: 'number', sql: 'call_log.duration' },
      { key: 'outcome', label: 'Outcome', type: 'string', sql: 'call_log.outcome' },
      { key: 'created_at', label: 'Call Date/Time', type: 'datetime', sql: 'call_log.created_at' }
    ],
    children: []
  },

  Visit: {
    label: 'Visit',
    table: 'visit_sessions',
    alias: 'vs',
    primaryKey: 'id',
    titleField: 'check_in_time',
    dateField: 'check_in_time',
    fields: [
      { key: 'customer_name', label: 'Customer Visited', type: 'string', sql: 'vs_cust.company_name' },
      { key: 'salesperson_name', label: 'Salesperson', type: 'string', sql: 'vs_user.name' },
      { key: 'check_in_time', label: 'Check-in Time', type: 'datetime', sql: 'vs.check_in_time' },
      { key: 'check_out_time', label: 'Check-out Time', type: 'datetime', sql: 'vs.check_out_time' },
      { key: 'city', label: 'City', type: 'string', sql: 'vs_cust.city' }
    ],
    children: []
  }
};

/* Additional fields from child modules */
const CHILD_FIELDS_META = {
  Product: [
    { key: 'product_name', label: 'Product Name', type: 'string', sql: 'ch_prod.name' },
    { key: 'product_code', label: 'Product Code', type: 'string', sql: 'ch_prod.code' },
    { key: 'product_category', label: 'Category', type: 'string', sql: 'ch_prod.category' },
    { key: 'product_price', label: 'Price', type: 'currency', sql: 'ch_prod.price' },
    { key: 'product_description', label: 'Description (Products)', type: 'string', sql: 'ch_prod.description' }
  ],
  Meeting: [
    { key: 'meeting_subject', label: 'Meeting Subject', type: 'string', sql: 'ch_m.meeting_subject' },
    { key: 'meeting_status', label: 'Meeting Status', type: 'string', sql: 'ch_m.meeting_status' },
    { key: 'meeting_start_time', label: 'Start Time', type: 'datetime', sql: 'ch_m.from_date' },
    { key: 'meeting_owner', label: 'Meeting Owner', type: 'string', sql: 'ch_m_user.name' }
  ],
  Task: [
    { key: 'task_title', label: 'Task Title', type: 'string', sql: 'ch_t.title' },
    { key: 'task_status', label: 'Task Status', type: 'string', sql: 'ch_t.status' },
    { key: 'task_due_date', label: 'Task Due Date', type: 'date', sql: 'ch_t.due_date' },
    { key: 'task_assigned_to', label: 'Task Assigned To', type: 'string', sql: 'ch_t_user.name' }
  ],
  Call: [
    { key: 'call_subject', label: 'Call Subject', type: 'string', sql: 'ch_c.subject' },
    { key: 'call_type', label: 'Call Type', type: 'string', sql: 'ch_c.call_type' },
    { key: 'call_duration', label: 'Call Duration', type: 'number', sql: 'ch_c.duration' }
  ],
  Contact: [
    { key: 'contact_name', label: 'Contact Name', type: 'string', sql: 'ch_ct.contact_name' },
    { key: 'phone', label: 'Phone', type: 'string', sql: 'ch_ct.phone' },
    { key: 'email', label: 'Email', type: 'string', sql: 'ch_ct.email' },
    { key: 'designation', label: 'Designation', type: 'string', sql: 'ch_ct.designation' }
  ],
  Lead: [
    { key: 'lead_title', label: 'Lead Name', type: 'string', sql: 'ch_l.title' },
    { key: 'lead_stage', label: 'Lead Stage', type: 'string', sql: 'ch_ls.name' },
    { key: 'lead_amount', label: 'Amount', type: 'currency', sql: 'ch_l.estimated_value' }
  ],
  Visit: [
    { key: 'visit_check_in', label: 'Check-in Time', type: 'datetime', sql: 'ch_vs.check_in_time' },
    { key: 'visit_user', label: 'Salesperson', type: 'string', sql: 'ch_vs_user.name' }
  ]
};

/* =====================================================================
 * QUERY GENERATOR HELPER
 * ===================================================================== */
function buildReportQuery({
  primaryModule = 'Lead',
  childModule = null,
  selectedColumns = [],
  filters = [],
  rowGroups = [],
  aggregates = [],
  user = null,
  limit = null,
  offset = 0
}) {
  const pMeta = MODULES_META[primaryModule] || MODULES_META.Lead;
  let fromSql = '';
  let whereClauses = [];
  let params = [];

  // Scoping according to user role
  const isAdmin = user?.role_name === 'admin';
  const isManager = user?.role_name === 'sales_manager';
  const userDomainIds = user?.domain_ids || [];

  if (primaryModule === 'Lead') {
    fromSql = `
      FROM leads l
      JOIN lead_stages s ON l.stage_id = s.id
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN users creator ON l.created_by = creator.id
      LEFT JOIN customers c ON l.customer_id = c.id
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
      LEFT JOIN domains d ON l.domain_id = d.id
    `;
    whereClauses.push('l.is_active = TRUE');

    if (!isAdmin) {
      if (isManager) {
        if (userDomainIds.length > 0) {
          whereClauses.push(`(l.domain_id IN (${userDomainIds.map(() => '?').join(',')}) OR l.assigned_to = ?)`);
          params.push(...userDomainIds, user.id);
        } else {
          whereClauses.push('l.assigned_to = ?');
          params.push(user.id);
        }
      } else {
        whereClauses.push('l.assigned_to = ?');
        params.push(user.id);
      }
    }

    if (childModule === 'Product') {
      fromSql += `
        LEFT JOIN lead_products ch_lp ON ch_lp.lead_id = l.id
        LEFT JOIN products ch_prod ON ch_lp.product_id = ch_prod.id
      `;
    } else if (childModule === 'Meeting') {
      fromSql += `
        LEFT JOIN meetings ch_m ON ch_m.related_to_type = 'Lead' AND ch_m.related_to_id = l.id
        LEFT JOIN users ch_m_user ON ch_m.meeting_owner_id = ch_m_user.id
      `;
    } else if (childModule === 'Task') {
      fromSql += `
        LEFT JOIN tasks ch_t ON ch_t.related_to_type = 'Lead' AND ch_t.related_to_id = l.id
        LEFT JOIN users ch_t_user ON ch_t.assigned_to = ch_t_user.id
      `;
    } else if (childModule === 'Call') {
      fromSql += `
        LEFT JOIN calls ch_c ON ch_c.lead_id = l.id
      `;
    }
  } else if (primaryModule === 'Customer') {
    fromSql = `
      FROM customers cust
      LEFT JOIN users cust_owner ON cust.assigned_to = cust_owner.id
    `;
    whereClauses.push('cust.is_active = TRUE');

    if (!isAdmin && !isManager) {
      whereClauses.push('(cust.assigned_to = ? OR cust.created_by = ?)');
      params.push(user.id, user.id);
    }

    if (childModule === 'Contact') {
      fromSql += ` LEFT JOIN contacts ch_ct ON ch_ct.customer_id = cust.id `;
    } else if (childModule === 'Lead') {
      fromSql += `
        LEFT JOIN leads ch_l ON ch_l.customer_id = cust.id AND ch_l.is_active = TRUE
        LEFT JOIN lead_stages ch_ls ON ch_l.stage_id = ch_ls.id
      `;
    } else if (childModule === 'Visit') {
      fromSql += `
        LEFT JOIN visit_sessions ch_vs ON ch_vs.customer_id = cust.id
        LEFT JOIN users ch_vs_user ON ch_vs.user_id = ch_vs_user.id
      `;
    }
  } else if (primaryModule === 'Contact') {
    fromSql = `
      FROM contacts ct_main
      LEFT JOIN customers c_for_ct ON ct_main.customer_id = c_for_ct.id
    `;
    if (!isAdmin && !isManager) {
      whereClauses.push('(ct_main.contact_owner = ? OR c_for_ct.assigned_to = ?)');
      params.push(user.id, user.id);
    }
  } else if (primaryModule === 'Product') {
    fromSql = ` FROM products prod `;
  } else if (primaryModule === 'Meeting') {
    fromSql = `
      FROM meetings m
      LEFT JOIN users m_owner ON m.meeting_owner_id = m_owner.id
      LEFT JOIN customers m_cust ON m.related_to_type = 'Customer' AND m.related_to_id = m_cust.id
      LEFT JOIN leads m_lead ON m.related_to_type = 'Lead' AND m.related_to_id = m_lead.id
    `;
    if (!isAdmin) {
      whereClauses.push('(m.meeting_owner_id = ? OR m.created_by = ?)');
      params.push(user.id, user.id);
    }
  } else if (primaryModule === 'Task') {
    fromSql = `
      FROM tasks t
      LEFT JOIN users t_user ON t.assigned_to = t_user.id
    `;
    if (!isAdmin) {
      whereClauses.push('(t.assigned_to = ? OR t.created_by = ?)');
      params.push(user.id, user.id);
    }
  } else if (primaryModule === 'Call') {
    fromSql = `
      FROM calls call_log
      LEFT JOIN users call_user ON call_log.user_id = call_user.id
    `;
    if (!isAdmin) {
      whereClauses.push('call_log.user_id = ?');
      params.push(user.id);
    }
  } else if (primaryModule === 'Visit') {
    fromSql = `
      FROM visit_sessions vs
      LEFT JOIN users vs_user ON vs.user_id = vs_user.id
      LEFT JOIN customers vs_cust ON vs.customer_id = vs_cust.id
    `;
    if (!isAdmin) {
      whereClauses.push('vs.user_id = ?');
      params.push(user.id);
    }
  }

  // Determine Columns to SELECT
  const selectParts = [];
  const allAvailable = [
    ...pMeta.fields,
    ...(childModule && CHILD_FIELDS_META[childModule] ? CHILD_FIELDS_META[childModule] : [])
  ];

  if (!selectedColumns || selectedColumns.length === 0) {
    // Select first 5-6 default fields
    pMeta.fields.slice(0, 5).forEach(f => {
      selectParts.push(`${f.sql} AS \`${f.key}\``);
    });
  } else {
    selectedColumns.forEach(sc => {
      const colKey = typeof sc === 'string' ? sc : sc.key;
      const match = allAvailable.find(f => f.key === colKey);
      if (match) {
        selectParts.push(`${match.sql} AS \`${match.key}\``);
      }
    });
    if (selectParts.length === 0) {
      pMeta.fields.slice(0, 5).forEach(f => {
        selectParts.push(`${f.sql} AS \`${f.key}\``);
      });
    }
  }

  // Handle custom filters
  if (Array.isArray(filters)) {
    filters.forEach(fil => {
      if (!fil || !fil.field) return;
      const match = allAvailable.find(f => f.key === fil.field);
      if (!match) return;

      const op = fil.operator || 'eq';
      const val = fil.value;

      // Date range filter
      if (fil.date_from || fil.date_to) {
        if (fil.date_from && fil.date_to) {
          whereClauses.push(`DATE(${match.sql}) >= ? AND DATE(${match.sql}) <= ?`);
          params.push(fil.date_from, fil.date_to);
        } else if (fil.date_from) {
          whereClauses.push(`DATE(${match.sql}) >= ?`);
          params.push(fil.date_from);
        } else if (fil.date_to) {
          whereClauses.push(`DATE(${match.sql}) <= ?`);
          params.push(fil.date_to);
        }
        return;
      }

      if (op === 'eq' && val !== undefined && val !== '') {
        whereClauses.push(`${match.sql} = ?`);
        params.push(val);
      } else if (op === 'neq' && val !== undefined && val !== '') {
        whereClauses.push(`${match.sql} != ?`);
        params.push(val);
      } else if (op === 'like' && val) {
        whereClauses.push(`${match.sql} LIKE ?`);
        params.push(`%${val}%`);
      } else if (op === 'gte' && val !== undefined && val !== '') {
        whereClauses.push(`${match.sql} >= ?`);
        params.push(val);
      } else if (op === 'lte' && val !== undefined && val !== '') {
        whereClauses.push(`${match.sql} <= ?`);
        params.push(val);
      } else if (op === 'between' && fil.from && fil.to) {
        whereClauses.push(`${match.sql} >= ? AND ${match.sql} <= ?`);
        params.push(fil.from, fil.to + (fil.to.length === 10 ? ' 23:59:59' : ''));
      }
    });
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderSql = pMeta.dateField ? `ORDER BY ${pMeta.alias}.${pMeta.dateField} DESC` : '';

  let paginationSql = '';
  const queryParams = [...params];
  if (limit) {
    paginationSql = `LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit, 10), parseInt(offset || 0, 10));
  }

  const dataSql = `SELECT ${selectParts.join(', ')} ${fromSql} ${whereSql} ${orderSql} ${paginationSql}`;
  const countSql = `SELECT COUNT(*) AS total ${fromSql} ${whereSql}`;

  return { dataSql, countSql, queryParams, countParams: params };
}

/* =====================================================================
 * EXPORTED CONTROLLER METHODS
 * ===================================================================== */

// 1. Get Module & Fields Metadata
exports.getModuleMetadata = async (req, res) => {
  try {
    const modules = Object.entries(MODULES_META).map(([key, def]) => ({
      key,
      label: def.label,
      children: def.children || [],
      fields: def.fields.map(f => ({ key: f.key, label: f.label, type: f.type }))
    }));

    const childFields = {};
    for (const [k, flist] of Object.entries(CHILD_FIELDS_META)) {
      childFields[k] = flist.map(f => ({ key: f.key, label: f.label, type: f.type }));
    }

    res.json({
      success: true,
      data: {
        modules,
        childFields
      }
    });
  } catch (e) {
    console.error('getModuleMetadata error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Folder Management
exports.getFolders = async (req, res) => {
  try {
    const [folders] = await pool.query(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM custom_reports r WHERE r.folder_id = f.id) AS report_count
      FROM report_folders f
      ORDER BY f.order_index ASC, f.name ASC
    `);

    // Also get overall counts for standard smart views
    const [[{ totalAll }]] = await pool.query('SELECT COUNT(*) AS totalAll FROM custom_reports');
    const [[{ totalRecent }]] = await pool.query('SELECT COUNT(*) AS totalRecent FROM custom_reports WHERE last_run_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [[{ totalCreatedByMe }]] = await pool.query('SELECT COUNT(*) AS totalCreatedByMe FROM custom_reports WHERE created_by = ?', [req.user.id]);
    const [[{ totalFavs }]] = await pool.query(`
      SELECT COUNT(*) AS totalFavs FROM custom_reports r 
      LEFT JOIN report_favorites rf ON rf.report_id = r.id AND rf.user_id = ?
      WHERE r.is_favorite = TRUE OR rf.id IS NOT NULL
    `, [req.user.id]);

    const countsData = {
      all: totalAll,
      recent: totalRecent,
      created_by_me: totalCreatedByMe,
      favorites: totalFavs
    };

    res.json({
      success: true,
      folders,
      counts: countsData,
      data: {
        folders,
        counts: countsData
      }
    });
  } catch (e) {
    console.error('getFolders error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }
    const [result] = await pool.query(
      'INSERT INTO report_folders (name, description, created_by) VALUES (?, ?, ?)',
      [name.trim(), description?.trim() || null, req.user.id]
    );
    res.json({ success: true, data: { id: result.insertId, name: name.trim() } });
  } catch (e) {
    console.error('createFolder error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }
    await pool.query(
      'UPDATE report_folders SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description?.trim() || null, id]
    );
    res.json({ success: true, message: 'Folder updated' });
  } catch (e) {
    console.error('updateFolder error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    // Unlink reports in this folder
    await pool.query('UPDATE custom_reports SET folder_id = NULL WHERE folder_id = ?', [id]);
    await pool.query('DELETE FROM report_folders WHERE id = ?', [id]);
    res.json({ success: true, message: 'Folder deleted' });
  } catch (e) {
    console.error('deleteFolder error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Report List (History Table)
exports.getReports = async (req, res) => {
  try {
    const { folder_id, view = 'all', search, page = 1, limit = 50 } = req.query;
    const off = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let w = ['1=1'];
    let p = [];

    if (search && search.trim()) {
      w.push('(r.name LIKE ? OR r.description LIKE ? OR rf.name LIKE ?)');
      const q = `%${search.trim()}%`;
      p.push(q, q, q);
    }

    if (folder_id && folder_id !== 'all') {
      w.push('r.folder_id = ?');
      p.push(folder_id);
    }

    if (view === 'favorites') {
      w.push('(r.is_favorite = TRUE OR fav.id IS NOT NULL)');
    } else if (view === 'created_by_me') {
      w.push('r.created_by = ?');
      p.push(req.user.id);
    } else if (view === 'recent') {
      w.push('r.last_run_at IS NOT NULL');
    }

    const whereSql = w.join(' AND ');

    const [rows] = await pool.query(
      `SELECT 
        r.*,
        rf.name AS folder_name,
        u_creator.name AS created_by_name,
        u_updater.name AS updated_by_name,
        CASE WHEN fav.id IS NOT NULL OR r.is_favorite = 1 THEN 1 ELSE 0 END AS is_favorite
       FROM custom_reports r
       LEFT JOIN report_folders rf ON r.folder_id = rf.id
       LEFT JOIN users u_creator ON r.created_by = u_creator.id
       LEFT JOIN users u_updater ON r.updated_by = u_updater.id
       LEFT JOIN report_favorites fav ON fav.report_id = r.id AND fav.user_id = ?
       WHERE ${whereSql}
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, ...p, parseInt(limit, 10), off]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM custom_reports r
       LEFT JOIN report_folders rf ON r.folder_id = rf.id
       LEFT JOIN report_favorites fav ON fav.report_id = r.id AND fav.user_id = ?
       WHERE ${whereSql}`,
      [req.user.id, ...p]
    );

    // Format rows: parse JSON columns
    const formatted = rows.map(r => ({
      ...r,
      selected_columns: typeof r.selected_columns === 'string' ? JSON.parse(r.selected_columns || '[]') : r.selected_columns,
      row_groups: typeof r.row_groups === 'string' ? JSON.parse(r.row_groups || '[]') : r.row_groups,
      aggregates: typeof r.aggregates === 'string' ? JSON.parse(r.aggregates || '[]') : r.aggregates,
      filters: typeof r.filters === 'string' ? JSON.parse(r.filters || '[]') : r.filters,
      is_favorite: Boolean(r.is_favorite)
    }));

    res.json({
      success: true,
      reports: formatted,
      data: formatted,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
  } catch (e) {
    console.error('getReports error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. Get Report By ID
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT 
        r.*,
        rf.name AS folder_name,
        u_creator.name AS created_by_name,
        u_updater.name AS updated_by_name,
        CASE WHEN fav.id IS NOT NULL OR r.is_favorite = 1 THEN 1 ELSE 0 END AS is_favorite
       FROM custom_reports r
       LEFT JOIN report_folders rf ON r.folder_id = rf.id
       LEFT JOIN users u_creator ON r.created_by = u_creator.id
       LEFT JOIN users u_updater ON r.updated_by = u_updater.id
       LEFT JOIN report_favorites fav ON fav.report_id = r.id AND fav.user_id = ?
       WHERE r.id = ?`,
      [req.user.id, id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const r = rows[0];
    r.selected_columns = typeof r.selected_columns === 'string' ? JSON.parse(r.selected_columns || '[]') : r.selected_columns;
    r.row_groups = typeof r.row_groups === 'string' ? JSON.parse(r.row_groups || '[]') : r.row_groups;
    r.aggregates = typeof r.aggregates === 'string' ? JSON.parse(r.aggregates || '[]') : r.aggregates;
    r.filters = typeof r.filters === 'string' ? JSON.parse(r.filters || '[]') : r.filters;
    r.is_favorite = Boolean(r.is_favorite);

    res.json({ success: true, data: r });
  } catch (e) {
    console.error('getReportById error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Create Report
exports.createReport = async (req, res) => {
  try {
    const {
      name,
      description,
      folder_id,
      primary_module,
      child_module,
      selected_columns,
      row_groups,
      aggregates,
      filters,
      is_favorite
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Report name is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO custom_reports
       (name, description, folder_id, primary_module, child_module, selected_columns, row_groups, aggregates, filters, is_favorite, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description?.trim() || null,
        folder_id ? parseInt(folder_id, 10) : null,
        primary_module || 'Lead',
        child_module || null,
        JSON.stringify(selected_columns || []),
        JSON.stringify(row_groups || []),
        JSON.stringify(aggregates || []),
        JSON.stringify(filters || []),
        is_favorite ? 1 : 0,
        req.user.id,
        req.user.id
      ]
    );

    res.json({ success: true, data: { id: result.insertId, name: name.trim() } });
  } catch (e) {
    console.error('createReport error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Update Report
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      folder_id,
      primary_module,
      child_module,
      selected_columns,
      row_groups,
      aggregates,
      filters,
      is_favorite
    } = req.body;

    await pool.query(
      `UPDATE custom_reports
       SET name = COALESCE(?, name),
           description = ?,
           folder_id = ?,
           primary_module = COALESCE(?, primary_module),
           child_module = ?,
           selected_columns = COALESCE(?, selected_columns),
           row_groups = ?,
           aggregates = ?,
           filters = ?,
           is_favorite = COALESCE(?, is_favorite),
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : null,
        folder_id ? parseInt(folder_id, 10) : null,
        primary_module || null,
        child_module || null,
        selected_columns ? JSON.stringify(selected_columns) : null,
        row_groups ? JSON.stringify(row_groups) : null,
        aggregates ? JSON.stringify(aggregates) : null,
        filters ? JSON.stringify(filters) : null,
        is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
        req.user.id,
        id
      ]
    );

    res.json({ success: true, message: 'Report updated' });
  } catch (e) {
    console.error('updateReport error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 7. Delete Report
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM report_favorites WHERE report_id = ?', [id]);
    await pool.query('DELETE FROM report_history WHERE report_id = ?', [id]);
    await pool.query('DELETE FROM custom_reports WHERE id = ?', [id]);
    res.json({ success: true, message: 'Report deleted' });
  } catch (e) {
    console.error('deleteReport error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. Clone Report
exports.cloneReport = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM custom_reports WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const r = rows[0];
    const newName = `${r.name} (Copy)`;

    const [result] = await pool.query(
      `INSERT INTO custom_reports
       (name, description, folder_id, primary_module, child_module, selected_columns, row_groups, aggregates, filters, is_favorite, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        newName,
        r.description,
        r.folder_id,
        r.primary_module,
        r.child_module,
        r.selected_columns,
        r.row_groups,
        r.aggregates,
        r.filters,
        req.user.id,
        req.user.id
      ]
    );

    res.json({ success: true, data: { id: result.insertId, name: newName } });
  } catch (e) {
    console.error('cloneReport error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 9. Toggle Favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query(
      'SELECT id FROM report_favorites WHERE user_id = ? AND report_id = ?',
      [req.user.id, id]
    );

    if (existing.length) {
      await pool.query('DELETE FROM report_favorites WHERE id = ?', [existing[0].id]);
      await pool.query('UPDATE custom_reports SET is_favorite = FALSE WHERE id = ?', [id]);
      res.json({ success: true, is_favorite: false });
    } else {
      await pool.query(
        'INSERT INTO report_favorites (user_id, report_id) VALUES (?, ?)',
        [req.user.id, id]
      );
      await pool.query('UPDATE custom_reports SET is_favorite = TRUE WHERE id = ?', [id]);
      res.json({ success: true, is_favorite: true });
    }
  } catch (e) {
    console.error('toggleFavorite error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 10. Preview Report Query (Limited to 20 rows + count)
exports.previewReport = async (req, res) => {
  try {
    const {
      primary_module,
      child_module,
      selected_columns,
      filters,
      row_groups,
      aggregates
    } = req.body;

    const { dataSql, countSql, queryParams, countParams } = buildReportQuery({
      primaryModule: primary_module || 'Lead',
      childModule: child_module || null,
      selectedColumns: selected_columns || [],
      filters: filters || [],
      rowGroups: row_groups || [],
      aggregates: aggregates || [],
      user: req.user,
      limit: 20,
      offset: 0
    });

    const [rows] = await pool.query(dataSql, queryParams);
    const [[{ total }]] = await pool.query(countSql, countParams);

    res.json({
      success: true,
      data: {
        rows,
        total,
        preview_limit: 20
      }
    });
  } catch (e) {
    console.error('previewReport error:', e);
    res.status(500).json({ success: false, message: 'Error generating report preview', error: e.message });
  }
};

// 11. Run Full Report
exports.runReport = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM custom_reports WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const r = rows[0];
    const selectedColumns = typeof r.selected_columns === 'string' ? JSON.parse(r.selected_columns || '[]') : r.selected_columns;
    const filters = typeof r.filters === 'string' ? JSON.parse(r.filters || '[]') : r.filters;
    const rowGroups = typeof r.row_groups === 'string' ? JSON.parse(r.row_groups || '[]') : r.row_groups;
    const aggregates = typeof r.aggregates === 'string' ? JSON.parse(r.aggregates || '[]') : r.aggregates;

    const isExport = req.query.export === 'true' || req.body?.export === true;
    const requestedLimit = req.query.limit || req.body?.limit;
    const limit = (isExport || requestedLimit === 'all') ? null : (parseInt(requestedLimit, 10) || 1000);

    const { dataSql, countSql, queryParams, countParams } = buildReportQuery({
      primaryModule: r.primary_module,
      childModule: r.child_module,
      selectedColumns,
      filters,
      rowGroups,
      aggregates,
      user: req.user,
      limit,
      offset: 0
    });

    const [reportRows] = await pool.query(dataSql, queryParams);
    const [[{ total }]] = await pool.query(countSql, countParams);

    // Update last_run_at and record history
    await pool.query('UPDATE custom_reports SET last_run_at = NOW() WHERE id = ?', [id]);
    await pool.query(
      'INSERT INTO report_history (report_id, run_by, row_count) VALUES (?, ?, ?)',
      [id, req.user.id, total]
    );

    res.json({
      success: true,
      data: {
        report: {
          id: r.id,
          name: r.name,
          description: r.description,
          primary_module: r.primary_module,
          child_module: r.child_module,
          selected_columns: selectedColumns
        },
        rows: reportRows,
        total
      }
    });
  } catch (e) {
    console.error('runReport error:', e);
    res.status(500).json({ success: false, message: 'Error running report', error: e.message });
  }
};

