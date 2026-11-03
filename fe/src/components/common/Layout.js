import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import UnreadNotificationsModal from './UnreadNotificationsModal';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Target, Building2, MapPin, CheckSquare,
  Users, BarChart2, Radio, LogOut, Menu, X, ChevronRight,
  Settings, ChevronLeft, Contact, ListTodo, CalendarDays ,Phone, LineChart, Bell, Mail
} from 'lucide-react';

const NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', all: true },
  { path: '/leads', icon: Target, label: 'Leads', all: true },
  { path: '/meetings', icon: CalendarDays , label: 'Meetings', all: true },
  { path: '/analytics', icon: LineChart, label: 'Analytics', all: true },
  // { path: '/customers', icon: Building2, label: 'Customers', all: true },
  // { path: '/contacts', icon: Contact, label: 'Contacts', all: true },
  { path: '/tasks', icon: ListTodo, label: 'Tasks', all: true },
  { path: '/calls', icon: Phone , label: 'Calls', all: true },
  { path: '/check-in', icon: CheckSquare, label: 'Field Check-In', all: true },
  { path: '/visits', icon: MapPin, label: 'Visit History', all: true },
  { path: '/admin/tracking', icon: Radio, label: 'Live Tracking', manager: true },
  { path: '/admin/reports', icon: BarChart2, label: 'Reports', all: true },
  { path: '/admin/users', icon: Users, label: 'User Management', admin: true },
  { path: '/admin/mail', icon: Mail, label: 'Mail Center', admin: true },
  { path: '/admin/settings', icon: Settings, label: 'Settings', admin: true },
  { path: '/notifications', icon: Bell, label: 'Notifications', all: true, hasBadge: true },
];

const SIDEBAR_KEY = 'crm_sidebar_collapsed';

export default function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const toggleCollapse = () => {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  const nav = NAV.filter(n => {
    if (n.admin) return isAdmin;
    if (n.manager) return isManager;
    return true;
  });

  const doLogout = () => { logout(); toast.success('Signed out'); navigate('/login'); };

  const SidebarInner = ({ mobile = false }) => (
    <div style={{
      width: mobile ? 260 : (collapsed ? 64 : 200),
      height: '100%',
      background: '#FFFFFF',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      transition: mobile ? 'none' : 'width 0.2s ease-in-out',
      overflow: 'hidden',
    }}>
      {/* Brand Logo Header */}
      <div style={{
        padding: collapsed && !mobile ? '16px 0' : '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid #F1F5F9',
        justifyContent: collapsed && !mobile ? 'center' : 'center',
        minHeight: 64,
        scale:  collapsed && !mobile ? '1' : '1.2',
      }}>
        {collapsed && !mobile ? (
          /* Collapsed: show icon only */
          <img
            src={`${process.env.PUBLIC_URL}/icon.svg`}
            alt="Icon"
            style={{ width: 32, height: 32, flexShrink: 0, objectFit: 'contain' }}
          />
        ) : (
          /* Expanded: show full logo */
          <img
            src={`${process.env.PUBLIC_URL}/full_logo.svg`}
            alt="SalesCRM"
            style={{ height: 36, maxWidth: 160, objectFit: 'fill', flexShrink: 0 }}
          />
        )}
      </div>

      {/* Navigation list */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {nav.map(item => (
          <NavLink key={item.path} to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed && !mobile ? '10px 0' : '9px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#2563EB' : '#64748B',
              background: isActive ? '#EFF6FF' : 'transparent',
              transition: 'all 0.15s ease',
              justifyContent: collapsed && !mobile ? 'center' : 'flex-start',
              whiteSpace: 'nowrap',
            })}
            title={collapsed && !mobile ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <item.icon size={16} strokeWidth={isActive ? 2.2 : 1.8} style={{ color: isActive ? '#2563EB' : '#64748B', flexShrink: 0 }} />
                  {item.hasBadge && unreadCount > 0 && (collapsed && !mobile) && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -5,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#EF4444',
                        border: '1.5px solid #FFFFFF',
                      }}
                    />
                  )}
                </div>
                {(!collapsed || mobile) && <span>{item.label}</span>}
                {item.hasBadge && unreadCount > 0 && (!collapsed || mobile) && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#EF4444',
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      lineHeight: '14px',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid #F1F5F9' }}>
        {collapsed && !mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => navigate('/profile')}
              title={user?.name}
              style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button onClick={doLogout} title="Sign Out" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}>
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: '#F8FAFC',
            border: '1px solid #F1F5F9',
            borderRadius: 10,
          }}>
            <div
              onClick={() => navigate('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', cursor: 'pointer', flex: 1 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1, textTransform: 'capitalize' }}>
                  {user?.role_name?.replace('_', ' ') || 'Member'}
                </div>
              </div>
            </div>
            <button onClick={doLogout} title="Sign Out" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* DESKTOP SIDEBAR */}
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }} className="desktop-sidebar">
        <SidebarInner />
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute',
            top: 20,
            right: -12,
            width: 24, height: 24,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            transition: 'all 0.15s ease',
            zIndex: 20,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#2563EB'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
        >
          {collapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* MOBILE DRAWER */}
      <div style={{
        position: 'fixed', top: 0, left: drawerOpen ? 0 : -270,
        height: '100%', zIndex: 401, transition: 'left 0.24s cubic-bezier(.4,0,.2,1)',
      }} className="mobile-drawer">
        <SidebarInner mobile />
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{
          display: 'none',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 54,
          background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
          flexShrink: 0, zIndex: 100,
        }}>
          <button onClick={() => setDrawerOpen(d => !d)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 6 }}>
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img
  src={`${process.env.PUBLIC_URL}/full_logo.svg`}
  alt="SalesCRM"
  style={{
    height: 36,
    maxWidth: 160,
    objectFit: 'contain',
    flexShrink: 0
  }}
/>
          <div
            onClick={() => navigate('/profile')}
            style={{ width: 30, height: 30, borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        {/* Page Container */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: '12px 12px', maxWidth: 1440, margin: '0 auto' }} className="page-padding">
            <Outlet context={{ toggleCollapse, collapsed }} />
          </div>
        </main>
      </div>

      {/* Unread Notifications Popup on Login */}
      <UnreadNotificationsModal />
    </div>
  );
}


