const aiRagService = require('../services/aiRagService');

// GET /api/v1/ai/rag/settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await aiRagService.getRagSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('aiRagController.getSettings error:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving RAG settings' });
  }
};

// PUT /api/v1/ai/rag/settings
exports.updateSettings = async (req, res) => {
  try {
    const updated = await aiRagService.updateRagSettings(req.body || {}, req.user);
    res.json({ success: true, message: 'AI RAG settings saved successfully', data: updated });
  } catch (err) {
    console.error('aiRagController.updateSettings error:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating RAG settings' });
  }
};

// POST /api/v1/ai/rag/query
exports.queryCopilot = async (req, res) => {
  try {
    const { query_type, prompt } = req.body || {};
    const result = await aiRagService.processCopilotQuery({
      queryType: query_type || 'custom',
      prompt: prompt || '',
      user: req.user,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('aiRagController.queryCopilot error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Error processing AI Copilot query' });
  }
};

// GET /api/v1/ai/rag/history
exports.getChatHistory = async (req, res) => {
  try {
    const history = await aiRagService.getChatHistory(req.user?.id || 1);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('aiRagController.getChatHistory error:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving chat history' });
  }
};

// DELETE /api/v1/ai/rag/history
exports.clearChatHistory = async (req, res) => {
  try {
    const result = await aiRagService.clearChatHistory(req.user?.id || 1);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiRagController.clearChatHistory error:', err.message);
    res.status(500).json({ success: false, message: 'Server error clearing chat history' });
  }
};

