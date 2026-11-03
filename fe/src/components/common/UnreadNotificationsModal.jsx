import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, X, Check, ExternalLink, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function UnreadNotificationsModal() {
  const { unreadNotifications, showLoginPopup, closeLoginPopup, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  const totalPages = Math.max(1, Math.ceil((unreadNotifications?.length || 0) / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const displayedNotifications = useMemo(() => {
    if (!unreadNotifications) return [];
    const start = (currentPage - 1) * pageSize;
    return unreadNotifications.slice(start, start + pageSize);
  }, [unreadNotifications, currentPage, pageSize]);

  if (!showLoginPopup || unreadNotifications.length === 0) {
    return null;
  }

  const handleNavigateToLead = (link) => {
    closeLoginPopup();
    if (link) {
      navigate(link);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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
          maxHeight: '80vh',
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
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={15} />
            </div>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                Notifications ({unreadNotifications.length})
              </h2>
              <p style={{ fontSize: 10.5, color: '#64748B', margin: '1px 0 0 0' }}>
                New lead updates from Admin
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginPopup}
            title="Close popup"
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
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Compact Notifications List */}
        <div
          style={{
            padding: '10px 14px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {displayedNotifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                background: '#F8FAFC',
                padding: '9px 11px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1E293B',
                        lineHeight: 1.3,
                      }}
                    >
                      {notif.title}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: 10,
                        background: '#DBEAFE',
                        color: '#1D4ED8',
                      }}
                    >
                      New
                    </span>
                  </div>

                  {/* Sender & Timestamp */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 10,
                      color: '#64748B',
                      marginTop: 3,
                      flexWrap: 'wrap',
                    }}
                  >
                    {notif.sender_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <User size={10} />
                        {notif.sender_name}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={10} />
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                </div>

                {/* Compact Mark as read button */}
                <button
                  type="button"
                  onClick={() => markAsRead(notif.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '3px 7px',
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: '#059669',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 6,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#059669';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ECFDF5';
                    e.currentTarget.style.color = '#059669';
                  }}
                  title="Mark as read"
                >
                  <Check size={11} />
                  Mark read
                </button>
              </div>

              {/* Message */}
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '7px 9px',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  fontSize: 11.5,
                  color: '#334155',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {notif.message}
              </div>

              {/* Lead Link if available */}
              {notif.link && (
                <button
                  type="button"
                  onClick={() => handleNavigateToLead(notif.link)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    cursor: 'pointer',
                    padding: 0,
                    alignSelf: 'flex-start',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <span>View Lead {notif.lead_title ? `(${notif.lead_title})` : ''}</span>
                  <ExternalLink size={10} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Compact Pagination Bar if multiple pages */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '6px 14px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#64748B',
            }}
          >
            <span>
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, unreadNotifications.length)} of {unreadNotifications.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  background: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage <= 1 ? '#94A3B8' : '#1E293B',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  background: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
                  color: currentPage >= totalPages ? '#94A3B8' : '#1E293B',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Compact Footer */}
        <div
          style={{
            padding: '9px 14px',
            borderTop: '1px solid #F1F5F9',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={markAllAsRead}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Check size={12} />
            Mark all read
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9.5, color: '#94A3B8' }}>
              Kept unread in sidebar
            </span>
            <button
              type="button"
              onClick={closeLoginPopup}
              style={{
                background: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
