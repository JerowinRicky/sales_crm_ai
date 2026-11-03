import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Step 1: 'email' | Step 2: 'otp_and_reset' | Step 3: 'success'
  const [step, setStep] = useState('email');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // 2 minutes = 120 seconds countdown
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef(null);

  // Start / Reset Timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(120);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format MM:SS
  const formatTime = seconds => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // STEP 1: Send OTP
  const handleSendOtp = async e => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.forgotPasswordSendOtp({ email: email.trim() });
      toast.success(res.message || 'OTP sent successfully!');
      setStep('otp_and_reset');
      setOtp('');
      startTimer();
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (timeLeft > 0 || resending) return;
    setResending(true);
    try {
      const res = await authAPI.forgotPasswordSendOtp({ email: email.trim() });
      toast.success(res.message || 'A new OTP has been sent to your email.');
      setOtp('');
      startTimer();
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  // STEP 2: Submit Reset Password
  const handleResetPassword = async e => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    if (otp.trim().length !== 6) {
      toast.error('OTP must be exactly 6 digits');
      return;
    }
    if (timeLeft === 0) {
      toast.error('OTP has expired. Please request a new code.');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.forgotPasswordReset({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });

      if (timerRef.current) clearInterval(timerRef.current);
      toast.success(res.message || 'Password reset successfully!');
      setStep('success');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans text-slate-800">
      {/* ========================================================= */}
      {/* LEFT SHOWCASE PANEL                                       */}
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
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center">
          <img
            src={`${process.env.PUBLIC_URL}/full_logo.svg`}
            alt="SAMPAT Sales CRM"
            className="h-10 w-auto object-contain cursor-pointer"
            onClick={() => navigate('/login')}
          />
        </div>

        {/* Centerpiece Showcase */}
        <div className="relative z-10 my-auto py-8 max-w-lg w-full">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
              <Sparkles size={13} className="text-blue-600" />
              <span>Account Recovery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Secure Access,{' '}
              <span className="text-blue-600">Restored.</span>
            </h1>
          </div>

          {/* White Card Info */}
          <div className="rounded-2xl bg-white/95 border border-slate-200/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-md space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Two-Minute Verified OTP
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Verification codes are sent directly to your verified work email address and expire automatically after 2 minutes for maximum account security.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                End-to-End Encrypted
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-blue-500" />
                Immediate Delivery
              </span>
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
      {/* RIGHT ACTION PANEL                                        */}
      {/* ========================================================= */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={`${process.env.PUBLIC_URL}/full_logo.svg`}
              alt="SAMPAT Sales CRM"
              className="h-9 w-auto object-contain cursor-pointer"
              onClick={() => navigate('/login')}
            />
          </div>

          {/* STEP 1: Enter Email */}
          {step === 'email' && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Forgot Password?
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Enter your registered email address and we'll send a 6-digit verification code.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      required
                      autoFocus
                      className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span>Sending OTP…</span>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 'otp_and_reset' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Reset Password
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (timerRef.current) clearInterval(timerRef.current);
                      setStep('email');
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Change Email
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between">
                  <span className="truncate font-medium text-slate-800">
                    {email}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 font-mono font-semibold text-xs px-2 py-0.5 rounded ${
                      timeLeft > 30
                        ? 'bg-blue-50 text-blue-700'
                        : timeLeft > 0
                        ? 'bg-amber-50 text-amber-700 animate-pulse'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <Clock size={12} />
                    <span>{timeLeft > 0 ? formatTime(timeLeft) : 'Expired'}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* 6-Digit OTP */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      6-Digit OTP
                    </label>
                    <button
                      type="button"
                      disabled={timeLeft > 0 || resending}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RotateCcw size={12} className={resending ? 'animate-spin' : ''} />
                      <span>{resending ? 'Resending…' : 'Resend Code'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      autoFocus
                      required
                      className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-base tracking-[0.35em] text-center font-mono font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full h-11 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full h-11 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Reset */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span>Updating Password…</span>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Success Screen */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Password Updated!
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mb-6">
                Your password has been reset successfully. You can now log in using your new credentials.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

