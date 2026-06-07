/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { db } from '../db.ts';
import { supabase } from '../supabaseClient.js';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  GraduationCap, 
  Shield, 
  BookOpen, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

interface SignInViewProps {
  onLoginSuccess: (user: User) => void;
  onNavigateToSignUp: () => void;
  onCancel: () => void;
}

export default function SignInView({ onLoginSuccess, onNavigateToSignUp, onCancel }: SignInViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Validation / Error States
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  
  // Simulated Forgot Password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Local helper: List of existing users details to make demo testing extremely simple and intuitive
  const demoUsers = db.getUsers();

  const handleDemoFill = (selectedUser: User) => {
    setEmail(selectedUser.email);
    setPassword('pa$$word123'); // standard simulated password for easy entry
    setErrors({});
  };

  const validateForm = () => {
    const tempErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      tempErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email)) {
      tempErrors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }

    if (!password) {
      tempErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // To ensure the demo credentials (e.g. Alex, teacher, admin) still work even in empty fresh Supabase instances,
        // we can fallback to the local simulated database when using pre-existing demo profiles.
        const allUsers = db.getUsers();
        const matchedDemo = allUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (matchedDemo && password === 'pa$$word123') {
          console.log(`Supabase auth error ("${error.message}"), falling back to mock user session for demo.`);
          setIsLoading(false);
          window.history.pushState({}, '', '/');
          onLoginSuccess(matchedDemo);
          return;
        }

        setErrors({
          general: `Authentication failed: ${error.message}`
        });
        setIsLoading(false);
        return;
      }

      // Successful Supabase login! Now map user to local mock database context
      const allUsers = db.getUsers();
      let matchedUser = allUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!matchedUser) {
        // Self-heal and register shadow user profile locally to enable direct dashboard access
        const newUserId = `user-student-${Date.now().toString().slice(-4)}`;
        matchedUser = {
          id: newUserId,
          name: email.split('@')[0],
          email: email.trim().toLowerCase(),
          role: UserRole.STUDENT,
          avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150`,
          classId: 'grade-8'
        };
        db.saveUsers([...allUsers, matchedUser]);
      }

      setIsLoading(false);
      window.history.pushState({}, '', '/');
      onLoginSuccess(matchedUser);
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Connection error while communicating with Supabase authenticator.'
      });
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Please enter a valid email address format.');
      return;
    }

    setForgotSubmitted(true);
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center py-6">
      
      {/* Container split screen card layout */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-250 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[600px] animate-scale-in">
        
        {/* LEFT PANEL: Interactive Features/Branding (Hidden on mobile) */}
        <div className="col-span-1 md:col-span-5 bg-gradient-to-tr from-indigo-900 to-indigo-950 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Wave visual decorations */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,50 Q25,70 50,50 T100,50 L100,100 L0,100 Z" fill="white" />
            </svg>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-650 rounded-lg flex items-center justify-center text-white border border-indigo-500 shadow-sm shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                MindMastery <span className="text-[10px] uppercase font-mono bg-indigo-850 px-2.2 py-0.5 rounded border border-indigo-700/60 font-bold">Portal</span>
              </h2>
            </div>

            <div className="space-y-4 pt-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-850 text-indigo-350 text-[10px] font-mono tracking-wide font-bold uppercase select-none border border-indigo-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                <span>Next-Gen Academic LMS</span>
              </div>
              <h3 className="text-2xl font-black font-display tracking-tight leading-tight">
                Empower your academic potential.
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed">
                Log in to access your structured homework syllabi, linear learning pathways, diagnostic tests, and customizable typography aids.
              </p>
            </div>
            
            {/* Structured highlight bullet checklist */}
            <div className="space-y-3 pt-6 border-t border-indigo-850">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white leading-tight">Mastery Learning Controls</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Sequential chapters designed for systematic student comprehension.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white leading-tight">Dynamic Typography Scales</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Adjust textbook font sizing dynamically using our draggable accessibility menu.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white leading-tight">Granular Progress Reports</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Immediate diagnostic statistics for students, parents, and administrative staff.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6">
            <p className="text-[11px] text-slate-400 font-medium font-mono leading-relaxed">
              Have doubts? Ask your class administrator for academic credential resets.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Authentic Form Interface */}
        <div className="col-span-1 md:col-span-7 p-8 flex flex-col justify-between">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">Sign In</h3>
              <p className="text-xs text-slate-400 font-medium">Verify your registered school credentials to enter</p>
            </div>
            <button
              id="btn-signin-cancel"
              type="button"
              onClick={onCancel}
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer select-none"
            >
              Back to Home
            </button>
          </div>

          {/* Core Sign-In Form container */}
          <form onSubmit={handleSubmit} className="space-y-5 my-6 text-left">
            {/* General Validation error notices */}
            {errors.general && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-150 text-xs text-rose-700 flex items-start gap-2.5 animate-fade-in font-sans font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="signin-email" className="text-xs font-bold text-slate-700 font-mono flex items-center justify-between">
                <span>EMAIL ADDRESS:</span>
                {errors.email && <span className="text-[10px] text-rose-600 lowercase font-medium">{errors.email}</span>}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="e.g. alex@mindmastery.edu"
                  className={`w-full bg-slate-50/50 border pl-10 pr-4 py-3 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    errors.email 
                      ? 'border-rose-300 focus:border-rose-450 focus:ring-rose-500/10' 
                      : 'border-slate-200 focus:border-indigo-650'
                  }`}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="signin-password" className="text-xs font-bold text-slate-700 font-mono flex items-center justify-between gap-1">
                  <span>PASSWORD:</span>
                  {errors.password && <span className="text-[10px] text-rose-600 lowercase font-medium">{errors.password}</span>}
                </label>
                <button
                  id="btn-forgot-password-link"
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-mono font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  disabled={isLoading}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-slate-50/50 border pl-10 pr-10 py-3 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    errors.password 
                      ? 'border-rose-300 focus:border-rose-450 focus:ring-rose-500/10' 
                      : 'border-slate-200 focus:border-indigo-650'
                  }`}
                />
                <button
                  id="btn-signin-password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me option */}
            <div className="flex items-center justify-between pt-1 font-sans">
              <label className="flex items-center gap-2.5 text-xs text-slate-650 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isLoading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Keep me signed in on this device</span>
              </label>
            </div>

            {/* Submit Action Block */}
            <div className="pt-3">
              <button
                id="btn-signin-submit"
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-720 disabled:bg-indigo-400 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-lg shadow-indigo-100 disabled:shadow-none cursor-pointer select-none scale-100 hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Student Portal</span>
                    <ArrowRight className="w-4 h-4 text-indigo-300" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* BOTTOM LINKS: Demo Sandbox User Accounts & CTA to Sign Up */}
          <div className="space-y-5 border-t border-slate-100 pt-5 text-left">
            
            {/* Navigation toggle link to Registration page */}
            <p className="text-xs text-slate-600 text-center font-medium">
              Don't have an academic account yet?{' '}
              <button
                id="btn-toggle-to-signup"
                type="button"
                onClick={onNavigateToSignUp}
                className="text-indigo-650 font-bold hover:text-indigo-850 hover:underline cursor-pointer"
              >
                Create Account / Register
              </button>
            </p>

            {/* Demo Helpers selection drawer */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 mt-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase font-black font-mono text-slate-400 tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Demo Accounts Fill:
                </h4>
                <span className="text-[9px] text-slate-400 font-mono">Click to autofill credentials</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {demoUsers.map((u) => {
                  let roleColor = 'bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100';
                  if (u.role === UserRole.TEACHER) roleColor = 'bg-pink-50 border-pink-100 text-pink-700 hover:bg-pink-100';
                  if (u.role === UserRole.ADMIN) roleColor = 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100';

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleDemoFill(u)}
                      className={`text-[10px] font-bold border rounded-lg px-2 py-1 cursor-pointer transition select-none flex items-center gap-1 ${roleColor}`}
                    >
                      <span>{u.name}</span>
                      <span className="text-[8px] opacity-75 font-mono">({u.role.toUpperCase()})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-205 shadow-2xl max-w-md w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-slate-900 uppercase tracking-tight">academic credential recovery</h3>
              <button
                id="btn-close-forgot-modal"
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSubmitted(false);
                  setForgotError('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Enter the email address registered with your school account below. We will send you instructions to securely reset your credentials.
                </p>

                {forgotError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="forgot-email" className="text-[10px] font-bold text-slate-400 font-mono block">SCHOOL EMAIL ADDRESS:</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="e.g. template@mindmastery.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-650"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    id="btn-forgot-cancel"
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotError('');
                    }}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl py-2 font-bold text-xs text-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-forgot-submit"
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-bold text-xs text-center cursor-pointer shadow-md shadow-indigo-100"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-150 inline-flex items-center justify-center text-emerald-600 shrink-0 shadow-sm animate-pulse">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs">Recovery Email Transmitted!</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans max-w-xs mx-auto">
                    A secure password modification link was dispatched to <strong className="text-slate-800">{forgotEmail}</strong>. Look for an inbox message from academic@mindmastery.edu within 5 minutes.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    id="btn-forgot-done"
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSubmitted(false);
                      setForgotError('');
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 font-bold text-xs text-center cursor-pointer shadow-sm"
                  >
                    Excellent, Got it!
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
