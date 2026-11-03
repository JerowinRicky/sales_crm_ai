import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Sparkles,
  Flame,
  CalendarClock,
  Send,
  UserCheck,
  PhoneCall,
  SearchCheck,
  Cpu,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Activity,
  Sliders,
  BellRing,
  Phone,
  MessageSquare,
  Zap,
  Target,
  RefreshCw,
} from "lucide-react";

export default function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);

  // Configuration State
  const [config, setConfig] = useState({
    // General
    ai_enabled: true,
    model_provider: "gemini-1.5-pro",
    auto_qualification: true,

    // Hot Lead Identification & Scoring
    hot_lead_threshold: 80,
    warm_lead_threshold: 50,
    scoring_weights: {
      budget_match: 25,
      decision_maker_role: 25,
      timeline_urgency: 20,
      engagement_velocity: 15,
      industry_fit: 15,
    },
    auto_rank_leads: true,

    // Next Best Engagement
    suggest_next_action: true,
    action_timing_window_hours: 4,
    recommended_channels: ["whatsapp", "phone", "email"],

    // Head & MD Escalation
    escalate_to_head: true,
    escalate_to_md: true,
    missed_lead_sla_minutes: 30,
    escalation_channel: "whatsapp",
    md_whatsapp_number: "+91 98765 43210",
    head_whatsapp_fallback: "+91 98765 00000",
    escalation_message_template:
      "🔥 *HOT LEAD ALERT (AI Qualified)*\nLead: {{lead_name}} (Score: {{lead_score}}/100)\nCompany: {{company_name}}\nReason: {{hot_reason}}\nAssigned To: {{sales_manager}}\n⚠️ SLA Expiry: {{sla_window}} min - Please take action!",

    // AI Calling & Qualification
    voice_ai_enabled: true,
    calling_channel_mobile: true,
    calling_channel_whatsapp: true,
    ai_voice_name: "Aria (Professional Sales Executive)",
    max_call_retries: 3,
    auto_log_reasons: true,
    require_interest_explanation: true,
    require_disinterest_explanation: true,

    // Best Sales Manager Assignment
    smart_assignment_enabled: true,
    assignment_strategy: "best_performer", // best_performer, round_robin, territory_matched
    match_domain_expertise: true,
    balance_manager_workload: true,

    // Lookalike Audience
    lookalike_enabled: true,
    lookalike_min_score: 85,
    auto_find_lookalikes: true,
    auto_enrich_phone_numbers: true,
    auto_outbound_call_lookalikes: false,
    daily_lookalike_quota: 50,
  });

  const handleToggle = (key) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleWeightChange = (key, val) => {
    setConfig((prev) => ({
      ...prev,
      scoring_weights: {
        ...prev.scoring_weights,
        [key]: parseInt(val) || 0,
      },
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("AI Configuration saved successfully!");
    }, 600);
  };

  const TABS = [
    { id: "overview", label: "Overview & Status", icon: Activity },
    { id: "scoring", label: "Hot Lead & Scoring", icon: Flame },
    { id: "engagement", label: "Next Engagement", icon: CalendarClock },
    { id: "assignment", label: "Smart Routing", icon: UserCheck },
    { id: "escalation", label: "WhatsApp & MD Alerts", icon: Send },
    { id: "voice", label: "AI Calling & Validation", icon: PhoneCall },
    { id: "lookalike", label: "Lookalike Audience", icon: SearchCheck },
    { id: "engine", label: "Model & Gateway", icon: Cpu },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                AI Engine & Automation Settings
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  v2.0 AI Core
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Configure hot lead detection, WhatsApp MD alerts, AI voice validation, and lookalike audience pipelines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition disabled:opacity-50"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200 scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview & Status */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">AI Engine</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">Active</div>
              <p className="text-xs text-gray-500 mt-1">Provider: Gemini 1.5 Pro</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hot Lead Threshold</span>
                <Flame size={16} className="text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{config.hot_lead_threshold} / 100</div>
              <p className="text-xs text-gray-500 mt-1">Rank tier A leads auto-flagged</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">WhatsApp Alert Gateway</span>
                <MessageSquare size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">Connected</div>
              <p className="text-xs text-gray-500 mt-1">MD & Head instant escalation</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">AI Calling Agent</span>
                <PhoneCall size={16} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">Ready</div>
              <p className="text-xs text-gray-500 mt-1">Mobile & WhatsApp Voice enabled</p>
            </div>
          </div>

          {/* Workflow Architecture Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              Configured AI Automation Pipeline
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              When a lead enters via website, mobile, or WhatsApp, the autonomous sales AI executes the following sequential steps:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {[
                {
                  step: "01",
                  title: "Lead Ingestion",
                  desc: "Incoming lead captured via Form, Mobile call, or WhatsApp query.",
                },
                {
                  step: "02",
                  title: "AI Voice Call",
                  desc: "Calls customer via Mobile/WhatsApp to qualify & explain reasons.",
                },
                {
                  step: "03",
                  title: "Lead Scoring",
                  desc: "Calculates lead quality score (0-100) & classifies Hot vs Warm.",
                },
                {
                  step: "04",
                  title: "Smart Assignment",
                  desc: "Auto-routes Hot Lead to top-performing sales manager.",
                },
                {
                  step: "05",
                  title: "WhatsApp MD Alert",
                  desc: "Notifies Head & MD if lead is missed within SLA window.",
                },
                {
                  step: "06",
                  title: "Lookalike Discovery",
                  desc: "Generates lookalike audience list & calls prospective clients.",
                },
              ].map((item) => (
                <div key={item.step} className="bg-gray-50 border border-gray-200/80 rounded-lg p-4 relative">
                  <div className="text-xs font-bold text-blue-600 mb-1">{item.step}</div>
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Hot Lead & Scoring */}
      {activeTab === "scoring" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hot Lead Identification & Ranking</h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure how the AI ranks lead quality, assigns a score between 0 and 100, and tags hot opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Hot Lead Score Threshold</h4>
                  <p className="text-xs text-gray-500">Leads with this score or higher are immediately flagged as Hot.</p>
                </div>
                <span className="text-lg font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-md border border-orange-200">
                  {config.hot_lead_threshold} pts
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={config.hot_lead_threshold}
                onChange={(e) => setConfig({ ...config, hot_lead_threshold: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>50 (Moderate)</span>
                <span>75 (Strict)</span>
                <span>95 (Ultra-qualified)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Warm Lead Score Threshold</h4>
                  <p className="text-xs text-gray-500">Leads between Warm and Hot threshold enter standard nurturing.</p>
                </div>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                  {config.warm_lead_threshold} pts
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="70"
                step="5"
                value={config.warm_lead_threshold}
                onChange={(e) => setConfig({ ...config, warm_lead_threshold: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>30 (Nurture early)</span>
                <span>50 (Standard)</span>
                <span>70 (High barrier)</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-3">AI Lead Scoring Criteria Weights (%)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: "budget_match", label: "Budget & Revenue Match", desc: "Commercial fit with product pricing" },
                { key: "decision_maker_role", label: "Decision Maker Authority", desc: "C-Level, VP, or Director involvement" },
                { key: "timeline_urgency", label: "Timeline & Buying Urgency", desc: "Intent to purchase within 30-90 days" },
                { key: "engagement_velocity", label: "Engagement Responsiveness", desc: "Speed of response to calls / WhatsApp" },
                { key: "industry_fit", label: "Industry & Geography Fit", desc: "Ideal customer profile alignment" },
              ].map((c) => (
                <div key={c.key} className="border border-gray-200 rounded-lg p-3.5 bg-white">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-800">{c.label}</span>
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {config.scoring_weights[c.key]}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{c.desc}</p>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={config.scoring_weights[c.key]}
                    onChange={(e) => handleWeightChange(c.key, e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Next Best Engagement */}
      {activeTab === "engagement" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Next Best Action & Timing Engine</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI calculates what specific action sales reps should take next and the exact optimal time to reach out.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">Suggest Next Action on Lead Detail</span>
                <p className="text-xs text-gray-500">
                  Displays an AI recommendation badge (e.g., "Send revised pricing proposal via WhatsApp tomorrow at 11:30 AM").
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.suggest_next_action}
                onChange={() => handleToggle("suggest_next_action")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Recommended Follow-up Window for Hot Leads</h4>
              <p className="text-xs text-gray-500">
                Maximum time allowed before AI flags the lead as "At Risk of Going Cold".
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={config.action_timing_window_hours}
                  onChange={(e) => setConfig({ ...config, action_timing_window_hours: Number(e.target.value) })}
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <span className="text-sm text-gray-600 font-medium">Hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Smart Routing */}
      {activeTab === "assignment" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Sales Manager Assignment</h3>
            <p className="text-sm text-gray-500 mt-1">
              Automatically assigns qualified Hot Leads to top-performing managers to maximize closure conversion.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">Auto-Assign Hot Leads</span>
                <p className="text-xs text-gray-500">
                  Instantly re-assigns newly qualified hot leads to the most suitable manager.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.smart_assignment_enabled}
                onChange={() => handleToggle("smart_assignment_enabled")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Routing Algorithm</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "best_performer", label: "Best Win-Rate Performer", desc: "Prioritizes managers with highest conversion in this product category" },
                  { id: "territory_matched", label: "Territory / Region Lead", desc: "Assigns to designated territory head with active capacity" },
                  { id: "round_robin", label: "Weighted Round Robin", desc: "Even distribution among qualified senior managers" },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setConfig({ ...config, assignment_strategy: opt.id })}
                    className={`p-3.5 rounded-lg border cursor-pointer transition ${
                      config.assignment_strategy === opt.id
                        ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WhatsApp & MD Alerts */}
      {activeTab === "escalation" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Head & MD WhatsApp Alerts (Missed Leads Safeguard)</h3>
            <p className="text-sm text-gray-500 mt-1">
              Ensures high-value hot leads are never missed by sending direct WhatsApp escalations to Territory Heads and Managing Director.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Escalation Contacts</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">MD WhatsApp Number</label>
                    <input
                      type="text"
                      value={config.md_whatsapp_number}
                      onChange={(e) => setConfig({ ...config, md_whatsapp_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Territory Head WhatsApp Fallback</label>
                    <input
                      type="text"
                      value={config.head_whatsapp_fallback}
                      onChange={(e) => setConfig({ ...config, head_whatsapp_fallback: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                      placeholder="+91 98765 00000"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Missed Lead Inactivity SLA</h4>
                <p className="text-xs text-gray-500">
                  If the assigned sales manager does not call or engage within this window, trigger WhatsApp escalation:
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={config.missed_lead_sla_minutes}
                    onChange={(e) => setConfig({ ...config, missed_lead_sla_minutes: Number(e.target.value) })}
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                  <span className="text-sm text-gray-600 font-medium">Minutes</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">WhatsApp Notification Template</h4>
                <textarea
                  rows={6}
                  value={config.escalation_message_template}
                  onChange={(e) => setConfig({ ...config, escalation_message_template: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white leading-relaxed"
                />
                <p className="text-xs text-gray-400">Available tags: {'{{lead_name}}, {{lead_score}}, {{company_name}}, {{hot_reason}}, {{sales_manager}}, {{sla_window}}'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI Calling & Validation */}
      {activeTab === "voice" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Calling & Lead Validation (Mobile & WhatsApp Voice)</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI voice agent validates incoming leads via phone call or WhatsApp audio call, captures interest, and records reasoning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">Mobile GSM Calling Agent</span>
                <p className="text-xs text-gray-500">Autonomous outbound calling to mobile numbers on lead capture.</p>
              </div>
              <input
                type="checkbox"
                checked={config.calling_channel_mobile}
                onChange={() => handleToggle("calling_channel_mobile")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">WhatsApp Voice Calling Agent</span>
                <p className="text-xs text-gray-500">Direct WhatsApp voice call for leads received via WhatsApp chat.</p>
              </div>
              <input
                type="checkbox"
                checked={config.calling_channel_whatsapp}
                onChange={() => handleToggle("calling_channel_whatsapp")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>
          </div>

          <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Interest / Disinterest Analysis & Reasoning Log</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-emerald-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 size={16} /> Interested Lead Qualification
                </div>
                <p className="text-xs text-gray-600">
                  AI logs exact justification: Key pain points, confirmed budget, immediate project requirements, and handed off to sales rep.
                </p>
              </div>

              <div className="bg-white border border-rose-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                  <AlertCircle size={16} /> Not Interested / Disqualified Reason
                </div>
                <p className="text-xs text-gray-600">
                  AI logs exact root cause: e.g. "Competitor locked in for 2 years", "Zero budget allocation", or "Wrong contact person".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Lookalike Audience */}
      {activeTab === "lookalike" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lookalike Audience Discovery & Prospecting</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI analyzes top-converting deals, identifies common client patterns, and discovers lookalike companies with contact numbers.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">Automatic Lookalike Prospecting</span>
                <p className="text-xs text-gray-500">
                  Analyzes leads with score &ge; {config.lookalike_min_score} and extracts industry, company scale, and location profiles.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.lookalike_enabled}
                onChange={() => handleToggle("lookalike_enabled")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">Enrich Verified Contact Numbers</span>
                <p className="text-xs text-gray-500">
                  Queries business registries and data partners to fetch verified phone numbers for lookalike targets.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.auto_enrich_phone_numbers}
                onChange={() => handleToggle("auto_enrich_phone_numbers")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-gray-900">Automated AI Calling to Qualified Lookalikes</span>
                <p className="text-xs text-gray-500">
                  AI dials verified lookalike leads, runs validation pitch, and passes interested leads to respective sales managers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.auto_outbound_call_lookalikes}
                onChange={() => handleToggle("auto_outbound_call_lookalikes")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Model & Gateway */}
      {activeTab === "engine" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Model & Integration Gateways</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select language models, WhatsApp Business API endpoints, and Telephony integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">LLM Engine</h4>
              <select
                value={config.model_provider}
                onChange={(e) => setConfig({ ...config, model_provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
              <p className="text-xs text-gray-400">Used for scoring, validation reasoning, and next action recommendations.</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">WhatsApp Gateway</h4>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="meta">Meta WhatsApp Cloud API</option>
                <option value="gupshup">Gupshup Enterprise</option>
                <option value="twilio">Twilio Messaging API</option>
              </select>
              <p className="text-xs text-gray-400">Used for MD & Head escalations and incoming lead capture.</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Telephony Provider</h4>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="exotel">Exotel / Twilio Voice</option>
                <option value="bland">Bland AI Phone Engine</option>
                <option value="vapi">Vapi Voice Pipeline</option>
              </select>
              <p className="text-xs text-gray-400">Used for autonomous mobile & WhatsApp calling.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

