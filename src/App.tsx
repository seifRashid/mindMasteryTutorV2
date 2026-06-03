/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, UserRole } from './types.ts';
import { db } from './db.ts';
import AdminDashboard from './components/AdminDashboard.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import StudentDashboard from './components/StudentDashboard.tsx';
import { Award, Shield, UserCheck, Flame, BookOpen, User as UserIcon, ArrowRight, Sparkles, GraduationCap, Video, CheckSquare, CheckCircle, ChevronRight, Activity, Menu, X } from 'lucide-react';

export default function App() {
  // Initialize Database once on boot
  useEffect(() => {
    db.init();
  }, []);

  // Loaded active users from DB
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [currentUserId, setCurrentUserId] = useState<string>('user-student-alex'); // start as Alex to show progression rules immediately
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Current active logged in teacher/student/admin object
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  // Reload user directory when swapping tabs or edits happen
  const handleUserSwap = (userId: string) => {
    // Save previous progress changes and load fresh database from state
    setUsers(db.getUsers());
    setCurrentUserId(userId);
    setShowLanding(false); // Auto-direct to core dashboards if swapped from simulator bar
  };

  // Direct fast role-entry triggers from CTAs
  const handleLaunchRole = (role: UserRole) => {
    const matchedUser = users.find(u => u.role === role);
    if (matchedUser) {
      setCurrentUserId(matchedUser.id);
    }
    setShowLanding(false);
  };

  // Live dynamic system counters
  const classesCount = db.getClasses().length;
  const subjectsCount = db.getSubjects().length;
  const topicsCount = db.getTopics().length;
  const lessonsCount = db.getLessons().length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Simulation Helper Portal (Top Header) */}
      <div id="simulation-portal-bar" className="bg-slate-900 text-slate-300 text-xs px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-800 font-mono shadow-sm select-none">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
          <span className="font-bold uppercase text-indigo-400">RBAC Simulator:</span>
          <span>Swap user roles on-the-fly to test student, teacher or administrator capabilities instantly.</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="user-switch-select" className="text-slate-400 font-semibold flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Log in as:
          </label>
          <select
            id="user-switch-select"
            value={currentUserId}
            onChange={(e) => handleUserSwap(e.target.value)}
            className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-2.5 py-1 text-xs font-semibold font-mono cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                {u.name} ({u.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Educational Navbar */}
      <header id="app-navigation-header" className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="w-full flex items-center justify-between">
          {/* Logo brand click goes to landing home */}
          <button
            id="btn-logo-home"
            onClick={() => {
              setShowLanding(true);
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
              <Award className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-1.5 animate-scale-in">
                MindMastery <span className="text-indigo-600 font-mono text-xs uppercase bg-indigo-50 px-2.5 py-0.5 rounded-md font-bold select-none">LMS</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Structured Academic Mastery System</p>
            </div>
          </button>

          {/* Hamburger Menu Toggle Button on Mobile */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
          </button>
        </div>

        {/* Global Navigation Hub (collapsible on mobile, visible on lg screens) */}
        <div className={`mt-4 lg:mt-0 flex-col lg:flex-row lg:flex items-stretch lg:items-center gap-4 w-full lg:w-auto ${mobileMenuOpen ? 'flex animate-slide-down' : 'hidden lg:flex'}`}>
          <nav className="flex flex-col lg:flex-row items-stretch lg:items-center gap-1 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            <button
              id="btn-nav-home"
              onClick={() => {
                setShowLanding(true);
                setMobileMenuOpen(false);
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer text-center ${
                showLanding
                  ? 'bg-white text-indigo-805 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Overview Home
            </button>
            <button
              id="btn-nav-class"
              onClick={() => {
                setShowLanding(false);
                setMobileMenuOpen(false);
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer text-center ${
                !showLanding
                  ? 'bg-white text-indigo-805 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active Dashboard
            </button>
          </nav>

          <span className="w-full h-[1px] lg:w-[1px] lg:h-6 bg-slate-200 block lg:inline"></span>

          {/* Current logged-in user profile view */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs w-full lg:w-auto">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full border-2 border-indigo-100 object-cover bg-slate-50 shrink-0"
            />
            <div className="text-left flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-slate-950">{currentUser.name}</span>
                <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${
                  currentUser.role === UserRole.ADMIN 
                    ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                    : currentUser.role === UserRole.TEACHER 
                    ? 'bg-pink-50 text-pink-700 border border-pink-100' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold font-mono leading-none">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="app-workspace-canvas" className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-8">
        
        {showLanding ? (
          /* Sleek Landing Page layout */
          <div className="space-y-16 animate-fade-in text-slate-800 py-4 max-w-5xl mx-auto">
            
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold font-mono tracking-wide animate-fade-in select-none">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-100" />
                <span>Structured Academic LMS Portal</span>
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-display max-w-3xl mx-auto leading-tight">
                Linear Chapters & <span className="text-indigo-600">Mastery-Based</span> Academic Success.
              </h2>
              
              <p className="text-base sm:text-lg text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed">
                Unlock potential with structured curricular paths where students watch video lessons, absorb extensive study guides, and prove their high-level comprehension before moving forward.
              </p>
            </div>

            {/* CTA Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* STUDENT CTA */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                    <GraduationCap className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold font-mono uppercase text-indigo-600 tracking-wider">Student Hub</span>
                    <h3 className="text-lg font-bold text-slate-900 font-display mt-0.5">Undergraduate Class</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Practice lessons, view class lectures, digest deep mathematical notes, and take active assessments.
                    </p>
                  </div>
                  
                  <ul className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Mastery locked requirements</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Sequential unit progressions</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Target diagnostic threshold of 75%</li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    id="cta-enter-class"
                    onClick={() => handleLaunchRole(UserRole.STUDENT)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-indigo-100 cursor-pointer group-hover:scale-[1.02] active:scale-95"
                  >
                    Enter Class <ArrowRight className="w-4 h-4 text-indigo-200 transition-transform group-hover:translate-x-1" />
                  </button>
                  <p className="text-center text-[10px] text-slate-400 italic mt-2 font-mono">Demos: Alex Mercer (Grade 8 Student)</p>
                </div>
              </div>

              {/* TEACHER CTA */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-650 shadow-xs shrink-0">
                    <BookOpen className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold font-mono uppercase text-pink-600 tracking-wider">Instructor workspace</span>
                    <h3 className="text-lg font-bold text-slate-900 font-display mt-0.5">Authoring Lab</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Draft brand new chapters, embed visual tutorials, structure study guides, and review student scorecard stats.
                    </p>
                  </div>
                  
                  <ul className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-pink-500 shrink-0" /> Live test-item database editors</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-pink-500 shrink-0" /> Full curriculum addition panels</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-pink-500 shrink-0" /> Instant statistics feedback maps</li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    id="cta-enter-teacher"
                    onClick={() => handleLaunchRole(UserRole.TEACHER)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-md cursor-pointer group-hover:scale-[1.02] active:scale-95"
                  >
                    Open Teacher Console <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </button>
                  <p className="text-center text-[10px] text-slate-400 italic mt-2 font-mono">Demos: Sarah Miller (Junior Instructor)</p>
                </div>
              </div>

              {/* ADMIN CTA */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-605 shadow-xs shrink-0">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold font-mono uppercase text-purple-600 tracking-wider">System Control</span>
                    <h3 className="text-lg font-bold text-slate-900 font-display mt-0.5">Admin Terminal</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Oversee system metrics, register students, edit roles, assign classrooms, and reset demo datasets.
                    </p>
                  </div>
                  
                  <ul className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Global user registries</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Cohort config panels</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" /> DB hard resets</li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    id="cta-enter-admin"
                    onClick={() => handleLaunchRole(UserRole.ADMIN)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-md cursor-pointer group-hover:scale-[1.02] active:scale-95"
                  >
                    Open Admin Terminal <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </button>
                  <p className="text-center text-[10px] text-slate-400 italic mt-2 font-mono">Demos: Eleanor Vance (Full Administrator)</p>
                </div>
              </div>

            </div>

            {/* Static counters block */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs border-dashed animate-scale-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="font-bold text-slate-905">Active Platform Scope Overview</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Live database configurations fetched on client-side state</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-150 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Cache Synchronized
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Cohort Grades</span>
                  <p className="text-2xl font-black text-slate-900 font-display">{classesCount} Class Grades</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Core Modules</span>
                  <p className="text-2xl font-black text-slate-900 font-display">{subjectsCount} Subjects</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Chapter Divisions</span>
                  <p className="text-2xl font-black text-slate-900 font-display">{topicsCount} Chapters</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Lesson Lectures</span>
                  <p className="text-2xl font-black text-slate-900 font-display">{lessonsCount} active units</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Main active portals block based on active user state */
          <div className="animate-fade-in">
            {/* Mount appropriate Dashboard view based on user's security role */}
            {currentUser.role === UserRole.ADMIN && (
              <AdminDashboard currentUser={currentUser} />
            )}

            {currentUser.role === UserRole.TEACHER && (
              <TeacherDashboard currentUser={currentUser} />
            )}

            {currentUser.role === UserRole.STUDENT && (
              <StudentDashboard currentUser={currentUser} />
            )}
          </div>
        )}

      </main>

      {/* Footer descriptor */}
      <footer id="app-global-footer" className="bg-white border-t border-slate-150 py-5 text-center text-xs text-gray-400 font-mono mt-12 w-full">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 MindMastery Tutor. All capabilities deployed securely on client-side state.</p>
          <p className="flex items-center gap-1 text-slate-500 font-semibold select-none">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse fill-amber-50" /> Built for Mastery-Based Success
          </p>
        </div>
      </footer>

    </div>
  );
}
