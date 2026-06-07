/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { db } from '../db.ts';
import { supabase } from '../supabaseClient.js';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckSquare, 
  CheckCircle2, 
  Award,
  Video,
  GripHorizontal
} from 'lucide-react';

interface SignUpViewProps {
  onRegisterSuccess: (user: User) => void;
  onNavigateToSignIn: () => void;
  onCancel: () => void;
}

export default function SignUpView({ onRegisterSuccess, onNavigateToSignIn, onCancel }: SignUpViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Toggles for visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Loading and feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  // Field validation states (Real-time and touched)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time password strength evaluation checklist
  const strengthCriteria = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const strengthCount = Object.values(strengthCriteria).filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: 'Empty', color: 'bg-slate-200', text: 'text-slate-400' };
    if (password.length < 5) return { label: 'Too Short', color: 'bg-rose-500', text: 'text-rose-500' };
    
    switch (strengthCount) {
      case 1:
        return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
      case 2:
        return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
      case 3:
        return { label: 'Good', color: 'bg-yellow-500', text: 'text-yellow-600' };
      case 4:
        return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
      default:
        return { label: 'Weak', color: 'bg-rose-200', text: 'text-rose-400' };
    }
  };

  const strengthInfo = getStrengthLabel();

  // Handle Form Validation Rules
  useEffect(() => {
    const tempErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (touched.name) {
      if (!name.trim()) {
        tempErrors.name = 'Full Name is required.';
      } else if (name.trim().length < 2) {
        tempErrors.name = 'Name must be at least 2 characters.';
      }
    }

    if (touched.email) {
      if (!email) {
        tempErrors.email = 'Email address is required.';
      } else if (!emailRegex.test(email)) {
        tempErrors.email = 'Invalid email address format.';
      } else {
        // Unique email checking simulation
        const isEmailTaken = db.getUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
        if (isEmailTaken) {
          tempErrors.email = 'This email address is already registered.';
        }
      }
    }

    if (touched.password) {
      if (!password) {
        tempErrors.password = 'Password is required.';
      } else if (password.length < 8) {
        tempErrors.password = 'Password must be at least 8 characters.';
      }
    }

    if (touched.confirmPassword) {
      if (!confirmPassword) {
        tempErrors.confirmPassword = 'Please confirm your password.';
      } else if (confirmPassword !== password) {
        tempErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(tempErrors);
  }, [name, email, password, confirmPassword, touched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trigger touched states to perform final sweep validations
    const allTouched = { name: true, email: true, password: true, confirmPassword: true };
    setTouched(allTouched);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const finalErrors: Record<string, string> = {};

    if (!name.trim()) finalErrors.name = 'Full Name is required.';
    if (!email) finalErrors.email = 'Email address is required.';
    else if (!emailRegex.test(email)) finalErrors.email = 'Invalid email format.';

    if (!password) finalErrors.password = 'Password is required.';
    else if (password.length < 8) finalErrors.password = 'Password must be at least 8 characters.';

    if (!confirmPassword) finalErrors.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) finalErrors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: name.trim()
          }
        }
      });

      if (error) {
        setErrors({ general: `Registration Error: ${error.message}` });
        setIsLoading(false);
        return;
      }

      // Assemble new standard student user
      const users = db.getUsers();
      const newUserId = `user-student-${Date.now().toString().slice(-4)}`;
      const newUser: User = {
        id: newUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: UserRole.STUDENT,
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150`, // student default avatar
        classId: 'grade-8' // standard default classroom assigned
      };

      try {
        db.saveUsers([...users, newUser]);
        
        setIsLoading(false);
        setRegisteredUser(newUser);
      } catch (err: any) {
        setIsLoading(false);
        setErrors({ general: err?.message || 'Database registration constraint violation occurred.' });
      }
    } catch (err: any) {
      setErrors({ general: err?.message || 'Failed connecting to Supabase database auth service.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center py-6">
      
      {/* Container split screen card layout */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-250 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px] relative animate-scale-in">
        
        {/* Success Modal Overlay inside card */}
        {registeredUser && (
          <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="max-w-md space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-150 inline-flex items-center justify-center text-emerald-600 shadow-md animate-scale-in">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wide text-emerald-650 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-mono">
                  account registered with success
                </span>
                <h3 className="text-2xl font-black font-display text-slate-900 tracking-tight">Welcome, {registeredUser.name}!</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Your academic learner account has been securely instantiated within MindMastery LMS! You are enrolled in <strong className="text-slate-800">Grade 8</strong> sequential curricular pathways.
                </p>
              </div>

              {/* Created User Details */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left font-mono text-[11px] space-y-1.5 shadow-xs border-dashed">
                <p className="text-slate-400 uppercase font-black tracking-wider text-[9px] mb-1">Authenticated Identity Info:</p>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">FullName:</span>
                  <span className="font-bold text-slate-800">{registeredUser.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-slate-800">{registeredUser.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Standard Role:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 rounded uppercase">STUDENT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Enrolled Course:</span>
                  <span className="font-bold text-slate-800">Grade 8 Middle Cohort</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="btn-signup-success-launch"
                  type="button"
                  onClick={() => onRegisterSuccess(registeredUser)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 rounded-xl cursor-pointer transition shadow-lg shadow-indigo-100"
                >
                  <span>Launch Student Workspace</span>
                  <ArrowRight className="w-4 h-4 text-indigo-200" />
                </button>
                <button
                  id="btn-signup-success-signin"
                  type="button"
                  onClick={onNavigateToSignIn}
                  className="text-xs font-mono font-bold text-slate-500 hover:text-slate-800 cursor-pointer hover:underline"
                >
                  Return to standard Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEFT PANEL: Interactive Features/Branding (Hidden on mobile) */}
        <div className="col-span-1 md:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-905 to-indigo-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Grid background visual */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="w-full h-full bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-650 rounded-lg flex items-center justify-center text-white border border-indigo-500 shadow-sm shrink-0">
                <Award className="w-5.5 h-5.5" />
              </div>
              <h2 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                MindMastery <span className="text-[10px] uppercase font-mono bg-indigo-850 px-2.2 py-0.5 rounded border border-indigo-700/60 font-bold">LMS</span>
              </h2>
            </div>

            <div className="space-y-4 pt-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/50 text-indigo-400 text-[10px] font-mono tracking-wide font-bold uppercase select-none border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                <span>Join Student Cohort</span>
              </div>
              <h3 className="text-2xl font-black font-display tracking-tight leading-tight">
                Master any curricular task.
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed">
                By creating an account, you enroll in unified online learning modules that systematically train your comprehensive understanding.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-indigo-850">
              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-5.5 h-5.5 rounded-lg bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-800">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block mt-0.5 leading-none">Diagnostic Assessments</span>
                  <p className="text-[10.5px] text-slate-450 mt-1">Achieve 75% score barriers to unlock next milestones naturally.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <div className="w-5.5 h-5.5 rounded-lg bg-indigo-900/50 flex items-center justify-center shrink-0 border border-indigo-800">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-white block mt-0.5 leading-none">Lectures & Guided Notes</span>
                  <p className="text-[10.5px] text-slate-450 mt-1">Read highly structured teacher summaries alongside video lectures.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6">
            <p className="text-[10px] text-slate-400 leading-normal">
              MindMastery safeguards educational progress securely with fully decoupled local client storage caching.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Form Block */}
        <div className="col-span-1 md:col-span-7 p-8 flex flex-col justify-between">
          
          {/* Nav Header controls */}
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold font-display text-slate-900 tracking-tight">Register Student</h3>
              <p className="text-xs text-slate-400 font-medium">Create a new academic account instantly</p>
            </div>
            <button
              id="btn-signup-cancel"
              type="button"
              onClick={onCancel}
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer select-none"
            >
              Back to Home
            </button>
          </div>

          {/* Registration Input stack */}
          <form onSubmit={handleSubmit} className="space-y-4 my-6 text-left">
            {errors.general && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-xs text-rose-750 rounded-xl flex items-start gap-2 animate-fade-in font-sans font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-1">
              <label htmlFor="signup-name" className="text-[10px] font-bold text-slate-700 font-mono flex items-center justify-between">
                <span>FULL NAME:</span>
                {errors.name && <span className="text-[10.5px] text-rose-600 lowercase font-medium">{errors.name}</span>}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="signup-name"
                  type="text"
                  disabled={isLoading}
                  value={name}
                  onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rachel Mercer"
                  className={`w-full bg-slate-50/50 border pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    errors.name && touched.name 
                      ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-500/10' 
                      : 'border-slate-200 focus:border-indigo-650'
                  }`}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="signup-email" className="text-[10px] font-bold text-slate-700 font-mono flex items-center justify-between">
                <span>EMAIL ADDRESS:</span>
                {errors.email && touched.email && <span className="text-[10.5px] text-rose-600 lowercase font-medium animate-fade-in">{errors.email}</span>}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="signup-email"
                  type="email"
                  disabled={isLoading}
                  value={email}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rachel@mindmastery.edu"
                  className={`w-full bg-slate-50/50 border pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    errors.email && touched.email 
                      ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-500/10' 
                      : 'border-slate-200 focus:border-indigo-650'
                  }`}
                />
              </div>
            </div>

            {/* Password input group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Password */}
              <div className="space-y-1">
                <label htmlFor="signup-password" className="text-[10px] font-bold text-slate-700 font-mono flex items-center justify-between">
                  <span>PASSWORD:</span>
                  {errors.password && touched.password && <span className="text-[10.5px] text-rose-600 lowercase font-medium leading-none">{errors.password}</span>}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    disabled={isLoading}
                    value={password}
                    onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`w-full bg-slate-50/50 border pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                      errors.password && touched.password 
                        ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-500/10' 
                        : 'border-slate-200 focus:border-indigo-650'
                    }`}
                  />
                  <button
                    id="btn-signup-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label htmlFor="signup-confirm-password" className="text-[10px] font-bold text-slate-700 font-mono flex items-center justify-between">
                  <span>CONFIRM PASSWORD:</span>
                  {errors.confirmPassword && touched.confirmPassword && <span className="text-[10.5px] text-rose-600 lowercase font-medium leading-none">{errors.confirmPassword}</span>}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    disabled={isLoading}
                    value={confirmPassword}
                    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full bg-slate-50/50 border pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                      errors.confirmPassword && touched.confirmPassword 
                        ? 'border-rose-305 focus:border-rose-450 focus:ring-rose-500/10' 
                        : 'border-slate-200 focus:border-indigo-650'
                    }`}
                  />
                  <button
                    id="btn-signup-confirm-pwd-toggle"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Password Strength Indicator & Progress criteria bar */}
            {password.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2 mt-1 animate-fade-in text-left">
                <div className="flex items-center justify-between text-[11px] font-mono select-none">
                  <span className="font-bold text-slate-400">PASSWORD SECURITY STRENGTH:</span>
                  <span className={`font-black uppercase ${strengthInfo.text}`}>{strengthInfo.label}</span>
                </div>
                
                {/* 4 strength indicators color-mapped segments */}
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  <div className={`rounded-full h-full transition-all duration-300 ${password.length >= 8 ? strengthInfo.color : 'bg-slate-200'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${password.length >= 8 && strengthCount >= 2 ? strengthInfo.color : 'bg-slate-200'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${password.length >= 8 && strengthCount >= 3 ? strengthInfo.color : 'bg-slate-200'}`} />
                  <div className={`rounded-full h-full transition-all duration-300 ${password.length >= 10 && strengthCount === 4 ? strengthInfo.color : 'bg-slate-200'}`} />
                </div>

                {/* Granular rules checklist */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                  <span className={`text-[10px] font-medium flex items-center gap-1 font-sans ${strengthCriteria.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckSquare className={`w-3 h-3 ${strengthCriteria.length ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'}`} /> 
                    <span>At least 8 characters</span>
                  </span>
                  <span className={`text-[10px] font-medium flex items-center gap-1 font-sans ${strengthCriteria.hasLetter ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckSquare className={`w-3 h-3 ${strengthCriteria.hasLetter ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'}`} /> 
                    <span>Contains user letters</span>
                  </span>
                  <span className={`text-[10px] font-medium flex items-center gap-1 font-sans ${strengthCriteria.hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckSquare className={`w-3 h-3 ${strengthCriteria.hasNumber ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'}`} /> 
                    <span>Contains numbers (0-9)</span>
                  </span>
                  <span className={`text-[10px] font-medium flex items-center gap-1 font-sans ${strengthCriteria.hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <CheckSquare className={`w-3 h-3 ${strengthCriteria.hasSpecial ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'}`} /> 
                    <span>Contains special characters</span>
                  </span>
                </div>
              </div>
            )}

            {/* Terms declaration text */}
            <p className="text-[10px] text-slate-450 leading-relaxed pt-1.5 font-sans">
              By clicking "Create Account", you agree to abide by our school district code of conduct policy, privacy practices, and academic integrity regulations.
            </p>

            {/* Submit Register button */}
            <div className="pt-2">
              <button
                id="btn-signup-submit"
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-720 disabled:bg-indigo-400 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-indigo-100 disabled:shadow-none cursor-pointer scale-100 hover:scale-[1.01] active:scale-95 select-none disabled:pointer-events-none disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Engaging Secure Registry...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Start Learning</span>
                    <ArrowRight className="w-4 h-4 text-indigo-300" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* BOTTOM LINKS: Toggle to Sign In page */}
          <div className="border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-650 font-medium">
              Already have school credentials registered?{' '}
              <button
                id="btn-toggle-to-signin"
                type="button"
                onClick={onNavigateToSignIn}
                className="text-indigo-650 font-bold hover:text-indigo-850 hover:underline cursor-pointer"
              >
                Sign In Instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
