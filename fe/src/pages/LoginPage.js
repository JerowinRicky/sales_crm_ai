import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans text-slate-800">
      {/* ========================================================= */}
      {/* LEFT SHOWCASE PANEL (White/Light, Visual Fill, Low Text)  */}
      {/* ========================================================= */}
      <div className="relative lg:w-[54%] xl:w-[56%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 border-r border-slate-200/80 overflow-hidden">
        {/* Soft Ambient Light Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-indigo-100/40 blur-3xl pointer-events-none" />

        {/* Subtle Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center">
          <img
            src={`${process.env.PUBLIC_URL}/full_logo.svg`}
            alt="SAMPAT Sales CRM"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Centerpiece Visual Dashboard Preview (Fills the space without words) */}
        <div className="relative z-10 my-auto py-8 max-w-lg w-full">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
              <Sparkles size={13} className="text-blue-600" />
              <span>SAMPAT Sales CRM</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Field Sales,{' '}
              <span className="text-blue-600">Unified.</span>
            </h1>
          </div>

          {/* Floating White Glass Showcase Card */}
          <div className="rounded-2xl bg-white/95 border border-slate-200/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-md space-y-5">
            {/* Top KPI Row */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Revenue Target
                  </div>
                  <div className="text-xl font-bold text-slate-900 tracking-tight">
                    ₹48.2 Lakhs
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                +28.4%
              </div>
            </div>

            {/* Pipeline Stage Preview */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">Pipeline Flow</span>
                <span className="text-blue-600 font-medium">84% Conversion</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { name: 'Lead', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                  { name: 'Meeting', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { name: 'Proposal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                  { name: 'Won', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' },
                ].map((s) => (
                  <div
                    key={s.name}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium text-center border truncate ${s.color}`}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Stat Mini Cards Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Field Visits</div>
                  <div className="text-sm font-bold text-slate-800">18 Today</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Deals Closed</div>
                  <div className="text-sm font-bold text-slate-800">12 Deals</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-4">
          <span>Enterprise Sales Edition</span>
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Encrypted & Verified</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT SIGN IN PANEL (Clean, White, Minimalist Form)       */}
      {/* ========================================================= */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={`${process.env.PUBLIC_URL}/full_logo.svg`}
              alt="Amvion Sales Codex"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Form Header (Minimal Words) */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full h-11 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>Signing in…</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}