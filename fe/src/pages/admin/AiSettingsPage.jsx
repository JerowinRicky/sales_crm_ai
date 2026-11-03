import React, { useState } from "react";
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
} from "lucide-react";

export default function AiSettingsPage() {
  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);

  // Configuration State
  const [config, setConfig] = useState({
    // General
    ai_enabled: true,
    model_provider: "gemini-1.5-pro",

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
      "🔥 HOT LEAD ALERT (AI Qualified)\nLead: {{lead_name}} (Score: {{lead_score}}/100)\nCompany: {{company_name}}\nReason: {{hot_reason}}\nAssigned To: {{sales_manager}}\n⚠️ SLA: No action taken in {{sla_window}} mins. Immediate intervention requested.",

    // AI Calling & Qualification
    voice_ai_enabled: true,
    calling_channel_mobile: true,
    calling_channel_whatsapp: true,
    ai_voice_name: "Aria (Professional Sales Voice)",
    max_call_retries: 3,
    auto_log_reasons: true,
    require_interest_explanation: true,
    require_disinterest_explanation: true,

    // Best Sales Manager Assignment
    smart_assignment_enabled: true,
    assignment_strategy: "best_performer", // best_performer, territory_matched, round_robin
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
        [key]: parseInt(val, 10) || 0,
      },
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("AI configuration saved successfully");
    }, 500);
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">AI Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure hot lead scoring, WhatsApp MD alerts, AI voice validation, and lookalike audience pipelines
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {/* Tabs Navigation matching SettingsPage.js pill style */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {[
          ["overview", Activity, "Overview & Status"],
          ["scoring", Flame, "Hot Lead & Scoring"],
          ["engagement", CalendarClock, "Next Best Engagement"],
          ["assignment", UserCheck, "Smart Assignment"],
          ["escalation", Send, "WhatsApp & MD Alerts"],
          ["voice", PhoneCall, "AI Voice & WhatsApp Calling"],
          ["lookalike", Search, "Lookalike Audience"],
          ["engine", Cpu, "Model & Gateway"],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition ${
              tab === key
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW & STATUS
         ========================================================= */}
      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Core</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                  Active
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">Gemini 1.5 Pro</div>
              <p className="text-xs text-gray-500 mt-1">Autonomous validation active</p>
            </div>

            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hot Lead Trigger</span>
                <Flame size={16} className="text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">&ge; {config.hot_lead_threshold} pts</div>
              <p className="text-xs text-gray-500 mt-1">Auto-promoted to Top Sales Managers</p>
            </div>

            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">WhatsApp Alerts</span>
                <MessageSquare size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">Connected</div>
              <p className="text-xs text-gray-500 mt-1">Head & MD escalation armed ({config.missed_lead_sla_minutes}m SLA)</p>
            </div>

            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Calling Agent</span>
                <PhoneCall size={16} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">Ready</div>
              <p className="text-xs text-gray-500 mt-1">Mobile GSM & WhatsApp Voice</p>
            </div>
          </div>

          {/* Workflow Architecture Card */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Configured AI Pipeline Architecture
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  How incoming leads move through autonomous validation, scoring, assignment, escalation, and lookalike generation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
              {[
                {
                  step: "Step 1",
                  title: "Lead Ingestion",
                  desc: "Incoming lead captured via Web Form, Phone Call, or WhatsApp.",
                },
                {
                  step: "Step 2",
                  title: "AI Voice Call",
                  desc: "AI dials lead via Mobile or WhatsApp Voice to qualify and record interest reasons.",
                },
                {
                  step: "Step 3",
                  title: "Lead Scoring",
                  desc: "Calculates quality score (0-100) and flags Hot leads based on criteria.",
                },
                {
                  step: "Step 4",
                  title: "Smart Routing",
                  desc: "Auto-routes qualified Hot Leads to the best-performing Sales Manager.",
                },
                {
                  step: "Step 5",
                  title: "WhatsApp Alerts",
                  desc: "Sends instant WhatsApp alerts to Territory Head and MD if lead is missed.",
                },
                {
                  step: "Step 6",
                  title: "Lookalike Engine",
                  desc: "Analyzes top leads, identifies lookalike clients, gets numbers & initiates calls.",
                },
              ].map((item) => (
                <div key={item.step} className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                    {item.step}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">{item.title}</div>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: HOT LEAD & SCORING
         ========================================================= */}
      {tab === "scoring" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Lead Scoring & Hot Lead Identification</h2>
            <p className="text-xs text-gray-500 mt-1">
              Configure how the AI ranks lead quality, assigns a score between 0 and 100, and tags hot opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Hot Lead Threshold</div>
                  <div className="text-xs text-gray-500">Leads with this score or higher are immediately flagged as Hot.</div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
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

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Warm Lead Threshold</div>
                  <div className="text-xs text-gray-500">Leads between Warm and Hot threshold enter standard nurturing.</div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
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
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Scoring Weights Breakdown (%)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "budget_match", label: "Budget & Commercial Fit", desc: "Alignment with product pricing" },
                { key: "decision_maker_role", label: "Decision Maker Authority", desc: "C-Level, VP, or Director involvement" },
                { key: "timeline_urgency", label: "Timeline & Buying Urgency", desc: "Purchase within 30-90 days" },
                { key: "engagement_velocity", label: "Engagement Velocity", desc: "Speed of response to calls / WhatsApp" },
                { key: "industry_fit", label: "Industry & Region Fit", desc: "Ideal customer profile alignment" },
              ].map((c) => (
                <div key={c.key} className="p-3.5 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-900">{c.label}</span>
                    <span className="text-xs font-bold text-gray-700 bg-white px-2 py-0.5 border rounded">
                      {config.scoring_weights[c.key]}%
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2">{c.desc}</p>
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

      {/* =========================================================
          TAB 3: NEXT BEST ENGAGEMENT
         ========================================================= */}
      {tab === "engagement" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Next Best Engagement & Timing</h2>
            <p className="text-xs text-gray-500 mt-1">
              AI suggests the most impactful action to take next and the exact optimal time to reach the prospect.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">Show AI Recommendation on Lead Details</div>
                <div className="text-xs text-gray-500">
                  Recommends exact channel, message intent, and time (e.g., "WhatsApp follow-up tomorrow at 11:30 AM").
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.suggest_next_action}
                onChange={() => handleToggle("suggest_next_action")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Follow-up Window for Hot Leads</div>
                <div className="text-xs text-gray-500">
                  Maximum hours allowed before AI warns that the lead is turning cold.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={config.action_timing_window_hours}
                  onChange={(e) => setConfig({ ...config, action_timing_window_hours: Number(e.target.value) })}
                  className="w-20 h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-center font-medium"
                />
                <span className="text-xs text-gray-600 font-medium">Hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: SMART ASSIGNMENT
         ========================================================= */}
      {tab === "assignment" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Smart Sales Manager Assignment</h2>
            <p className="text-xs text-gray-500 mt-1">
              Auto-assign qualified Hot Leads to top-performing sales managers to maximize closure conversion.
            </p>
          </div>

          <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
            <div>
              <div className="text-sm font-medium text-gray-900">Auto-Assign Hot Leads Immediately</div>
              <div className="text-xs text-gray-500">
                Re-routes newly qualified hot opportunities from generic pool to the best manager.
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.smart_assignment_enabled}
              onChange={() => handleToggle("smart_assignment_enabled")}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
          </label>

          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Assignment Strategy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: "best_performer",
                  title: "Best Win-Rate Performer",
                  desc: "Prioritizes sales managers with highest conversion record in this specific product category.",
                },
                {
                  id: "territory_matched",
                  title: "Territory / Region Lead",
                  desc: "Assigns to the designated territory head with active capacity.",
                },
                {
                  id: "round_robin",
                  title: "Weighted Round Robin",
                  desc: "Distributes hot leads evenly across qualified senior sales managers.",
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setConfig({ ...config, assignment_strategy: opt.id })}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    config.assignment_strategy === opt.id
                      ? "border-blue-600 bg-blue-50/40"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{opt.title}</div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: WHATSAPP & MD ALERTS
         ========================================================= */}
      {tab === "escalation" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Head & MD WhatsApp Alerts (Missed Leads Safeguard)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Notifies Territory Head and MD if a hot lead is not acted upon within SLA time, preventing lost deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Managing Director (MD) WhatsApp Number
                </label>
                <input
                  type="text"
                  value={config.md_whatsapp_number}
                  onChange={(e) => setConfig({ ...config, md_whatsapp_number: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Territory Head WhatsApp Fallback Number
                </label>
                <input
                  type="text"
                  value={config.head_whatsapp_fallback}
                  onChange={(e) => setConfig({ ...config, head_whatsapp_fallback: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Missed Lead SLA Window</div>
                  <div className="text-xs text-gray-500">
                    If sales manager doesn't contact lead within this window, trigger WhatsApp escalation.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={config.missed_lead_sla_minutes}
                    onChange={(e) => setConfig({ ...config, missed_lead_sla_minutes: Number(e.target.value) })}
                    className="w-20 h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-center font-medium"
                  />
                  <span className="text-xs text-gray-600 font-medium">Mins</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-0.5">
                WhatsApp Escalation Message Template
              </label>
              <textarea
                rows={6}
                value={config.escalation_message_template}
                onChange={(e) => setConfig({ ...config, escalation_message_template: e.target.value })}
                className="w-full p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
              <p className="text-[11px] text-gray-400">
                Variables: {'{{lead_name}}, {{lead_score}}, {{company_name}}, {{hot_reason}}, {{sales_manager}}, {{sla_window}}'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 6: AI CALLING & VALIDATION
         ========================================================= */}
      {tab === "voice" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Calling & Lead Validation (Mobile & WhatsApp Voice)</h2>
            <p className="text-xs text-gray-500 mt-1">
              AI voice agent validates incoming leads via phone call or WhatsApp audio call, captures interest, and records reasoning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">Mobile GSM Calling Agent</div>
                <div className="text-xs text-gray-500">Autonomous outbound calling to mobile numbers on lead capture.</div>
              </div>
              <input
                type="checkbox"
                checked={config.calling_channel_mobile}
                onChange={() => handleToggle("calling_channel_mobile")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">WhatsApp Voice Calling Agent</div>
                <div className="text-xs text-gray-500">Direct WhatsApp voice call for leads received via WhatsApp chat.</div>
              </div>
              <input
                type="checkbox"
                checked={config.calling_channel_whatsapp}
                onChange={() => handleToggle("calling_channel_whatsapp")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Qualification Reasoning & Logging
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wide">
                  <CheckCircle2 size={15} /> Interested Lead Qualification
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  AI logs exact justification: Key pain points, confirmed budget, immediate project requirements, and automatically hands off to sales rep.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs uppercase tracking-wide">
                  <AlertCircle size={15} /> Not Interested / Disqualified Reason
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  AI logs exact root cause: e.g., "Competitor contract locked for 2 years", "Zero budget allocation", or "Wrong contact person".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 7: LOOKALIKE AUDIENCE
         ========================================================= */}
      {tab === "lookalike" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Lookalike Audience Discovery & Outbound Prospecting</h2>
            <p className="text-xs text-gray-500 mt-1">
              AI analyzes top-converting deals, identifies common client patterns, and discovers lookalike companies with contact numbers.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">Automatic Lookalike Prospecting</div>
                <div className="text-xs text-gray-500">
                  Analyzes leads with score &ge; {config.lookalike_min_score} and matches industry, company scale, and location profiles.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.lookalike_enabled}
                onChange={() => handleToggle("lookalike_enabled")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">Enrich Verified Contact Numbers</div>
                <div className="text-xs text-gray-500">
                  Auto-fetches verified corporate contact numbers for discovered lookalike targets.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.auto_enrich_phone_numbers}
                onChange={() => handleToggle("auto_enrich_phone_numbers")}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer">
              <div>
                <div className="text-sm font-medium text-gray-900">Automated AI Outbound Calls to Lookalikes</div>
                <div className="text-xs text-gray-500">
                  AI dials verified lookalikes, runs pitch validation, and routes interested leads to sales managers.
                </div>
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

      {/* =========================================================
          TAB 8: MODEL & GATEWAY
         ========================================================= */}
      {tab === "engine" && (
        <div className="bg-white border rounded-lg p-5 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Model & Integration Gateways</h2>
            <p className="text-xs text-gray-500 mt-1">
              Select language models, WhatsApp Business API endpoints, and Telephony integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                LLM Provider
              </label>
              <select
                value={config.model_provider}
                onChange={(e) => setConfig({ ...config, model_provider: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
              <p className="text-[11px] text-gray-400">Used for scoring, validation reasoning, and next action advice.</p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                WhatsApp Gateway
              </label>
              <select className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="meta">Meta WhatsApp Cloud API</option>
                <option value="gupshup">Gupshup Enterprise</option>
                <option value="twilio">Twilio Messaging API</option>
              </select>
              <p className="text-[11px] text-gray-400">Used for MD & Head escalations and WhatsApp lead chats.</p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Telephony Provider
              </label>
              <select className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="exotel">Exotel / Twilio Voice</option>
                <option value="bland">Bland AI Voice Engine</option>
                <option value="vapi">Vapi Voice Pipeline</option>
              </select>
              <p className="text-[11px] text-gray-400">Used for autonomous mobile & WhatsApp calling.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
