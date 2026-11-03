import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Key, X } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    if (form.new_password.length < 8) { toast.error('Min 8 characters'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword({ current_password:form.current_password, new_password:form.new_password });
      toast.success('Password changed');
      setShowModal(false);
      setForm({ current_password:'', new_password:'', confirm_password:'' });
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="animate-in" style={{ maxWidth:720 }}>
      <h1 className="page-title" style={{ marginBottom:22 }}>My Profile</h1>

      <div className="card" style={{ marginBottom:20, borderRadius:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24 }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:'linear-gradient(135deg, #2563EB, #1D4ED8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color:'#FFFFFF', boxShadow:'0 4px 12px rgba(37,99,235,0.2)' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#111827', margin:0 }}>{user?.name}</h2>
            <div style={{ fontSize:13, color:'#64748B', marginTop:3, fontWeight:500 }}>{user?.email}</div>
            <span className="badge" style={{ marginTop:8, background:'#EFF6FF', color:'#2563EB', fontWeight:600, padding:'3px 10px', borderRadius:20 }}>{user?.role_name?.replace('_',' ')}</span>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns:'repeat(2, 1fr)', gap:14 }}>
          {[
            ['Employee ID', user?.employee_id || '—'],
            ['Department', user?.department || '—'],
            ['Territory', user?.territory || '—'],
            ['Phone', user?.phone || '—'],
            ['Last Login', user?.last_login ? format(new Date(user.last_login),'MMM d, yyyy HH:mm') : 'N/A'],
            ['Total Logins', user?.login_count || 0]
          ].map(([l, v]) => (
            <div key={l} style={{ padding:'12px 16px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:11, color:'#64748B', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ borderRadius:14 }}>
        <div className="section-title" style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:12 }}>Security</div>
        <p style={{ fontSize:13, color:'#64748B', marginBottom:16 }}>Keep your account secure by updating your password periodically.</p>
        <button className="btn btn-secondary" onClick={()=>setShowModal(true)} style={{ display:'inline-flex', alignItems:'center', gap:8, fontWeight:600 }}>
          <Key size={15}/> Change Password
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:420, borderRadius:16 }}>
            <div className="modal-header"><h3>Change Password</h3><button className="modal-close" onClick={()=>setShowModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {[
                  ['current_password','Current Password'],
                  ['new_password','New Password'],
                  ['confirm_password','Confirm New Password']
                ].map(([k, l]) => (
                  <div className="form-group" key={k}>
                    <label>{l}</label>
                    <input required type="password" value={form[k]} onChange={e=>setForm(f=>({...f, [k]:e.target.value}))} minLength={k!=='current_password'?8:1} placeholder={`Enter ${l.toLowerCase()}`} />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Saving...':'Change Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
