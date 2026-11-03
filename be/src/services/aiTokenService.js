const { pool } = require('../config/database');

class AiTokenService {
  /**
   * Get global AI Token Settings
   */
  async getGlobalSettings() {
    const [rows] = await pool.query('SELECT * FROM ai_token_settings LIMIT 1');
    if (!rows || rows.length === 0) {
      return {
        default_user_quota: 50000,
        default_quota_period: 'monthly',
        enforce_quotas: 1,
        warning_threshold_pct: 80,
      };
    }
    return rows[0];
  }

  /**
   * Update global AI Token Settings
   */
  async updateGlobalSettings(data) {
    const [rows] = await pool.query('SELECT id FROM ai_token_settings LIMIT 1');
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO ai_token_settings (default_user_quota, default_quota_period, enforce_quotas, warning_threshold_pct)
         VALUES (?, ?, ?, ?)`,
        [
          Number(data.default_user_quota) || 50000,
          data.default_quota_period || 'monthly',
          data.enforce_quotas ? 1 : 0,
          Number(data.warning_threshold_pct) || 80,
        ]
      );
    } else {
      await pool.query(
        `UPDATE ai_token_settings SET
           default_user_quota = ?,
           default_quota_period = ?,
           enforce_quotas = ?,
           warning_threshold_pct = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          Number(data.default_user_quota) || 50000,
          data.default_quota_period || 'monthly',
          data.enforce_quotas ? 1 : 0,
          Number(data.warning_threshold_pct) || 80,
          rows[0].id,
        ]
      );
    }
    return await this.getGlobalSettings();
  }

  /**
   * Get high-level Analytics Summary
   */
  async getAnalyticsSummary() {
    const globalSettings = await this.getGlobalSettings();

    // 1. Overall Token & Query Stats
    const [overallRows] = await pool.query(`
      SELECT
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
        COUNT(*) AS total_requests,
        COALESCE(SUM(estimated_cost), 0) AS estimated_cost,
        COUNT(DISTINCT user_id) AS active_users_count
      FROM ai_token_usage
    `);
    const overall = overallRows[0] || {
      total_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_requests: 0,
      estimated_cost: 0,
      active_users_count: 0,
    };

    // 2. Today's usage
    const [todayRows] = await pool.query(`
      SELECT
        COALESCE(SUM(total_tokens), 0) AS today_tokens,
        COUNT(*) AS today_requests
      FROM ai_token_usage
      WHERE DATE(created_at) = CURDATE()
    `);
    const today = todayRows[0] || { today_tokens: 0, today_requests: 0 };

    // 3. This Month's usage
    const [monthRows] = await pool.query(`
      SELECT
        COALESCE(SUM(total_tokens), 0) AS month_tokens,
        COUNT(*) AS month_requests
      FROM ai_token_usage
      WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `);
    const month = monthRows[0] || { month_tokens: 0, month_requests: 0 };

    // 4. Provider & Model Breakdown
    const [providerRows] = await pool.query(`
      SELECT
        provider,
        model,
        COUNT(*) AS requests_count,
        COALESCE(SUM(total_tokens), 0) AS tokens_count,
        COALESCE(SUM(estimated_cost), 0) AS cost
      FROM ai_token_usage
      GROUP BY provider, model
      ORDER BY tokens_count DESC
    `);

    // 5. Daily Usage Timeline for past 14 days
    const [timelineRows] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
        COALESCE(SUM(total_tokens), 0) AS total_tokens,
        COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
        COUNT(*) AS requests_count
      FROM ai_token_usage
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    // 6. User Quota Status Distribution
    const [quotaStats] = await pool.query(`
      SELECT
        COUNT(*) AS total_configured_users,
        SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) AS blocked_count,
        SUM(CASE WHEN is_restricted = 0 THEN 1 ELSE 0 END) AS unlimited_count,
        SUM(CASE WHEN is_restricted = 1 AND tokens_used_current_period >= token_quota THEN 1 ELSE 0 END) AS exceeded_count
      FROM ai_user_quotas
    `);

    return {
      settings: globalSettings,
      overall: {
        total_tokens: Number(overall.total_tokens),
        prompt_tokens: Number(overall.prompt_tokens),
        completion_tokens: Number(overall.completion_tokens),
        total_requests: Number(overall.total_requests),
        estimated_cost: Number(overall.estimated_cost),
        active_users_count: Number(overall.active_users_count),
      },
      today: {
        today_tokens: Number(today.today_tokens),
        today_requests: Number(today.today_requests),
      },
      this_month: {
        month_tokens: Number(month.month_tokens),
        month_requests: Number(month.month_requests),
      },
      providers: providerRows.map((r) => ({
        provider: r.provider,
        model: r.model,
        requests_count: Number(r.requests_count),
        tokens_count: Number(r.tokens_count),
        cost: Number(r.cost),
      })),
      timeline: timelineRows.map((r) => ({
        date: r.date,
        total_tokens: Number(r.total_tokens),
        prompt_tokens: Number(r.prompt_tokens),
        completion_tokens: Number(r.completion_tokens),
        requests_count: Number(r.requests_count),
      })),
      quota_summary: quotaStats[0] || {
        total_configured_users: 0,
        blocked_count: 0,
        unlimited_count: 0,
        exceeded_count: 0,
      },
    };
  }

  /**
   * Get User-based Tokens & Quotas table list
   */
  async getUserQuotasList({ search = '', roleId = null, domainId = null }) {
    const globalSettings = await this.getGlobalSettings();

    // Query active users with roles
    let query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_active,
        r.id AS role_id,
        r.name AS role_name,
        COALESCE(uq.token_quota, ?) AS token_quota,
        COALESCE(uq.quota_period, ?) AS quota_period,
        COALESCE(uq.is_restricted, ?) AS is_restricted,
        COALESCE(uq.is_blocked, 0) AS is_blocked,
        COALESCE(uq.tokens_used_current_period, 0) AS tokens_used_current_period,
        uq.last_reset_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN ai_user_quotas uq ON u.id = uq.user_id
      WHERE u.is_active = 1
    `;
    const params = [
      globalSettings.default_user_quota || 50000,
      globalSettings.default_quota_period || 'monthly',
      globalSettings.enforce_quotas ? 1 : 0,
    ];

    if (search && search.trim().length > 0) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (roleId) {
      query += ` AND u.role_id = ?`;
      params.push(Number(roleId));
    }

    query += ` ORDER BY u.role_id ASC, u.name ASC`;

    const [users] = await pool.query(query, params);

    // Get all domains per user
    const userIds = users.map((u) => u.id);
    let domainsByUser = {};
    if (userIds.length > 0) {
      const [udRows] = await pool.query(
        `SELECT ud.user_id, d.id AS domain_id, d.name AS domain_name
         FROM user_domains ud
         JOIN domains d ON ud.domain_id = d.id
         WHERE ud.user_id IN (?)`,
        [userIds]
      );
      for (const row of udRows) {
        if (!domainsByUser[row.user_id]) domainsByUser[row.user_id] = [];
        domainsByUser[row.user_id].push({ id: row.domain_id, name: row.domain_name });
      }
    }

    // Get all-time tokens & total requests count per user
    let allTimeUsageByUser = {};
    if (userIds.length > 0) {
      const [usageRows] = await pool.query(
        `SELECT
           user_id,
           COALESCE(SUM(total_tokens), 0) AS all_time_tokens,
           COUNT(*) AS total_requests,
           MAX(created_at) AS last_activity
         FROM ai_token_usage
         WHERE user_id IN (?)
         GROUP BY user_id`,
        [userIds]
      );
      for (const row of usageRows) {
        allTimeUsageByUser[row.user_id] = {
          all_time_tokens: Number(row.all_time_tokens),
          total_requests: Number(row.total_requests),
          last_activity: row.last_activity,
        };
      }
    }

    const warningPct = globalSettings.warning_threshold_pct || 80;

    return users
      .filter((u) => {
        if (!domainId) return true;
        const userDoms = domainsByUser[u.id] || [];
        return userDoms.some((d) => d.id === Number(domainId));
      })
      .map((u) => {
        const quota = Number(u.token_quota) || 50000;
        const used = Number(u.tokens_used_current_period) || 0;
        const isRestricted = Boolean(u.is_restricted);
        const isBlocked = Boolean(u.is_blocked);
        const usagePct = isRestricted && quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

        let status = 'normal';
        if (isBlocked) {
          status = 'blocked';
        } else if (!isRestricted) {
          status = 'unlimited';
        } else if (used >= quota) {
          status = 'exceeded';
        } else if (usagePct >= warningPct) {
          status = 'warning';
        }

        const allTime = allTimeUsageByUser[u.id] || { all_time_tokens: used, total_requests: 0, last_activity: null };

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role_id: u.role_id,
          role_name: u.role_name,
          domains: domainsByUser[u.id] || [],
          token_quota: quota,
          quota_period: u.quota_period,
          is_restricted: isRestricted,
          is_blocked: isBlocked,
          tokens_used_current_period: used,
          all_time_tokens: allTime.all_time_tokens,
          total_requests: allTime.total_requests,
          last_activity: allTime.last_activity,
          usage_pct: usagePct,
          status,
        };
      });
  }

  /**
   * Update or Create a single user's quota configuration
   */
  async updateUserQuota(userId, data) {
    const quota = Number(data.token_quota) >= 0 ? Number(data.token_quota) : 50000;
    const period = ['daily', 'weekly', 'monthly', 'total'].includes(data.quota_period)
      ? data.quota_period
      : 'monthly';
    const isRestricted = data.is_restricted !== undefined ? (data.is_restricted ? 1 : 0) : 1;
    const isBlocked = data.is_blocked !== undefined ? (data.is_blocked ? 1 : 0) : 0;

    let resetSql = '';
    const updateParams = [quota, period, isRestricted, isBlocked];

    if (data.reset_usage) {
      resetSql = ', tokens_used_current_period = 0, last_reset_at = CURRENT_TIMESTAMP';
    }

    await pool.query(
      `INSERT INTO ai_user_quotas (user_id, token_quota, quota_period, is_restricted, is_blocked, tokens_used_current_period)
       VALUES (?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         token_quota = ?,
         quota_period = ?,
         is_restricted = ?,
         is_blocked = ?
         ${resetSql},
         updated_at = CURRENT_TIMESTAMP`,
      [userId, quota, period, isRestricted, isBlocked, ...updateParams]
    );

    const [rows] = await pool.query('SELECT * FROM ai_user_quotas WHERE user_id = ?', [userId]);
    return rows[0] || null;
  }

  /**
   * Bulk Update Quotas for a list of users
   */
  async bulkUpdateQuotas({ user_ids, token_quota, quota_period, is_restricted, is_blocked, reset_usage }) {
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new Error('user_ids array is required for bulk update');
    }

    for (const uid of user_ids) {
      await this.updateUserQuota(uid, {
        token_quota,
        quota_period,
        is_restricted,
        is_blocked,
        reset_usage,
      });
    }

    return { success: true, updated_count: user_ids.length };
  }

  /**
   * Reset Token Usage for one user or all users
   */
  async resetUsage(userId) {
    if (userId === 'all') {
      await pool.query(`
        UPDATE ai_user_quotas SET
          tokens_used_current_period = 0,
          last_reset_at = CURRENT_TIMESTAMP
      `);
      return { success: true, message: 'All user token usage has been reset.' };
    } else {
      await pool.query(
        `UPDATE ai_user_quotas SET
           tokens_used_current_period = 0,
           last_reset_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [userId]
      );
      return { success: true, message: `Token usage for user #${userId} reset.` };
    }
  }

  /**
   * Check if user is allowed to execute AI queries (Quota check)
   */
  async checkUserQuota(userId) {
    const globalSettings = await this.getGlobalSettings();

    // 1. Fetch user quota record
    const [rows] = await pool.query('SELECT * FROM ai_user_quotas WHERE user_id = ?', [userId]);
    let quotaRecord = rows?.[0];

    // If no row exists, initialize with default
    if (!quotaRecord) {
      await pool.query(
        `INSERT IGNORE INTO ai_user_quotas (user_id, token_quota, quota_period, is_restricted, is_blocked, tokens_used_current_period)
         VALUES (?, ?, ?, ?, 0, 0)`,
        [
          userId,
          globalSettings.default_user_quota || 50000,
          globalSettings.default_quota_period || 'monthly',
          globalSettings.enforce_quotas ? 1 : 0,
        ]
      );
      const [reFetch] = await pool.query('SELECT * FROM ai_user_quotas WHERE user_id = ?', [userId]);
      quotaRecord = reFetch?.[0];
    }

    if (!quotaRecord) return { allowed: true };

    // Check manual block
    if (quotaRecord.is_blocked === 1) {
      return {
        allowed: false,
        reason: 'blocked',
        message: 'Your AI access has been suspended by your CRM administrator.',
      };
    }

    // Check if quotas are enforced globally and per-user
    if (!globalSettings.enforce_quotas || quotaRecord.is_restricted === 0) {
      return { allowed: true, quota: quotaRecord.token_quota, used: quotaRecord.tokens_used_current_period, is_unlimited: true };
    }

    // Check if period reset is needed (daily / monthly)
    const lastReset = quotaRecord.last_reset_at ? new Date(quotaRecord.last_reset_at) : new Date();
    const now = new Date();
    let needReset = false;

    if (quotaRecord.quota_period === 'daily') {
      needReset = now.toDateString() !== lastReset.toDateString();
    } else if (quotaRecord.quota_period === 'monthly') {
      needReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
    } else if (quotaRecord.quota_period === 'weekly') {
      const diffDays = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
      needReset = diffDays >= 7;
    }

    if (needReset) {
      await pool.query(
        'UPDATE ai_user_quotas SET tokens_used_current_period = 0, last_reset_at = CURRENT_TIMESTAMP WHERE id = ?',
        [quotaRecord.id]
      );
      quotaRecord.tokens_used_current_period = 0;
    }

    // Check if quota limit exceeded
    if (quotaRecord.tokens_used_current_period >= quotaRecord.token_quota) {
      return {
        allowed: false,
        reason: 'quota_exceeded',
        quota: quotaRecord.token_quota,
        used: quotaRecord.tokens_used_current_period,
        period: quotaRecord.quota_period,
        message: `Token Quota Exceeded: You have consumed your limit of ${Number(quotaRecord.token_quota).toLocaleString()} tokens for this ${quotaRecord.quota_period}. Please contact your administrator to adjust your quota.`,
      };
    }

    return {
      allowed: true,
      quota: quotaRecord.token_quota,
      used: quotaRecord.tokens_used_current_period,
      remaining: Math.max(0, quotaRecord.token_quota - quotaRecord.tokens_used_current_period),
    };
  }

  /**
   * Record Token Usage after AI Query execution
   */
  async recordUsage({
    userId,
    conversationId = null,
    provider = 'gemini',
    model = 'gemini-1.5-pro',
    promptText = '',
    completionText = '',
    usage = null,
    queryType = 'copilot',
    status = 'success',
  }) {
    let promptTokens = 0;
    let compTokens = 0;
    let totalTokens = 0;

    if (usage && Number(usage.total_tokens) > 0) {
      promptTokens = Number(usage.prompt_tokens || 0);
      compTokens = Number(usage.completion_tokens || 0);
      totalTokens = Number(usage.total_tokens || promptTokens + compTokens);
    } else {
      // Accurate fallback heuristic (approx 4 chars per token)
      promptTokens = Math.max(10, Math.ceil((promptText || '').length / 4));
      compTokens = Math.max(10, Math.ceil((completionText || '').length / 4));
      totalTokens = promptTokens + compTokens;
    }

    // Standard rate: $1.50 per 1M tokens
    const estimatedCost = totalTokens * 0.0000015;

    await pool.query(
      `INSERT INTO ai_token_usage (
         user_id, conversation_id, provider, model, prompt_tokens,
         completion_tokens, total_tokens, query_type, status, estimated_cost
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        conversationId,
        provider || 'gemini',
        model || 'gemini-1.5-pro',
        promptTokens,
        compTokens,
        totalTokens,
        queryType || 'copilot',
        status,
        estimatedCost,
      ]
    );

    // Increment user quota counter
    await pool.query(
      `UPDATE ai_user_quotas SET
         tokens_used_current_period = tokens_used_current_period + ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [totalTokens, userId]
    );

    return {
      prompt_tokens: promptTokens,
      completion_tokens: compTokens,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
    };
  }
}

module.exports = new AiTokenService();

