import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Bot,
  User,
  ShieldCheck,
  ChevronRight,
  Phone,
  Clock,
  ArrowRight,
  Search,
  Globe,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { aiCopilotAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function LeadAiCopilotDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [ragSettings, setRagSettings] = useState(null);

  // Load chat history & RAG settings when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSettings = async () => {
    try {
      const res = await aiCopilotAPI.getRagSettings();
      if (res?.data) setRagSettings(res.data);
    } catch (_) {}
  };

  const loadHistory = async () => {
    try {
      const res = await aiCopilotAPI.getHistory();
      if (res?.data && res.data.length > 0) {
        setMessages(res.data);
      } else {
        // Welcome message with guided options
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            query_type: 'welcome',
            message:
              'Hello! I am your **SalesCRM AI Copilot**. I am strictly grounded in your **CRM Application Data** to analyze deal velocity, identify high-priority hot leads, determine next engagement steps, and provide company intelligence.',
          },
        ]);
      }
    } catch (_) {}
  };

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
      }
    } catch (err) {
      toast.error(err.message || 'Error processing AI query');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          message: '⚠️ Sorry, I encountered an issue querying CRM application data. Please verify your connection.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await aiCopilotAPI.clearHistory();
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          query_type: 'welcome',
          message: 'Chat history cleared. How can I assist your sales pipeline today?',
        },
      ]);
      toast.success('Chat history cleared');
    } catch (err) {
      toast.error('Failed to clear history');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">SalesCRM AI Copilot</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={11} />
                  Grounded RAG
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Answering only from CRM Application Data & Web Search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClear}
              title="Clear Chat History"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Search Action Buttons (READY TO CLICK) */}
        <div className="p-3 bg-gray-50/90 border-b border-gray-200">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Ready One-Click Intelligence
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSend('AI should identify hot lead', 'hot_leads')}
              disabled={loading}
              className="flex items-center gap-2 p-2.5 bg-white border border-orange-200 hover:border-orange-300 hover:bg-orange-50/50 rounded-lg text-left transition shadow-xs group cursor-pointer disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Flame size={15} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-gray-900 group-hover:text-orange-700 leading-tight">
                  Identify Hot Leads
                </div>
                <div className="text-[10px] text-gray-500 truncate">Lead scoring & quality ranking</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSend('AI should tell what should be next engagement to do and when', 'next_engagement')}
              disabled={loading}
              className="flex items-center gap-2 p-2.5 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-left transition shadow-xs group cursor-pointer disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CalendarClock size={15} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700 leading-tight">
                  Next Engagement & Timing
                </div>
                <div className="text-[10px] text-gray-500 truncate">What to do & optimal schedule</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSend('Tell why leads went interested or not interested with company reasons', 'qualification_reasoning')}
              disabled={loading}
              className="flex items-center gap-2 p-2.5 bg-white border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-lg text-left transition shadow-xs group cursor-pointer disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HelpCircle size={15} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-gray-900 group-hover:text-emerald-700 leading-tight">
                  Qualification Reasons
                </div>
                <div className="text-[10px] text-gray-500 truncate">Why interested vs not interested</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSend('Analyze high scoring leads and provide company intelligence', 'hot_leads')}
              disabled={loading}
              className="flex items-center gap-2 p-2.5 bg-white border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/50 rounded-lg text-left transition shadow-xs group cursor-pointer disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 size={15} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-700 leading-tight">
                  Company Intelligence
                </div>
                <div className="text-[10px] text-gray-500 truncate">Enriched with outside search</div>
              </div>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const cards = m.structured_payload || [];

            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
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
                    <div className="whitespace-pre-wrap font-sans">{m.message}</div>
                  </div>

                  {/* Render Lead Cards inside AI Responses */}
                  {!isUser && cards && cards.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        CRM Lead Records ({cards.length})
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
                                  {card.company || 'Corporate Client'}
                                </div>
                              </div>

                              {card.score && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                  {card.score} pts
                                </span>
                              )}
                            </div>

                            {/* Hot Reason or Next Engagement Action */}
                            {card.hot_reason && (
                              <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg mt-2 border border-gray-100 line-clamp-2">
                                🔥 {card.hot_reason}
                              </p>
                            )}

                            {card.recommended_action && (
                              <div className="mt-2 p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] space-y-1">
                                <div className="font-semibold text-blue-900 flex items-center gap-1">
                                  <span>Action:</span> {card.recommended_action}
                                </div>
                                <div className="text-blue-700 flex items-center gap-1 font-medium">
                                  <Clock size={11} /> {card.recommended_timing}
                                </div>
                              </div>
                            )}

                            {/* Outside Company Intelligence */}
                            {card.external_intelligence && (
                              <div className="mt-2 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] space-y-1">
                                <div className="font-semibold text-indigo-900 flex items-center gap-1">
                                  <Globe size={11} className="text-indigo-600" />
                                  <span>Company Market Signal:</span>
                                </div>
                                <p className="text-indigo-800 line-clamp-2">
                                  {card.external_intelligence}
                                </p>
                              </div>
                            )}
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
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={16} />
              </div>
              <div className="p-3.5 bg-white border border-gray-200 rounded-2xl rounded-bl-xs shadow-xs text-xs text-gray-500 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-blue-600" />
                <span>Searching CRM Application Data & analyzing deal signals...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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
                placeholder="Ask AI Copilot about leads, stages, follow-ups..."
                className="w-full pl-3 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 shadow-2xs"
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
            <span>Powered by RAG • Strictly Grounded in CRM Database</span>
          </div>
        </div>
      </div>
    </div>
  );
}
