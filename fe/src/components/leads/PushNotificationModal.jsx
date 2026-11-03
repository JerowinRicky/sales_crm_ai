import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Send, X, BellRing, User, FileText } from 'lucide-react';

export default function PushNotificationModal({ isOpen, onClose, lead, usersList = [] }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (lead) {
      setSelectedUserId(lead.assigned_to ? String(lead.assigned_to) : '');
      setTitle(`Lead Update: ${lead.title || ''}`);
      setMessage('');
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const quickMessages = [
    'Please follow up with this lead urgently.',
    'Schedule a follow-up demo or meeting.',
    'Review proposal and update customer.',
  ];

  const handleSend = async (e) => {
    if (e) e.preventDefault();

    const targetUser = selectedUserId || lead.assigned_to;
    if (!targetUser) {
      toast.error('Please assign or select a user to receive this notification');
      return;
    }

    setSending(true);
    try {
      const res = await notificationsAPI.push({
        lead_id: lead.id,
        user_id: targetUser,
        title: title.trim() || `Lead Update: ${lead.title}`,
        message: message.trim(),
      });

      toast.success(res.message || 'Notification pushed successfully!');
      onClose();
    } catch (err) {
      console.error('Failed to push notification:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to push notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Compact Header */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BellRing size={15} />
            </div>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                Push Notification
              </h2>
              <p style={{ fontSize: 10.5, color: '#64748B', margin: '1px 0 0 0' }}>
                Notify salesperson immediately
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94A3B8',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Lead context badge */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 7,
                padding: '7px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Lead:
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', marginLeft: 5 }}>
                  {lead.title}
                </span>
              </div>
              {lead.stage_name && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 10,
                    background: `${lead.stage_color || '#2563EB'}18`,
                    color: lead.stage_color || '#2563EB',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {lead.stage_name}
                </span>
              )}
            </div>

            {/* Recipient User */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                <User size={12} color="#64748B" />
                Recipient (Salesperson)
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 9px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  color: '#1E293B',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="">-- Select Recipient --</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email || u.role_name || 'User'})
                    {lead.assigned_to === u.id ? ' [Assigned]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Title */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                <FileText size={12} color="#64748B" />
                Notification Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Lead Update: ${lead.title}`}
                style={{
                  width: '100%',
                  padding: '6px 9px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  color: '#1E293B',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Notification Message */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>
                  Message (Optional)
                </label>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>
                  Leave blank to send default
                </span>
              </div>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter instructions (or leave blank to send alert)..."
                style={{
                  width: '100%',
                  padding: '6px 9px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  color: '#1E293B',
                  background: '#FFFFFF',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />

              {/* Quick message chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                {quickMessages.map((qm, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMessage(qm)}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: '2px 6px',
                      fontSize: 10,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    + {qm}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compact Footer */}
          <div
            style={{
              padding: '9px 14px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#475569',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              style={{
                background: '#4F46E5',
                border: 'none',
                color: '#FFFFFF',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                opacity: sending ? 0.7 : 1,
              }}
            >
              <Send size={12} />
              {sending ? 'Sending...' : 'Send Push'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
