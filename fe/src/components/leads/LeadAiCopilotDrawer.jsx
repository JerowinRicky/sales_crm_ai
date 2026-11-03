import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Flame,
  CalendarClock,
  HelpCircle,
  Building2,
  Trash2,
  Bot,
  User,
  ShieldCheck,
  ChevronRight,
  Clock,
  Globe,
  Plus,
  History,
  MessageSquare,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { aiCopilotAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Clean inline markdown parser that strips raw markdown characters like * and ###,
 * rendering styled headers, bold text, italics, bullet lists, blockquotes, and links.
 */
function renderInlineMarkdown(text, navigate) {
  if (!text) return null;

  // Tokenizer regex matching bold-links, links, bold, italic, code
  const regex = /(\*\*\[([^\]]+)\]\(([^)]+)\)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      // **[Link](url)**
      const linkText = match[2];
      const url = match[3];
      elements.push(
        <button
          key={match.index}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (url.startsWith('http')) window.open(url, '_blank');
            else navigate(url);
          }}
          className="font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
        >
          {linkText}
        </button>
      );
    } else if (match[4] && match[5]) {
      // [Link](url)
      const linkText = match[4];
      const url = match[5];
      elements.push(
        <button
          key={match.index}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (url.startsWith('http')) window.open(url, '_blank');
            else navigate(url);
          }}
          className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
        >
          {linkText}
        </button>
      );
    } else if (match[6]) {
      // **bold**
      elements.push(
        <strong key={match.index} className="font-semibold text-gray-900">
          {match[6]}
        </strong>
      );
    } else if (match[7]) {
      // *italic*
      elements.push(
        <em key={match.index} className="italic text-gray-700">
          {match[7]}
        </em>
      );
    } else if (match[8]) {
      // `code`
      elements.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-gray-100 text-blue-700 font-mono text-[11px] font-medium">
          {match[8]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

function MarkdownRenderer({ message, isUser, navigate }) {
  if (!message) return null;
  if (isUser) {
    return <div className="whitespace-pre-wrap">{message}</div>;
  }

  const lines = message.split('\n');
  const rendered = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      rendered.push(<div key={`blank-${i}`} className="h-2" />);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      rendered.push(
        <h3 key={i} className="text-sm font-bold text-gray-900 mt-2.5 mb-1 flex items-center gap-1.5 border-b border-gray-100 pb-1">
          {renderInlineMarkdown(trimmed.substring(4), navigate)}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      rendered.push(
        <h4 key={i} className="text-xs font-bold text-gray-800 mt-2 mb-1">
          {renderInlineMarkdown(trimmed.substring(5), navigate)}
        </h4>
      );
    } else if (trimmed.startsWith('> ')) {
      rendered.push(
        <div key={i} className="my-2 p-2.5 bg-blue-50/80 border-l-3 border-blue-500 rounded-r-lg text-xs text-blue-950 leading-relaxed shadow-xs">
          {renderInlineMarkdown(trimmed.substring(2), navigate)}
        </div>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      rendered.push(
        <div key={i} className="flex items-start gap-2 my-1 text-xs text-gray-700 pl-1 leading-relaxed">
          <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
          <span className="flex-1">{renderInlineMarkdown(trimmed.substring(2), navigate)}</span>
        </div>
      );
    } else {
      rendered.push(
        <p key={i} className="text-xs text-gray-700 leading-relaxed my-0.5">
          {renderInlineMarkdown(line, navigate)}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{rendered}</div>;
}

export default function LeadAiCopilotDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Conversations & Chat State
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ragSettings, setRagSettings] = useState(null);

  const isSalesManager = user?.role_name === 'sales_manager';
  const isAdmin = user?.role_name === 'admin';

  // Load conversations list and RAG settings when drawer opens
  const loadConversations = useCallback(async () => {
    try {
      const res = await aiCopilotAPI.getConversations();
      if (res?.data) {
        setConversations(res.data);
      }
    } catch (_) {}
  }, []);

  const loadHistory = useCallback(async (convId = null) => {
    try {
      const res = await aiCopilotAPI.getHistory({ conversation_id: convId });
      if (res?.data && res.data.length > 0) {
        setMessages(res.data);
      } else {
        setMessages([]);
      }
    } catch (_) {
      setMessages([]);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await aiCopilotAPI.getRagSettings();
      if (res?.data) setRagSettings(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadConversations();
      // If we don't have an active conversation selected, start fresh or load most recent
      if (!activeConvId) {
        loadHistory(null);
      }
    }
  }, [isOpen, activeConvId, loadConversations, loadHistory, loadSettings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Start a new chat session
  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setHistoryOpen(false);
    setInputPrompt('');
  };

  // Switch to an existing conversation
  const handleSelectConversation = (convId) => {
    setActiveConvId(convId);
    loadHistory(convId);
    setHistoryOpen(false);
  };

  // Delete a specific conversation
  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat conversation?')) return;

    try {
      await aiCopilotAPI.deleteConversation(convId);
      toast.success('Conversation deleted');
      loadConversations();
      if (activeConvId === convId) {
        handleNewChat();
      }
    } catch (err) {
      toast.error('Failed to delete conversation');
    }
  };

  // Clear all conversations for current user
  const handleClearAll = async () => {
    if (!window.confirm('Clear all your chat history? This cannot be undone.')) return;

    try {
      await aiCopilotAPI.clearHistory();
      setConversations([]);
      setMessages([]);
      setActiveConvId(null);
      toast.success('Chat history cleared');
    } catch (err) {
      toast.error('Failed to clear history');
    }
  };

  // Send message
  const handleSend = async (customText, queryType = 'custom') => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      query_type: queryType,
      message: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await aiCopilotAPI.query({
        conversation_id: activeConvId,
        query_type: queryType,
        prompt: textToSend,
      });

      if (res?.data) {
        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          query_type: res.data.query_type,
          message: res.data.message,
          structured_payload: res.data.cards,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // If a new conversation was created on the backend, update activeConvId and reload conversation list
        if (res.data.conversation_id && res.data.conversation_id !== activeConvId) {
          setActiveConvId(res.data.conversation_id);
          loadConversations();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error processing AI query');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          message: '⚠️ Sorry, an error occurred while processing your request. Please verify your connection.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 relative">
        {/* Header Bar */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900">Olgpt ai</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={11} />
                  {isSalesManager ? 'Domain Scoped' : isAdmin ? 'Admin Grounding' : 'My Leads'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                {isSalesManager
                  ? 'Strictly scoped to your assigned domain leads and team'
                  : 'Answering strictly from CRM Application Data'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleNewChat}
              title="Start a new chat"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Plus size={14} />
              <span>New Chat</span>
            </button>

            {/* History Toggle Button */}
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              title="View past conversations"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                historyOpen
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <History size={14} />
              <span>{conversations.length}</span>
            </button>

            {/* Close Drawer */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* History Slide-Out Panel */}
        {historyOpen && (
          <div className="absolute inset-x-0 top-[73px] bottom-0 z-30 bg-white/95 backdrop-blur-md flex flex-col border-b border-gray-200 shadow-xl animate-in fade-in duration-150">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2">
                <History size={16} className="text-gray-600" />
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Your Chat History ({conversations.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {conversations.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <MessageSquare size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs">No previous chat history found.</p>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Start a new conversation
                  </button>
                </div>
              ) : (
                conversations.map((c) => {
                  const isActive = c.id === activeConvId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectConversation(c.id)}
                      className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer group ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 shadow-xs'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <MessageSquare
                          size={15}
                          className={isActive ? 'text-blue-600' : 'text-gray-400'}
                        />
                        <div className="overflow-hidden">
                          <div
                            className={`text-xs font-semibold truncate ${
                              isActive ? 'text-blue-900' : 'text-gray-800 group-hover:text-gray-900'
                            }`}
                          >
                            {c.title || 'Conversation'}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span>{new Date(c.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span>{c.message_count || 0} messages</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {/* Welcome Screen if no messages in active chat */}
          {messages.length === 0 && (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">How can I assist your pipeline today?</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  {isSalesManager
                    ? 'I am strictly authorized to analyze and search leads for your assigned domain team.'
                    : 'Grounded strictly in your CRM database records to identify hot leads and guide follow-ups.'}
                </p>
              </div>

              {/* Ready One-Click Search Chips */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                <button
                  type="button"
                  onClick={() => handleSend('AI should identify hot lead', 'hot_leads')}
                  disabled={loading}
                  className="flex items-center gap-2.5 p-3 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50/40 rounded-xl transition shadow-2xs group cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Flame size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-orange-700">
                      Identify Hot Leads
                    </div>
                    <div className="text-[10px] text-gray-500">Quality score & deal velocity</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('AI should tell what should be next engagement to do and when', 'next_engagement')}
                  disabled={loading}
                  className="flex items-center gap-2.5 p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl transition shadow-2xs group cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CalendarClock size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700">
                      Next Best Engagement
                    </div>
                    <div className="text-[10px] text-gray-500">What action to do & when</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Tell why leads went interested or not interested with company reasons', 'qualification_reasoning')}
                  disabled={loading}
                  className="flex items-center gap-2.5 p-3 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-xl transition shadow-2xs group cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <HelpCircle size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-emerald-700">
                      Qualification Reasons
                    </div>
                    <div className="text-[10px] text-gray-500">Why interested vs not interested</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend('Analyze high scoring leads and provide company intelligence', 'hot_leads')}
                  disabled={loading}
                  className="flex items-center gap-2.5 p-3 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl transition shadow-2xs group cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-700">
                      Company Intelligence
                    </div>
                    <div className="text-[10px] text-gray-500">Outside market context</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const cards = m.structured_payload || [];

            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[88%] space-y-2`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    <MarkdownRenderer message={m.message} isUser={isUser} navigate={navigate} />
                  </div>

                  {/* Render Lead Cards inside AI Responses */}
                  {!isUser && cards && cards.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-400" />
                        <span>CRM Lead Records ({cards.length})</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {cards.slice(0, 5).map((card) => (
                          <div
                            key={card.id}
                            onClick={() => {
                              navigate(`/leads/${card.id}`);
                              onClose();
                            }}
                            className="p-3 bg-white border border-gray-200 hover:border-blue-300 rounded-xl transition shadow-2xs hover:shadow-xs cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                  {card.title}
                                  <ChevronRight size={13} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <div className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                                  <Building2 size={12} className="text-gray-400" />
                                  <span>{card.company || 'Corporate Client'}</span>
                                  {card.domain_name && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                      {card.domain_name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {card.score && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                  {card.score} pts
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={16} />
              </div>
              <div className="p-3.5 bg-white border border-gray-200 rounded-2xl rounded-bl-xs shadow-xs text-xs text-gray-500 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-blue-600" />
                <span>Searching domain CRM records and formulating answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Quick Chips above Input if conversation active */}
        {messages.length > 0 && (
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <button
              type="button"
              onClick={() => handleSend('AI should identify hot lead', 'hot_leads')}
              className="px-2.5 py-1 bg-white border border-gray-200 hover:border-orange-300 rounded-full text-[11px] font-medium text-gray-700 hover:text-orange-700 whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <Flame size={12} className="text-orange-500" />
              <span>Hot Leads</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('AI should tell what should be next engagement to do and when', 'next_engagement')}
              className="px-2.5 py-1 bg-white border border-gray-200 hover:border-blue-300 rounded-full text-[11px] font-medium text-gray-700 hover:text-blue-700 whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <CalendarClock size={12} className="text-blue-500" />
              <span>Next Action</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('Tell why leads went interested or not interested with company reasons', 'qualification_reasoning')}
              className="px-2.5 py-1 bg-white border border-gray-200 hover:border-emerald-300 rounded-full text-[11px] font-medium text-gray-700 hover:text-emerald-700 whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <HelpCircle size={12} className="text-emerald-500" />
              <span>Interested vs Not</span>
            </button>
          </div>
        )}

        {/* Bottom Input Box */}
        <div className="p-3 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputPrompt, 'custom');
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={
                  isSalesManager
                    ? 'Ask about your domain leads, next engagements, or team...'
                    : 'Ask Olgpt ai about leads, stages, follow-ups...'
                }
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition shadow-xs cursor-pointer shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
          <div className="text-[10px] text-gray-400 text-center mt-1.5 flex items-center justify-center gap-1">
            <span>Powered by RAG • {isSalesManager ? 'Strictly Scoped to Manager Domain' : 'Strictly Grounded in CRM Data'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
