import React, { useState, useEffect, useCallback } from 'react';
import { mailAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Mail,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  Play,
  RotateCcw,
  Trash2,
  Search,
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  Calendar,
  Eye,
  Check,
  AlertCircle,
  HelpCircle,
  FileText,
  Code,
  Copy,
  Save,
  Sparkles,
  Bell,
  Target,
  Layout,
  Layers,
} from 'lucide-react';

export default function MailPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'logs'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningDaily, setRunningDaily] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    provider: 'smtp',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    from_name: 'SalesCRM Notifications',
    from_email: '',
    daily_reminder_time: '09:00',
    enable_daily_reminder: true,
    enable_notification_mail: true,
    max_retries: 3,
  });

  // Test mail state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingMail, setTestingMail] = useState(false);

  useEffect(() => {
    if (user?.email && !testEmail) {
      setTestEmail(user.email);
    }
  }, [user, testEmail]);

  // Preview modal state
  const [previewLog, setPreviewLog] = useState(null);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatus, setLogStatus] = useState('all'); // 'all' | 'sent' | 'retrying' | 'failed'
  const [logSearch, setLogSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, retrying: 0 });
  const [retryingId, setRetryingId] = useState(null);
  const [retryingAll, setRetryingAll] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('notification');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState('split'); // 'split' | 'editor' | 'preview'
  const [sendingPreviewEmail, setSendingPreviewEmail] = useState(false);

  // Dynamic sample data for real-time live preview
  const sampleDataMap = {
    notification: {
      title: 'Urgent Client Follow-up Required',
      lead_title: 'Enterprise ERP Implementation - Acme Corp',
      salesperson_name: user?.name || 'Alex Johnson',
      sender_name: 'Admin Sarah',
      message: 'Client mentioned budget sign-off is scheduled for this Friday. Please submit the revised proposal by tomorrow afternoon.',
      lead_url: '/leads/101',
    },
    daily_schedule: {
      salesperson_name: user?.name || 'Alex Johnson',
      date: new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      total_leads: '2',
      leads_table: `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; color: #475569; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 10px 12px;">Lead & Company</th>
            <th style="padding: 10px 12px;">Next Visit</th>
            <th style="padding: 10px 12px;">Closing Date</th>
            <th style="padding: 10px 12px;">Stage</th>
            <th style="padding: 10px 12px;">Priority</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">Acme Corp Cloud Expansion<div style="font-size: 11px; font-weight: normal; color: #64748b;">Acme Industries</div></td>
            <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">Tomorrow, 10:00 AM</td>
            <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">Nov 15, 2026</td>
            <td style="padding: 10px 12px; color: #475569;">Proposal Sent</td>
            <td style="padding: 10px 12px; text-transform: capitalize; color: #334155;">High</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">CyberSecurity Suite Upgrade<div style="font-size: 11px; font-weight: normal; color: #64748b;">Globex Logistics</div></td>
            <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">Oct 28, 2026</td>
            <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">Oct 31, 2026</td>
            <td style="padding: 10px 12px; color: #475569;">Negotiation</td>
            <td style="padding: 10px 12px; text-transform: capitalize; color: #334155;">Urgent</td>
          </tr>
        </tbody>
      </table>`,
    },
    test: {
      smtp_host: settings.smtp_host || 'smtp.hostinger.com',
      smtp_port: settings.smtp_port || '465',
      from_name: settings.from_name || 'SalesCRM Notifications',
      from_email: settings.from_email || settings.smtp_user || 'training1@amvionlabs.com',
      date: new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    closing_reminder: {
      salesperson_name: user?.name || 'Alex Johnson',
      lead_title: 'Enterprise ERP Implementation - Acme Corp',
      closing_date: 'Nov 15, 2026',
      stage_name: 'Proposal Sent',
      estimated_value: '$45,000 USD',
      customer_company: 'Acme Industries',
    },
  };

  const renderSample = (str, key) => {
    if (!str) return '';
    const vars = sampleDataMap[key] || {};
    return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, vKey) => {
      return vars[vKey] !== undefined ? vars[vKey] : match;
    });
  };

  const PLACEHOLDER_HELP = {
    '{{title}}': 'Push notification headline / title entered by admin',
    '{{lead_title}}': 'Title of the associated CRM lead (e.g. Acme Corp Cloud)',
    '{{salesperson_name}}': 'Full name of assigned salesperson',
    '{{sender_name}}': 'Admin who pushed the notification alert',
    '{{message}}': 'Message content entered in the push notification popup',
    '{{lead_url}}': 'Link to open the lead directly in CRM',
    '{{date}}': 'Current date and time of the email generation',
    '{{leads_table}}': 'HTML table listing leads with Next Visits & Closing Dates',
    '{{total_leads}}': 'Total count of pending leads for this salesperson',
    '{{smtp_host}}': 'Configured SMTP outgoing mail server host',
    '{{smtp_port}}': 'Configured SMTP port number (e.g. 465 or 587)',
    '{{from_name}}': 'Sender display name configured in mail settings',
    '{{from_email}}': 'Sender email address configured in mail settings',
    '{{closing_date}}': 'Lead target closing date',
    '{{stage_name}}': 'Current sales stage name',
    '{{estimated_value}}': 'Estimated deal revenue value',
    '{{customer_company}}': 'Customer company or account name',
  };

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await mailAPI.getSettings();
      if (res.data) {
        setSettings({
          ...res.data,
          smtp_secure: Boolean(res.data.smtp_secure),
          enable_daily_reminder: Boolean(res.data.enable_daily_reminder),
          enable_notification_mail: Boolean(res.data.enable_notification_mail),
          max_retries: res.data.max_retries || 3,
        });
      }
    } catch (err) {
      console.error('Error loading mail settings:', err);
      toast.error('Failed to load mail configuration');
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await mailAPI.getLogs({
        status: logStatus,
        search: logSearch,
        limit: 100,
      });
      setLogs(res.data || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Error loading mail logs:', err);
      toast.error('Failed to load mail delivery logs');
    } finally {
      setLogsLoading(false);
    }
  }, [logStatus, logSearch]);

  useEffect(() => {
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Fetch templates
  const fetchTemplates = useCallback(async (selectKey) => {
    setTemplatesLoading(true);
    try {
      const res = await mailAPI.getTemplates();
      if (res.data) {
        setTemplates(res.data);
        const targetKey = selectKey || selectedTemplateKey;
        const current = res.data.find((t) => t.template_key === targetKey) || res.data[0];
        if (current) {
          setSelectedTemplateKey(current.template_key);
          setEditSubject(current.subject);
          setEditBody(current.body_html);
          setEditIsActive(Boolean(current.is_active));
        }
      }
    } catch (err) {
      console.error('Error loading mail templates:', err);
      toast.error('Failed to load email templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, [selectedTemplateKey]);

  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) {
      fetchTemplates();
    }
  }, [activeTab, templates.length, fetchTemplates]);

  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    const tpl = templates.find((t) => t.template_key === key);
    if (tpl) {
      setEditSubject(tpl.subject);
      setEditBody(tpl.body_html);
      setEditIsActive(Boolean(tpl.is_active));
    }
  };

  const handleCopyPlaceholder = (ph) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(ph);
      toast.success(`Copied ${ph} to clipboard!`);
    }
  };

  const handleInsertPlaceholder = (ph) => {
    setEditBody((prev) => prev + ` ${ph}`);
    toast.success(`Appended ${ph} to email body`);
  };

  const handleSaveTemplate = async () => {
    if (!editSubject.trim()) {
      toast.error('Subject line is required');
      return;
    }
    if (!editBody.trim()) {
      toast.error('HTML body is required');
      return;
    }
    setTemplateSaving(true);
    try {
      await mailAPI.updateTemplate(selectedTemplateKey, {
        subject: editSubject.trim(),
        body_html: editBody,
        is_active: editIsActive,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.template_key === selectedTemplateKey
            ? { ...t, subject: editSubject.trim(), body_html: editBody, is_active: editIsActive }
            : t
        )
      );
      toast.success('Template saved successfully!');
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Restore this template to its default factory content? Any custom edits will be replaced.')) {
      return;
    }
    setTemplateSaving(true);
    try {
      const res = await mailAPI.resetTemplate(selectedTemplateKey);
      const updated = res.data?.data;
      if (updated) {
        setEditSubject(updated.subject);
        setEditBody(updated.body_html);
        setEditIsActive(Boolean(updated.is_active));
        setTemplates((prev) =>
          prev.map((t) => (t.template_key === selectedTemplateKey ? updated : t))
        );
      }
      toast.success('Template restored to factory default');
    } catch (err) {
      console.error('Error resetting template:', err);
      toast.error('Failed to reset template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleSendTemplateTest = async () => {
    const target = testEmail || user?.email;
    if (!target) {
      toast.error('Recipient email address is required');
      return;
    }
    setSendingPreviewEmail(true);
    try {
      const renderedSubject = renderSample(editSubject, selectedTemplateKey);
      const renderedHtml = renderSample(editBody, selectedTemplateKey);
      const res = await mailAPI.testMail({
        to_email: target,
        custom_subject: renderedSubject,
        custom_html: renderedHtml,
        template_key: selectedTemplateKey,
      });
      toast.success(res.message || `Test email sent to ${target}`);
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      console.error('Send template test error:', err);
      toast.error(err.response?.data?.message || 'Failed to send template test email');
    } finally {
      setSendingPreviewEmail(false);
    }
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await mailAPI.updateSettings(settings);
      toast.success('Mail configuration saved successfully');
      fetchSettings();
    } catch (err) {
      console.error('Save settings error:', err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Run test mail
  const handleSendTestMail = async (e) => {
    if (e) e.preventDefault();
    if (!testEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    setTestingMail(true);
    try {
      const res = await mailAPI.testMail({ to_email: testEmail });
      toast.success(res.message || 'Test email sent successfully!');
      setTestModalOpen(false);
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      console.error('Test mail error:', err);
      toast.error(err.response?.data?.message || err.message || 'Test email failed');
      if (activeTab === 'logs') fetchLogs();
    } finally {
      setTestingMail(false);
    }
  };

  // Trigger 9 AM check manually
  const handleRunDailyCheck = async () => {
    setRunningDaily(true);
    try {
      const res = await mailAPI.runDailyCheck();
      toast.success(res.message || 'Daily 9:00 AM lead reminder executed');
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      console.error('Daily check error:', err);
      toast.error(err.response?.data?.message || 'Failed to run daily reminder check');
    } finally {
      setRunningDaily(false);
    }
  };

  // Retry single log
  const handleRetryLog = async (id, e) => {
    if (e) e.stopPropagation();
    setRetryingId(id);
    try {
      const res = await mailAPI.retryLog(id);
      if (res.success) {
        toast.success('Email delivered successfully on retry!');
      } else {
        toast.error(`Retry attempt finished: ${res.data?.status || 'Failed'}`);
      }
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Retry failed');
      fetchLogs();
    } finally {
      setRetryingId(null);
    }
  };

  // Retry all pending
  const handleRetryAll = async () => {
    setRetryingAll(true);
    try {
      const res = await mailAPI.retryAll();
      toast.success(res.message || 'Retried pending emails');
      fetchLogs();
    } catch (err) {
      toast.error('Failed to retry all pending');
    } finally {
      setRetryingAll(false);
    }
  };

  // Delete log
  const handleDeleteLog = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await mailAPI.removeLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success('Log deleted');
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-gray-500">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-2 spin" />
          <p className="text-xs">Loading mail system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 w-full">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Mail Center
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Admin
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            SMTP setup, automated morning 9:00 AM lead reminders & 3-attempt fallback error tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRunDailyCheck}
            disabled={runningDaily}
            className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition inline-flex items-center gap-2 shadow-xs"
            title="Trigger morning 9:00 AM lead next visit and closing date check immediately"
          >
            <Clock size={14} className={runningDaily ? 'spin text-blue-600' : 'text-gray-500'} />
            {runningDaily ? 'Running 9:00 AM Check...' : 'Run 9:00 AM Check Now'}
          </button>

          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <Send size={14} />
            Send Test Email
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Settings size={15} />
          <span>Configuration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'templates'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText size={15} />
          <span>Mail Content & Templates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle size={15} />
          <span>Errors & Delivery Logs</span>
          {stats.failed + stats.retrying > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white">
              {stats.failed + stats.retrying}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 1: CONFIGURATION
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-5">
          {/* SMTP Credentials Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Server size={18} className="text-blue-600" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                  SMTP Server Credentials
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure the outgoing mail server for sending notifications and alerts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smtp.gmail.com or mail.yourcompany.com"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Port <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smtp_secure}
                      onChange={(e) => setSettings({ ...settings, smtp_secure: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-700">SSL/TLS (465)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  SMTP Username / Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. alerts@company.com"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  SMTP Password / App Password
                </label>
                <input
                  type="password"
                  placeholder="Enter SMTP password"
                  value={settings.smtp_pass}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Sender From Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. SalesCRM Notifications"
                  value={settings.from_name}
                  onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  From Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. notifications@company.com"
                  value={settings.from_email}
                  onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Automations & 3-Fallback Rules Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Clock size={18} className="text-indigo-600" />
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                  Automated Triggers & Fallback Rules
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure daily 9:00 AM checks, notification emails, and error retry limits
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Toggle 1: Notification push */}
              <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100/60 transition">
                <input
                  type="checkbox"
                  checked={settings.enable_notification_mail}
                  onChange={(e) => setSettings({ ...settings, enable_notification_mail: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">
                    Dispatch Email on Lead Notification Push
                  </span>
                  <span className="text-xs text-gray-500">
                    When an admin pushes a notification on a lead, automatically send an email alert to the assigned salesperson.
                  </span>
                </div>
              </label>

              {/* Toggle 2: Daily 9 AM Lead Reminder */}
              <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100/60 transition">
                <input
                  type="checkbox"
                  checked={settings.enable_daily_reminder}
                  onChange={(e) => setSettings({ ...settings, enable_daily_reminder: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">
                    Everyday Morning Lead Next Visit & Closing Date Email
                  </span>
                  <span className="text-xs text-gray-500">
                    Runs every morning to review all active leads with scheduled next visit dates or closing dates, sending digest emails to each salesperson.
                  </span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Daily Morning Schedule Time
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={settings.daily_reminder_time}
                    onChange={(e) => setSettings({ ...settings, daily_reminder_time: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">(Default: 09:00 AM)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Error Fallback Retries Limit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_retries}
                    onChange={(e) => setSettings({ ...settings, max_retries: parseInt(e.target.value) || 3 })}
                    className="w-24 h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-500">
                    Only 3 fallbacks permitted on delivery error before marking permanently failed.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2 shadow-sm"
            >
              <Check size={15} />
              {saving ? 'Saving...' : 'Save Mail Configuration'}
            </button>
          </div>

          {/* ── TEST EMAIL VERIFICATION CARD (After Configuration) ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-blue-600" />
                <div>
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">
                    Test Mail Delivery
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Send an instant test email using the configured SMTP server above
                  </p>
                </div>
              </div>
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md font-medium">
                Live Verification
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Send Test Email To:
                </label>
                <input
                  type="email"
                  placeholder="Enter recipient email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestMail}
                disabled={testingMail || !testEmail}
                className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition inline-flex items-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={13} className={testingMail ? 'spin' : ''} />
                {testingMail ? 'Verifying & Sending...' : 'Send Test Mail'}
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              * Tip: Remember to save your configuration changes above before running the test. Delivery logs and error details will be logged in the "Errors & Delivery Logs" tab.
            </p>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 2: MAIL CONTENT & TEMPLATES
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="flex flex-col gap-5 w-full">
          {/* Template Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                key: 'notification',
                name: 'Notification Content',
                tag: 'Lead Push Alert',
                desc: 'Alert sent when admin pushes a lead update to salesperson',
                icon: Bell,
                color: 'text-blue-600 bg-blue-50 border-blue-200',
              },
              {
                key: 'daily_schedule',
                name: 'Schedule Content',
                tag: 'Morning 09:00 AM',
                desc: 'Daily digest of active leads with upcoming visits & closing dates',
                icon: Calendar,
                color: 'text-amber-600 bg-amber-50 border-amber-200',
              },
              {
                key: 'test',
                name: 'Test Content',
                tag: 'SMTP Diagnostic',
                desc: 'Test email verifying outgoing SMTP server connectivity',
                icon: Server,
                color: 'text-purple-600 bg-purple-50 border-purple-200',
              },
              {
                key: 'closing_reminder',
                name: 'Closing Alert Content',
                tag: 'Pipeline Target',
                desc: 'Reminder when lead expected close date is due or pending',
                icon: Target,
                color: 'text-rose-600 bg-rose-50 border-rose-200',
              },
            ].map((t) => {
              const IconComp = t.icon;
              const isSelected = selectedTemplateKey === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleSelectTemplate(t.key)}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.color}`}>
                        <IconComp size={15} />
                      </div>
                      <span className="font-semibold text-xs text-gray-900">{t.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {t.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                    {t.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Template Details & Editor Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col gap-5">
            {/* Header with Title and Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-gray-900">
                    {templates.find((t) => t.template_key === selectedTemplateKey)?.name || 'Mail Template Editor'}
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    key: {selectedTemplateKey}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {templates.find((t) => t.template_key === selectedTemplateKey)?.description ||
                    'Customize the email subject, dynamic variables, and HTML layout'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  disabled={templateSaving}
                  className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Restore this template to factory default"
                >
                  <RotateCcw size={13} />
                  Reset to Default
                </button>

                <button
                  type="button"
                  onClick={handleSendTemplateTest}
                  disabled={sendingPreviewEmail || templateSaving}
                  className="h-8 px-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Send sample email with this template to test recipient"
                >
                  <Send size={13} className={sendingPreviewEmail ? 'spin' : ''} />
                  {sendingPreviewEmail ? 'Sending Test...' : 'Send Test of This Template'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={templateSaving}
                  className="h-8 px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Save size={13} className={templateSaving ? 'spin' : ''} />
                  {templateSaving ? 'Saving Changes...' : 'Save Template'}
                </button>
              </div>
            </div>

            {/* Subject Line Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Email Subject Line
                </label>
                <span className="text-[11px] text-gray-400">
                  Evaluated Subject Preview: <span className="font-medium text-gray-700">{renderSample(editSubject, selectedTemplateKey)}</span>
                </span>
              </div>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="e.g. [SalesCRM Alert] {{title}}"
                className="w-full h-9 px-3 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Dynamic Placeholders Toolbar */}
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Available Dynamic Variables (Click badge to copy or insert):</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  Values are automatically replaced when emails are dispatched
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  templates.find((t) => t.template_key === selectedTemplateKey)?.placeholders ||
                  '{{title}}, {{lead_title}}, {{salesperson_name}}, {{sender_name}}, {{message}}, {{date}}'
                )
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((placeholder) => {
                    const desc = PLACEHOLDER_HELP[placeholder] || 'Dynamic parameter';
                    return (
                      <div
                        key={placeholder}
                        className="group relative inline-flex items-center gap-1 bg-white border border-gray-200 hover:border-blue-400 rounded-md px-2 py-1 text-[11px] font-mono text-blue-700 shadow-2xs transition"
                        title={desc}
                      >
                        <button
                          type="button"
                          onClick={() => handleCopyPlaceholder(placeholder)}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Copy size={11} className="text-gray-400 group-hover:text-blue-500" />
                          <span>{placeholder}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertPlaceholder(placeholder)}
                          className="text-gray-300 hover:text-blue-600 pl-1 border-l border-gray-100 text-[10px]"
                          title="Append to body"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Body Editor & Live Preview Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Email Content & HTML Design
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Supports inline CSS styling for universal email client compatibility
                  </span>
                </div>

                {/* View Mode Switcher */}
                <div className="inline-flex items-center p-0.5 bg-gray-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('split')}
                    className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 ${
                      previewViewMode === 'split' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Layout size={12} />
                    <span>Split View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('editor')}
                    className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 ${
                      previewViewMode === 'editor' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Code size={12} />
                    <span>HTML Source</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('preview')}
                    className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 ${
                      previewViewMode === 'preview' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>

              {/* Editor + Preview Area */}
              <div
                className={`grid gap-4 ${
                  previewViewMode === 'split'
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {/* HTML Source Pane */}
                {(previewViewMode === 'split' || previewViewMode === 'editor') && (
                  <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-800 text-slate-300 px-3.5 py-2 text-xs font-mono flex items-center justify-between border-b border-slate-700">
                      <div className="flex items-center gap-2">
                        <Code size={13} className="text-blue-400" />
                        <span>body_html.html</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {editBody.length} characters
                      </span>
                    </div>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={22}
                      spellCheck={false}
                      placeholder="Enter raw HTML content with {{placeholders}}..."
                      className="w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                    />
                  </div>
                )}

                {/* Rendered Live Preview Pane */}
                {(previewViewMode === 'split' || previewViewMode === 'preview') && (
                  <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-xs">
                    {/* Simulated Email Client Header */}
                    <div className="bg-white border-b border-gray-200 p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          <span className="ml-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            Live Email Preview Mockup
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                          Auto-Evaluated
                        </span>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs flex flex-col gap-1 text-gray-700">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-semibold w-14">Subject:</span>
                          <span className="font-semibold text-gray-900">
                            {renderSample(editSubject, selectedTemplateKey) || '(Empty subject)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-semibold w-14">From:</span>
                          <span>
                            {settings.from_name || 'SalesCRM Notifications'}{' '}
                            <span className="text-gray-400">&lt;{settings.from_email || settings.smtp_user || 'training1@amvionlabs.com'}&gt;</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-semibold w-14">To:</span>
                          <span>
                            {user?.name || 'Alex Johnson'}{' '}
                            <span className="text-gray-400">&lt;{user?.email || 'alex@example.com'}&gt;</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rendered Email Body Canvas */}
                    <div className="p-4 overflow-y-auto max-h-[560px]">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[350px]">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderSample(editBody, selectedTemplateKey),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 3: ERRORS & DELIVERY LOGS ("errors and other things")
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Mails
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {stats.total}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                Sent Successfully
              </div>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                {stats.sent}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
                Retrying (Fallback &lt; 3)
              </div>
              <div className="text-xl font-bold text-amber-600 mt-1">
                {stats.retrying}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
                Delivery Errors / Failed
              </div>
              <div className="text-xl font-bold text-red-600 mt-1">
                {stats.failed}
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setLogStatus('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                  logStatus === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Logs
              </button>
              <button
                type="button"
                onClick={() => setLogStatus('sent')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                  logStatus === 'sent' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Delivered ({stats.sent})
              </button>
              <button
                type="button"
                onClick={() => setLogStatus('retrying')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                  logStatus === 'retrying' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Retrying ({stats.retrying})
              </button>
              <button
                type="button"
                onClick={() => setLogStatus('failed')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                  logStatus === 'failed' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Errors ({stats.failed})
              </button>
            </div>

            {/* Right Tools: Search & Retry All */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search recipient or error..."
                  className="w-full h-8 pl-8 pr-7 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {logSearch && (
                  <button
                    type="button"
                    onClick={() => setLogSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {stats.retrying > 0 && (
                <button
                  type="button"
                  onClick={handleRetryAll}
                  disabled={retryingAll}
                  className="h-8 px-2.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={13} className={retryingAll ? 'spin' : ''} />
                  Retry All Pending
                </button>
              )}

              <button
                type="button"
                onClick={fetchLogs}
                disabled={logsLoading}
                className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                title="Refresh logs"
              >
                <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Logs Table / Cards */}
          {logsLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 shadow-xs">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-2 spin" />
              <p className="text-xs font-medium">Loading mail delivery records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center gap-2 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <h3 className="text-xs font-semibold text-gray-700">No mail records found</h3>
              <p className="text-[11px] text-gray-400">
                {logStatus === 'failed'
                  ? 'Great! There are no delivery errors currently.'
                  : 'No emails logged for this filter.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Type & Subject</th>
                      <th className="py-2.5 px-3">Fallbacks</th>
                      <th className="py-2.5 px-3">Error Details</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {logs.map((log) => {
                      const isSent = log.status === 'sent';
                      const isRetrying = log.status === 'retrying';
                      const isFailed = log.status === 'failed';

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                          {/* Status */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isSent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check size={10} /> Sent
                              </span>
                            )}
                            {isRetrying && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <RotateCcw size={10} /> Retrying ({log.attempt_count}/{log.max_attempts})
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                <AlertTriangle size={10} /> Failed (3/3)
                              </span>
                            )}
                            {log.status === 'queued' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                                Queued
                              </span>
                            )}
                          </td>

                          {/* Recipient */}
                          <td className="py-2.5 px-3 font-medium text-gray-900">
                            <div>{log.recipient_email}</div>
                            {log.recipient_name && (
                              <div className="text-[11px] text-gray-400">{log.recipient_name}</div>
                            )}
                          </td>

                          {/* Subject & Type */}
                          <td className="py-2.5 px-3 max-w-xs">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9.5px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                {log.mail_type?.replace(/_/g, ' ')}
                              </span>
                              {log.lead_title && (
                                <span className="text-[9.5px] text-blue-600 truncate">
                                  Lead: {log.lead_title}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-gray-800 font-medium" title={log.subject}>
                              {log.subject}
                            </div>
                          </td>

                          {/* Attempts / Fallbacks */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                            {log.attempt_count} / {log.max_attempts}
                            {log.attempt_count >= log.max_attempts && isFailed && (
                              <span className="text-red-500 block text-[9.5px]">Max 3 reached</span>
                            )}
                          </td>

                          {/* Error Message */}
                          <td className="py-2.5 px-3 max-w-sm">
                            {log.error_message ? (
                              <div className="bg-red-50 text-red-700 text-[11px] p-1.5 rounded border border-red-100 font-mono break-words leading-tight">
                                {log.error_message}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">None</span>
                            )}
                          </td>

                          {/* Time */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-400 text-[11px]">
                            <div>{formatDate(log.created_at)}</div>
                            {log.sent_at && (
                              <div className="text-emerald-600 text-[10px]">
                                Delivered: {formatDate(log.sent_at)}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Retry button */}
                              {(!isSent) && (
                                <button
                                  type="button"
                                  onClick={(e) => handleRetryLog(log.id, e)}
                                  disabled={retryingId === log.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition"
                                  title="Retry sending this email"
                                >
                                  <RotateCcw size={10} className={retryingId === log.id ? 'spin' : ''} />
                                  Retry
                                </button>
                              )}

                              {/* View content */}
                              <button
                                type="button"
                                onClick={() => setPreviewLog(log)}
                                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                title="View Email Content"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLog(log.id, e)}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete Log"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEST EMAIL MODAL ── */}
      {testModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-200 overflow-hidden">
            <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Send size={15} className="text-blue-600" />
                <h3 className="text-xs font-bold text-gray-900">Send Test Email</h3>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSendTestMail} className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Will send an SMTP verification test to this email address.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  disabled={testingMail}
                  className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testingMail}
                  className="h-8 px-3.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5"
                >
                  <Send size={12} />
                  {testingMail ? 'Verifying...' : 'Send Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PREVIEW LOG MODAL ── */}
      {previewLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-gray-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="min-w-0 pr-2">
                <h3 className="text-xs font-bold text-gray-900 truncate">
                  {previewLog.subject}
                </h3>
                <p className="text-[10px] text-gray-500">
                  To: {previewLog.recipient_email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLog(null)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs flex flex-wrap gap-x-4 gap-y-1">
                <div><span className="text-gray-400">Status:</span> <strong>{previewLog.status}</strong></div>
                <div><span className="text-gray-400">Attempts:</span> <strong>{previewLog.attempt_count} / {previewLog.max_attempts}</strong></div>
                <div><span className="text-gray-400">Type:</span> <strong>{previewLog.mail_type}</strong></div>
              </div>

              {previewLog.error_message && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 text-xs text-red-700 font-mono">
                  <strong>Last Error:</strong> {previewLog.error_message}
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-3 bg-white text-xs leading-relaxed overflow-x-auto">
                {previewLog.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: previewLog.body_html }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-gray-800">
                    {previewLog.body_text}
                  </pre>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setPreviewLog(null)}
                className="h-7 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
