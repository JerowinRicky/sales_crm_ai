import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Sparkles,
  Flame,
  CalendarClock,
  Send,
  UserCheck,
  PhoneCall,
  Search,
  Cpu,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Activity,
  MessageSquare,
  Zap,
  Phone,
  RefreshCw,
  Clock,
  Check,
  Building2,
  Users,
  Eye,
  EyeOff,
  History,
  RotateCcw,
  ShieldCheck,
  Globe,
  Sliders,
  Terminal,
  ChevronDown,
  ChevronUp,
  X,
  BarChart3,
} from "lucide-react";
import { aiGatewayAPI, aiCopilotAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AiTokenAnalyticsTab from "../../components/admin/AiTokenAnalyticsTab";

// Presets for LLM Providers
const LLM_PRESETS = [
  {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "o1-preview", "gpt-4-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
  },
  {
    id: "groq",
    name: "Groq (High-Speed LPU)",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
  },
  {
    id: "ollama",
    name: "Ollama (Self-Hosted / Local)",
    baseUrl: "http://localhost:11434/v1",
    models: ["llama3.1:latest", "mistral:latest", "qwen2.5:latest"],
  },
  {
    id: "custom",
    name: "Custom / Self-Hosted Endpoint",
    baseUrl: "https://your-custom-llm-proxy.com/v1",
    models: ["custom-model-id"],
  },
];

// Presets for WhatsApp Gateways
const WHATSAPP_PRESETS = [
  {
    id: "meta",
    name: "Meta WhatsApp Cloud API (Official)",
    endpoint: "https://graph.facebook.com/v19.0",
  },
  {
    id: "gupshup",
    name: "Gupshup Enterprise Messaging",
    endpoint: "https://api.gupshup.io/sm/api/v1",
  },
  {
    id: "twilio",
    name: "Twilio WhatsApp API",
    endpoint: "https://api.twilio.com/2010-04-01",
  },
  {
    id: "infobip",
    name: "Infobip WhatsApp Business API",
    endpoint: "https://api.infobip.com/whatsapp/1",
  },
  {
    id: "custom",
    name: "Custom Webhook / Internal API Gateway",
    endpoint: "https://api.yourdomain.com/whatsapp",
  },
];

// Presets for Telephony / Voice Providers
const TELEPHONY_PRESETS = [
  {
    id: "exotel",
    name: "Exotel (India Cloud Telephony)",
    baseUrl: "https://api.exotel.com/v1",
    defaultVoice: "en-IN-Wavenet-B",
  },
  {
    id: "twilio",
    name: "Twilio Voice",
    baseUrl: "https://api.twilio.com/2010-04-01",
    defaultVoice: "Polly.Aditi",
  },
  {
    id: "bland_ai",
    name: "Bland AI (Autonomous Voice Calling)",
    baseUrl: "https://api.bland.ai/v1/calls",
    defaultVoice: "maya-conversational",
  },
  {
    id: "vapi",
    name: "Vapi Voice AI Platform",
    baseUrl: "https://api.vapi.ai",
    defaultVoice: "josh",
  },
  {
    id: "retell",
    name: "Retell AI",
    baseUrl: "https://api.retellai.com/v2",
    defaultVoice: "11labs-Adrian",
  },
  {
    id: "custom",
    name: "Custom SIP Trunk / Webhook Gateway",
    baseUrl: "https://telephony.yourcompany.com",
    defaultVoice: "custom-agent",
  },
];

export default function AiSettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("engine"); // default to Model & Gateway as requested
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gateway Settings State
  const [gatewayConfig, setGatewayConfig] = useState({
    current_version: 1,

    // LLM
    llm_provider: "gemini",
    llm_model: "gemini-1.5-pro",
    llm_api_key: "",
    llm_api_key_configured: false,
    llm_base_url: "https://generativelanguage.googleapis.com",
    llm_temperature: 0.7,
    llm_max_tokens: 2048,
    llm_timeout_seconds: 30,
    llm_custom_headers: "",

    // WhatsApp
    whatsapp_provider: "meta",
    whatsapp_phone_number_id: "",
    whatsapp_business_account_id: "",
    whatsapp_api_key: "",
    whatsapp_api_key_configured: false,
    whatsapp_api_endpoint: "https://graph.facebook.com/v19.0",
    whatsapp_webhook_url: "",
    whatsapp_webhook_verify_token: "",
    whatsapp_webhook_verify_token_configured: false,

    // Telephony
    telephony_provider: "exotel",
    telephony_account_sid: "",
    telephony_auth_token: "",
    telephony_auth_token_configured: false,
    telephony_caller_id: "+919000000000",
    telephony_base_url: "https://api.exotel.com/v1",
    telephony_voice_id: "en-IN-Wavenet-B",
    telephony_max_call_duration_seconds: 300,
  });

  // RAG & Application Grounding Settings State
  const [ragConfig, setRagConfig] = useState({
    rag_enabled: true,
    strict_crm_grounding: true,
    enable_hot_lead_rag: true,
    enable_next_engagement: true,
    enable_qualification_reasoning: true,
    enable_external_search: true,
    external_search_provider: "duckduckgo",
    hot_lead_threshold: 80,
    warm_lead_threshold: 50,
  });

  // UI state for inputs (toggle manual entry vs dropdown)
  const [customModelMode, setCustomModelMode] = useState(false);
  const [showKeys, setShowKeys] = useState({
    llm: false,
    whatsapp: false,
    whatsappVerify: false,
    telephony: false,
  });

  // Test Connection status
  const [testing, setTesting] = useState({
    llm: false,
    whatsapp: false,
    telephony: false,
  });
  const [testResult, setTestResult] = useState({
    llm: null,
    whatsapp: null,
    telephony: null,
  });

  // History & Audit Log State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Load gateway settings from backend
  const loadGatewaySettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await aiGatewayAPI.getSettings();
      if (res?.data) {
        setGatewayConfig(res.data);
        // check if current model is outside default preset list
        const currentPreset = LLM_PRESETS.find((p) => p.id === res.data.llm_provider);
        if (currentPreset && !currentPreset.models.includes(res.data.llm_model)) {
          setCustomModelMode(true);
        }
      }
    } catch (err) {
      console.error("Error loading AI gateway settings:", err);
      toast.error("Failed to load AI gateway configuration from server");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load audit history
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await aiGatewayAPI.getHistory({ limit: 50, page: 1 });
      if (res?.items) {
        setHistoryList(res.items);
      }
    } catch (err) {
      console.error("Error loading AI gateway history:", err);
      toast.error("Failed to load audit history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load RAG Settings from backend
  const loadRagSettings = useCallback(async () => {
    try {
      const res = await aiCopilotAPI.getRagSettings();
      if (res?.data) {
        setRagConfig(res.data);
      }
    } catch (err) {
      console.error("Error loading RAG settings:", err);
    }
  }, []);

  useEffect(() => {
    loadGatewaySettings();
    loadHistory();
    loadRagSettings();
  }, [loadGatewaySettings, loadHistory, loadRagSettings]);

  // Handle LLM Provider Dropdown Change
  const handleLlmProviderChange = (providerId) => {
    const preset = LLM_PRESETS.find((p) => p.id === providerId);
    if (!preset) return;

    setGatewayConfig((prev) => ({
      ...prev,
      llm_provider: providerId,
      llm_model: preset.models[0] || "custom-model",
      llm_base_url: preset.baseUrl,
    }));
    setCustomModelMode(providerId === "custom");
  };

  // Handle WhatsApp Provider Dropdown Change
  const handleWhatsappProviderChange = (providerId) => {
    const preset = WHATSAPP_PRESETS.find((p) => p.id === providerId);
    if (!preset) return;

    setGatewayConfig((prev) => ({
      ...prev,
      whatsapp_provider: providerId,
      whatsapp_api_endpoint: preset.endpoint,
    }));
  };

  // Handle Telephony Provider Dropdown Change
  const handleTelephonyProviderChange = (providerId) => {
    const preset = TELEPHONY_PRESETS.find((p) => p.id === providerId);
    if (!preset) return;

    setGatewayConfig((prev) => ({
      ...prev,
      telephony_provider: providerId,
      telephony_base_url: preset.baseUrl,
      telephony_voice_id: preset.defaultVoice,
    }));
  };

  // Open Save confirmation modal
  const handleOpenSaveModal = (e) => {
    e.preventDefault();
    setChangeReason("");
    setShowSaveModal(true);
  };

  // Submit Save with Audit History Note
  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const res = await aiGatewayAPI.updateSettings({
        settings: gatewayConfig,
        reason: changeReason || "Updated Model & Gateway parameters",
      });

      // Save RAG settings
      await aiCopilotAPI.updateRagSettings(ragConfig);

      if (res.updated) {
        toast.success(res.message || "AI configuration updated successfully!");
        setShowSaveModal(false);
        loadGatewaySettings();
        loadHistory();
        loadRagSettings();
      } else {
        toast.success("AI and RAG configuration saved!");
        setShowSaveModal(false);
        loadRagSettings();
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save AI Gateway settings");
    } finally {
      setSaving(false);
    }
  };

  // Rollback to specific version
  const handleRollback = async (version) => {
    if (!window.confirm(`Are you sure you want to rollback AI Gateway configuration to version v${version}?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await aiGatewayAPI.rollback(version);
      toast.success(res.message || `Successfully rolled back to v${version}`);
      loadGatewaySettings();
      loadHistory();
    } catch (err) {
      toast.error(err.message || "Failed to rollback version");
    } finally {
      setSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async (type) => {
    setTesting((prev) => ({ ...prev, [type]: true }));
    setTestResult((prev) => ({ ...prev, [type]: null }));

    try {
      const res = await aiGatewayAPI.testConnection({
        type,
        config: gatewayConfig,
      });

      if (res?.data?.success) {
        setTestResult((prev) => ({ ...prev, [type]: { ok: true, data: res.data } }));
        toast.success(res.data.message || `${type.toUpperCase()} connection successful!`);
      } else {
        const msg = res?.data?.message || "Please check your configuration and try again.";
        setTestResult((prev) => ({ ...prev, [type]: { ok: false, error: msg } }));
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.message || "Please check the URL and settings.";
      setTestResult((prev) => ({ ...prev, [type]: { ok: false, error: msg } }));
      toast.error(msg);
    } finally {
      setTesting((prev) => ({ ...prev, [type]: false }));
    }
  };

  const toggleDiffExpand = (historyId) => {
    setExpandedDiffs((prev) => ({ ...prev, [historyId]: !prev[historyId] }));
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">AI Settings</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Active Version: v{gatewayConfig.current_version || 1}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Production Model & Gateway orchestration with dropdown presets, manual endpoints, secret masking, and version audit history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition shadow-xs"
          >
            <History size={16} />
            Version History ({historyList.length})
          </button>

          <button
            type="button"
            onClick={handleOpenSaveModal}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50 shadow-sm"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Left Sidebar Navigation + Right Content Area */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 bg-white border border-gray-200 rounded-xl p-2.5 shadow-2xs space-y-1 self-start sticky top-4">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            AI Settings
          </div>

          {[
            {
              key: "engine",
              icon: Cpu,
              label: "Model & Gateway",
              desc: "LLM, WhatsApp & Telephony",
            },
            {
              key: "analytics",
              icon: BarChart3,
              label: "Token Analytics & Quotas",
              desc: "Tokens used, limits & restrictions",
            },
            {
              key: "rag",
              icon: Layers,
              label: "RAG & CRM Grounding",
              desc: "Pipeline scope & web search",
            },
          ].map(({ key, icon: Icon, label, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition cursor-pointer group ${
                tab === key
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                  tab === key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="overflow-hidden">
                <div className={`text-xs font-bold leading-tight ${tab === key ? "text-blue-900" : "text-gray-800"}`}>
                  {label}
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${tab === key ? "text-blue-600" : "text-gray-400"}`}>
                  {desc}
                </div>
              </div>
            </button>
          ))}

          {/* Status badge at bottom of sidebar */}
          <div className="pt-3 border-t border-gray-100 px-3 py-2 mt-3">
            <div className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>olgpt ai Active</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
              Domain-scoped RBAC and token usage monitoring enabled.
            </p>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 w-full min-w-0">

      {/* =========================================================
          TAB: MODEL & GATEWAY (HIGHLY CUSTOMIZABLE + HISTORY)
         ========================================================= */}
      {tab === "engine" && (
        <div className="flex flex-col gap-6">
          {/* SECTION 1: LLM Engine */}
          <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cpu size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                    LLM Engine (Intelligence, Scoring & Reasoning)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select a preset or configure custom LLM endpoints, temperature, and API credentials
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection("llm")}
                  disabled={testing.llm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition"
                >
                  {testing.llm ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} className="text-amber-500" />}
                  Test Model Latency
                </button>
              </div>
            </div>

            {testResult.llm && (
              <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${testResult.llm.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {testResult.llm.ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-600" />}
                  <span>{testResult.llm.ok ? testResult.llm.data.message : testResult.llm.error}</span>
                </div>
                {testResult.llm.ok && <span className="font-semibold">{testResult.llm.data.latency_ms} ms</span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Provider dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  LLM Provider (Dropdown Presets)
                </label>
                <select
                  value={gatewayConfig.llm_provider}
                  onChange={(e) => handleLlmProviderChange(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
                >
                  {LLM_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model selection: Dropdown vs Manual Entry */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Model Name / Identifier
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomModelMode(!customModelMode)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {customModelMode ? "Switch to Preset Models Dropdown" : "Enter Custom Model Manually"}
                  </button>
                </div>

                {customModelMode ? (
                  <input
                    type="text"
                    value={gatewayConfig.llm_model}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_model: e.target.value })}
                    placeholder="e.g. meta-llama/Llama-3-70b-instruct or fine-tuned-crm-v1"
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-blue-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                  />
                ) : (
                  <select
                    value={gatewayConfig.llm_model}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_model: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
                  >
                    {(LLM_PRESETS.find((p) => p.id === gatewayConfig.llm_provider)?.models || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Base URL and API Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  API Base URL (Manual Entry & Proxy Support)
                </label>
                <div className="relative">
                  <Globe size={14} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={gatewayConfig.llm_base_url}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_base_url: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span>API Key / Secret</span>
                  {gatewayConfig.llm_api_key_configured && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Configured on Server
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKeys.llm ? "text" : "password"}
                    value={gatewayConfig.llm_api_key}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_api_key: e.target.value })}
                    placeholder={gatewayConfig.llm_api_key_configured ? "•••••••• (Leave blank to keep existing)" : "Paste AI Provider API Key"}
                    className="w-full h-9 px-3 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((p) => ({ ...p, llm: !p.llm }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.llm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Hyperparameters: Temperature, Max Tokens, Timeout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">Temperature</span>
                  <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 border rounded">
                    {gatewayConfig.llm_temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={gatewayConfig.llm_temperature}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_temperature: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Deterministic (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">Max Tokens</span>
                  <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 border rounded">
                    {gatewayConfig.llm_max_tokens}
                  </span>
                </div>
                <input
                  type="number"
                  min="256"
                  max="16384"
                  step="256"
                  value={gatewayConfig.llm_max_tokens}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_max_tokens: parseInt(e.target.value, 10) || 2048 })}
                  className="w-full h-8 px-2 text-xs bg-white border border-gray-200 rounded font-medium text-gray-800 text-center"
                />
                <p className="text-[10px] text-gray-400 mt-1">Upper limit per qualification reasoning pass</p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">Timeout (Seconds)</span>
                  <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 border rounded">
                    {gatewayConfig.llm_timeout_seconds}s
                  </span>
                </div>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={gatewayConfig.llm_timeout_seconds}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, llm_timeout_seconds: parseInt(e.target.value, 10) || 30 })}
                  className="w-full h-8 px-2 text-xs bg-white border border-gray-200 rounded font-medium text-gray-800 text-center"
                />
                <p className="text-[10px] text-gray-400 mt-1">Abort request if no response within this window</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: WhatsApp Gateway */}
          <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                    WhatsApp Gateway (Head & MD Escalation + Lead Chat)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure Meta Cloud API, Gupshup, or Twilio WhatsApp endpoint credentials
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTestConnection("whatsapp")}
                disabled={testing.whatsapp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition"
              >
                {testing.whatsapp ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} className="text-emerald-600" />}
                Test WhatsApp Gateway
              </button>
            </div>

            {testResult.whatsapp && (
              <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${testResult.whatsapp.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {testResult.whatsapp.ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-600" />}
                  <span>{testResult.whatsapp.ok ? testResult.whatsapp.data.message : testResult.whatsapp.error}</span>
                </div>
                {testResult.whatsapp.ok && <span className="font-semibold">{testResult.whatsapp.data.latency_ms} ms</span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  WhatsApp Provider (Presets)
                </label>
                <select
                  value={gatewayConfig.whatsapp_provider}
                  onChange={(e) => handleWhatsappProviderChange(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
                >
                  {WHATSAPP_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={gatewayConfig.whatsapp_phone_number_id}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, whatsapp_phone_number_id: e.target.value })}
                  placeholder="e.g. 104829105938201"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  WABA ID (Business Account)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.whatsapp_business_account_id}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, whatsapp_business_account_id: e.target.value })}
                  placeholder="e.g. 948201958204918"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  API Endpoint / Base URL (Manual Entry)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.whatsapp_api_endpoint}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, whatsapp_api_endpoint: e.target.value })}
                  placeholder="https://graph.facebook.com/v19.0"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span>Access Token / Permanent Bearer Key</span>
                  {gatewayConfig.whatsapp_api_key_configured && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Configured
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKeys.whatsapp ? "text" : "password"}
                    value={gatewayConfig.whatsapp_api_key}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, whatsapp_api_key: e.target.value })}
                    placeholder={gatewayConfig.whatsapp_api_key_configured ? "•••••••• (Leave blank to keep existing)" : "Paste Meta Permanent Access Token"}
                    className="w-full h-9 px-3 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((p) => ({ ...p, whatsapp: !p.whatsapp }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.whatsapp ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Telephony & Voice Agent Gateway */}
          <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PhoneCall size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                    Telephony & Voice Calling Gateway (Mobile & WhatsApp Audio)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Connect Exotel, Bland AI, Twilio Voice, or custom SIP trunk to power autonomous lead calling
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTestConnection("telephony")}
                disabled={testing.telephony}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition"
              >
                {testing.telephony ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} className="text-indigo-600" />}
                Test SIP / Voice Channel
              </button>
            </div>

            {testResult.telephony && (
              <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${testResult.telephony.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {testResult.telephony.ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-600" />}
                  <span>{testResult.telephony.ok ? testResult.telephony.data.message : testResult.telephony.error}</span>
                </div>
                {testResult.telephony.ok && <span className="font-semibold">{testResult.telephony.data.latency_ms} ms</span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Voice Calling Provider (Presets)
                </label>
                <select
                  value={gatewayConfig.telephony_provider}
                  onChange={(e) => handleTelephonyProviderChange(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
                >
                  {TELEPHONY_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Outbound Caller ID (Mobile / Virtual Number)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.telephony_caller_id}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, telephony_caller_id: e.target.value })}
                  placeholder="+91 90000 00000"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Voice Model / Persona ID
                </label>
                <input
                  type="text"
                  value={gatewayConfig.telephony_voice_id}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, telephony_voice_id: e.target.value })}
                  placeholder="e.g. en-IN-Wavenet-B or bland-agent-id"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Telephony Base URL / Webhook
                </label>
                <input
                  type="text"
                  value={gatewayConfig.telephony_base_url}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, telephony_base_url: e.target.value })}
                  placeholder="https://api.exotel.com/v1"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span>Auth Token / Secret</span>
                  {gatewayConfig.telephony_auth_token_configured && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Configured
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKeys.telephony ? "text" : "password"}
                    value={gatewayConfig.telephony_auth_token}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, telephony_auth_token: e.target.value })}
                    placeholder={gatewayConfig.telephony_auth_token_configured ? "•••••••• (Leave blank to keep existing)" : "Paste Auth Token / API Secret"}
                    className="w-full h-9 px-3 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((p) => ({ ...p, telephony: !p.telephony }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.telephony ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VERSION HISTORY DRAWER / MODAL
         ========================================================= */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    Model & Gateway Version Audit History
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Chronological audit log of every configuration update with diffs and one-click rollback
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {historyLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                  Loading audit logs...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">
                  No configuration updates logged yet.
                </div>
              ) : (
                historyList.map((item) => {
                  const isCurrent = item.version === gatewayConfig.current_version;
                  const isExpanded = expandedDiffs[item.id];
                  const hasDiffs = item.diff_details && Object.keys(item.diff_details).length > 0;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 transition ${
                        isCurrent
                          ? "bg-blue-50/30 border-blue-200 ring-1 ring-blue-500/20"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                              isCurrent
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            v{item.version}
                          </span>
                          {isCurrent && (
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              Active Version
                            </span>
                          )}
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-medium text-gray-700">
                            {item.changed_by_name || "Admin"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(item.created_at).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleRollback(item.version)}
                              title="Rollback configuration to this version"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition border border-blue-200"
                            >
                              <RotateCcw size={12} />
                              Rollback
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="mt-2 text-xs font-semibold text-gray-900">
                        {item.change_reason || "Configuration update"}
                      </div>

                      {/* Summary */}
                      {item.change_summary && (
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed font-mono bg-gray-50 p-2 rounded border border-gray-100">
                          {item.change_summary}
                        </p>
                      )}

                      {/* Diffs Toggle */}
                      {hasDiffs && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => toggleDiffExpand(item.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {isExpanded ? "Hide Changed Fields" : `View ${Object.keys(item.diff_details).length} Modified Field(s)`}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5">
                              {Object.entries(item.diff_details).map(([k, d]) => (
                                <div key={k} className="text-[11px] bg-white p-2 rounded border border-gray-100 flex items-start justify-between gap-2">
                                  <span className="font-semibold text-gray-700">{d.label || k}:</span>
                                  <div className="flex items-center gap-2 text-right font-mono">
                                    <span className="text-rose-600 line-through bg-rose-50 px-1 rounded">{d.old_value}</span>
                                    <span className="text-gray-400">➔</span>
                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">{d.new_value}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SAVE CONFIRMATION & AUDIT REASON MODAL
         ========================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Save size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Confirm Configuration Update</h3>
                  <p className="text-xs text-gray-500">A new version entry (v{(gatewayConfig.current_version || 1) + 1}) will be logged in history</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Change Reason / Release Note (Audit Log)
              </label>
              <input
                type="text"
                autoFocus
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Switched LLM to GPT-4o and updated Meta WhatsApp phone number"
                className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-800"
              />
              <p className="text-[11px] text-gray-400">
                This note will be recorded permanently in the version history alongside who made the change.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-xs disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm & Log to History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB: TOKEN ANALYTICS & USER QUOTA CONTROLS
         ========================================================= */}
      {tab === "analytics" && <AiTokenAnalyticsTab />}

      {/* =========================================================
          TAB: RAG & APPLICATION GROUNDING ENGINE
         ========================================================= */}
      {tab === "rag" && (
        <div className="flex flex-col gap-6">
          {/* Overview Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Layers size={22} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">RAG (Retrieval-Augmented Generation) & Knowledge Base</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Ensures AI generates grounded responses strictly sourced from your CRM leads, call logs, activities, and customer notes.
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                ragConfig.rag_enabled ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
              }`}>
                <span className={`w-2 h-2 rounded-full ${ragConfig.rag_enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                {ragConfig.rag_enabled ? "RAG Active" : "RAG Disabled"}
              </span>
            </div>
          </div>

          {/* Setting Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Strict CRM Grounding */}
            <div className="bg-white border rounded-lg p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Strict CRM Data Grounding</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.strict_crm_grounding}
                      onChange={(e) => setRagConfig((prev) => ({ ...prev, strict_crm_grounding: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  When enabled, the AI answers strictly from your internal application database (leads, stages, activities, calls, customers, notes). It rejects hallucinated claims and quotes exact records.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Data Scope: Internal CRM records</span>
                <span className="font-medium text-emerald-600">{ragConfig.strict_crm_grounding ? "Enforced" : "Permissive"}</span>
              </div>
            </div>

            {/* 2. Hot Lead Identification */}
            <div className="bg-white border rounded-lg p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame size={18} className="text-orange-500" />
                    <h3 className="text-sm font-semibold text-gray-900">AI Hot Lead Identification</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.enable_hot_lead_rag}
                      onChange={(e) => setRagConfig((prev) => ({ ...prev, enable_hot_lead_rag: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Powers the Copilot search prompt <i>"AI should identify hot lead"</i>. Evaluates estimated deal value, call sentiment, stage velocity, and engagement recency.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Threshold: &ge; {ragConfig.hot_lead_threshold || 80} Score</span>
                <span className="font-medium text-blue-600">{ragConfig.enable_hot_lead_rag ? "Enabled" : "Disabled"}</span>
              </div>
            </div>

            {/* 3. Next Best Engagement & Timing */}
            <div className="bg-white border rounded-lg p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Next Best Engagement & When</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.enable_next_engagement}
                      onChange={(e) => setRagConfig((prev) => ({ ...prev, enable_next_engagement: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Powers the Copilot search prompt <i>"AI should tell what should be next engagement to do and when"</i>. Formulates the exact next interaction (Demo, Executive Call, Pricing Review) and optimal time slot.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Engine: Activity velocity & stage SLA</span>
                <span className="font-medium text-indigo-600">{ragConfig.enable_next_engagement ? "Active" : "Disabled"}</span>
              </div>
            </div>

            {/* 4. Call Qualification Reasoning (Interested vs Not Interested) */}
            <div className="bg-white border rounded-lg p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={18} className="text-emerald-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Qualification & Rejection Reasoning</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.enable_qualification_reasoning}
                      onChange={(e) => setRagConfig((prev) => ({ ...prev, enable_qualification_reasoning: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  If AI or an agent called a lead and it is <b>Not Interested</b>, AI explains why it was lost (pricing, no budget, competitor, bad timing). If <b>Interested</b>, AI highlights the exact compelling driver.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Mandate: Specific justification required</span>
                <span className="font-medium text-emerald-600">{ragConfig.enable_qualification_reasoning ? "Active" : "Disabled"}</span>
              </div>
            </div>
          </div>

          {/* Section: Outside Company Search & Intelligence */}
          <div className="bg-white border rounded-lg p-5 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">External Company Intelligence & Web Search</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enables AI to reach beyond internal CRM records to fetch real-world company overview, industry vertical, and background from external public web sources.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ragConfig.enable_external_search}
                  onChange={(e) => setRagConfig((prev) => ({ ...prev, enable_external_search: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {ragConfig.enable_external_search && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    External Search Knowledge Provider
                  </label>
                  <p className="text-xs text-gray-500">
                    Select the search index used to fetch firmographic data when an internal lead company needs external context.
                  </p>
                </div>
                <select
                  value={ragConfig.external_search_provider || "duckduckgo"}
                  onChange={(e) => setRagConfig((prev) => ({ ...prev, external_search_provider: e.target.value }))}
                  className="w-full sm:w-64 h-9 px-3 text-xs bg-white border border-gray-300 rounded-lg text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="duckduckgo">DuckDuckGo Instant Answer API (Zero-API Key)</option>
                  <option value="wikipedia">Wikipedia Knowledge Graph</option>
                  <option value="custom">Custom Web Search Endpoint</option>
                </select>
              </div>
            )}
          </div>

          {/* Quick Save Bar for RAG */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  setSaving(true);
                  await aiCopilotAPI.updateRagSettings(ragConfig);
                  toast.success("RAG and Knowledge Base settings saved!");
                } catch (e) {
                  toast.error("Failed to save RAG settings");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <Save size={16} />
              Save RAG Settings
            </button>
          </div>
        </div>
      )}
    </main>
  </div>
</div>
  );
}
