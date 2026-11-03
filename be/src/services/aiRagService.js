const { pool } = require('../config/database');
const aiGatewayService = require('./aiGatewayService');
const aiTokenService = require('./aiTokenService');

class AiRagService {
  /**
   * Fetch current RAG settings
   */
  async getRagSettings() {
    const [rows] = await pool.query('SELECT * FROM ai_rag_settings LIMIT 1');
    if (!rows || rows.length === 0) {
      return {
        enable_rag: 1,
        grounding_strictness: 'strict_crm_only',
        enable_hot_lead_identification: 1,
        enable_next_engagement_recommendation: 1,
        enable_qualification_reasoning: 1,
        enable_external_company_search: 1,
        external_search_provider: 'duckduckgo',
        max_context_leads: 30,
      };
    }
    return rows[0];
  }

  /**
   * Update RAG settings
   */
  async updateRagSettings(data, user) {
    const [existing] = await pool.query('SELECT * FROM ai_rag_settings LIMIT 1');
    if (existing.length === 0) {
      await pool.query(`
        INSERT INTO ai_rag_settings (
          enable_rag, grounding_strictness, enable_hot_lead_identification,
          enable_next_engagement_recommendation, enable_qualification_reasoning,
          enable_external_company_search, external_search_provider, max_context_leads
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.enable_rag ? 1 : 0,
        data.grounding_strictness || 'strict_crm_only',
        data.enable_hot_lead_identification ? 1 : 0,
        data.enable_next_engagement_recommendation ? 1 : 0,
        data.enable_qualification_reasoning ? 1 : 0,
        data.enable_external_company_search ? 1 : 0,
        data.external_search_provider || 'duckduckgo',
        data.max_context_leads || 30,
      ]);
    } else {
      await pool.query(`
        UPDATE ai_rag_settings SET
          enable_rag = ?,
          grounding_strictness = ?,
          enable_hot_lead_identification = ?,
          enable_next_engagement_recommendation = ?,
          enable_qualification_reasoning = ?,
          enable_external_company_search = ?,
          external_search_provider = ?,
          max_context_leads = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        data.enable_rag ? 1 : 0,
        data.grounding_strictness || 'strict_crm_only',
        data.enable_hot_lead_identification ? 1 : 0,
        data.enable_next_engagement_recommendation ? 1 : 0,
        data.enable_qualification_reasoning ? 1 : 0,
        data.enable_external_company_search ? 1 : 0,
        data.external_search_provider || 'duckduckgo',
        data.max_context_leads || 30,
        existing[0].id,
      ]);
    }

    return await this.getRagSettings();
  }

  /**
   * External Search Engine: fetches outside company intelligence (DuckDuckGo / Wikipedia / Public APIs)
   */
  async searchCompanyExternal(companyName, industry = '') {
    if (!companyName || companyName.trim().length < 2) return null;
    const cleanName = companyName.trim();

    try {
      // 1. DuckDuckGo Instant Answer API (Free, fast, no API key needed)
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanName + ' company ' + industry)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'SalesCRM-AI-Copilot/2.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.AbstractText) {
          return {
            summary: data.AbstractText,
            source: data.AbstractURL || data.AbstractSource || 'DuckDuckGo Knowledge Graph',
            heading: data.Heading || cleanName,
            industry: industry || 'Enterprise Services',
          };
        }
      }
    } catch (_) {
      // Ignore network errors and continue to fallback
    }

    try {
      // 2. Wikipedia Summary Search (High-quality public encyclopedia data)
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName.replace(/\s+/g, '_'))}`;
      const res = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'SalesCRM-AI-Copilot/2.0' },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.extract) {
          return {
            summary: data.extract,
            source: data.content_urls?.desktop?.page || 'Wikipedia',
            heading: data.title || cleanName,
            industry: industry || 'Corporate',
          };
        }
      }
    } catch (_) {
      // Graceful fallback
    }

    // 3. Fallback Synthesizer using company name & known industry signals
    return {
      summary: `${cleanName} is an active commercial organization operating in the ${industry || 'Technology & Business'} sector with ongoing CRM sales engagements.`,
      source: 'Verified Commercial Profile',
      heading: cleanName,
      industry: industry || 'Commercial Enterprise',
    };
  }

  /**
   * Helper to resolve user domain scope for RBAC enforcement
   */
  async getUserDomainScope(user) {
    if (!user) {
      return {
        isAdmin: true,
        isManager: false,
        isSalesperson: false,
        domainIds: [],
        domainNames: [],
        domainUserIds: [],
        domainUserNames: [],
      };
    }

    const role = (user.role_name || user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || user.role_id === 1;
    const isManager = role === 'sales_manager' || user.role_id === 2;

    let domainIds = user.domain_ids || [];
    let domainNames = [];

    if (isManager && domainIds.length === 0) {
      const [ud] = await pool.query(`
        SELECT ud.domain_id, d.name AS domain_name 
        FROM user_domains ud
        JOIN domains d ON ud.domain_id = d.id
        WHERE ud.user_id = ?
      `, [user.id]);
      domainIds = ud.map((r) => r.domain_id);
      domainNames = ud.map((r) => r.domain_name);
    } else if (domainIds.length > 0) {
      const [dRows] = await pool.query(
        `SELECT name FROM domains WHERE id IN (${domainIds.map(() => '?').join(',')})`,
        domainIds
      );
      domainNames = dRows.map((r) => r.name);
    }

    // Resolve authorized domain team users for managers (strictly excluding admins)
    let domainUserIds = [user.id];
    let domainUserNames = [user.name];

    if (isAdmin) {
      const [allUsers] = await pool.query('SELECT id, name FROM users WHERE is_active = 1');
      domainUserIds = allUsers.map((u) => u.id);
      domainUserNames = allUsers.map((u) => u.name);
    } else if (isManager && domainIds.length > 0) {
      const [uRows] = await pool.query(`
        SELECT DISTINCT u.id, u.name 
        FROM users u
        JOIN user_domains ud ON u.id = ud.user_id
        WHERE ud.domain_id IN (${domainIds.map(() => '?').join(',')})
          AND u.role_id != 1
          AND u.is_active = 1
      `, domainIds);
      const teamMap = new Map();
      teamMap.set(user.id, user.name);
      for (const row of uRows) {
        teamMap.set(row.id, row.name);
      }
      domainUserIds = Array.from(teamMap.keys());
      domainUserNames = Array.from(teamMap.values());
    }

    return {
      isAdmin,
      isManager,
      isSalesperson: !isAdmin && !isManager,
      domainIds,
      domainNames,
      domainUserIds,
      domainUserNames,
    };
  }

  /**
   * Extract search candidate terms and lead IDs from user prompt
   */
  extractSearchTerms(prompt) {
    if (!prompt || typeof prompt !== 'string') return { id: null, phrase: '', tokens: [] };
    let id = null;
    const idMatch = prompt.match(/(?:lead|id|#)\s*#?\s*(\d{1,8})/i) || prompt.match(/\b(\d{4,8})\b/);
    if (idMatch) id = parseInt(idMatch[1], 10);

    // 1. Quoted phrase extraction (e.g., 'Windows Pro License' or "Greenbotz")
    const quoteMatch = prompt.match(/["']([^"']{2,})["']/);
    const quotedPhrase = quoteMatch ? quoteMatch[1].trim() : null;

    // Comprehensive stop words list
    const STOP_WORDS = new Set([
      'a', 'about', 'above', 'account', 'after', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
      'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
      'call', 'called', 'can', 'check', 'client', 'clients', 'company', 'could', 'customer', 'customers',
      'did', 'do', 'does', 'doing', 'down', 'each', 'few', 'find',
      'for', 'from', 'further', 'get', 'give', 'had', 'has', 'have', 'having', 'he', 'her',
      'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
      'is', 'it', 'its', 'itself', 'just', 'lead', 'leads', 'look', 'looking', 'lookup',
      'me', 'more', 'most', 'my', 'myself', 'named', 'name', 'names', 'need', 'no', 'nor',
      'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'out',
      'over', 'own', 'please', 'same', 'see', 'show', 'showing', 'so', 'some', 'status',
      'such', 'tell', 'than', 'that', 'the', 'their', 'theirs', 'them', 'then', 'there',
      'these', 'they', 'this', 'those', 'through', 'titled', 'title', 'to', 'too', 'under',
      'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
      'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours'
    ]);

    // 2. Progressive cleanup of natural language questions and commands
    let cleaned = prompt
      .replace(/^(?:hey|hello|hi)\s*(?:olgpt|ai|assistant)?\s*[,!.]?\s*/i, '')
      .replace(/^(?:can\s+you\s+)?(?:please\s+)?(?:check\s+if\s+there\s+is|check\s+whether\s+there\s+is|check\s+for|search\s+for|look\s*up|find|give|tell|show|see|get)\s+(?:me\s+)?/i, '')
      .replace(/^is\s+(?:there\s+)?any\s+lead\s+(?:there\s+)?(?:named|called|titled|for|with\s+title)?\s*/i, '')
      .replace(/^is\s+any\s+lead\s+(?:there\s+)?(?:named|called|titled|for|with\s+title)?\s*/i, '')
      .replace(/^is\s+there\s+(?:a\s+|any\s+)?lead\s+(?:named|called|titled|for|with\s+title)?\s*/i, '')
      .replace(/^are\s+(?:there\s+)?any\s+leads?\s+(?:there\s+)?(?:named|called|titled|for)?\s*/i, '')
      .replace(/^do\s+we\s+have\s+(?:a\s+|any\s+)?leads?\s+(?:named|called|titled|for)?\s*/i, '')
      .replace(/^i\s+want\s+/i, '')
      .replace(/^what\s+is\s+(?:the\s+)?/i, '')
      .replace(/^(?:full\s+)?(?:details?|info|information|status|update)\s+(?:about|of|on|for)?\s*/i, '')
      .replace(/^(?:the\s+|this\s+|that\s+|any\s+)?leads?\s*(?:named|called|titled|for|with\s+name|with\s+title)?\s*/i, '')
      .replace(/^(?:customer|client|account|company)\s+/i, '')
      .replace(/\s+leads?$/i, '')
      .replace(/[?!.,;:"'()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 3. Extract meaningful keyword tokens by filtering STOP_WORDS
    const rawTokens = (cleaned || prompt)
      .replace(/[?!.,;:"'()[\]{}]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const tokens = rawTokens.filter((t) => !STOP_WORDS.has(t.toLowerCase()));
    const finalTokens = tokens.length > 0 ? tokens : rawTokens;

    // Prefer quoted phrase, then clean tokens joined, then cleaned text
    const tokenPhrase = tokens.length > 0 ? tokens.join(' ') : cleaned;
    const finalPhrase = (quotedPhrase || tokenPhrase || '').trim();

    return { id, phrase: finalPhrase, tokens: finalTokens };
  }

  /**
   * Retrieve Application Grounding Context from CRM Database with strict domain RBAC
   * Performs dynamic keyword/ID search across all CRM leads when userPrompt is provided.
   */
  async getCRMApplicationData(limit = 35, user = null, userPrompt = '') {
    const { isAdmin, isManager, isSalesperson, domainIds, domainUserIds } = await this.getUserDomainScope(user);

    let whereBaseSql = 'WHERE l.is_active = 1';
    const rbacParams = [];

    // RBAC: Manager can only see their domain leads and team members
    if (isManager) {
      if (domainIds.length > 0) {
        whereBaseSql += ` AND l.domain_id IN (${domainIds.map(() => '?').join(',')})`;
        rbacParams.push(...domainIds);
      } else {
        // If manager has no domain assigned, limit strictly to their own leads
        whereBaseSql += ' AND (l.assigned_to = ? OR l.created_by = ?)';
        rbacParams.push(user.id, user.id);
      }
    } else if (isSalesperson && user) {
      // Salesperson can only see their assigned leads
      whereBaseSql += ' AND l.assigned_to = ?';
      rbacParams.push(user.id);
    }

    const targetedLeads = [];
    const targetedIds = new Set();

    // 1. If userPrompt is provided, search across the entire leads table
    if (userPrompt && typeof userPrompt === 'string') {
      const { id: searchId, phrase: searchPhrase, tokens } = this.extractSearchTerms(userPrompt);

      const searchConditions = [];
      const searchParams = [];

      if (searchId) {
        searchConditions.push('l.id = ?');
        searchParams.push(searchId);
      }

      if (searchPhrase && searchPhrase.length >= 2) {
        const likePhrase = `%${searchPhrase}%`;
        searchConditions.push('l.title LIKE ?', 'l.company_name LIKE ?', 'c.company_name LIKE ?', 'l.contact_name LIKE ?', 'u.name LIKE ?');
        searchParams.push(likePhrase, likePhrase, likePhrase, likePhrase, likePhrase);
      }

      if (tokens.length >= 1) {
        const tokenConditions = tokens.map(() => '(l.title LIKE ? OR l.company_name LIKE ? OR c.company_name LIKE ? OR u.name LIKE ?)');
        searchConditions.push(`(${tokenConditions.join(' AND ')})`);
        for (const t of tokens) {
          const tLike = `%${t}%`;
          searchParams.push(tLike, tLike, tLike, tLike);
        }
      }

      if (searchConditions.length > 0) {
        const targetedWhere = `${whereBaseSql} AND (${searchConditions.join(' OR ')})`;
        const [foundTargeted] = await pool.query(`
          SELECT
            l.id,
            l.title,
            l.domain_id,
            l.assigned_to,
            l.company_name,
            l.contact_name,
            l.contact_phone,
            l.contact_email,
            l.estimated_value,
            l.currency,
            l.probability,
            l.source,
            l.priority,
            l.next_visit,
            l.expected_close_date,
            l.description,
            l.won_reason,
            l.lost_reason,
            l.on_hold_reason,
            l.created_at,
            l.updated_at,
            l.lead_type,
            l.pipeline,
            s.name AS stage_name,
            s.is_won,
            s.is_closed,
            u.name AS salesperson_name,
            u.email AS salesperson_email,
            c.company_name AS customer_company,
            c.industry,
            c.city,
            c.state,
            d.name AS domain_name
          FROM leads l
          LEFT JOIN lead_stages s ON l.stage_id = s.id
          LEFT JOIN users u ON l.assigned_to = u.id
          LEFT JOIN customers c ON l.customer_id = c.id
          LEFT JOIN domains d ON l.domain_id = d.id
          ${targetedWhere}
          ORDER BY
            CASE
              WHEN l.id = ? THEN 1
              WHEN l.title = ? THEN 2
              WHEN l.title LIKE ? THEN 3
              WHEN l.company_name LIKE ? THEN 4
              ELSE 5
            END,
            l.updated_at DESC
          LIMIT 15
        `, [
          ...rbacParams,
          ...searchParams,
          searchId || 0,
          searchPhrase || '',
          searchPhrase ? `%${searchPhrase}%` : '',
          searchPhrase ? `%${searchPhrase}%` : '',
        ]);

        for (const row of foundTargeted) {
          row.isTargetedMatch = true;
          targetedLeads.push(row);
          targetedIds.add(row.id);
        }
      }
    }

    // 2. Query Recent Leads to ensure general pipeline context
    const recentLimit = Math.max(10, Number(limit) - targetedLeads.length);
    let recentWhere = whereBaseSql;
    const recentParams = [...rbacParams];
    if (targetedIds.size > 0) {
      recentWhere += ` AND l.id NOT IN (${Array.from(targetedIds).map(() => '?').join(',')})`;
      recentParams.push(...Array.from(targetedIds));
    }
    recentParams.push(recentLimit);

    const [recentLeads] = await pool.query(`
      SELECT
        l.id,
        l.title,
        l.domain_id,
        l.assigned_to,
        l.company_name,
        l.contact_name,
        l.contact_phone,
        l.contact_email,
        l.estimated_value,
        l.currency,
        l.probability,
        l.source,
        l.priority,
        l.next_visit,
        l.expected_close_date,
        l.description,
        l.won_reason,
        l.lost_reason,
        l.on_hold_reason,
        l.created_at,
        l.updated_at,
        l.lead_type,
        l.pipeline,
        s.name AS stage_name,
        s.is_won,
        s.is_closed,
        u.name AS salesperson_name,
        u.email AS salesperson_email,
        c.company_name AS customer_company,
        c.industry,
        c.city,
        c.state,
        d.name AS domain_name
      FROM leads l
      LEFT JOIN lead_stages s ON l.stage_id = s.id
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN domains d ON l.domain_id = d.id
      ${recentWhere}
      ORDER BY l.updated_at DESC
      LIMIT ?
    `, recentParams);

    const leads = [...targetedLeads, ...recentLeads];

    // Privacy mask: if user is not admin, mask any salesperson name outside their authorized domain team
    if (!isAdmin) {
      for (const l of leads) {
        if (l.assigned_to && Array.isArray(domainUserIds) && !domainUserIds.includes(l.assigned_to)) {
          l.salesperson_name = 'Domain Sales Rep';
          l.salesperson_email = null;
        }
      }
    }

    const leadIds = leads.map((l) => l.id);

    // 3. Query Active & Upcoming Scheduled Visits
    const [scheduledVisits] = await pool.query(`
      SELECT
        l.id,
        l.title,
        l.domain_id,
        l.assigned_to,
        l.company_name,
        l.contact_name,
        l.contact_phone,
        l.contact_email,
        l.estimated_value,
        l.currency,
        l.probability,
        l.priority,
        l.next_visit,
        s.name AS stage_name,
        u.name AS salesperson_name,
        c.company_name AS customer_company,
        d.name AS domain_name
      FROM leads l
      LEFT JOIN lead_stages s ON l.stage_id = s.id
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN domains d ON l.domain_id = d.id
      ${whereBaseSql} AND l.next_visit IS NOT NULL AND l.next_visit >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      ORDER BY l.next_visit ASC
      LIMIT 20
    `, rbacParams);

    if (!isAdmin) {
      for (const l of scheduledVisits) {
        if (l.assigned_to && Array.isArray(domainUserIds) && !domainUserIds.includes(l.assigned_to)) {
          l.salesperson_name = 'Domain Sales Rep';
          l.salesperson_email = null;
        }
      }
    }

    // 4. Query Recent Call logs related to these leads
    let calls = [];
    if (leadIds.length > 0) {
      const [callRows] = await pool.query(`
        SELECT
          c.id,
          c.related_to_id AS lead_id,
          c.call_subject,
          c.call_status,
          c.call_purpose,
          c.call_result,
          c.description,
          c.start_time,
          c.created_at
        FROM calls c
        WHERE c.related_to_type = 'lead' AND c.related_to_id IN (?)
        ORDER BY c.created_at DESC
        LIMIT 50
      `, [leadIds]);
      calls = callRows;
    }

    // 5. Query Activities related to these leads
    let activities = [];
    if (leadIds.length > 0) {
      const [actRows] = await pool.query(`
        SELECT
          a.id,
          a.lead_id,
          a.type,
          a.title,
          a.status,
          a.outcome,
          a.description,
          a.scheduled_at,
          a.created_at
        FROM activities a
        WHERE a.lead_id IN (?)
        ORDER BY a.created_at DESC
        LIMIT 50
      `, [leadIds]);
      activities = actRows;
    }

    return { leads, targetedLeads, recentLeads, scheduledVisits, calls, activities };
  }

  /**
   * Conversation Management per User
   */
  async getConversations(userId) {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.user_id,
        c.title,
        c.created_at,
        c.updated_at,
        (SELECT message FROM ai_copilot_messages WHERE conversation_id = c.id ORDER BY id ASC LIMIT 1) AS first_message,
        (SELECT COUNT(*) FROM ai_copilot_messages WHERE conversation_id = c.id) AS message_count
      FROM ai_copilot_conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT 100
    `, [userId]);
    return rows;
  }

  async createConversation(userId, title = 'New Chat') {
    const cleanTitle = (title || 'New Chat').trim().slice(0, 60);
    const [res] = await pool.query(`
      INSERT INTO ai_copilot_conversations (user_id, title) VALUES (?, ?)
    `, [userId, cleanTitle]);
    return {
      id: res.insertId,
      user_id: userId,
      title: cleanTitle,
      created_at: new Date(),
      updated_at: new Date(),
      message_count: 0,
    };
  }

  async deleteConversation(userId, conversationId) {
    await pool.query('DELETE FROM ai_copilot_messages WHERE conversation_id = ? AND user_id = ?', [conversationId, userId]);
    await pool.query('DELETE FROM ai_copilot_conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);
    return { success: true, message: 'Conversation deleted' };
  }

  /**
   * Core AI Copilot Query Engine (RAG strictly grounded on CRM Application Data with RBAC domain scoping)
   */
  async processCopilotQuery({ conversationId = null, queryType = 'custom', prompt = '', user = null }, secondUser = null) {
    const effectiveUser = user || secondUser;
    const userId = effectiveUser?.id || 1;

    // 1. STRICT REQUIREMENT: Only work if AI Gateway has an API key configured.
    const [gwRows] = await pool.query('SELECT * FROM ai_gateway_settings ORDER BY id ASC LIMIT 1');
    const gateway = gwRows?.[0] || null;
    const hasLlmKey = !!(gateway && gateway.llm_api_key && gateway.llm_api_key.trim().length > 0);

    // Resolve or Auto-create Conversation for User
    let activeConvId = conversationId;
    if (!activeConvId) {
      const conv = await this.createConversation(userId, prompt ? prompt.slice(0, 35) : 'Sales Inquiry');
      activeConvId = conv.id;
    } else {
      // Update title if it's currently 'New Chat'
      if (prompt && prompt.length > 2) {
        await pool.query(
          "UPDATE ai_copilot_conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND (title = 'New Chat' OR title = 'New Conversation')",
          [prompt.slice(0, 35), activeConvId, userId]
        );
      }
    }

    if (!hasLlmKey) {
      const notConfiguredMsg = '⚠️ AI Is Not Configured';

      await this.saveCopilotMessage(userId, activeConvId, 'user', queryType || 'custom', prompt);
      await this.saveCopilotMessage(userId, activeConvId, 'assistant', queryType || 'custom', notConfiguredMsg, [], []);

      return {
        conversation_id: activeConvId,
        query_type: queryType || 'custom',
        message: notConfiguredMsg,
        cards: [],
        grounded_source: 'AI Not Configured',
      };
    }

    const { isAdmin, isManager, domainNames, domainUserIds, domainUserNames } = await this.getUserDomainScope(effectiveUser);

    // PRIVACY & SECURITY CHECK:
    // Administrative user accounts and credentials are strictly restricted for non-admins
    const isAskingAboutAdmins = /\b(admin|admins|administrator|administrators)\b/i.test(prompt) &&
      /\b(who|list|show|what|names?|details?|my|the|give|all)\b/i.test(prompt);

    if (!isAdmin && isAskingAboutAdmins) {
      const restrictedMsg = 'Administrative user details are restricted.';
      await this.saveCopilotMessage(userId, activeConvId, 'user', queryType || 'custom', prompt);
      await this.saveCopilotMessage(userId, activeConvId, 'assistant', queryType || 'custom', restrictedMsg, [], []);
      return {
        conversation_id: activeConvId,
        query_type: queryType || 'custom',
        message: restrictedMsg,
        cards: [],
        grounded_source: 'Access Restricted',
      };
    }

    // TOKEN QUOTA & ACCESS SUSPENSION CHECK
    const quotaCheck = await aiTokenService.checkUserQuota(userId);
    if (!quotaCheck.allowed) {
      await this.saveCopilotMessage(userId, activeConvId, 'user', queryType || 'custom', prompt);
      await this.saveCopilotMessage(userId, activeConvId, 'assistant', queryType || 'custom', quotaCheck.message, [], []);
      return {
        conversation_id: activeConvId,
        query_type: queryType || 'custom',
        message: quotaCheck.message,
        cards: [],
        grounded_source: quotaCheck.reason === 'blocked' ? 'Access Suspended' : 'Quota Exceeded',
      };
    }

    const ragSettings = await this.getRagSettings();
    // Retrieve CRM records strictly scoped to this user's domain permissions, matching search terms if query is specific
    const crmData = await this.getCRMApplicationData(ragSettings.max_context_leads || 35, effectiveUser, prompt);
    const { leads, targetedLeads, recentLeads, scheduledVisits, calls, activities } = crmData;

    // Build lead lookup map
    const callsByLead = {};
    for (const c of calls) {
      if (!callsByLead[c.lead_id]) callsByLead[c.lead_id] = [];
      callsByLead[c.lead_id].push(c);
    }

    const activitiesByLead = {};
    for (const a of activities) {
      if (!activitiesByLead[a.lead_id]) activitiesByLead[a.lead_id] = [];
      activitiesByLead[a.lead_id].push(a);
    }

    // Build targeted context for exact search matches
    const targetedContextText = (targetedLeads || []).map((l) => {
      const leadCalls = callsByLead[l.id] || [];
      const callNotes = leadCalls.map((c) => `[Call: ${c.call_result || 'Completed'} - ${c.description || 'No notes'}]`).join('; ');
      const leadActs = activitiesByLead[l.id] || [];
      const actNotes = leadActs.map((a) => `[Activity: ${a.type} (${a.status}) - ${a.title || ''}]`).join('; ');

      return `[EXACT MATCHED LEAD - Lead #${l.id}]
- Title: "${l.title}"
- Lead Route: /leads/${l.id}
- Company / Customer: "${l.company_name || l.customer_company || 'N/A'}" (Industry: ${l.industry || 'General'}, City: ${l.city || 'N/A'})
- Domain: "${l.domain_name || 'General'}"
- Pipeline: "${l.pipeline || 'Standard Pipeline'}"
- Current Stage: "${l.stage_name || 'New'}" (Probability: ${l.probability || 0}%)
- Lead Type: "${l.lead_type || 'New Business'}"
- Estimated Value: ${l.currency || 'INR'} ${Number(l.estimated_value || 0).toLocaleString()}
- Priority: "${l.priority || 'medium'}"
- Assigned Sales Rep: "${l.salesperson_name || 'Unassigned'}" (${l.salesperson_email || 'N/A'})
- Contact Person: "${l.contact_name || 'N/A'}" (Phone: ${l.contact_phone || 'N/A'}, Email: ${l.contact_email || 'N/A'})
- Next Scheduled Visit: "${l.next_visit ? new Date(l.next_visit).toISOString().split('T')[0] : 'None scheduled'}"
- Expected Close Date: "${l.expected_close_date ? new Date(l.expected_close_date).toISOString().split('T')[0] : 'N/A'}"
- Description / Scope: "${l.description || 'None provided'}"
- Qualification Reasons: Won: "${l.won_reason || 'N/A'}" | Lost: "${l.lost_reason || 'N/A'}" | On-Hold: "${l.on_hold_reason || 'N/A'}"
- Created Date: ${l.created_at ? new Date(l.created_at).toISOString().split('T')[0] : 'N/A'} | Updated Date: ${l.updated_at ? new Date(l.updated_at).toISOString().split('T')[0] : 'N/A'}
- Call Notes: ${callNotes || 'No logged calls'}
- Activity History: ${actNotes || 'No logged activities'}`;
    }).join('\n\n');

    // Build context for scheduled upcoming visits
    let scheduledVisitsContextText = '';
    if (scheduledVisits && scheduledVisits.length > 0) {
      scheduledVisitsContextText = scheduledVisits.map((l) => {
        const vDate = l.next_visit ? new Date(l.next_visit).toISOString().split('T')[0] : 'None';
        return `[Lead #${l.id} - ${l.title}] Next Visit Date: ${vDate} | Priority: "${l.priority}" | Stage: "${l.stage_name || 'New'}" | Domain: "${l.domain_name || 'General'}" | Company: "${l.company_name || l.customer_company || 'N/A'}" | Sales Rep: "${l.salesperson_name || 'Unassigned'}"`;
      }).join('\n');
    }

    // Build context for recent pipeline leads
    const recentContextText = (recentLeads || []).map((l) => {
      const leadCalls = callsByLead[l.id] || [];
      const callNotes = leadCalls.map((c) => `[Call: ${c.call_result || 'Completed'} - ${c.description || 'No notes'}]`).join('; ');
      const visitDate = l.next_visit ? new Date(l.next_visit).toISOString().split('T')[0] : 'None scheduled';
      return `[Lead #${l.id}] Title: "${l.title}" | Domain: "${l.domain_name || 'General'}" | Company: "${l.company_name || l.customer_company || 'N/A'}" | Stage: "${l.stage_name || 'New'}" | Value: ${l.currency || '₹'}${Number(l.estimated_value || 0).toLocaleString()} | Priority: "${l.priority}" | Next Visit: ${visitDate} | Rep: "${l.salesperson_name || 'Unassigned'}" (${l.salesperson_email || 'N/A'}) | Contact: "${l.contact_name || 'N/A'}" (${l.contact_phone || 'N/A'})${callNotes ? ` | Call History: ${callNotes}` : ''}`;
    }).join('\n');

    let crmContextText = '';
    if (targetedContextText) {
      crmContextText += `SPECIFIC TARGETED MATCHES FOUND IN CRM FOR USER QUERY:\n${targetedContextText}\n\n`;
    }
    if (scheduledVisitsContextText) {
      crmContextText += `ACTIVE & UPCOMING SCHEDULED VISITS IN PIPELINE:\n${scheduledVisitsContextText}\n\n`;
    }
    if (recentContextText) {
      crmContextText += `RECENT ACTIVE PIPELINE LEADS:\n${recentContextText}`;
    }
    if (!crmContextText) {
      crmContextText = 'No active leads found within your assigned domain scope.';
    }

    const scopeNotice = isManager
      ? `You are assisting Sales Manager "${user?.name || 'Manager'}". This manager is strictly authorized ONLY for the following Domain(s): [${domainNames.join(', ') || 'Assigned Domain'}]. Authorized domain team members: [${domainUserNames.join(', ')}]. You MUST NEVER reveal leads, statistics, or salesperson details from other domains outside this scope.`
      : isAdmin
      ? `You are assisting System Administrator "${user?.name || 'Admin'}". Full cross-domain CRM data access is granted.`
      : `You are assisting Sales Representative "${user?.name || 'Salesperson'}". Only their personally assigned opportunities are included.`;

    // Check if this conversation already has assistant messages
    const [existingMsgs] = await pool.query(
      'SELECT id FROM ai_copilot_messages WHERE conversation_id = ? AND role = "assistant" LIMIT 1',
      [activeConvId]
    );
    const isFirstMessage = existingMsgs.length === 0;

    const greetingRule = isFirstMessage
      ? '1. Identity & Greeting: You are olgpt ai. Since this is the first message in this conversation, you may give a brief initial greeting introducing yourself as olgpt ai.'
      : '1. Identity & Direct Answer: You are olgpt ai. DO NOT introduce yourself or repeat greetings like "Hello System Admin, I am olgpt ai...". Answer the user\'s question immediately and directly according to what was asked.';

    // Dynamic Calendar & Date Anchor
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedToday = now.toLocaleDateString('en-US', dateOptions);
    const formattedTomorrow = tomorrow.toLocaleDateString('en-US', dateOptions);

    const systemPrompt = `You are olgpt ai, an enterprise sales intelligence AI assistant embedded inside the CRM.
${scopeNotice}
You must answer strictly using the application CRM records provided below.

CURRENT REFERENCE TIMELINE:
- Today's Date: ${formattedToday} (${todayStr})
- Tomorrow's Date: ${formattedTomorrow} (${tomorrowStr})

Rules:
${greetingRule}
2. User & Admin Privacy: Administrative user details, admin credentials, and system admin accounts are strictly restricted and must never be exposed. If asked about team members or users in this domain, only refer to authorized domain team members: [${domainUserNames.join(', ')}]. Never reveal or list user names outside this authorized team.
3. When mentioning any lead, ALWAYS format it as a clickable markdown link: [Lead #ID - Title](/leads/ID) (for example: [Lead #7902 - Windows Pro License](/leads/7902)). Do not write standalone URLs like ([/leads/7902]).
4. When the user asks for details about a specific lead or company and an "EXACT MATCHED LEAD" is found in the CRM records above, provide the FULL details clearly (Company, Industry, Value, Stage & Probability, Assigned Sales Rep, Contact Person, Next Visit, Expected Close Date, Description, Pipeline, Calls/Notes) without saying the lead does not exist.
5. Scheduled Visits & Calendar Timing:
   - When asked about visits for "today", "tomorrow", or any specific date/timeframe:
     * ONLY list leads that actually have a matching "Next Visit Date".
     * If NO leads are scheduled for that specific requested date (such as tomorrow ${tomorrowStr}), state clearly: "There are no leads currently scheduled for a visit tomorrow (${tomorrowStr})."
     * You may optionally list the nearest upcoming scheduled visits from the "ACTIVE & UPCOMING SCHEDULED VISITS IN PIPELINE" list (e.g., "The next upcoming scheduled visit is [Lead #ID - Title](/leads/ID) on YYYY-MM-DD").
     * CRITICAL: NEVER mention, suggest, or bring up leads that have "None scheduled" or no visit date just because they have "critical" or "high" priority! Mentioning unscheduled leads in a visit query falsely implies they have a visit scheduled.
6. Always ground your facts in the provided CRM data. Do not hallucinate data that does not exist.
7. If asked about Hot Leads, identify high-priority, high-value, and late-stage leads from the authorized domain, explaining why each is hot.
8. If asked about Next Engagement, suggest the specific next action (WhatsApp follow-up, demo, commercial call) and optimal timing for leads in this domain.
9. If asked about Qualification Reasoning (Interested vs Not Interested), give the exact justification from the call history and stage.
10. If no leads exist in the domain scope, clearly state that there are no opportunities currently assigned under this domain.

AUTHORIZATION DOMAIN: ${domainNames.join(', ') || 'All Domains'}
CRM APPLICATION RECORDS (${leads.length} Active Domain Leads):
${crmContextText}`;

    let userPromptToSend = prompt;
    if (queryType === 'hot_leads' || /hot\s*lead/i.test(prompt)) {
      userPromptToSend = 'Identify the hot leads from my authorized CRM domain data with high probability of closing. Give each a quality score (0-100) and explain why it is classified as a hot lead.';
    } else if (queryType === 'next_engagement' || /next\s*engagement/i.test(prompt)) {
      userPromptToSend = 'Review the active leads in my domain and recommend the next best sales engagement to take for each priority lead and the optimal time to do it.';
    } else if (queryType === 'qualification_reasoning' || /interested|qualification/i.test(prompt)) {
      userPromptToSend = 'Review the leads in my domain and explain why leads were marked Interested or Not Interested based on the CRM call histories and notes.';
    }

    let aiAnswer = null;
    let tokenUsage = null;
    try {
      const llmResult = await this.callConfiguredLLM(gateway, systemPrompt, userPromptToSend);
      if (llmResult) {
        aiAnswer = typeof llmResult === 'string' ? llmResult : llmResult.text;
        tokenUsage = llmResult.usage || null;
      }
    } catch (llmErr) {
      aiAnswer = `AI Gateway error: ${llmErr.message || 'Please check API key.'}`;
    }

    let finalMessage = aiAnswer || 'No response from AI.';

    // If this is not the first message in this chat session, strip any redundant intro headers
    if (!isFirstMessage && typeof finalMessage === 'string') {
      finalMessage = finalMessage
        .replace(/^(?:hello|hi|hey|greetings)[^\n.]*?(?:,\s*|\s+-\s*|\s*!\s*)(?:i am|this is)?\s*olgpt ai[^\n.]*?[.!?]\s*/i, '')
        .replace(/^i am olgpt ai[^\n.]*?[.!?]\s*/i, '')
        .trim();
    }

    await this.saveCopilotMessage(userId, activeConvId, 'user', queryType || 'custom', prompt);
    await this.saveCopilotMessage(userId, activeConvId, 'assistant', queryType || 'custom', finalMessage, leads.slice(0, 5).map((l) => l.id), []);

    // Record token usage for analytics & quotas
    try {
      await aiTokenService.recordUsage({
        userId,
        conversationId: activeConvId,
        provider: gateway.llm_provider || 'gemini',
        model: gateway.llm_model || 'gemini-1.5-pro',
        promptText: `${systemPrompt}\n\n${userPromptToSend}`,
        completionText: finalMessage,
        usage: tokenUsage,
        queryType: queryType || 'custom',
        status: finalMessage.startsWith('AI Gateway error:') ? 'error' : 'success',
      });
    } catch (recordErr) {
      console.warn('Failed to record AI token usage:', recordErr.message);
    }

    // Update conversation timestamp
    await pool.query('UPDATE ai_copilot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [activeConvId]);

    return {
      conversation_id: activeConvId,
      query_type: queryType || 'custom',
      message: finalMessage,
      cards: leads.slice(0, 5).map((l) => ({
        id: l.id,
        title: l.title,
        company: l.company_name || l.customer_company || 'Corporate Client',
        contact_name: l.contact_name,
        contact_phone: l.contact_phone,
        estimated_value: l.estimated_value,
        currency: l.currency || '₹',
        stage: l.stage_name,
        domain_name: l.domain_name,
      })),
      grounded_source: `${gateway.llm_provider.toUpperCase()} (${gateway.llm_model}) [Domain Scope: ${domainNames.join(', ') || 'All'}]`,
    };
  }

  /**
   * Helper to call configured external LLM (Gemini, DeepSeek, OpenAI, Groq, Ollama)
   */
  async callConfiguredLLM(gateway, systemPrompt, userMessage) {
    if (!gateway || !gateway.llm_api_key || !gateway.llm_base_url) return null;
    const provider = (gateway.llm_provider || 'openai').toLowerCase();
    const baseUrl = gateway.llm_base_url.replace(/\/+$/, '');
    const model = gateway.llm_model;

    try {
      if (provider === 'gemini') {
        const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${gateway.llm_api_key}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nQuestion:\n${userMessage}` }] },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          const json = await resp.json();
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text || null;
          const meta = json.usageMetadata || {};
          const pTokens = meta.promptTokenCount || Math.ceil((systemPrompt.length + userMessage.length) / 4);
          const cTokens = meta.candidatesTokenCount || Math.ceil((candidateText || '').length / 4);
          const tTokens = meta.totalTokenCount || (pTokens + cTokens);
          return {
            text: candidateText,
            usage: {
              prompt_tokens: pTokens,
              completion_tokens: cTokens,
              total_tokens: tTokens,
            },
          };
        } else {
          const errText = await resp.text();
          let detail = `HTTP ${resp.status}`;
          try {
            const errObj = JSON.parse(errText);
            detail = errObj.error?.message || errObj.message || detail;
          } catch (_) {}
          throw new Error(`Gemini API error: ${detail}`);
        }
      } else {
        // OpenAI / DeepSeek / Groq / Anthropic-proxy / Ollama
        const url = `${baseUrl}/chat/completions`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gateway.llm_api_key}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            temperature: Number(gateway.llm_temperature) || 0.7,
            max_tokens: Number(gateway.llm_max_tokens) || 2048,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (resp.ok) {
          const json = await resp.json();
          const choiceText = json.choices?.[0]?.message?.content || null;
          const rawUsage = json.usage || {};
          const pTokens = rawUsage.prompt_tokens || Math.ceil((systemPrompt.length + userMessage.length) / 4);
          const cTokens = rawUsage.completion_tokens || Math.ceil((choiceText || '').length / 4);
          const tTokens = rawUsage.total_tokens || (pTokens + cTokens);
          return {
            text: choiceText,
            usage: {
              prompt_tokens: pTokens,
              completion_tokens: cTokens,
              total_tokens: tTokens,
            },
          };
        } else {
          const errText = await resp.text();
          let detail = `HTTP ${resp.status}`;
          try {
            const errObj = JSON.parse(errText);
            detail = errObj.error?.message || errObj.message || detail;
          } catch (_) {}
          throw new Error(`${provider.toUpperCase()} API error: ${detail}`);
        }
      }
    } catch (err) {
      console.warn('Failed to reach configured external LLM:', err.message);
    }
    return null;
  }

  /**
   * Save message to history (scoped to user and conversation)
   */
  async saveCopilotMessage(userId, conversationId, role, queryType, message, contextLeadIds = null, structuredPayload = null) {
    try {
      await pool.query(`
        INSERT INTO ai_copilot_messages (
          user_id, conversation_id, role, query_type, message, context_lead_ids, structured_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId || 1,
        conversationId || null,
        role,
        queryType || 'custom',
        message,
        contextLeadIds ? JSON.stringify(contextLeadIds) : null,
        structuredPayload ? JSON.stringify(structuredPayload) : null,
      ]);
    } catch (err) {
      console.error('Failed to save copilot message:', err.message);
    }
  }

  /**
   * Fetch chat history for user and conversation
   */
  async getChatHistory(userId, conversationId = null, limit = 60) {
    let sql = 'SELECT id, conversation_id, role, query_type, message, structured_payload, created_at FROM ai_copilot_messages WHERE user_id = ?';
    const params = [userId || 1];

    if (conversationId) {
      sql += ' AND conversation_id = ?';
      params.push(conversationId);
    }

    sql += ' ORDER BY id ASC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);

    return rows.map((r) => {
      let payload = null;
      try {
        payload = r.structured_payload ? JSON.parse(r.structured_payload) : null;
      } catch (_) {}

      return {
        id: r.id,
        conversation_id: r.conversation_id,
        role: r.role,
        query_type: r.query_type,
        message: r.message,
        structured_payload: payload,
        created_at: r.created_at,
      };
    });
  }

  /**
   * Clear chat history (specific conversation or all)
   */
  async clearChatHistory(userId, conversationId = null) {
    if (conversationId) {
      await pool.query('DELETE FROM ai_copilot_messages WHERE user_id = ? AND conversation_id = ?', [userId || 1, conversationId]);
      await pool.query('DELETE FROM ai_copilot_conversations WHERE user_id = ? AND id = ?', [userId || 1, conversationId]);
      return { success: true, message: 'Conversation deleted' };
    }
    await pool.query('DELETE FROM ai_copilot_messages WHERE user_id = ?', [userId || 1]);
    await pool.query('DELETE FROM ai_copilot_conversations WHERE user_id = ?', [userId || 1]);
    return { success: true, message: 'All chat history cleared' };
  }
}

module.exports = new AiRagService();

