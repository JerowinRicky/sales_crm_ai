const { pool } = require('../config/database');

const FIELD_LABELS = {
  llm_provider: 'LLM Provider',
  llm_model: 'LLM Model Name',
  llm_api_key: 'LLM API Key',
  llm_base_url: 'LLM Base URL',
  llm_temperature: 'Temperature',
  llm_max_tokens: 'Max Tokens',
  llm_timeout_seconds: 'Timeout (s)',
  llm_custom_headers: 'Custom Headers',
  whatsapp_provider: 'WhatsApp Provider',
  whatsapp_phone_number_id: 'WhatsApp Phone Number ID',
  whatsapp_business_account_id: 'WhatsApp Business Account ID',
  whatsapp_api_key: 'WhatsApp API Key / Access Token',
  whatsapp_api_endpoint: 'WhatsApp API Endpoint',
  whatsapp_webhook_url: 'WhatsApp Webhook URL',
  whatsapp_webhook_verify_token: 'WhatsApp Webhook Verify Token',
  telephony_provider: 'Telephony Provider',
  telephony_account_sid: 'Telephony Account SID / Key',
  telephony_auth_token: 'Telephony Auth Token / Secret',
  telephony_caller_id: 'Telephony Caller ID',
  telephony_base_url: 'Telephony Base URL',
  telephony_voice_id: 'Voice Model / Persona',
  telephony_max_call_duration_seconds: 'Max Call Duration (s)',
};

const SECRET_FIELDS = [
  'llm_api_key',
  'whatsapp_api_key',
  'whatsapp_webhook_verify_token',
  'telephony_auth_token',
];

function maskSecret(val) {
  if (!val) return '';
  if (val.length <= 6) return '••••••';
  return `${val.slice(0, 3)}••••••••${val.slice(-3)}`;
}

class AiGatewayService {
  /**
   * Fetch current active gateway settings with masked secrets
   */
  async getSettings() {
    const [rows] = await pool.query('SELECT * FROM ai_gateway_settings ORDER BY id ASC LIMIT 1');
    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // Build safe return payload with indicators whether secrets are configured
    const safeData = {
      ...row,
      llm_api_key_configured: Boolean(row.llm_api_key),
      llm_api_key_masked: maskSecret(row.llm_api_key),
      llm_api_key: row.llm_api_key ? '••••••••' : '',

      whatsapp_api_key_configured: Boolean(row.whatsapp_api_key),
      whatsapp_api_key_masked: maskSecret(row.whatsapp_api_key),
      whatsapp_api_key: row.whatsapp_api_key ? '••••••••' : '',

      whatsapp_webhook_verify_token_configured: Boolean(row.whatsapp_webhook_verify_token),
      whatsapp_webhook_verify_token_masked: maskSecret(row.whatsapp_webhook_verify_token),
      whatsapp_webhook_verify_token: row.whatsapp_webhook_verify_token ? '••••••••' : '',

      telephony_auth_token_configured: Boolean(row.telephony_auth_token),
      telephony_auth_token_masked: maskSecret(row.telephony_auth_token),
      telephony_auth_token: row.telephony_auth_token ? '••••••••' : '',
    };

    return safeData;
  }

  /**
   * Save updated settings and create audit history entry
   */
  async updateSettings({ settings, user, reason }) {
    const [rows] = await pool.query('SELECT * FROM ai_gateway_settings ORDER BY id ASC LIMIT 1');
    if (!rows || rows.length === 0) {
      throw new Error('AI gateway settings table is empty. Please run migrations.');
    }

    const current = rows[0];
    const diffs = {};
    const changeList = [];

    // Fields to compare
    const trackableFields = [
      'llm_provider',
      'llm_model',
      'llm_api_key',
      'llm_base_url',
      'llm_temperature',
      'llm_max_tokens',
      'llm_timeout_seconds',
      'llm_custom_headers',
      'whatsapp_provider',
      'whatsapp_phone_number_id',
      'whatsapp_business_account_id',
      'whatsapp_api_key',
      'whatsapp_api_endpoint',
      'whatsapp_webhook_url',
      'whatsapp_webhook_verify_token',
      'telephony_provider',
      'telephony_account_sid',
      'telephony_auth_token',
      'telephony_caller_id',
      'telephony_base_url',
      'telephony_voice_id',
      'telephony_max_call_duration_seconds',
    ];

    const updatedData = { ...current };

    for (const field of trackableFields) {
      if (settings[field] === undefined) continue;

      let newVal = settings[field];
      const oldVal = current[field];

      // Handle secrets: if user passed '••••••••' or empty when already configured, keep existing
      if (SECRET_FIELDS.includes(field)) {
        if (!newVal || newVal === '••••••••' || (typeof newVal === 'string' && newVal.includes('••••'))) {
          newVal = oldVal;
        }
      }

      // Type normalization
      if (typeof oldVal === 'number' && typeof newVal !== 'undefined') {
        newVal = Number(newVal);
      }

      // Check difference
      const isDiff = String(oldVal ?? '') !== String(newVal ?? '');

      if (isDiff) {
        const label = FIELD_LABELS[field] || field;
        const displayOld = SECRET_FIELDS.includes(field) ? maskSecret(oldVal) : String(oldVal ?? 'None');
        const displayNew = SECRET_FIELDS.includes(field) ? maskSecret(newVal) : String(newVal ?? 'None');

        diffs[field] = {
          label,
          old_value: displayOld,
          new_value: displayNew,
        };

        changeList.push(`${label}: "${displayOld}" ➔ "${displayNew}"`);
        updatedData[field] = newVal;
      }
    }

    // If nothing changed
    if (changeList.length === 0) {
      return {
        updated: false,
        message: 'No changes detected. Configuration is up to date.',
        version: current.current_version,
      };
    }

    const newVersion = (current.current_version || 1) + 1;
    const summary = changeList.join('; ');
    const changeReason = (reason && reason.trim()) ? reason.trim() : 'Configuration update';

    // 1. Update ai_gateway_settings
    await pool.query(`
      UPDATE ai_gateway_settings SET
        current_version = ?,
        llm_provider = ?,
        llm_model = ?,
        llm_api_key = ?,
        llm_base_url = ?,
        llm_temperature = ?,
        llm_max_tokens = ?,
        llm_timeout_seconds = ?,
        llm_custom_headers = ?,
        whatsapp_provider = ?,
        whatsapp_phone_number_id = ?,
        whatsapp_business_account_id = ?,
        whatsapp_api_key = ?,
        whatsapp_api_endpoint = ?,
        whatsapp_webhook_url = ?,
        whatsapp_webhook_verify_token = ?,
        telephony_provider = ?,
        telephony_account_sid = ?,
        telephony_auth_token = ?,
        telephony_caller_id = ?,
        telephony_base_url = ?,
        telephony_voice_id = ?,
        telephony_max_call_duration_seconds = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      newVersion,
      updatedData.llm_provider,
      updatedData.llm_model,
      updatedData.llm_api_key,
      updatedData.llm_base_url,
      updatedData.llm_temperature,
      updatedData.llm_max_tokens,
      updatedData.llm_timeout_seconds,
      updatedData.llm_custom_headers,
      updatedData.whatsapp_provider,
      updatedData.whatsapp_phone_number_id,
      updatedData.whatsapp_business_account_id,
      updatedData.whatsapp_api_key,
      updatedData.whatsapp_api_endpoint,
      updatedData.whatsapp_webhook_url,
      updatedData.whatsapp_webhook_verify_token,
      updatedData.telephony_provider,
      updatedData.telephony_account_sid,
      updatedData.telephony_auth_token,
      updatedData.telephony_caller_id,
      updatedData.telephony_base_url,
      updatedData.telephony_voice_id,
      updatedData.telephony_max_call_duration_seconds,
      user?.id || 1,
      current.id,
    ]);

    // 2. Insert into ai_gateway_history
    const snapshotToSave = { ...updatedData };
    // Remove database internal metadata from snapshot
    delete snapshotToSave.id;
    delete snapshotToSave.created_at;
    delete snapshotToSave.updated_at;

    await pool.query(`
      INSERT INTO ai_gateway_history (
        version,
        section,
        changed_by,
        changed_by_name,
        change_reason,
        change_summary,
        diff_details,
        snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newVersion,
      'all',
      user?.id || 1,
      user?.name || 'Administrator',
      changeReason,
      summary,
      JSON.stringify(diffs),
      JSON.stringify(snapshotToSave),
    ]);

    return {
      updated: true,
      message: `Configuration updated to version v${newVersion}`,
      version: newVersion,
      change_summary: summary,
      diffs,
    };
  }

  /**
   * Get version audit history
   */
  async getHistory({ limit = 50, page = 1 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);

    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM ai_gateway_history');
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(`
      SELECT
        id,
        version,
        section,
        changed_by,
        changed_by_name,
        change_reason,
        change_summary,
        diff_details,
        created_at
      FROM ai_gateway_history
      ORDER BY version DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)]);

    const items = rows.map((r) => {
      let parsedDiffs = null;
      try {
        parsedDiffs = r.diff_details ? JSON.parse(r.diff_details) : null;
      } catch (e) {
        parsedDiffs = null;
      }

      return {
        ...r,
        diff_details: parsedDiffs,
      };
    });

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(total / Number(limit)),
    };
  }

  /**
   * Rollback configuration to a past version
   */
  async rollbackToVersion(targetVersion, user) {
    const [historyRows] = await pool.query(
      'SELECT * FROM ai_gateway_history WHERE version = ? LIMIT 1',
      [Number(targetVersion)]
    );

    if (!historyRows || historyRows.length === 0) {
      throw new Error(`History version v${targetVersion} not found`);
    }

    const historyEntry = historyRows[0];
    let snapshot = null;
    try {
      snapshot = JSON.parse(historyEntry.snapshot);
    } catch (e) {
      throw new Error('Corrupt history snapshot data for this version');
    }

    const reason = `Rollback to version v${targetVersion} (Originally created: ${new Date(historyEntry.created_at).toLocaleDateString()})`;

    return await this.updateSettings({
      settings: snapshot,
      user,
      reason,
    });
  }

  async resolveSecret(submittedValue, dbField) {
    if (submittedValue && submittedValue !== '••••••••' && !submittedValue.includes('••••')) {
      return submittedValue.trim();
    }
    const [rows] = await pool.query(`SELECT ${dbField} FROM ai_gateway_settings LIMIT 1`);
    return rows[0]?.[dbField] || '';
  }

  /**
   * Test live connection to configured gateways with real HTTP requests and credentials
   */
  async testConnection({ type, config }) {
    const startTime = Date.now();

    function validateUrl(rawUrl) {
      if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        throw new Error('Please check the URL.');
      }
      const trimmed = rawUrl.trim();
      let parsed;
      try {
        parsed = new URL(trimmed);
      } catch (_) {
        throw new Error('Please check the URL.');
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Please check the URL.');
      }
      return parsed.toString().replace(/\/+$/, '');
    }

    if (type === 'llm') {
      const provider = (config.llm_provider || 'gemini').toLowerCase();
      const model = (config.llm_model || '').trim();
      const rawBaseUrl = config.llm_base_url || '';

      const cleanBaseUrl = validateUrl(rawBaseUrl, 'LLM Base URL');
      const apiKey = await this.resolveSecret(config.llm_api_key, 'llm_api_key');

      // Check API Key
      if (provider !== 'ollama' && (!apiKey || apiKey.length < 5)) {
        throw new Error(`Please check the API key. An API key is required to connect to ${provider.toUpperCase()}.`);
      }

      let testUrl;
      const headers = {
        'User-Agent': 'SalesCRM-AI/2.0',
        'Accept': 'application/json',
      };

      if (provider === 'gemini') {
        testUrl = `${cleanBaseUrl}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      } else if (provider === 'anthropic') {
        testUrl = `${cleanBaseUrl}/v1/models`;
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider === 'ollama') {
        testUrl = `${cleanBaseUrl}/api/tags`;
      } else {
        // DeepSeek, OpenAI, Groq, Custom
        testUrl = `${cleanBaseUrl}/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      let response;
      try {
        response = await fetch(testUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(12000),
        });
      } catch (fetchErr) {
        if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
          throw new Error('Connection timed out. Please check the URL and try again.');
        }
        if (fetchErr.cause?.code === 'ENOTFOUND') {
          throw new Error('Unable to reach server. Please check the URL hostname.');
        }
        if (fetchErr.cause?.code === 'ECONNREFUSED') {
          throw new Error('Connection refused. Please check the URL port and server status.');
        }
        throw new Error('Unable to connect. Please check the URL and your network connection.');
      }

      const latencyMs = Date.now() - startTime;
      let resBodyText = '';
      try {
        resBodyText = await response.text();
      } catch (_) {}

      let resJson = null;
      try {
        resJson = JSON.parse(resBodyText);
      } catch (_) {}

      if (response.status === 200) {
        return {
          success: true,
          type: 'llm',
          provider,
          model,
          latency_ms: latencyMs,
          message: `Connected successfully to ${provider.toUpperCase()} (${model || 'default'}) [${latencyMs}ms].`,
          timestamp: new Date().toISOString(),
        };
      }

      // Handle Authentication / Authorization Errors
      if (response.status === 401) {
        throw new Error(`Authentication failed on ${provider.toUpperCase()}. Please check your API key.`);
      }

      if (response.status === 403) {
        throw new Error(`Access forbidden on ${provider.toUpperCase()}. Please check your account permissions or billing balance.`);
      }

      if (response.status === 404) {
        throw new Error('Endpoint not found. Please check the Base URL path.');
      }

      const errorMsg = resJson?.error?.message || resJson?.message || response.statusText;
      throw new Error(`Server returned error (HTTP ${response.status}): ${errorMsg || 'Please check your configuration.'}`);
    }

    if (type === 'whatsapp') {
      const provider = (config.whatsapp_provider || 'meta').toLowerCase();
      const rawEndpoint = config.whatsapp_api_endpoint || 'https://graph.facebook.com/v19.0';
      const cleanEndpoint = validateUrl(rawEndpoint, 'WhatsApp API Endpoint');
      const apiKey = await this.resolveSecret(config.whatsapp_api_key, 'whatsapp_api_key');
      const phoneId = (config.whatsapp_phone_number_id || '').trim();

      if (!apiKey || apiKey.length < 5) {
        throw new Error('Please check your WhatsApp Access Token / API Key. It is required.');
      }

      if (provider === 'meta') {
        if (!phoneId) {
          throw new Error('Please check the Phone Number ID. It is required for Meta WhatsApp API.');
        }

        const testUrl = `${cleanEndpoint}/${encodeURIComponent(phoneId)}`;
        let response;
        try {
          response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(12000),
          });
        } catch (fetchErr) {
          throw new Error('Unable to connect to WhatsApp API. Please check the endpoint URL.');
        }

        const latencyMs = Date.now() - startTime;
        let resJson = null;
        try {
          resJson = await response.json();
        } catch (_) {}

        if (response.status === 200) {
          const verifiedName = resJson.verified_name || resJson.display_phone_number || phoneId;
          const quality = resJson.quality_rating || 'GREEN';
          return {
            success: true,
            type: 'whatsapp',
            provider: 'meta',
            phone_id: phoneId,
            latency_ms: latencyMs,
            message: `Meta WhatsApp API verified ("${verifiedName}", Quality: ${quality}) [${latencyMs}ms].`,
            timestamp: new Date().toISOString(),
          };
        }

        if (response.status === 401 || response.status === 400) {
          const detail = resJson?.error?.message || 'Invalid WhatsApp Access Token or Phone ID.';
          throw new Error(`Authentication failed on Meta WhatsApp: ${detail}`);
        }

        throw new Error(`WhatsApp API returned HTTP ${response.status}. Please check your credentials.`);
      }

      // Gupshup, Twilio, Custom
      let response;
      try {
        response = await fetch(cleanEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(12000),
        });
      } catch (fetchErr) {
        throw new Error('Unable to connect. Please check the WhatsApp endpoint URL.');
      }

      const latencyMs = Date.now() - startTime;
      if (response.status < 400) {
        return {
          success: true,
          type: 'whatsapp',
          provider,
          latency_ms: latencyMs,
          message: `Connected to ${provider.toUpperCase()} WhatsApp gateway [${latencyMs}ms].`,
          timestamp: new Date().toISOString(),
        };
      }

      throw new Error(`WhatsApp gateway returned HTTP ${response.status}. Please check your settings.`);
    }

    if (type === 'telephony') {
      const provider = (config.telephony_provider || 'exotel').toLowerCase();
      const rawBaseUrl = config.telephony_base_url || 'https://api.exotel.com/v1';
      const cleanBaseUrl = validateUrl(rawBaseUrl, 'Telephony Base URL');
      const accountSid = (config.telephony_account_sid || '').trim();
      const authToken = await this.resolveSecret(config.telephony_auth_token, 'telephony_auth_token');

      if (!accountSid) {
        throw new Error('Please check the Account SID / Key. It cannot be empty.');
      }
      if (!authToken || authToken.length < 5) {
        throw new Error('Please check the Auth Token / Secret. It cannot be empty.');
      }

      let testUrl;
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'SalesCRM-AI/2.0',
      };

      if (provider === 'twilio') {
        testUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`;
        const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        headers['Authorization'] = `Basic ${creds}`;
      } else if (provider === 'exotel') {
        testUrl = `${cleanBaseUrl}/Accounts/${encodeURIComponent(accountSid)}`;
        const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        headers['Authorization'] = `Basic ${creds}`;
      } else if (provider === 'bland_ai') {
        testUrl = 'https://api.bland.ai/v1/me';
        headers['Authorization'] = authToken;
      } else if (provider === 'vapi') {
        testUrl = 'https://api.vapi.ai/assistant';
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        testUrl = cleanBaseUrl;
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      let response;
      try {
        response = await fetch(testUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(12000),
        });
      } catch (fetchErr) {
        throw new Error('Unable to connect to Telephony provider. Please check the URL.');
      }

      const latencyMs = Date.now() - startTime;
      if (response.status === 200) {
        return {
          success: true,
          type: 'telephony',
          provider,
          latency_ms: latencyMs,
          message: `Telephony channel verified (${provider.toUpperCase()}) [${latencyMs}ms].`,
          timestamp: new Date().toISOString(),
        };
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed on Telephony provider. Please check Account SID and Auth Token.');
      }

      throw new Error(`Telephony returned HTTP ${response.status}. Please check your credentials.`);
    }

    throw new Error(`Unknown gateway type: "${type}"`);
  }
}

module.exports = new AiGatewayService();

