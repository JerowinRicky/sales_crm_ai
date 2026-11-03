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

// GET /api/v1/ai/rag/conversations
exports.getConversations = async (req, res) => {
  try {
    const list = await aiRagService.getConversations(req.user?.id || 1);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('aiRagController.getConversations error:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving conversations' });
  }
};

// POST /api/v1/ai/rag/conversations
exports.createConversation = async (req, res) => {
  try {
    const { title } = req.body || {};
    const conv = await aiRagService.createConversation(req.user?.id || 1, title || 'New Chat');
    res.json({ success: true, data: conv });
  } catch (err) {
    console.error('aiRagController.createConversation error:', err.message);
    res.status(500).json({ success: false, message: 'Server error creating conversation' });
  }
};

// DELETE /api/v1/ai/rag/conversations/:id
exports.deleteConversation = async (req, res) => {
  try {
    const result = await aiRagService.deleteConversation(req.user?.id || 1, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiRagController.deleteConversation error:', err.message);
    res.status(500).json({ success: false, message: 'Server error deleting conversation' });
  }
};

// POST /api/v1/ai/rag/query
exports.queryCopilot = async (req, res) => {
  try {
    const { query_type, prompt, conversation_id } = req.body || {};
    const result = await aiRagService.processCopilotQuery({
      conversationId: conversation_id || null,
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
    const conversationId = req.query.conversation_id ? Number(req.query.conversation_id) : null;
    const history = await aiRagService.getChatHistory(req.user?.id || 1, conversationId);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('aiRagController.getChatHistory error:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving chat history' });
  }
};

// DELETE /api/v1/ai/rag/history
exports.clearChatHistory = async (req, res) => {
  try {
    const conversationId = req.query.conversation_id ? Number(req.query.conversation_id) : null;
    const result = await aiRagService.clearChatHistory(req.user?.id || 1, conversationId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('aiRagController.clearChatHistory error:', err.message);
    res.status(500).json({ success: false, message: 'Server error clearing chat history' });
  }
};

