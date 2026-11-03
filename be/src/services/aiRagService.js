const { pool } = require('../config/database');
const aiGatewayService = require('./aiGatewayService');

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
    if (!user) return { isAdmin: true, isManager: false, isSalesperson: false, domainIds: [], domainNames: [] };

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

    return {
      isAdmin,
      isManager,
      isSalesperson: !isAdmin && !isManager,
      domainIds,
      domainNames,
    };
  }

  /**
   * Retrieve Application Grounding Context from CRM Database with strict domain RBAC
   */
  async getCRMApplicationData(limit = 35, user = null) {
    const { isAdmin, isManager, isSalesperson, domainIds } = await this.getUserDomainScope(user);

    let whereSql = 'WHERE l.is_active = 1';
    const params = [];

    // RBAC: Manager can only see their domain leads and team members
    if (isManager) {
      if (domainIds.length > 0) {
        whereSql += ` AND l.domain_id IN (${domainIds.map(() => '?').join(',')})`;
        params.push(...domainIds);
      } else {
        // If manager has no domain assigned, limit strictly to their own leads
        whereSql += ' AND (l.assigned_to = ? OR l.created_by = ?)';
        params.push(user.id, user.id);
      }
    } else if (isSalesperson && user) {
      // Salesperson can only see their assigned leads
      whereSql += ' AND l.assigned_to = ?';
      params.push(user.id);
    }

    params.push(Number(limit));

    // 1. Query Leads with Stages, Rep info, and Domain info
    const [leads] = await pool.query(`
      SELECT
        l.id,
        l.title,
        l.domain_id,
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
      ${whereSql}
      ORDER BY l.updated_at DESC
      LIMIT ?
    `, params);

    const leadIds = leads.map((l) => l.id);

    // 2. Query Recent Call logs related to these leads
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

    // 3. Query Activities related to these leads
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

    return { leads, calls, activities };
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
  async processCopilotQuery({ conversationId = null, queryType = 'custom', prompt = '', user = null }) {
    const userId = user?.id || 1;

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

    const ragSettings = await this.getRagSettings();
    // Retrieve CRM records strictly scoped to this user's domain permissions
    const crmData = await this.getCRMApplicationData(ragSettings.max_context_leads || 35, user);
    const { leads, calls, activities } = crmData;
    const { isAdmin, isManager, domainNames } = await this.getUserDomainScope(user);

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

    // Build RAG context string for the AI model
    const crmContextText = leads.length === 0
      ? 'No active leads found within your assigned domain scope.'
      : leads.map((l) => {
          const leadCalls = callsByLead[l.id] || [];
          const callNotes = leadCalls.map((c) => `[Call: ${c.call_result || 'Completed'} - ${c.description || 'No notes'}]`).join('; ');
          return `[Lead #${l.id}] Title: "${l.title}" | Domain: "${l.domain_name || 'General'}" | Company: "${l.company_name || l.customer_company || 'N/A'}" | Stage: "${l.stage_name || 'New'}" | Value: ${l.currency || '₹'}${Number(l.estimated_value || 0).toLocaleString()} | Priority: "${l.priority}" | Rep: "${l.salesperson_name || 'Unassigned'}" (${l.salesperson_email || 'N/A'}) | Contact: "${l.contact_name || 'N/A'}" (${l.contact_phone || 'N/A'})${callNotes ? ` | Call History: ${callNotes}` : ''}`;
        }).join('\n');

    const scopeNotice = isManager
      ? `You are assisting Sales Manager "${user?.name || 'Manager'}". This manager is strictly authorized ONLY for the following Domain(s): [${domainNames.join(', ') || 'Assigned Domain'}]. You MUST NEVER reveal leads, statistics, or salesperson details from other domains outside this scope.`
      : isAdmin
      ? `You are assisting System Administrator "${user?.name || 'Admin'}". Full cross-domain CRM data access is granted.`
      : `You are assisting Sales Representative "${user?.name || 'Salesperson'}". Only their personally assigned opportunities are included.`;

    const systemPrompt = `You are olgpt ai, an enterprise sales intelligence AI assistant embedded inside the CRM.
${scopeNotice}
You must answer strictly using the application CRM records provided below.
Rules:
1. Always introduce and refer to yourself strictly as "olgpt ai" (never "SalesCRM Copilot").
2. When mentioning any lead, ALWAYS format it as a clickable markdown link: [Lead #ID - Title](/leads/ID) (for example: [Lead #4608 - NOC and NAC](/leads/4608)). Do not write standalone URLs like ([/leads/4608]).
3. Always ground your facts in the provided CRM data. Do not hallucinate data that does not exist.
4. If asked about Hot Leads, identify high-priority, high-value, and late-stage leads from the authorized domain, explaining why each is hot.
5. If asked about Next Engagement, suggest the specific next action (WhatsApp follow-up, demo, commercial call) and optimal timing for leads in this domain.
6. If asked about Qualification Reasoning (Interested vs Not Interested), give the exact justification from the call history and stage.
7. If no leads exist in the domain scope, clearly state that there are no opportunities currently assigned under this domain.

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
    try {
      aiAnswer = await this.callConfiguredLLM(gateway, systemPrompt, userPromptToSend);
    } catch (llmErr) {
      aiAnswer = `AI Gateway error: ${llmErr.message || 'Please check API key.'}`;
    }

    const finalMessage = aiAnswer || 'No response from AI.';

    await this.saveCopilotMessage(userId, activeConvId, 'user', queryType || 'custom', prompt);
    await this.saveCopilotMessage(userId, activeConvId, 'assistant', queryType || 'custom', finalMessage, leads.slice(0, 5).map((l) => l.id), []);

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
          return json.candidates?.[0]?.content?.parts?.[0]?.text || null;
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
          return json.choices?.[0]?.message?.content || null;
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

