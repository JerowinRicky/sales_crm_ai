import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { leadsAPI, activitiesAPI, customersAPI, usersAPI, productMasterAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ConfirmModal from "../components/common/ConfirmModal";
import PushNotificationModal from "../components/leads/PushNotificationModal";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  Tag,
  TrendingUp,
  Calendar,
  User,
  Plus,
  X,
  Clock,
  FileText,
  CheckCircle2,
  Globe,
  Package,
  Layers,
  FolderTree,
  RefreshCw,
  DollarSign,
  Activity,
  Check,
  Pencil,
  History,
  BellRing,
  CalendarClock,
  Trash2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

const SOURCES = {
  cold_call: "Cold Call",
  email: "Email",
  referral: "Referral",
  website: "Website",
  social_media: "Social Media",
  exhibition: "Exhibition",
  walk_in: "Walk-in",
  other: "Other",
};

const LEAD_TYPES = ["Existing Business", "New Business", "Renewal"];

const WEEKS = ["W1", "W2", "W3", "W4", "W5"];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const PRIORITY_COLOR = {
  low: "#6b7280",
  medium: "#d97706",
  high: "#dc2626",
  critical: "#7c3aed",
};

const TYPE_ICON = {
  call: Phone,
  email: Mail,
  meeting: User,
  demo: CheckCircle2,
  proposal: FileText,
  follow_up: Clock,
  note: FileText,
  task: CheckCircle2,
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy HH:mm");
  } catch {
    return "—";
  }
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return `₹${number.toLocaleString("en-IN")}`;
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return value;
};

const formatSource = (value) => {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [lead, setLead] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjacentLeads, setAdjacentLeads] = useState({ prev: null, next: null });
  const [showPushModal, setShowPushModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, loading: false });

  useEffect(() => {
    let prevFromSession = null;
    let nextFromSession = null;
    try {
      const raw = sessionStorage.getItem('leads_nav_ids');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const idx = list.findIndex(item => String(item.id) === String(id));
          if (idx !== -1) {
            if (idx > 0) prevFromSession = list[idx - 1];
            if (idx < list.length - 1) nextFromSession = list[idx + 1];
          }
        }
      }
    } catch (_) {}

    setAdjacentLeads({ prev: prevFromSession, next: nextFromSession });

    leadsAPI.getAdjacent(id)
      .then(res => {
        if (res.data?.data) {
          setAdjacentLeads(current => ({
            prev: prevFromSession || res.data.data.prev,
            next: nextFromSession || res.data.data.next,
          }));
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tagName = e.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tagName) || e.target?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft' && adjacentLeads.prev) {
        navigate(`/leads/${adjacentLeads.prev.id}`);
      } else if (e.key === 'ArrowRight' && adjacentLeads.next) {
        navigate(`/leads/${adjacentLeads.next.id}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjacentLeads, navigate]);

  const confirmDeleteLead = async () => {
    if (!lead) return;
    setDeleteModal({ isOpen: true, loading: true });
    try {
      await leadsAPI.remove(lead.id);
      toast.success('Lead deleted successfully');
      setDeleteModal({ isOpen: false, loading: false });
      navigate('/leads');
    } catch (err) {
      toast.error(err.message || 'Failed to delete lead');
      setDeleteModal({ isOpen: true, loading: false });
    }
  };

  const handleRestoreLead = async () => {
    if (!lead) return;
    try {
      await leadsAPI.restore(lead.id);
      toast.success('Lead restored successfully');
      loadLead();
    } catch (err) {
      toast.error(err.message || 'Failed to restore lead');
    }
  };

  const [customersList, setCustomersList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [domainsList, setDomainsList] = useState([]);

  const [editFieldModal, setEditFieldModal] = useState({
    isOpen: false,
    field: "",
    label: "",
    type: "text",
    options: [],
    value: "",
  });
  const [savingField, setSavingField] = useState(false);

  const [confirmStage, setConfirmStage] = useState({
    isOpen: false,
    toStage: null,
  });
  const [stageUpdating, setStageUpdating] = useState(false);
  const [showActModal, setShowActModal] = useState(false);

  const [actForm, setActForm] = useState({
    type: "call",
    title: "",
    description: "",
    scheduled_at: "",
    outcome: "",
  });

  useEffect(() => {
    load();
    loadMasterData();
  }, [id]);

  const loadMasterData = async () => {
    try {
      const [cRes, uRes, dRes] = await Promise.all([
        customersAPI.getAll({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        usersAPI.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        productMasterAPI.getDomains().catch(() => ({ data: [] })),
      ]);
      setCustomersList(cRes?.data || []);
      setUsersList(uRes?.data || []);
      setDomainsList(dRes?.data || []);
    } catch (e) {
      console.error("Failed to load master data for inline editing:", e);
    }
  };

  const openEditModal = (fieldName, label, type, options = null) => {
    let currentValue = lead ? (lead[fieldName] ?? "") : "";
    if (type === "date" && currentValue) {
      try {
        currentValue = new Date(currentValue).toISOString().split("T")[0];
      } catch {
        // keep as is
      }
    }
    setEditFieldModal({
      isOpen: true,
      field: fieldName,
      label,
      type,
      options,
      value: currentValue,
    });
  };

  const handleSaveField = async (e) => {
    if (e) e.preventDefault();
    if (!editFieldModal.field) return;

    setSavingField(true);
    try {
      let val = editFieldModal.value;
      if (editFieldModal.type === "number") {
        val = val === "" || val === null ? null : Number(val);
      } else if (typeof val === "string") {
        val = val.trim();
        if (val === "") val = null;
      }

      await leadsAPI.update(id, {
        [editFieldModal.field]: val,
      });

      toast.success(`${editFieldModal.label} updated successfully`);
      setEditFieldModal({
        isOpen: false,
        field: "",
        label: "",
        type: "text",
        options: [],
        value: "",
      });
      await load();
    } catch (error) {
      console.error("Update single field error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          `Failed to update ${editFieldModal.label}`
      );
    } finally {
      setSavingField(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [leadResponse, stagesResponse] = await Promise.all([
        leadsAPI.getById(id),
        leadsAPI.getStages(),
      ]);
      const leadData = leadResponse?.data || null;
      const stagesData = stagesResponse?.data || [];
      setLead(leadData);
      setStages(stagesData);
    } catch (error) {
      console.error("Load lead error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load lead"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStageClick = (stage) => {
    if (!stage || Number(stage.id) === Number(lead?.stage_id)) return;
    setConfirmStage({
      isOpen: true,
      toStage: stage,
    });
  };

  const confirmStageChange = async () => {
    const { toStage } = confirmStage;
    if (!toStage) return;
    try {
      setStageUpdating(true);
      await leadsAPI.updateStage(id, { stage_id: toStage.id });
      toast.success(`Stage updated to "${toStage.name}"`);
      setConfirmStage({ isOpen: false, toStage: null });
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update stage"
      );
    } finally {
      setStageUpdating(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await activitiesAPI.create({ ...actForm, lead_id: parseInt(id, 10) });
      toast.success("Activity logged");
      setShowActModal(false);
      setActForm({
        type: "call",
        title: "",
        description: "",
        scheduled_at: "",
        outcome: "",
      });
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to log activity"
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <div className="text-gray-500">Loading lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
        <h3 className="text-lg font-medium text-gray-700">Lead not found</h3>
        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  const products = Array.isArray(lead.products) ? lead.products : [];
  const isPOScheduled =
    Number(lead?.stage_id) === 11 ||
    lead?.stage_name?.toLowerCase().includes("po scheduled") ||
    stages.some(
      (s) =>
        Number(s.id) === Number(lead?.stage_id) &&
        (s.name?.toLowerCase().includes("po scheduled") ||
          s.code?.toLowerCase().includes("po_scheduled"))
    );
  const rescheduleHistory = (lead?.edit_history || []).filter(
    (item) => item.field_name === "rescheduled_week"
  );

  return (
    <div className="p-6 flex flex-col gap-5">
      {/* ==================== HEADER ==================== */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/leads")}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={15} />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="group inline-flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {lead.title}
                </h1>
                <button
                  type="button"
                  onClick={() => openEditModal('title', 'Lead Name', 'text')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit Lead Name"
                >
                  <Pencil size={15} />
                </button>
              </div>

              {lead.stage_name && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: `${lead.stage_color || "#2563EB"}15`,
                    color: lead.stage_color || "#2563EB",
                  }}
                >
                  {lead.stage_name}
                </span>
              )}
              <div className="group inline-flex items-center gap-1">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize cursor-pointer hover:opacity-90 transition"
                  style={{
                    background: `${
                      PRIORITY_COLOR[lead.priority || "medium"] || "#6b7280"
                    }15`,
                    color: PRIORITY_COLOR[lead.priority || "medium"] || "#6b7280",
                  }}
                  onClick={() => openEditModal('priority', 'Priority', 'select', PRIORITIES)}
                  title="Click to edit Priority"
                >
                  {lead.priority || "medium"}
                </span>
                <button
                  type="button"
                  onClick={() => openEditModal('priority', 'Priority', 'select', PRIORITIES)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                  title="Edit Priority"
                >
                  <Pencil size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  openEditModal(
                    'customer_id',
                    'Customer',
                    'select',
                    customersList.map((c) => ({ value: c.id, label: c.company_name }))
                  )
                }
                className="group inline-flex items-center gap-1.5 hover:text-blue-600 transition text-left"
                title="Edit Customer"
              >
                <Building2 size={13} className="text-gray-400 group-hover:text-blue-600" />
                <span>{lead.customer_company || lead.company_name || "No customer"}</span>
                <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
              </button>
              <span className="text-gray-300">·</span>
              <span>Created {formatDate(lead.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Previous Lead / Next Lead navigation */}
          <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden h-9">
            <button
              type="button"
              disabled={!adjacentLeads.prev}
              onClick={() => adjacentLeads.prev && navigate(`/leads/${adjacentLeads.prev.id}`)}
              className="inline-flex items-center gap-1.5 px-3 h-full text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition border-r border-gray-200 cursor-pointer"
              title={adjacentLeads.prev ? `Previous: ${adjacentLeads.prev.title}` : "No previous lead"}
            >
              <ChevronLeft size={16} />
              <span>Previous Lead</span>
            </button>
            <button
              type="button"
              disabled={!adjacentLeads.next}
              onClick={() => adjacentLeads.next && navigate(`/leads/${adjacentLeads.next.id}`)}
              className="inline-flex items-center gap-1.5 px-3 h-full text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title={adjacentLeads.next ? `Next: ${adjacentLeads.next.title}` : "No next lead"}
            >
              <span>Next Lead</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {isAdmin && (
            <>
              {lead.is_active === 0 || lead.is_active === false ? (
                <button
                  type="button"
                  onClick={handleRestoreLead}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-sm font-medium transition cursor-pointer"
                  title="Restore deleted lead"
                >
                  <RotateCcw size={15} />
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: true, loading: false })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 text-sm font-medium transition cursor-pointer"
                  title="Delete lead"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPushModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition"
                title="Push notification to assigned user"
              >
                <BellRing size={15} />
                Push
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowActModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition"
          >
            <Plus size={15} />
            Log Activity
          </button>
        </div>
      </div>

      {/* Delete Lead Confirmation */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.title}"? Once deleted, this lead will be hidden and will not be displayed to anyone.`}
        confirmText="Delete Lead"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDeleteLead}
        onCancel={() => setDeleteModal({ isOpen: false, loading: false })}
        loading={deleteModal.loading}
      />

      {/* Deleted Lead Warning Banner */}
      {(lead.is_active === 0 || lead.is_active === false) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>This lead has been deleted and is hidden from standard views and normal users.</span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleRestoreLead}
              className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            >
              Restore Lead
            </button>
          )}
        </div>
      )}

      {/* ==================== PIPELINE PROGRESS (ARROW BUTTONS) ==================== */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Pipeline Progress
            </h2>
            <span className="text-xs text-gray-400">
              · Click any stage to move lead
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {lead.probability !== undefined && (
              <span>
                Win Probability:{" "}
                <span className="text-gray-900 font-semibold">
                  {lead.probability || 0}%
                </span>
              </span>
            )}
            {lead.stage_name && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                Current: <strong className="font-semibold">{lead.stage_name}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="w-full pt-1 pb-1">
          <div className="flex items-center w-full">
            {stages.map((stage, idx, arr) => {
              const isCurrent = Number(stage.id) === Number(lead.stage_id);
              const currentIdx = arr.findIndex(
                (s) => Number(s.id) === Number(lead.stage_id)
              );
              const isPast = currentIdx !== -1 && idx < currentIdx;

              // 8px arrow depth. Combined with marginLeft: -6px, gives an exact 2px parallel gap
              const clipPath =
                idx === 0
                  ? "polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)"
                  : "polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%, 8px 50%)";

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleStageClick(stage)}
                  disabled={isCurrent || stageUpdating}
                  title={
                    isCurrent
                      ? `Current Stage: ${stage.name}`
                      : `Click to move to ${stage.name}`
                  }
                  style={{
                    clipPath,
                    marginLeft: idx === 0 ? 0 : "-6px",
                    zIndex: isCurrent ? 5 : 1,
                    backgroundColor: isCurrent ? stage.color || "#2563EB" : undefined,
                  }}
                  className={`relative flex-1 min-w-0 h-8 flex items-center justify-center gap-1.5 text-[11px] font-medium transition-all duration-150 select-none ${
                    idx === 0 ? "pl-2 pr-2.5" : "pl-3 pr-2.5"
                  } ${
                    isCurrent
                      ? "text-white font-semibold shadow-sm cursor-default"
                      : isPast
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:z-10 cursor-pointer"
                      : stage.is_won
                      ? "bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 hover:z-10 cursor-pointer"
                      : stage.is_closed
                      ? "bg-rose-50/70 text-rose-700 hover:bg-rose-100 hover:z-10 cursor-pointer"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:z-10 cursor-pointer"
                  }`}
                >
                  {isCurrent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
                  ) : isPast ? (
                    <Check
                      size={10}
                      className="text-emerald-600 stroke-[3] flex-shrink-0"
                    />
                  ) : stage.is_won ? (
                    <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                  ) : stage.is_closed ? (
                    <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                  ) : null}

                  <span className="truncate">
                    {stage.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== DATES (FULL WIDTH BOX) ==================== */}
      <div className="w-full bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 gap-4 sm:gap-6">
          {/* Created Date */}
          <div className="flex items-center gap-3.5 sm:pr-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Calendar size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Created Date
              </div>
              <div className="text-base font-semibold text-gray-900 mt-0.5">
                {formatDate(lead.created_at)}
              </div>
            </div>
          </div>

          {/* Closing Date */}
          <div
            onClick={() => openEditModal('expected_close_date', 'Closing Date', 'date')}
            className="group flex items-center justify-between gap-3.5 sm:pl-6 pt-3 sm:pt-0 cursor-pointer rounded-lg hover:bg-blue-50/50 transition p-2 -m-2"
            title="Click to edit Closing Date"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span>Closing Date</span>
                  <span className="text-[10px] text-gray-400 font-normal lowercase">(expected)</span>
                </div>
                <div className="mt-0.5">
                  {lead.expected_close_date ? (
                    <span className="text-base font-semibold text-gray-900">
                      {formatDate(lead.expected_close_date)}
                    </span>
                  ) : (
                    <span className="text-sm text-blue-600 font-medium hover:underline">
                      + Set closing date
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal('expected_close_date', 'Closing Date', 'date');
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-md flex-shrink-0"
              title="Edit Closing Date"
            >
              <Pencil size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MAIN GRID ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ============ LEFT: LEAD INFO (2 cols) ============ */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Lead Information */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Lead Information
              </h2>
              <span className="text-[11px] text-gray-400">
                Hover field to edit
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow
                icon={FileText}
                label="Lead Name"
                value={lead.title}
                onEdit={() => openEditModal('title', 'Lead Name', 'text')}
              />
              <InfoRow
                icon={Building2}
                label="Customer"
                value={lead.customer_company || lead.company_name}
                onEdit={() =>
                  openEditModal(
                    'customer_id',
                    'Customer',
                    'select',
                    customersList.map((c) => ({ value: c.id, label: c.company_name }))
                  )
                }
              />
              <InfoRow
                icon={User}
                label="Contact Name"
                value={lead.contact_name}
                onEdit={() => openEditModal('contact_name', 'Contact Name', 'text')}
              />
              <InfoRow
                icon={Phone}
                label="Contact Phone"
                value={lead.contact_phone || lead.customer_phone}
                onEdit={() => openEditModal('contact_phone', 'Contact Phone', 'tel')}
              />
              <InfoRow
                icon={Mail}
                label="Contact Email"
                value={lead.contact_email || lead.customer_email}
                onEdit={() => openEditModal('contact_email', 'Contact Email', 'email')}
              />
              <InfoRow
                icon={User}
                label="Lead Owner"
                value={lead.assigned_to_name || lead.lead_owner_name}
                onEdit={() =>
                  openEditModal(
                    'assigned_to',
                    'Lead Owner',
                    'select',
                    usersList.map((u) => ({ value: u.id, label: u.name }))
                  )
                }
              />
              <InfoRow
                icon={Tag}
                label="Lead Type"
                value={lead.lead_type}
                onEdit={() =>
                  openEditModal(
                    'lead_type',
                    'Lead Type',
                    'select',
                    LEAD_TYPES.map((t) => ({ value: t, label: t }))
                  )
                }
              />
              <InfoRow
                icon={Globe}
                label="Domain"
                value={lead.domain_name || lead.domain}
                onEdit={() =>
                  openEditModal(
                    'domain_id',
                    'Domain',
                    'select',
                    domainsList.map((d) => ({ value: d.id, label: d.name }))
                  )
                }
              />
              <InfoRow
                icon={Tag}
                label="Deal Source"
                value={formatSource(lead.source)}
                onEdit={() =>
                  openEditModal(
                    'source',
                    'Deal Source',
                    'select',
                    Object.entries(SOURCES).map(([k, v]) => ({ value: k, label: v }))
                  )
                }
              />
              <InfoRow
                icon={DollarSign}
                label="Amount"
                value={formatCurrency(lead.estimated_value || lead.amount)}
                onEdit={() => openEditModal('estimated_value', 'Amount', 'number')}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Schedule
              </h2>
              <span className="text-[11px] text-gray-400">
                Hover field to edit
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow
                icon={Calendar}
                label="Closing Date"
                value={formatDate(lead.expected_close_date)}
                onEdit={() => openEditModal('expected_close_date', 'Closing Date', 'date')}
              />
              <InfoRow
                icon={Calendar}
                label="Next Visit"
                value={formatDateTime(lead.next_visit)}
                onEdit={() => openEditModal('next_visit', 'Next Visit Date', 'date')}
              />
              <InfoRow
                icon={Calendar}
                label="Actual Scheduled Week"
                value={lead.actual_scheduled_week}
                onEdit={() =>
                  openEditModal(
                    'actual_scheduled_week',
                    'Actual Scheduled Week',
                    'select',
                    WEEKS.map((w) => ({ value: w, label: w }))
                  )
                }
              />
              <InfoRow
                icon={RefreshCw}
                label="Re-Scheduled Week"
                value={lead.rescheduled_week}
                onEdit={() =>
                  openEditModal(
                    'rescheduled_week',
                    'Re-Scheduled Week',
                    'select',
                    WEEKS.map((w) => ({ value: w, label: w }))
                  )
                }
              />
            </div>
          </div>

          {/* Product Information */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={15} className="text-gray-500" />
              Product Information
            </h2>

            {products.length > 0 ? (
              <div className="flex flex-col gap-3">
                {products.map((product, index) => (
                  <div
                    key={product.id || index}
                    className="p-4 border border-gray-100 rounded-lg bg-gray-50"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <InfoRow
                        icon={Package}
                        label="Product Name"
                        value={product.product_name || product.name}
                        editable={false}
                      />
                      <InfoRow
                        icon={Globe}
                        label="Product Domain"
                        value={product.domain_name || product.product_domain}
                        editable={false}
                      />
                      <InfoRow
                        icon={Layers}
                        label="Product Sub Domain"
                        value={
                          product.subdomain_name || product.product_subdomain
                        }
                        editable={false}
                      />
                      <InfoRow
                        icon={FolderTree}
                        label="Product Category"
                        value={product.category || product.product_category}
                        editable={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-lg">
                No product information added.
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white border rounded-lg p-5 group">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Description
              </h2>
              <button
                type="button"
                onClick={() => openEditModal('description', 'Description', 'textarea')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded text-xs flex items-center gap-1 font-medium"
                title="Edit Description"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
            {lead.description ? (
              <p
                onClick={() => openEditModal('description', 'Description', 'textarea')}
                className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap p-2 -m-2 rounded hover:bg-gray-50/70 cursor-pointer transition"
              >
                {lead.description}
              </p>
            ) : (
              <p
                onClick={() => openEditModal('description', 'Description', 'textarea')}
                className="text-xs text-gray-400 italic hover:text-blue-600 cursor-pointer p-1"
              >
                + Click to add description...
              </p>
            )}
          </div>

          {/* On Hold Reason */}
          <div className="bg-white border rounded-lg p-5 group">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-amber-700">
                On Hold Reason
              </h2>
              <button
                type="button"
                onClick={() => openEditModal('on_hold_reason', 'On Hold Reason', 'textarea')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded text-xs flex items-center gap-1 font-medium"
                title="Edit On Hold Reason"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
            {lead.on_hold_reason ? (
              <div
                onClick={() => openEditModal('on_hold_reason', 'On Hold Reason', 'textarea')}
                className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 leading-relaxed cursor-pointer hover:bg-amber-100/60 transition"
              >
                {lead.on_hold_reason}
              </div>
            ) : (
              <p
                onClick={() => openEditModal('on_hold_reason', 'On Hold Reason', 'textarea')}
                className="text-xs text-gray-400 italic hover:text-amber-700 cursor-pointer p-1"
              >
                + Click to add on hold reason...
              </p>
            )}
          </div>

          {/* Won / Lost Reason */}
          <div className="bg-white border rounded-lg p-5 group">
            <div className="flex items-center justify-between mb-3">
              <h2
                className={`text-sm font-semibold ${
                  lead.won_reason ? "text-emerald-700" : "text-gray-900"
                }`}
              >
                {lead.won_reason ? "Won Reason" : lead.lost_reason ? "Lost Reason" : "Closing Note / Reason"}
              </h2>
              <button
                type="button"
                onClick={() =>
                  openEditModal(
                    lead.won_reason ? "won_reason" : "lost_reason",
                    lead.won_reason ? "Won Reason" : "Lost Reason",
                    "textarea"
                  )
                }
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded text-xs flex items-center gap-1 font-medium"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
            {lead.won_reason || lead.lost_reason ? (
              <p
                onClick={() =>
                  openEditModal(
                    lead.won_reason ? "won_reason" : "lost_reason",
                    lead.won_reason ? "Won Reason" : "Lost Reason",
                    "textarea"
                  )
                }
                className="text-sm text-gray-700 leading-relaxed p-2 -m-2 rounded hover:bg-gray-50/70 cursor-pointer transition"
              >
                {lead.won_reason || lead.lost_reason}
              </p>
            ) : (
              <p
                onClick={() =>
                  openEditModal(
                    "won_reason",
                    "Won / Lost Reason",
                    "textarea"
                  )
                }
                className="text-xs text-gray-400 italic hover:text-blue-600 cursor-pointer p-1"
              >
                + Click to add closing reason...
              </p>
            )}
          </div>
        </div>

        {/* ============ RIGHT: SUMMARY, ACTIVITIES, HISTORY ============ */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Activities */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={15} className="text-gray-500" />
                Activities ({lead.activities?.length || 0})
              </h2>
              <button
                type="button"
                onClick={() => setShowActModal(true)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Add
              </button>
            </div>

            {lead.activities?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-5">
                <Clock size={32} className="text-gray-300 mb-2" />
                <h4 className="text-sm font-medium text-gray-700">
                  No activities yet
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Log a call, meeting, or note
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                {lead.activities.map((activity, index) => {
                  const Icon = TYPE_ICON[activity.type] || FileText;
                  return (
                    <div
                      key={activity.id}
                      className={`px-5 py-3.5 flex items-start gap-3 ${
                        index < lead.activities.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </div>
                        {activity.description && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {activity.description}
                          </div>
                        )}
                        {activity.outcome && (
                          <div className="text-xs text-blue-600 font-medium mt-1">
                            Outcome: {activity.outcome}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Change History (Field-level audit trail) */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Change History ({lead.edit_history?.length || 0})
              </h2>
              <span className="text-[11px] text-gray-400">Audit trail</span>
            </div>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {!lead.edit_history || lead.edit_history.length === 0 ? (
                <div className="text-xs text-gray-400 py-3 text-center">
                  No edit changes recorded yet.
                </div>
              ) : (
                lead.edit_history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/70 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {item.changed_by_name || "User"}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        {formatDateTime(item.changed_at)}
                      </span>
                    </div>
                    <div className="text-gray-600 mb-1">
                      Changed <span className="font-semibold text-gray-800">{item.field_label || item.field_name}</span>:
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap bg-white p-2 rounded border border-gray-100">
                      <span
                        className="text-rose-600 line-through max-w-[180px] truncate"
                        title={item.old_value || "(empty)"}
                      >
                        {item.old_value || <span className="italic text-gray-400 font-normal">(empty)</span>}
                      </span>
                      <span className="text-gray-400 font-bold">→</span>
                      <span
                        className="text-emerald-700 font-medium max-w-[180px] truncate"
                        title={item.new_value || "(empty)"}
                      >
                        {item.new_value || <span className="italic text-gray-400 font-normal">(empty)</span>}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reschedule History (PO Scheduled Week Changes) */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CalendarClock size={16} className="text-amber-600" />
                Reschedule History ({isPOScheduled ? rescheduleHistory.length : 0})
              </h2>
              {isPOScheduled ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  PO Scheduled
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  {lead.stage_name || ""}
                </span>
              )}
            </div>

            {isPOScheduled ? (
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                {rescheduleHistory.length === 0 ? (
                  <div className="text-xs text-gray-400 py-3 text-center">
                    No reschedule changes recorded yet.
                  </div>
                ) : (
                  rescheduleHistory.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-2.5 rounded-lg border border-amber-100 bg-amber-50/40 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {item.changed_by_name || "User"}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {formatDateTime(item.changed_at)}
                        </span>
                      </div>
                      <div className="text-gray-600 mb-1 flex items-center justify-between">
                        <span>Rescheduled Week:</span>
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                          #{rescheduleHistory.length - index} Reschedule
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap bg-white p-2 rounded border border-amber-100">
                        <span
                          className="text-rose-600 line-through font-medium"
                          title={item.old_value || "(empty)"}
                        >
                          {item.old_value || <span className="italic text-gray-400 font-normal">(empty)</span>}
                        </span>
                        <span className="text-amber-600 font-bold">→</span>
                        <span
                          className="text-emerald-700 font-semibold"
                          title={item.new_value || "(empty)"}
                        >
                          {item.new_value || <span className="italic text-gray-400 font-normal">(empty)</span>}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                Reschedule history is only displayed when status is PO Scheduled.
              </div>
            )}
          </div>

          {/* History (Stage Movement & Transitions) */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <History size={16} className="text-indigo-600" />
                History (
                {lead.history?.filter(
                  (h) =>
                    h.field_changed !== "stage" ||
                    (h.new_value && h.new_value !== "null")
                ).length || 0}
                )
              </h2>
              <span className="text-[11px] text-gray-400">Stage timeline</span>
            </div>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {!lead.history ||
              lead.history.filter(
                (h) =>
                  h.field_changed !== "stage" ||
                  (h.new_value && h.new_value !== "null")
              ).length === 0 ? (
                <div className="text-xs text-gray-400 py-3 text-center">
                  No stage history recorded yet.
                </div>
              ) : (
                lead.history
                  .filter(
                    (h) =>
                      h.field_changed !== "stage" ||
                      (h.new_value && h.new_value !== "null")
                  )
                  .map((history) => (
                    <div
                      key={history.id}
                      className="flex gap-3 text-xs p-2 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-700 leading-relaxed">
                          <strong className="text-gray-900">
                            {history.changed_by_name || "User"}
                          </strong>{" "}
                          {history.field_changed === "stage"
                            ? history.old_value
                              ? `moved stage from "${history.old_value}" to "${history.new_value}"`
                              : `moved stage to "${history.new_value}"`
                            : history.note || `updated ${history.field_changed}`}
                        </div>
                        <div className="text-gray-400 mt-0.5 text-[11px]">
                          {formatDateTime(history.changed_at)}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== STAGE CHANGE CONFIRM MODAL ==================== */}
      <ConfirmModal
        isOpen={confirmStage.isOpen}
        title={
          confirmStage.toStage?.is_won
            ? `Mark Lead as Won (${confirmStage.toStage?.name})`
            : confirmStage.toStage?.is_closed
            ? `Mark Lead as Lost (${confirmStage.toStage?.name})`
            : `Move to "${confirmStage.toStage?.name}"`
        }
        message={
          confirmStage.toStage
            ? `Are you sure you want to move "${lead.title}" from "${
                lead.stage_name || "Current Stage"
              }" to "${confirmStage.toStage.name}"?`
            : ""
        }
        confirmText={
          confirmStage.toStage?.is_won
            ? "Confirm Won"
            : confirmStage.toStage?.is_closed
            ? "Confirm Lost"
            : "Change Stage"
        }
        cancelText="Cancel"
        variant={
          confirmStage.toStage?.is_won
            ? "primary"
            : confirmStage.toStage?.is_closed
            ? "danger"
            : "primary"
        }
        onConfirm={confirmStageChange}
        onCancel={() =>
          !stageUpdating && setConfirmStage({ isOpen: false, toStage: null })
        }
        loading={stageUpdating}
      />

      {/* ==================== ACTIVITY MODAL ==================== */}
      {showActModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowActModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Log Activity
              </h2>
              <button
                type="button"
                onClick={() => setShowActModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddActivity}>
              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Type *
                    </label>
                    <select
                      value={actForm.type}
                      onChange={(e) =>
                        setActForm((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[
                        "call",
                        "email",
                        "meeting",
                        "demo",
                        "proposal",
                        "follow_up",
                        "note",
                        "task",
                      ].map((type) => (
                        <option key={type} value={type}>
                          {type
                            .replace("_", " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Scheduled At
                    </label>
                    <input
                      type="datetime-local"
                      value={actForm.scheduled_at}
                      onChange={(e) =>
                        setActForm((prev) => ({
                          ...prev,
                          scheduled_at: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title *
                  </label>
                  <input
                    required
                    value={actForm.title}
                    onChange={(e) =>
                      setActForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Activity title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={actForm.description}
                    onChange={(e) =>
                      setActForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What happened?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Outcome
                  </label>
                  <textarea
                    rows={2}
                    value={actForm.outcome}
                    onChange={(e) =>
                      setActForm((prev) => ({
                        ...prev,
                        outcome: e.target.value,
                      }))
                    }
                    placeholder="Result / next action"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowActModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SINGLE FIELD EDIT MODAL ==================== */}
      {editFieldModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Pencil size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Edit {editFieldModal.label}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Update this single field
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditFieldModal({
                    isOpen: false,
                    field: "",
                    label: "",
                    type: "text",
                    options: [],
                    value: "",
                  })
                }
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveField} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {editFieldModal.label}
                </label>

                {editFieldModal.type === "textarea" ? (
                  <textarea
                    autoFocus
                    rows={4}
                    value={editFieldModal.value || ""}
                    onChange={(e) =>
                      setEditFieldModal((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${editFieldModal.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                  />
                ) : editFieldModal.type === "select" ? (
                  <select
                    autoFocus
                    value={editFieldModal.value || ""}
                    onChange={(e) =>
                      setEditFieldModal((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Select {editFieldModal.label.toLowerCase()}</option>
                    {editFieldModal.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    autoFocus
                    type={editFieldModal.type || "text"}
                    step={editFieldModal.type === "number" ? "any" : undefined}
                    min={editFieldModal.type === "number" ? "0" : undefined}
                    value={editFieldModal.value ?? ""}
                    onChange={(e) =>
                      setEditFieldModal((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${editFieldModal.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={savingField}
                  onClick={() =>
                    setEditFieldModal({
                      isOpen: false,
                      field: "",
                      label: "",
                      type: "text",
                      options: [],
                      value: "",
                    })
                  }
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingField}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
                >
                  {savingField ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Push Notification Modal (Admin Only) */}
      {isAdmin && (
        <PushNotificationModal
          isOpen={showPushModal}
          onClose={() => setShowPushModal(false)}
          lead={lead}
          usersList={usersList}
        />
      )}
    </div>
  );
}

/* =========================================================
 * Reusable Info Row (compact with hover edit icon)
 * ========================================================= */
function InfoRow({ icon: Icon, label, value, onEdit, editable = true }) {
  return (
    <div
      onClick={editable && onEdit ? onEdit : undefined}
      className={`group relative flex items-start justify-between p-2.5 -m-2.5 rounded-lg transition ${
        editable && onEdit ? "hover:bg-blue-50/50 cursor-pointer" : ""
      }`}
    >
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          <Icon size={12} className="text-gray-400" />
          {label}
        </div>
        <div className="text-sm font-medium text-gray-900 break-words">
          {displayValue(value)}
        </div>
      </div>
      {editable && onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-100 flex-shrink-0"
          title={`Edit ${label}`}
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}

