import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  User,
  Building2,
  FileText,
  Edit,
  CheckCircle2,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { callsAPI } from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';

const STATUS_STYLES = {
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
  Cancelled: 'bg-gray-100 text-gray-600 border-gray-200'
};

export default function CallDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    loadCall();
  }, [id]);

  const loadCall = async () => {
    try {
      setLoading(true);
      const response = await callsAPI.getById(id);
      const payload = response?.data ?? response;
      setCall(payload?.data ?? payload);
    } catch (error) {
      console.error('Load call error:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load call'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!call) return;

    try {
      setActionLoading(true);
      await callsAPI.update(call.id, {
        ...call,
        call_status: 'Completed',
        duration_minutes: call.duration_minutes || 0,
        duration_seconds: call.duration_seconds || 0
      });
      toast.success('Call marked as completed');
      await loadCall();
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || 'Failed to update call'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = () => {
    setShowMenu(false);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Call',
      message:
        'Are you sure you want to delete this call? This action cannot be undone.',
      onConfirm: handleDelete
    });
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await callsAPI.remove(call.id);
      toast.success('Call deleted successfully');
      navigate('/calls');
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || 'Failed to delete call'
      );
    } finally {
      setActionLoading(false);
      setConfirmModal({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
      });
    }
  };

  const formatDate = value => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = () => {
    if (!call) return '00:00';
    const minutes = String(call.duration_minutes || 0).padStart(2, '0');
    const seconds = String(call.duration_seconds || 0).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-[1250px] mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            Loading call...
          </div>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen  p-6">
        <div className="max-w-[1250px] mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Phone size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Call not found</p>
            <button
              onClick={() => navigate('/calls')}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
            >
              Back to Calls
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusClass =
    STATUS_STYLES[call.call_status] ||
    'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="min-h-screen  text-[#334155]">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1250px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/calls')}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <ArrowLeft size={19} />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {call.call_subject}
                  </h1>
                  <span
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium ${statusClass}`}
                  >
                    {call.call_status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Phone size={14} />
                  Call
                  <span>•</span>
                  {call.call_type}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {call.call_status !== 'Completed' &&
                call.call_status !== 'Cancelled' && (
                  <button
                    onClick={handleMarkCompleted}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={16} />
                    {actionLoading ? 'Updating...' : 'Mark as Completed'}
                  </button>
                )}

              <button
                onClick={() => navigate(`/calls/${call.id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(prev => !prev)}
                  className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <MoreVertical size={18} />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-11 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                      <button
                        onClick={openDeleteModal}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Delete Call
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-[1250px] mx-auto px-6 py-6">
        <div className="grid grid-cols-[1fr_310px] gap-6">
          {/* MAIN */}
          <div className="space-y-6">
            {/* CALL OVERVIEW */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader icon={<Phone size={17} />} title="Call Overview" />

              <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-6 py-6">
                <DetailRow label="Call Subject" value={call.call_subject} />
                <DetailRow label="Call Type" value={call.call_type} />
                <DetailRow label="Call Status" value={call.call_status} />
                <DetailRow
                  label="Start Time"
                  value={formatDate(call.start_time)}
                />
                <DetailRow label="Duration" value={formatDuration()} />
                <DetailRow
                  label="Call Purpose"
                  value={call.call_purpose || '-'}
                />
                <DetailRow
                  label="Call Result"
                  value={call.call_result || '-'}
                />
                <DetailRow
                  label="Reminder"
                  value={call.reminder || 'None'}
                />
              </div>
            </section>

            {/* ADDITIONAL INFORMATION */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader
                icon={<User size={17} />}
                title="Additional Information"
              />

              <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-6 py-6">
                <DetailRow
                  label="Call Owner"
                  value={call.call_owner_name || '-'}
                />
                <DetailRow
                  label="Call To"
                  value={call.call_to_name || '-'}
                />
                <DetailRow
                  label="Related To"
                  value={
                    call.related_name ||
                    (call.related_to_type && call.related_to_id
                      ? `${call.related_to_type} #${call.related_to_id}`
                      : '-')
                  }
                />
                <DetailRow
                  label="Created By"
                  value={call.created_by_name || '-'}
                />
                <DetailRow
                  label="Modified By"
                  value={call.modified_by_name || '-'}
                />
              </div>
            </section>

            {/* DESCRIPTION */}
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader
                icon={<FileText size={17} />}
                title="Description"
              />

              <div className="px-6 py-6">
                {call.description ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">
                    {call.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    No description added.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader title="Summary" />

              <div className="px-5 py-5 space-y-5">
                <SummaryItem
                  icon={<Calendar size={17} />}
                  label="Start Time"
                  value={formatDate(call.start_time)}
                />
                <SummaryItem
                  icon={<Clock size={17} />}
                  label="Duration"
                  value={formatDuration()}
                />
                <SummaryItem
                  icon={<User size={17} />}
                  label="Call Owner"
                  value={call.call_owner_name || '-'}
                />
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader title="Call Result" />

              <div className="px-5 py-5">
                <span className="inline-flex px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm">
                  {call.call_result || 'Not recorded'}
                </span>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader title="Reminder" />

              <div className="px-5 py-5">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Clock size={17} className="text-gray-500" />
                  <span>{call.reminder || 'None'}</span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SectionHeader title="Related Record" />

              <div className="px-5 py-5">
                {call.related_to_type ? (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      {call.related_to_type}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Building2 size={16} className="text-gray-500" />
                      <span>
                        {call.related_name || `#${call.related_to_id}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    No related record
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null
          })
        }
        loading={actionLoading}
      />
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
      {icon && <span className="text-gray-500">{icon}</span>}
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </div>
      <div className="text-sm text-gray-800">{value || '-'}</div>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div>
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="text-sm text-gray-800">{value || '-'}</div>
      </div>
    </div>
  );
}