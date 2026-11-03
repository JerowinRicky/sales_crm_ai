import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Sliders } from 'lucide-react';
import ExportButtons from './ExportButtons';

const DIMENSIONS = [
  { value:'stage',    label:'Pipeline Stage' },
  { value:'source',   label:'Lead Source' },
  { value:'priority', label:'Priority' },
  { value:'assignee', label:'Salesperson' },
  { value:'month',    label:'Month Created' },
  { value:'city',     label:'Customer City' },
  { value:'industry', label:'Customer Industry' },
];

const METRICS = [
  { value:'count',           label:'Lead Count' },
  { value:'value_sum',       label:'Total Value (₹)' },
  { value:'value_avg',       label:'Average Value (₹)' },
  { value:'probability_avg', label:'Average Probability (%)' },
];

const CHART_TYPES = ['bar','line','pie'];
const COLORS = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#6366f1','#f97316','#14b8a6','#ec4899'];

export default function ChartBuilder() {
  const [dimension, setDimension] = useState('stage');
  const [metric, setMetric] = useState('count');
  const [chartType, setChartType] = useState('bar');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [dimension, metric, dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { dimension, metric };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const r = await analyticsAPI.getCustom(params);
      setData(r.data || []);
    } catch (e) { toast.error('Failed to load chart data'); }
    setLoading(false);
  };

  const metricLabel = METRICS.find(m=>m.value===metric)?.label || 'Value';
  const dimLabel = DIMENSIONS.find(d=>d.value===dimension)?.label || 'Category';

  const fmtVal = v => (metric==='value_sum'||metric==='value_avg') ? (v>=100000?`₹${(v/100000).toFixed(1)}L`:`₹${Number(v).toLocaleString()}`) : (metric==='probability_avg'? `${Number(v).toFixed(0)}%` : v);

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <Sliders size={15} color="#2563eb"/>
        <div style={{ fontSize:13, fontWeight:700, color:'#111827' }}>Custom Chart Builder</div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ minWidth:160 }}>
          <label>Dimension (X-axis / Legend)</label>
          <select value={dimension} onChange={e=>setDimension(e.target.value)}>
            {DIMENSIONS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div style={{ minWidth:160 }}>
          <label>Metric (Y-axis / Value)</label>
          <select value={metric} onChange={e=>setMetric(e.target.value)}>
            {METRICS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ minWidth:120 }}>
          <label>Chart Type</label>
          <select value={chartType} onChange={e=>setChartType(e.target.value)}>
            {CHART_TYPES.map(c=><option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ minWidth:140 }}>
          <label>From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        </div>
        <div style={{ minWidth:140 }}>
          <label>To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        </div>
        <ExportButtons data={data} filename={`custom_${dimension}_${metric}`} title={`${metricLabel} by ${dimLabel}`} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#9ca3af' }}>Loading...</div>
      ) : data.length === 0 ? (
        <div className="empty-state"><Sliders size={28}/><h4>No data</h4><p>Try a different dimension, metric, or date range</p></div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top:4, right:16, left:0, bottom: data.length>6?60:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} angle={data.length>6?-35:0} textAnchor={data.length>6?'end':'middle'} interval={0} />
              <YAxis tickFormatter={fmtVal} tick={{ fill:'#9ca3af', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v=>[fmtVal(v), metricLabel]} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e5e7eb' }} cursor={{ fill:'#eff6ff' }} />
              <Bar dataKey="value" name={metricLabel} radius={[4,4,0,0]}>
                {data.map((_,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top:4, right:16, left:0, bottom: data.length>6?60:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} angle={data.length>6?-35:0} textAnchor={data.length>6?'end':'middle'} interval={0} />
              <YAxis tickFormatter={fmtVal} tick={{ fill:'#9ca3af', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v=>[fmtVal(v), metricLabel]} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="value" name={metricLabel} stroke="#2563eb" strokeWidth={2} dot={{ r:3 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={({label,percent})=>`${label} ${(percent*100).toFixed(0)}%`}>
                {data.map((_,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v=>[fmtVal(v), metricLabel]} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize:11 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
