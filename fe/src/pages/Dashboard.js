import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Target, DollarSign, Building2, MapPin, Activity, Award,
  Download, RefreshCw, Plus, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Users, Clock
} from 'lucide-react';
import StaleLeadsCard from '../components/common/StaleLeadsCard';
import ChartBuilder from '../components/common/ChartBuilder';

const PIE_COLORS = ['#2563EB', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#F97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-gray-900 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#2563EB' }} className="mb-0.5">
          {p.name}:{' '}
          <span className="font-bold">
            {p.value > 10000 ? `₹${(p.value / 100000).toFixed(1)}L` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isAdmin } = useAuth();

  const context = useOutletContext() || {};
  const toggleCollapse = context.toggleCollapse || (() => {});
  const collapsed = context.collapsed || false;

  const fetchDashboardData = (showToast = false) => {
    if (showToast) setRefreshing(true);
    analyticsAPI
      .getDashboard()
      .then((r) => {
        setData(r.data);
        if (showToast) toast.success('Dashboard updated with live metrics');
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load dashboard data');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  const fmt = (n) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Number(n || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-9 h-9 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Loading live dashboard data...
          </p>
        </div>
      </div>
    );
  }

  if (!data)
    return (
      <div className="p-10 text-center text-gray-500">
        Failed to load dashboard metrics.
      </div>
    );

  const { kpis, charts, topPerformers, recentActivity } = data;
  const srcData = (charts.bySrc || []).map((s) => ({
    name: s.source?.replace('_', ' '),
    value: s.count,
  }));

  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 17
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="text-sm text-gray-500 font-medium">{greeting},</div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
            {user?.name?.split(' ')[0] || 'User'}{' '}
            <span className="text-xl">👋</span>
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
            <Clock size={12} />
            <span>
              {format(new Date(), 'EEEE, MMMM d, yyyy')} — Live CRM Overview
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            title="Refresh Data"
            className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
          </button>

          <button
            type="button"
            onClick={() => toast.success('Exporting overview report to CSV')}
            className="h-9 px-3.5 rounded-lg bg-white border border-gray-200 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={15} />
            Export All
          </button>

          <div className="h-9 px-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Live
          </div>

          <a
            href="/leads"
            className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            New Lead
          </a>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Target}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          badge="Live"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          value={kpis.totalLeads}
          label="Total Leads"
          sub={`${kpis.activeLeads} active`}
        />
        <KpiCard
          icon={DollarSign}
          iconColor="#10B981"
          iconBg="#ECFDF5"
          badge="Revenue"
          badgeColor="#10B981"
          badgeBg="#ECFDF5"
          value={kpis.wonThisMonth}
          label="Won This Month"
          sub={fmt(kpis.revenueThisMonth)}
          subColor="#10B981"
        />
        <KpiCard
          icon={Building2}
          iconColor="#0EA5E9"
          iconBg="#F0F9FF"
          badge="Total"
          badgeColor="#0EA5E9"
          badgeBg="#F0F9FF"
          value={kpis.totalCustomers}
          label="Total Customers"
          sub="Registered"
        />
        <KpiCard
          icon={MapPin}
          iconColor="#8B5CF6"
          iconBg="#F3E8FF"
          badge="Field"
          badgeColor="#8B5CF6"
          badgeBg="#F3E8FF"
          value={kpis.visitsToday}
          label="Visits Today"
          sub={`Pipeline: ${fmt(kpis.pipelineValue)}`}
        />
      </div>

      {/* ── ROW 1: PIPELINE & SOURCES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          className="lg:col-span-2"
          title="Lead Pipeline"
          subtitle="Active leads categorized by stage"
          onExport={() => toast.success('Exporting pipeline data')}
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.byStage}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
                  {(charts.byStage || []).map((e, i) => (
                    <Cell key={i} fill={e.color || '#2563EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Lead Sources"
          subtitle="Distribution by channel origin"
          onExport={() => toast.success('Exporting sources data')}
        >
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={srcData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {srcData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 6 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 2: TRENDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Monthly Lead Trend"
          subtitle="Volume over last 12 months"
          onExport={() => toast.success('Exporting monthly trend')}
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={charts.monthLeads}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m) => m?.slice(5)}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Leads"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#colorLeads)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Revenue Trend"
          subtitle="Won deals revenue over last 12 months"
          onExport={() => toast.success('Exporting revenue trend')}
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={charts.monthRev}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={(m) => m?.slice(5)}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 3: FIELD VISITS & CITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Field Visits — 30 Days"
          subtitle="Daily check-ins log"
          onExport={() => toast.success('Exporting visits log')}
        >
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.visitTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d?.slice(5)}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar
                  dataKey="visits"
                  name="Visits"
                  fill="#0EA5E9"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Customers by City"
          subtitle="Top customer locations"
          onExport={() => toast.success('Exporting city metrics')}
        >
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.byCity}
                layout="vertical"
                margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="city"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  width={80}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar
                  dataKey="count"
                  name="Customers"
                  fill="#8B5CF6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 4: ACTIVITY + PERFORMERS ── */}
      <div
        className={`grid grid-cols-1 ${
          isAdmin && topPerformers?.length > 0 ? 'lg:grid-cols-2' : ''
        } gap-4`}
      >
        {/* Recent Activity */}
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Activity
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Latest pipeline changes & updates
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity size={15} className="text-blue-600" />
            </div>
          </div>

          <div className="flex flex-col">
            {(recentActivity || []).slice(0, 6).map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-3 ${
                  i < 5 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Activity size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {a.lead_title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {a.user_name} · {a.old_value && `${a.old_value} → `}
                    {a.new_value}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {format(new Date(a.changed_at), 'MMM d')}
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <div className="text-center text-sm text-gray-400 py-8">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        {isAdmin && topPerformers?.length > 0 && (
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Top Performers
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ranked by closed revenue performance
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Award size={15} className="text-amber-600" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {topPerformers.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                      i === 0
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : i === 1
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : i === 2
                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {p.won_leads} won · {p.visits} visits
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600">
                    {fmt(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── STALE LEADS ── */}
      <StaleLeadsCard />

      {/* ── CHART BUILDER ── */}
      <ChartBuilder />
    </div>
  );
}

/* =========================================================
 * Reusable sub-components
 * ========================================================= */

function KpiCard({
  icon: Icon,
  iconColor,
  iconBg,
  badge,
  badgeColor,
  badgeBg,
  value,
  label,
  sub,
  subColor = '#94A3B8',
}) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-sm transition">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon size={18} color={iconColor} />
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {badge}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
      <div className="text-xs mt-1" style={{ color: subColor }}>
        {sub}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, onExport, children, className = '' }) {
  return (
    <div className={`bg-white border rounded-lg p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5"
          >
            <Download size={13} />
            Export
          </button>
        )}
      </div>
      {children}
    </div>
  );
}