const aiGatewayService = require('../services/aiGatewayService');

// GET /api/v1/ai/gateway
exports.getSettings = async (req, res) => {
  try {
    const data = await aiGatewayService.getSettings();
    res.json({ success: true, data });
  } catch (err) {
    console.error('aiGatewayController.getSettings error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error fetching AI gateway settings' });
  }
};

// PUT /api/v1/ai/gateway
exports.updateSettings = async (req, res) => {
  try {
    const { settings, reason } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings payload object is required' });
    }

    const result = await aiGatewayService.updateSettings({
      settings,
      user: req.user,
      reason,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiGatewayController.updateSettings error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error updating AI gateway settings' });
  }
};

// GET /api/v1/ai/gateway/history
exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await aiGatewayService.getHistory({ page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiGatewayController.getHistory error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error fetching AI gateway history' });
  }
};

// POST /api/v1/ai/gateway/rollback/:version
exports.rollback = async (req, res) => {
  try {
    const { version } = req.params;
    if (!version) {
      return res.status(400).json({ success: false, message: 'Target version number is required' });
    }

    const result = await aiGatewayService.rollbackToVersion(version, req.user);
    res.json({ success: true, message: `Successfully rolled back to version v${version}`, ...result });
  } catch (err) {
    console.error('aiGatewayController.rollback error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error rolling back version' });
  }
};

// POST /api/v1/ai/gateway/test-connection
exports.testConnection = async (req, res) => {
  try {
    const { type, config } = req.body || {};
    if (!type) {
      return res.status(400).json({ success: false, message: 'Gateway type (llm, whatsapp, or telephony) is required' });
    }

    const result = await aiGatewayService.testConnection({ type, config: config || {} });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('aiGatewayController.testConnection error:', err);
    res.status(500).json({ success: false, message: err.message || 'Gateway connection test failed' });
  }
};

