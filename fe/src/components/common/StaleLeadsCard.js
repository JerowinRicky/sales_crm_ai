import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, AlertTriangle } from 'lucide-react';
import ExportButtons from './ExportButtons';

const PERIODS = [
  { label:'7+ days', value:7 },
  { label:'15+ days', value:15 },
  { label:'30+ days', value:30 },
  { label:'60+ days', value:60 },
  { label:'90+ days', value:90 },
];

export default function StaleLeadsCard() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [days]);

  const load = async () => {
    setLoading(true);
    try { const r = await analyticsAPI.getStaleLeads({ days }); setData(r.data); }
    catch (e) { toast.error('Failed to load stale leads'); }
    setLoading(false);
  };

  const fmt = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Number(n||0).toLocaleString()}`;

  const formatDaysInStage = totalDays => {
    const d = parseInt(totalDays, 10);
    if (isNaN(d) || d <= 0) return '0d';

    const years = Math.floor(d / 365);
    const remDays = d % 365;
    const months = Math.floor(remDays / 30);
    const days = remDays % 30;

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0 || parts.length === 0) parts.push(`${days}d`);

    return parts.join('');
  };

  const exportLeads = (data?.leads || []).map(lead => ({
    ...lead,
    time_in_stage: formatDaysInStage(lead.days_in_stage),
  }));

  return (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={15} color="#d97706" />
          <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>Long-Pending Leads</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={days} onChange={e=>setDays(parseInt(e.target.value))} style={{ width:120 }}>
            {PERIODS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ExportButtons data={exportLeads} filename={`stale_leads_${days}d`} title={`Leads pending ${days}+ days in current stage`} />
        </div>
      </div>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:14 }}>
        Active leads that have stayed in their current stage for {days}+ days, grouped by stage.
      </div>

      {loading ? <div style={{ textAlign:'center', padding:30, color:'#9ca3af' }}>Loading...</div> : (
        <>
          {data?.summary?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.summary} layout="vertical" margin={{ left:8, right:24, top:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fill:'#9ca3af', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="stage_name" tick={{ fill:'#6b7280', fontSize:11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, n, p) => n === 'count' ? [`${v} leads`, 'Count'] : [v, n]}
                  contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e5e7eb' }}
                  cursor={{ fill:'#fffbeb' }}
                />
                <Bar dataKey="count" name="count" radius={[0,4,4,0]}>
                  {data.summary.map((e,i)=><Cell key={i} fill={e.color || '#d97706'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><AlertTriangle size={28}/><h4>Nothing pending</h4><p>No leads have been stuck in a stage for {days}+ days</p></div>
          )}

          {data?.leads?.length > 0 && (
            <div className="table-wrap" style={{ marginTop:14 }}>
              <table>
                <thead><tr><th>Lead</th><th>Company</th><th>Stage</th><th>Value</th><th>Days in Stage</th><th>Assigned To</th></tr></thead>
                <tbody>
                  {data.leads.slice(0,8).map(l=>(
                    <tr key={l.id}>
                      <td style={{ fontWeight:600 }}>{l.title}</td>
                      <td style={{ color:'#6b7280' }}>{l.company_name||'—'}</td>
                      <td><span className="badge" style={{ background:`${l.stage_color}14`, color:l.stage_color }}>{l.stage_name}</span></td>
                      <td style={{ color:'#16a34a', fontWeight:600 }}>{l.estimated_value?fmt(l.estimated_value):'—'}</td>
                      <td>
                        <span
                          className="badge"
                          title={`${l.days_in_stage} days in current stage`}
                          style={{ background:'#fef3c7', color:'#b45309', whiteSpace:'nowrap', fontWeight:600 }}
                        >
                          {formatDaysInStage(l.days_in_stage)}
                        </span>
                      </td>
                      <td style={{ color:'#6b7280' }}>{l.assigned_to_name||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
