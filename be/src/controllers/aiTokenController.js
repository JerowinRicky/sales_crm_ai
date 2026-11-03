const aiTokenService = require('../services/aiTokenService');

// GET /api/v1/ai/analytics/summary
exports.getSummary = async (req, res) => {
  try {
    const summary = await aiTokenService.getAnalyticsSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('aiTokenController.getSummary error:', err.message);
    res.status(500).json({ success: false, message: 'Error retrieving AI token analytics summary' });
  }
};

// GET /api/v1/ai/analytics/users
exports.getUserQuotas = async (req, res) => {
  try {
    const { search, role_id, domain_id } = req.query;
    const users = await aiTokenService.getUserQuotasList({
      search,
      roleId: role_id ? Number(role_id) : null,
      domainId: domain_id ? Number(domain_id) : null,
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('aiTokenController.getUserQuotas error:', err.message);
    res.status(500).json({ success: false, message: 'Error retrieving user token quotas' });
  }
};

// PUT /api/v1/ai/analytics/users/:id/quota
exports.updateUserQuota = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const updated = await aiTokenService.updateUserQuota(userId, req.body || {});
    res.json({ success: true, message: 'User quota updated successfully', data: updated });
  } catch (err) {
    console.error('aiTokenController.updateUserQuota error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Error updating user quota' });
  }
};

// POST /api/v1/ai/analytics/users/bulk-quota
exports.bulkUpdateQuotas = async (req, res) => {
  try {
    const result = await aiTokenService.bulkUpdateQuotas(req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiTokenController.bulkUpdateQuotas error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Error updating bulk user quotas' });
  }
};

// PUT /api/v1/ai/analytics/settings
exports.updateSettings = async (req, res) => {
  try {
    const settings = await aiTokenService.updateGlobalSettings(req.body || {});
    res.json({ success: true, message: 'Global AI Token policy updated', data: settings });
  } catch (err) {
    console.error('aiTokenController.updateSettings error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Error updating AI token settings' });
  }
};

// POST /api/v1/ai/analytics/reset-usage
exports.resetUsage = async (req, res) => {
  try {
    const { user_id } = req.body || {};
    const result = await aiTokenService.resetUsage(user_id || 'all');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiTokenController.resetUsage error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Error resetting token usage' });
  }
};

