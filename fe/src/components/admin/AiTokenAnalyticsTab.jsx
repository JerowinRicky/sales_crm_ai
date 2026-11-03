import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  Cpu,
  Layers,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Edit2,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  X,
  Sliders,
  DollarSign,
  Zap,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { aiTokenAPI } from "../../services/api";

export default function AiTokenAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Global Settings Form
  const [globalSettings, setGlobalSettings] = useState({
    default_user_quota: 50000,
    default_quota_period: "monthly",
    enforce_quotas: true,
    warning_threshold_pct: 80,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Edit User Quota Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    token_quota: 50000,
    quota_period: "monthly",
    is_restricted: true,
    is_blocked: false,
    reset_usage: false,
  });
  const [savingUserQuota, setSavingUserQuota] = useState(false);

  // Reset All Confirmation Modal
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  // Fetch summary and user quotas
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, usersRes] = await Promise.all([
        aiTokenAPI.getSummary(),
        aiTokenAPI.getUserQuotas({ search, role_id: roleFilter || undefined }),
      ]);

      if (sumRes?.data) {
        setSummary(sumRes.data);
        if (sumRes.data.settings) {
          setGlobalSettings({
            default_user_quota: sumRes.data.settings.default_user_quota || 50000,
            default_quota_period: sumRes.data.settings.default_quota_period || "monthly",
            enforce_quotas: Boolean(sumRes.data.settings.enforce_quotas),
            warning_threshold_pct: sumRes.data.settings.warning_threshold_pct || 80,
          });
        }
      }

      if (usersRes?.data) {
        setUsers(usersRes.data);
      }
    } catch (err) {
      console.error("Error loading AI token analytics:", err);
      toast.error("Failed to load AI token analytics");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Save Global Settings
  const handleSaveGlobalSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await aiTokenAPI.updateSettings(globalSettings);
      if (res?.data) {
        toast.success("Global AI Token policy updated successfully!");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to update global token policy");
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (userItem) => {
    setEditingUser(userItem);
    setEditForm({
      token_quota: userItem.token_quota || 50000,
      quota_period: userItem.quota_period || "monthly",
      is_restricted: userItem.is_restricted,
      is_blocked: userItem.is_blocked,
      reset_usage: false,
    });
  };

  // Handle Save User Quota
  const handleSaveUserQuota = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingUserQuota(true);
      await aiTokenAPI.updateUserQuota(editingUser.id, editForm);
      toast.success(`Quota updated for ${editingUser.name}`);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user quota");
    } finally {
      setSavingUserQuota(false);
    }
  };

  // Quick Toggle Block
  const handleToggleBlock = async (userItem) => {
    try {
      const newBlocked = !userItem.is_blocked;
      await aiTokenAPI.updateUserQuota(userItem.id, {
        token_quota: userItem.token_quota,
        quota_period: userItem.quota_period,
        is_restricted: userItem.is_restricted,
        is_blocked: newBlocked,
      });
      toast.success(newBlocked ? `AI access suspended for ${userItem.name}` : `AI access restored for ${userItem.name}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update user access status");
    }
  };

  // Quick Reset User Usage
  const handleResetUserUsage = async (userItem) => {
    try {
      await aiTokenAPI.resetUsage({ user_id: userItem.id });
      toast.success(`Token usage counter reset to 0 for ${userItem.name}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to reset user usage");
    }
  };

  // Handle Reset All Users Usage
  const handleResetAllUsage = async () => {
    try {
      setResettingAll(true);
      await aiTokenAPI.resetUsage({ user_id: "all" });
      toast.success("All users' token usage counters have been reset to 0!");
      setShowResetAllModal(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to reset all usage");
    } finally {
      setResettingAll(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-500 bg-white border rounded-lg">
        <RefreshCw size={28} className="animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading AI Token Analytics & Quotas...</p>
      </div>
    );
  }

  const overall = summary?.overall || {};
  const today = summary?.today || {};
  const month = summary?.this_month || {};
  const providers = summary?.providers || [];
  const timeline = summary?.timeline || [];
  const quotaSummary = summary?.quota_summary || {};

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Bar with Actions */}
      <div className="bg-white border rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              AI Token Analytics & Quota Controls
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Real-time tracking of AI tokens used across CRM operations, prompt vs completion costs, user-level consumption, and customizable token quota limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetAllModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset All Counters</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tokens Card */}
        <div className="bg-white border rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Tokens Used</span>
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap size={14} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {Number(overall.total_tokens || 0).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
              <span>Prompt: <b>{Number(overall.prompt_tokens || 0).toLocaleString()}</b></span>
              <span>Comp: <b>{Number(overall.completion_tokens || 0).toLocaleString()}</b></span>
            </div>
          </div>
        </div>

        {/* Total Queries Card */}
        <div className="bg-white border rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total AI Queries</span>
            <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles size={14} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {Number(overall.total_requests || 0).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
              <span>Today: <b>{Number(today.today_requests || 0)}</b></span>
              <span>This Month: <b>{Number(month.month_requests || 0)}</b></span>
            </div>
          </div>
        </div>

        {/* Active AI Users Card */}
        <div className="bg-white border rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Active AI Users</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {overall.active_users_count || 0}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
              <span>Exceeded Quota: <b className="text-red-600">{quotaSummary.exceeded_count || 0}</b></span>
              <span>Blocked: <b className="text-amber-600">{quotaSummary.blocked_count || 0}</b></span>
            </div>
          </div>
        </div>

        {/* Estimated AI Cost Card */}
        <div className="bg-white border rounded-lg p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Estimated Cost</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              ${Number(overall.estimated_cost || 0).toFixed(4)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
              <span>₹{(Number(overall.estimated_cost || 0) * 87).toFixed(2)} INR</span>
              <span>Rate: ~$1.50/1M tok</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Global Quota Settings Policy Bar */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Global Token Quota Policy & Defaults
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">
              {globalSettings.enforce_quotas ? "Token quotas strictly active" : "Token quotas currently unconstrained"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveGlobalSettings} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Enforce Quotas Toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Enforce Token Quotas
            </label>
            <button
              type="button"
              onClick={() => setGlobalSettings((p) => ({ ...p, enforce_quotas: !p.enforce_quotas }))}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md border transition cursor-pointer ${
                globalSettings.enforce_quotas
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{globalSettings.enforce_quotas ? "Enabled (Strict)" : "Disabled (Unlimited)"}</span>
              {globalSettings.enforce_quotas ? (
                <ShieldCheck size={16} className="text-blue-600" />
              ) : (
                <Shield size={16} className="text-gray-400" />
              )}
            </button>
          </div>

          {/* Default Quota */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Default Quota per User
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="5000"
                value={globalSettings.default_user_quota}
                onChange={(e) => setGlobalSettings((p) => ({ ...p, default_user_quota: Number(e.target.value) }))}
                className="w-full px-3 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50000"
              />
              <span className="absolute right-2.5 top-1.5 text-[11px] text-gray-400 font-mono">tokens</span>
            </div>
          </div>

          {/* Quota Period */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reset Interval / Period
            </label>
            <select
              value={globalSettings.default_quota_period}
              onChange={(e) => setGlobalSettings((p) => ({ ...p, default_quota_period: e.target.value }))}
              className="w-full px-3 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="monthly">Monthly (Auto-reset each month)</option>
              <option value="weekly">Weekly (Auto-reset every 7 days)</option>
              <option value="daily">Daily (Auto-reset every 24h)</option>
              <option value="total">Total Lifetime Quota (No auto-reset)</option>
            </select>
          </div>

          {/* Save Button */}
          <div>
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>Save Policy Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. Timeline Usage Chart & Providers Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 14-Day Timeline Chart */}
        <div className="bg-white border rounded-lg p-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-600" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Daily Token Consumption (Past 14 Days)
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">Prompt vs Completion</span>
          </div>

          {timeline.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No daily token usage recorded in the past 14 days.
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                    formatter={(val) => Number(val).toLocaleString() + " tokens"}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="prompt_tokens" name="Prompt Tokens" fill="#93c5fd" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="completion_tokens" name="Completion Tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Provider & Model Distribution */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-blue-600" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Model Distribution
              </h3>
            </div>
          </div>

          {providers.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No provider activity logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map((p, idx) => {
                const totalAll = overall.total_tokens || 1;
                const pct = Math.min(100, Math.round((p.tokens_count / totalAll) * 100));
                return (
                  <div key={idx} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                        {p.model}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {p.provider}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                      <span>{Number(p.tokens_count).toLocaleString()} tokens ({pct}%)</span>
                      <span>{p.requests_count} calls</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. User-Based Token Analytics & Quota Controls Table */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              User-Level Token Consumption & Quotas ({users.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Customize token limits, restrict or unblock specific sales representatives or managers, and view detailed token burn rates.
            </p>
          </div>

          {/* Search & Role Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user..."
                className="pl-8 pr-3 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-44 sm:w-52"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Roles</option>
              <option value="1">Admin</option>
              <option value="2">Sales Manager</option>
              <option value="3">Salesperson</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/70 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">User & Email</th>
                <th className="py-2.5 px-3">Role & Domain</th>
                <th className="py-2.5 px-3">Tokens Used / Quota</th>
                <th className="py-2.5 px-3">Burn Progress</th>
                <th className="py-2.5 px-3">Quota Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const used = Number(u.tokens_used_current_period || 0);
                  const quota = Number(u.token_quota || 0);
                  const isBlocked = Boolean(u.is_blocked);
                  const isRestricted = Boolean(u.is_restricted);
                  const pct = u.usage_pct || 0;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* User */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                      </td>

                      {/* Role & Domain */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 capitalize">
                          {u.role_name ? u.role_name.replace("_", " ") : "User"}
                        </span>
                        {u.domains && u.domains.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-1">
                            {u.domains.map((d) => (
                              <span key={d.id} className="bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-medium">
                                {d.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Tokens Used vs Quota */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">
                          {used.toLocaleString()}{" "}
                          <span className="font-normal text-gray-400 text-[11px]">
                            / {isRestricted ? quota.toLocaleString() : "∞"}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Period: {u.quota_period || "monthly"} • All-Time: {Number(u.all_time_tokens || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3 px-3 min-w-[140px]">
                        {isRestricted ? (
                          <div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 100
                                    ? "bg-red-500"
                                    : pct >= 80
                                    ? "bg-amber-500"
                                    : "bg-blue-600"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                              <span>{pct}% used</span>
                              <span>{Math.max(0, quota - used).toLocaleString()} left</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-blue-600">Unrestricted</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <Ban size={10} /> Blocked
                          </span>
                        ) : !isRestricted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 size={10} /> Unlimited
                          </span>
                        ) : u.status === "exceeded" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle size={10} /> Exceeded
                          </span>
                        ) : u.status === "warning" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle size={10} /> Near Limit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} /> Normal
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            title="Edit quota & limits"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetUserUsage(u)}
                            title="Reset tokens used to 0"
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                          >
                            <RotateCcw size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBlock(u)}
                            title={isBlocked ? "Unblock user AI access" : "Block user from AI access"}
                            className={`p-1.5 rounded-md transition cursor-pointer ${
                              isBlocked
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                          >
                            {isBlocked ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Edit User Quota Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Configure Quota: {editingUser.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUserQuota} className="p-5 space-y-4">
              {/* Restriction Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <div className="text-xs font-bold text-gray-900">Enforce Token Quota</div>
                  <div className="text-[11px] text-gray-500">
                    {editForm.is_restricted ? "Restrict this user to a fixed quota" : "Allow unlimited tokens"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.is_restricted}
                  onChange={(e) => setEditForm((p) => ({ ...p, is_restricted: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Blocked Toggle */}
              <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-200">
                <div>
                  <div className="text-xs font-bold text-red-900">Suspend AI Access</div>
                  <div className="text-[11px] text-red-600">
                    Manually prevent this user from executing any AI Copilot queries
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.is_blocked}
                  onChange={(e) => setEditForm((p) => ({ ...p, is_blocked: e.target.checked }))}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
              </div>

              {editForm.is_restricted && (
                <>
                  {/* Token Quota Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Token Quota Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1000"
                        step="5000"
                        required
                        value={editForm.token_quota}
                        onChange={(e) => setEditForm((p) => ({ ...p, token_quota: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400 font-mono">tokens</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400 font-medium">Presets:</span>
                      {[25000, 50000, 100000, 250000, 500000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setEditForm((p) => ({ ...p, token_quota: amt }))}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border border-gray-200 cursor-pointer"
                        >
                          {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Period Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Reset Interval / Period
                    </label>
                    <select
                      value={editForm.quota_period}
                      onChange={(e) => setEditForm((p) => ({ ...p, quota_period: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="monthly">Monthly (Resets on 1st of each month)</option>
                      <option value="weekly">Weekly (Resets every 7 days)</option>
                      <option value="daily">Daily (Resets every 24 hours)</option>
                      <option value="total">Total Lifetime Limit (No reset)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Reset Usage Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reset_usage_chk"
                  checked={editForm.reset_usage}
                  onChange={(e) => setEditForm((p) => ({ ...p, reset_usage: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="reset_usage_chk" className="text-xs text-gray-700 cursor-pointer">
                  Reset current used tokens to <b>0</b> now
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUserQuota}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingUserQuota ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Save Quota</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Reset All Counters Modal */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-900">Reset All User Token Counters?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This will reset the current period token consumption back to <b>0</b> for all users. Lifetime audit logs will be preserved.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingAll}
                onClick={handleResetAllUsage}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition cursor-pointer"
              >
                {resettingAll ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                <span>Yes, Reset All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
