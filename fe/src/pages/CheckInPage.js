import React, { useState, useEffect, useMemo } from 'react';
import { visitsAPI, customersAPI, settingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { MapPin, RefreshCw, CheckCircle2, AlertCircle, Clock, LogOut, X, Navigation, AlertTriangle } from 'lucide-react';

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function CheckInPage() {
  const [customers, setCustomers] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [getting, setGetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [radius, setRadius] = useState(250);

  useEffect(() => { loadData(); getLocation(); loadSettings(); }, []);

  const loadData = async () => {
    try {
      const [c, s] = await Promise.all([customersAPI.getAll({ limit:200 }), visitsAPI.getActive()]);
      setCustomers(c.data || []);
      setActiveSessions(s.data || []);
    } catch (e) { toast.error('Failed to load data'); }
  };

  const loadSettings = async () => {
    try { const r = await settingsAPI.get(); if (r.data?.checkin_radius_meters) setRadius(parseFloat(r.data.checkin_radius_meters)); }
    catch (e) {}
  };

  const getLocation = () => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return; }
    setGetting(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ latitude:pos.coords.latitude, longitude:pos.coords.longitude, accuracy:pos.coords.accuracy }); setGetting(false); },
      err => { setLocError(`Location error: ${err.message}`); setGetting(false); },
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  };

  const selectedCustomerObj = useMemo(() => customers.find(c => String(c.id) === String(selectedCustomer)), [customers, selectedCustomer]);

  const preview = useMemo(() => {
    if (!location || !selectedCustomerObj) return null;
    const { latitude: clat, longitude: clng } = selectedCustomerObj;
    if (clat == null || clng == null) return null;
    const dist = Math.round(distanceMeters(Number(clat), Number(clng), location.latitude, location.longitude));
    return { distance: dist, withinRange: dist <= radius };
  }, [location, selectedCustomerObj, radius]);

  const handleCheckIn = async () => {
    if (!selectedCustomer) { toast.error('Select a customer'); return; }
    if (!location) { toast.error('Location required'); return; }
    setLoading(true);
    try {
      const res = await visitsAPI.checkIn({ customer_id:parseInt(selectedCustomer), latitude:location.latitude, longitude:location.longitude, accuracy:location.accuracy, purpose, notes });
      if (res.distance_meters != null) {
        if (res.within_geofence) toast.success(`Checked in — ${res.distance_meters}m from registered location`);
        else toast(`Checked in, but you're ${res.distance_meters}m away from the registered location (outside ${radius}m geofence)`, { icon: '\u26a0\ufe0f', style: { borderLeft:'3px solid #d97706' } });
      } else {
        toast.success(`Checked in — Session #${res.session_id}`);
      }
      setSelectedCustomer(''); setPurpose(''); setNotes('');
      loadData();
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const confirmCheckOut = async () => {
    if (!checkoutSession) return;
    if (!location) { toast.error('Location required'); return; }
    setLoading(true);
    try {
      const res = await visitsAPI.checkOut({
        session_id: checkoutSession.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes, outcome,
        follow_up_date: followUp || null
      });
      if (res.checkout_distance_meters != null) {
        if (res.checkout_within_geofence) {
          toast.success(`Checked out — ${res.duration_minutes} min · ${res.checkout_distance_meters}m from site`);
        } else {
          toast(`Checked out — ${res.duration_minutes} min · but you're ${res.checkout_distance_meters}m from site (outside 250m)`, { icon: '⚠️', style: { borderLeft:'3px solid #d97706' } });
        }
      } else {
        toast.success(`Checked out — ${res.duration_minutes} min`);
      }
      setCheckoutSession(null); setOutcome(''); setFollowUp(''); setNotes('');
      loadData();
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = location ? '#10B981' : locError ? '#EF4444' : '#F59E0B';
  const StatusIcon = location ? CheckCircle2 : locError ? AlertCircle : Navigation;

  return (
    <div className="animate-in">
      <div style={{ marginBottom:22 }}>
        <h1 className="page-title">Field Check-In / Check-Out</h1>
        <p className="page-subtitle">Record your visits with GPS location and timestamp</p>
      </div>

      <div className="card" style={{ marginBottom:20, borderRadius:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${statusColor}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <StatusIcon size={20} color={statusColor} />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>
                {getting ? 'Getting your location...' : location ? 'Location acquired' : locError ? 'Location unavailable' : 'Location not fetched'}
              </div>
              {location && <div style={{ fontSize:12, color:'#64748B', marginTop:3, fontWeight:500 }}>{Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)} {location.accuracy && `· ±${Math.round(location.accuracy)}m accuracy`}</div>}
              {locError && <div style={{ fontSize:12, color:'#EF4444', marginTop:3, fontWeight:500 }}>{locError}</div>}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={getLocation} disabled={getting} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <RefreshCw size={13} className={getting?'spin':''}/> Refresh Location
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card">
          <div className="section-title" style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'#111827', marginBottom:16 }}><MapPin size={16} color="#2563EB"/> New Visit Check-In</div>

          <div className="form-group">
            <label>Search Customer</label>
            <input placeholder="Type company name or city..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Select Customer *</label>
            <select value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}>
              <option value="">— Select Customer —</option>
              {filteredCustomers.map(c=>(
                <option key={c.id} value={c.id}>{c.company_name}{c.city?` (${c.city})`:''}{c.contact_person?` — ${c.contact_person}`:''}</option>
              ))}
            </select>
          </div>

          {selectedCustomerObj && (
            selectedCustomerObj.latitude == null ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, marginBottom:16, fontSize:12, color:'#64748B', fontWeight:500 }}>
                <AlertTriangle size={15} color="#F59E0B"/> This customer has no registered location — geofence check will be skipped
              </div>
            ) : preview ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background: preview.withinRange ? '#ECFDF5' : '#FFFBEB', border:`1px solid ${preview.withinRange?'#A7F3D0':'#FDE68A'}`, borderRadius:10, marginBottom:16, fontSize:12, color: preview.withinRange?'#047857':'#B45309', fontWeight:500 }}>
                {preview.withinRange ? <CheckCircle2 size={15}/> : <AlertTriangle size={15}/>}
                You are <strong>{preview.distance}m</strong> from the registered location {preview.withinRange ? `(within ${radius}m geofence)` : `(outside ${radius}m geofence)`}
              </div>
            ) : null
          )}

          <div className="form-group">
            <label>Visit Purpose</label>
            <select value={purpose} onChange={e=>setPurpose(e.target.value)}>
              <option value="">— Select Purpose —</option>
              {['prospecting','demo','follow_up','proposal','after_sales','relationship','other'].map(p=>(
                <option key={p} value={p}>{p.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows={3} placeholder="Pre-visit agenda or notes..." value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>

          <button className="btn btn-primary" onClick={handleCheckIn} disabled={loading || !location || !selectedCustomer} style={{ width:'100%', justifyContent:'center', marginTop:4 }}>
            <MapPin size={16}/> {loading ? 'Checking in...' : 'Check In Now'}
          </button>
          {!location && <p style={{ fontSize:12, color:'#D97706', textAlign:'center', marginTop:10, fontWeight:500 }}>GPS location required to check in</p>}
        </div>

        <div className="card">
          <div className="section-title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:14, fontWeight:700, color:'#111827', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={16} color="#10B981"/> Active Check-Ins
            </div>
            <span className="badge" style={{ background:'#ECFDF5', color:'#047857', fontWeight:600, padding:'2px 9px', borderRadius:20 }}>{activeSessions.length}</span>
          </div>

          {activeSessions.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}><MapPin size={32} color="#94A3B8"/><h4>No active check-ins</h4><p>Check in to a customer to start tracking</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {activeSessions.map(s => {
                const duration = Math.round((new Date() - new Date(s.check_in_time)) / 60000);
                return (
                  <div key={s.id} style={{ padding:16, background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div><div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{s.company_name}</div><div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{s.city}</div></div>
                      <span className="badge" style={{ background:'#ECFDF5', color:'#047857', fontWeight:700, padding:'2px 8px', borderRadius:20 }}>LIVE</span>
                    </div>
                    <div style={{ fontSize:12, color:'#64748B', marginBottom:10, fontWeight:500 }}>
                      {duration} min · In at {format(new Date(s.check_in_time),'HH:mm')} · {Number(s.check_in_lat).toFixed(4)}, {Number(s.check_in_lng).toFixed(4)}
                    </div>
                    {s.distance_meters != null && (
                      <div style={{ marginBottom:14 }}>
                        <span className="badge" style={{ background: s.within_geofence ? '#ECFDF5' : '#FFFBEB', color: s.within_geofence ? '#047857' : '#B45309', fontWeight:600, padding:'3px 10px', borderRadius:20 }}>
                          {s.within_geofence ? 'In range' : 'Out of range'} · {s.distance_meters}m from site
                        </span>
                      </div>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={()=>setCheckoutSession(s)} style={{ width:'100%', justifyContent:'center', borderRadius:8 }}>
                      <LogOut size={14}/> Check Out
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {checkoutSession && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:480, borderRadius:16 }}>
            <div className="modal-header"><h3>Check Out — {checkoutSession.company_name}</h3><button className="modal-close" onClick={()=>setCheckoutSession(null)}><X size={18}/></button></div>
            <div className="modal-body">
              {(() => {
                const co = customers.find(c => String(c.id) === String(checkoutSession.customer_id));
                if (location && co?.latitude != null) {
                  const dist = Math.round(distanceMeters(Number(co.latitude), Number(co.longitude), location.latitude, location.longitude));
                  const ok = dist <= radius;
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background: ok?'#ECFDF5':'#FFFBEB', border:`1px solid ${ok?'#A7F3D0':'#FDE68A'}`, borderRadius:10, marginBottom:16, fontSize:12, color: ok?'#047857':'#B45309', fontWeight:500 }}>
                      {ok ? <CheckCircle2 size={15}/> : <AlertTriangle size={15}/>}
                      Your checkout location is <strong>{dist}m</strong> from the registered site {ok ? `(within 250m ✓)` : `(outside 250m — will be flagged)`}
                    </div>
                  );
                }
                return null;
              })()}
              <div className="form-group"><label>Visit Outcome</label><textarea rows={3} placeholder="What was discussed? Next steps?" value={outcome} onChange={e=>setOutcome(e.target.value)} /></div>
              <div className="form-group"><label>Notes</label><textarea rows={2} placeholder="Other observations..." value={notes} onChange={e=>setNotes(e.target.value)} /></div>
              <div className="form-group"><label>Follow-up Date</label><input type="date" value={followUp} onChange={e=>setFollowUp(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
              {location && <div style={{ fontSize:12, color:'#64748B', padding:'10px 14px', background:'#F8FAFC', borderRadius:8, border:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:6, fontWeight:500 }}><MapPin size={14} color="#2563EB"/>Checkout location: {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setCheckoutSession(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmCheckOut} disabled={loading}>{loading?'Checking out...':'Confirm Check Out'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
