/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { User, Class, Subject, Topic, Lesson, UserRole, QuestionType } from '../types.ts';
import { db } from '../db.ts';
import { 
  Users, BookOpen, GraduationCap, School, Award, Activity, 
  Trash2, Edit, Plus, CheckCircle, Clock, Search, Shield, 
  FileText, ArrowRight, Save, X, RotateCcw
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
}

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  // Database States loaded inside component
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [classes, setClasses] = useState<Class[]>(() => db.getClasses());
  const [subjects, setSubjects] = useState<Subject[]>(() => db.getSubjects());
  const [topics, setTopics] = useState<Topic[]>(() => db.getTopics());
  const [lessons, setLessons] = useState<Lesson[]>(() => db.getLessons());
  const [progress] = useState(() => db.getProgress());

  // UI States
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'academic'>('overview');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Edit / Add Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Custom Delete / Reset Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: UserRole.STUDENT,
    classId: '',
    assignedClassesSubjects: [] as { classId: string; subjectId: string }[],
    avatarUrl: ''
  });

  // Academic management states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');

  // Creation forms states
  const [newClassForm, setNewClassForm] = useState({ name: '', description: '' });
  const [newSubjectForm, setNewSubjectForm] = useState({ name: '', description: '' });
  const [newTopicForm, setNewTopicForm] = useState({ name: '', description: '' });

  // Quick Stats
  const studentCount = users.filter((u) => u.role === UserRole.STUDENT).length;
  const teacherCount = users.filter((u) => u.role === UserRole.TEACHER).length;
  const classCount = classes.length;
  const subjectCount = subjects.length;
  const lessonCount = lessons.length;
  
  // Total quiz attempts
  const allAttempts = progress.flatMap((p) => p.attempts);
  const passAttempts = allAttempts.filter((a) => a.passed);
  const overallPassRate = allAttempts.length > 0 
    ? Math.round((passAttempts.length / allAttempts.length) * 100) 
    : 0;

  // Handles User Save
  const handleSaveUser = (e: FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email) return;

    let updatedUsers = [...users];

    if (editingUser) {
      // Edit mode
      updatedUsers = updatedUsers.map((u) => {
        if (u.id === editingUser.id) {
          const updated: User = {
            ...u,
            name: userFormData.name,
            email: userFormData.email,
            role: userFormData.role,
            avatarUrl: userFormData.avatarUrl || u.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150`
          };
          if (userFormData.role === UserRole.STUDENT) {
            updated.classId = userFormData.classId;
            delete updated.assignedClassesSubjects;
          } else if (userFormData.role === UserRole.TEACHER) {
            updated.assignedClassesSubjects = userFormData.assignedClassesSubjects;
            delete updated.classId;
          } else {
            delete updated.classId;
            delete updated.assignedClassesSubjects;
          }
          return updated;
        }
        return u;
      });
    } else {
      // Create mode
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: userFormData.name,
        email: userFormData.email,
        role: userFormData.role,
        avatarUrl: userFormData.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150`
      };

      if (userFormData.role === UserRole.STUDENT) {
        newUser.classId = userFormData.classId;
      } else if (userFormData.role === UserRole.TEACHER) {
        newUser.assignedClassesSubjects = userFormData.assignedClassesSubjects;
      }

      updatedUsers.push(newUser);
    }

    db.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setUserModalOpen(false);
    setEditingUser(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      classId: user.classId || '',
      assignedClassesSubjects: user.assignedClassesSubjects || [],
      avatarUrl: user.avatarUrl || ''
    });
    setUserModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete User Account',
      message: 'Are you sure you want to delete this user? All their associated records will be removed from state. This action cannot be undone.',
      onConfirm: () => {
        const updated = users.filter((u) => u.id !== id);
        db.saveUsers(updated);
        setUsers(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Add teacher assignments
  const handleAddAssignment = (classId: string, subjectId: string) => {
    if (!classId || !subjectId) return;
    const exists = userFormData.assignedClassesSubjects.some(
      (a) => a.classId === classId && a.subjectId === subjectId
    );
    if (!exists) {
      setUserFormData({
        ...userFormData,
        assignedClassesSubjects: [...userFormData.assignedClassesSubjects, { classId, subjectId }]
      });
    }
  };

  // Remove teacher assignment
  const handleRemoveAssignment = (index: number) => {
    const updated = [...userFormData.assignedClassesSubjects];
    updated.splice(index, 1);
    setUserFormData({
      ...userFormData,
      assignedClassesSubjects: updated
    });
  };

  // Create academic items
  const handleCreateClass = (e: FormEvent) => {
    e.preventDefault();
    if (!newClassForm.name) return;
    const newClass: Class = {
      id: `class-${Date.now()}`,
      name: newClassForm.name,
      description: newClassForm.description,
      archived: false
    };
    const updated = [...db.getAllClassesIncludingArchived(), newClass];
    db.saveClasses(updated);
    setClasses(db.getClasses());
    setNewClassForm({ name: '', description: '' });
  };

  const handleCreateSubject = (e: FormEvent) => {
    e.preventDefault();
    if (!newSubjectForm.name || !selectedClassId) return;
    const newSubject: Subject = {
      id: `subject-${Date.now()}`,
      classId: selectedClassId,
      name: newSubjectForm.name,
      description: newSubjectForm.description
    };
    const updated = [...subjects, newSubject];
    db.saveSubjects(updated);
    setSubjects(updated);
    setNewSubjectForm({ name: '', description: '' });
  };

  const handleCreateTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!newTopicForm.name || !selectedSubjectId) return;
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      subjectId: selectedSubjectId,
      name: newTopicForm.name,
      description: newTopicForm.description
    };
    const updated = [...topics, newTopic];
    db.saveTopics(updated);
    setTopics(updated);
    setNewTopicForm({ name: '', description: '' });
  };

  const handleDeleteClass = (classId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Archive Classroom',
      message: 'Archiving this class grade will hide it from active students and instructors. Are you sure you want to proceed?',
      onConfirm: () => {
        const allCls = db.getAllClassesIncludingArchived();
        const updated = allCls.map(c => c.id === classId ? { ...c, archived: true } : c);
        db.saveClasses(updated);
        setClasses(db.getClasses());
        if (selectedClassId === classId) {
          setSelectedClassId('');
          setSelectedSubjectId('');
          setSelectedTopicId('');
        }
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Subject Module',
      message: 'Deleting this subject will remove it completely. This action will break downstream relationships for chapter topics and sequential lessons. Proceed?',
      onConfirm: () => {
        const updated = subjects.filter(s => s.id !== subjectId);
        db.saveSubjects(updated);
        setSubjects(updated);
        if (selectedSubjectId === subjectId) {
          setSelectedSubjectId('');
          setSelectedTopicId('');
        }
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteTopic = (topicId: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Chapter Division',
      message: 'Are you sure you want to delete this topic along with all its sequential lessons and lectures? This action is permanent and cannot be reversed.',
      onConfirm: () => {
        const updatedTopics = topics.filter(t => t.id !== topicId);
        db.saveTopics(updatedTopics);
        setTopics(updatedTopics);

        // Also clean up lessons optionally
        const updatedLessons = lessons.filter(l => l.topicId !== topicId);
        db.saveLessons(updatedLessons);
        setLessons(updatedLessons);

        if (selectedTopicId === topicId) {
          setSelectedTopicId('');
        }
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetSystem = () => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Restore Default Datasets',
      message: 'WARNING: This will completely restore the system database to its original demo state, clearing all customized classes, subject modules, questions, student progress scores, and registered user accounts. Ready to reset?',
      onConfirm: () => {
        db.resetAll();
        // Since db.resetAll() already reloads the page, we don't strictly need to close the modal, but it's good practice.
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filtered Users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div id="admin-dashboard-root" className="space-y-8 animate-fade-in text-slate-800">
      {/* Overview Head & Factory Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 id="admin-welcome-heading" className="text-2xl font-bold text-slate-900 tracking-tight font-display">System Administration</h2>
          <p className="text-slate-500 text-sm mt-1">Configure classes, assign roles, monitor platform metrics, and manage core curriculum structure.</p>
        </div>
        <button
          id="btn-reset-system"
          onClick={handleResetSystem}
          className="flex items-center gap-2 px-3 py-1.5 self-start text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors border border-rose-250 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Demo Database
        </button>
      </div>

      {/* Tabs */}
      <div id="admin-tabs" className="flex border-b border-slate-200">
        <button
          id="tab-admin-overview"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Overview & Metrics
        </button>
        <button
          id="tab-admin-users"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory ({users.length})
        </button>
        <button
          id="tab-admin-academic"
          onClick={() => setActiveTab('academic')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === 'academic'
              ? 'border-indigo-600 text-indigo-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200'
          }`}
        >
          <School className="w-4 h-4" />
          Curriculum Architect
        </button>
      </div>

      {/* Overview View */}
      {activeTab === 'overview' && (
        <div id="admin-view-overview" className="space-y-8">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Total Students</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{studentCount}</span>
                <span className="text-xs text-indigo-600 font-medium font-mono">Enrolled</span>
              </div>
              <div className="mt-4 p-2 bg-indigo-50/50 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Instructors</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{teacherCount}</span>
                <span className="text-xs text-indigo-650 font-medium font-mono">RBAC</span>
              </div>
              <div className="mt-4 p-2 bg-pink-50/50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-500" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Active Classes</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{classCount}</span>
                <span className="text-xs text-emerald-650 font-medium font-mono">Grades</span>
              </div>
              <div className="mt-4 p-2 bg-emerald-50/50 rounded-xl flex items-center justify-center">
                <School className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Total Subjects</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{subjectCount}</span>
                <span className="text-xs text-amber-650 font-medium font-mono">Active</span>
              </div>
              <div className="mt-4 p-2 bg-amber-50/50 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono font-mono">Quiz Pass Rate</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{overallPassRate}%</span>
                <span className="text-xs text-violet-600 font-medium font-mono">Target: 75%</span>
              </div>
              <div className="mt-4 p-2 bg-violet-50/50 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-violet-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Assessments list */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Recent Quiz Activity</h3>
                  <p className="text-gray-400 text-xs">Real-time evaluations across the learning platform</p>
                </div>
                <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">Live Stream</span>
              </div>

              <div className="divide-y divide-gray-100">
                {allAttempts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No assessments taken on this environment yet.
                  </div>
                ) : (
                  allAttempts.slice(-5).reverse().map((att) => {
                    const stud = users.find((u) => u.id === att.studentId);
                    const les = lessons.find((l) => l.id === att.lessonId);
                    return (
                      <div key={att.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={stud?.avatarUrl || `https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150`}
                            alt={stud?.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-100 bg-gray-50"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{stud?.name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Assessed: <span className="font-medium text-gray-600">{les?.name || 'Unknown Lesson'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <span className={`text-sm font-bold font-mono ${att.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {att.score}%
                            </span>
                            <span className="text-gray-400 text-xs block font-mono">
                              {new Date(att.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${att.passed ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick class list */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Platform Classes</h3>
              <p className="text-gray-400 text-xs mt-0.5">Quick lookup table of registered classes</p>
              
              <div className="space-y-3">
                {classes.map((cls) => {
                  const classStudents = users.filter((u) => u.role === UserRole.STUDENT && u.classId === cls.id);
                  const activeSubjects = subjects.filter((s) => s.classId === cls.id);
                  
                  return (
                    <div key={cls.id} className="p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900">{cls.name}</span>
                        <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                          {classStudents.length} Students
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{cls.description}</p>
                      
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1 font-mono">
                          <BookOpen className="w-3 h-3" />
                          {activeSubjects.length} subjects
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab View */}
      {activeTab === 'users' && (
        <div id="admin-view-users" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-user-input"
                type="text"
                placeholder="Search registered staff and students..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                id="filter-role-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="teacher">Teachers</option>
                <option value="student">Students</option>
              </select>

              <button
                id="btn-add-user"
                onClick={() => {
                  setEditingUser(null);
                  setUserFormData({ name: '', email: '', role: UserRole.STUDENT, classId: classes[0]?.id || '', assignedClassesSubjects: [], avatarUrl: '' });
                  setUserModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors border border-indigo-700 font-mono shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Enroll User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table id="tbl-users" className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs font-bold font-mono tracking-wider">
                    <th className="py-3 px-6">Name & ID</th>
                    <th className="py-3 px-6">User Role</th>
                    <th className="py-3 px-6">Academic Assignation</th>
                    <th className="py-3 px-6 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400">
                        No users match current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      // Lookup Class Name for students
                      const studentClass = classes.find((c) => c.id === u.classId);

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6 flex items-center gap-3">
                            <img
                              src={u.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-100 bg-gray-50"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                              u.role === UserRole.ADMIN 
                                ? 'bg-purple-150 text-purple-700' 
                                : u.role === UserRole.TEACHER 
                                ? 'bg-pink-50 text-pink-700 border border-pink-100'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              <Shield className="w-3 h-3" />
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {u.role === UserRole.STUDENT && (
                              <span className="inline-flex items-center gap-1 font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                <School className="w-3.5 h-3.5 text-slate-505" />
                                {studentClass?.name || 'Unassigned'}
                              </span>
                            )}
                            {u.role === UserRole.TEACHER && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.assignedClassesSubjects && u.assignedClassesSubjects.length > 0 ? (
                                  u.assignedClassesSubjects.map((ass, idx) => {
                                    const assClass = classes.find((c) => c.id === ass.classId);
                                    const assSubject = subjects.find((s) => s.id === ass.subjectId);
                                    return (
                                      <span key={idx} className="bg-pink-50 hover:bg-pink-100 text-[11px] font-medium text-pink-800 px-1.5 py-0.5 rounded border border-pink-100">
                                        {assClass?.name}: {assSubject?.name}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No assigned subjects</span>
                                )}
                              </div>
                            )}
                            {u.role === UserRole.ADMIN && (
                              <span className="text-xs font-mono text-gray-400">Universal Access</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              id={`btn-edit-user-${u.id}`}
                              onClick={() => handleEditUser(u)}
                              className="p-1 px-2 text-indigo-600 hover:bg-indigo-50 rounded text-xs inline-flex items-center gap-1 font-semibold transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 px-2 text-rose-600 hover:bg-rose-50 rounded text-xs inline-flex items-center gap-1 font-semibold transition"
                              disabled={u.id === currentUser.id} // Don't let logged in admin delete themselves
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum architect */}
      {activeTab === 'academic' && (
        <div id="admin-view-academic" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Classes */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-indigo-500"></span>
                  Active Classes
                </h3>
                <p className="text-xs text-gray-400">Step 1: Choose or build a grade</p>
              </div>
            </div>

            {/* Quick add class */}
            <form onSubmit={handleCreateClass} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-3">
              <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">Publish New Class</span>
              <input
                id="input-class-name"
                type="text"
                placeholder="e.g. Grade 11"
                value={newClassForm.name}
                onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                id="input-class-desc"
                type="text"
                placeholder="Brief description..."
                value={newClassForm.description}
                onChange={(e) => setNewClassForm({ ...newClassForm, description: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                id="btn-create-class"
                type="submit"
                className="w-full py-1 bg-indigo-600 font-mono hover:bg-indigo-700 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Class
              </button>
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setSelectedSubjectId('');
                    setSelectedTopicId('');
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                    selectedClassId === cls.id 
                      ? 'border-indigo-650 bg-indigo-50/30' 
                      : 'border-gray-150 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-bold text-sm text-gray-800">{cls.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{cls.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-archive-class-${cls.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(cls.id);
                      }}
                      className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded text-gray-400 text-xs inline-flex items-center transition"
                      title="Archive Class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className={`w-4 h-4 text-gray-400 ${selectedClassId === cls.id ? 'translate-x-1 text-indigo-500' : ''} transition-transform`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Subjects */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-pink-500"></span>
                  Active Subjects
                </h3>
                <p className="text-xs text-gray-400">Step 2: Choose or post subject</p>
              </div>
            </div>

            {selectedClassId ? (
              <>
                {/* Add subject form */}
                <form onSubmit={handleCreateSubject} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-3">
                  <span className="text-[10px] font-bold tracking-wider text-pink-600 uppercase">Add Subject to {classes.find(c => c.id === selectedClassId)?.name}</span>
                  <input
                    id="input-subject-name"
                    type="text"
                    placeholder="e.g. Organic Chemistry"
                    value={newSubjectForm.name}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    id="input-subject-desc"
                    type="text"
                    placeholder="Subject theme..."
                    value={newSubjectForm.description}
                    onChange={(e) => setNewSubjectForm({ ...newSubjectForm, description: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    id="btn-create-subject"
                    type="submit"
                    className="w-full py-1 bg-pink-600 font-mono hover:bg-pink-750 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Subject
                  </button>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {subjects.filter(s => s.classId === selectedClassId).length === 0 ? (
                    <div className="text-center py-10 text-gray-450 text-xs italic">
                      No subjects added in this grade yet.
                    </div>
                  ) : (
                    subjects
                      .filter(s => s.classId === selectedClassId)
                      .map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubjectId(sub.id);
                            setSelectedTopicId('');
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                            selectedSubjectId === sub.id 
                              ? 'border-pink-650 bg-pink-50/20' 
                              : 'border-gray-150 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="font-bold text-sm text-gray-800">{sub.name}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{sub.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              id={`btn-delete-subject-${sub.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubject(sub.id);
                              }}
                              className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded text-gray-400 text-xs inline-flex items-center transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ArrowRight className={`w-4 h-4 text-gray-400 ${selectedSubjectId === sub.id ? 'translate-x-1 text-pink-500' : ''} transition-transform`} />
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-400 text-sm italic">
                Please select a Class in the left column.
              </div>
            )}
          </div>

          {/* Column 3: Topics */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded bg-amber-500"></span>
                  Active Topics
                </h3>
                <p className="text-xs text-gray-400">Step 3: Define structured topics</p>
              </div>
            </div>

            {selectedSubjectId ? (
              <>
                {/* Add topic form */}
                <form onSubmit={handleCreateTopic} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-3">
                  <span className="text-[10px] font-bold tracking-wider text-amber-600 uppercase">Publish Topic to {subjects.find(s => s.id === selectedSubjectId)?.name}</span>
                  <input
                    id="input-topic-name"
                    type="text"
                    placeholder="e.g. Atomic Configurations"
                    value={newTopicForm.name}
                    onChange={(e) => setNewTopicForm({ ...newTopicForm, name: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    id="input-topic-desc"
                    type="text"
                    placeholder="Brief objective..."
                    value={newTopicForm.description}
                    onChange={(e) => setNewTopicForm({ ...newTopicForm, description: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    id="btn-create-topic"
                    type="submit"
                    className="w-full py-1 bg-amber-600 font-mono hover:bg-amber-700 text-white font-semibold text-xs rounded transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Create Topic
                  </button>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {topics.filter(t => t.subjectId === selectedSubjectId).length === 0 ? (
                    <div className="text-center py-10 text-gray-450 text-xs italic">
                      No topics structured here yet.
                    </div>
                  ) : (
                    topics
                      .filter(t => t.subjectId === selectedSubjectId)
                      .map((topic) => {
                        const topicLessons = lessons.filter(l => l.topicId === topic.id);
                        return (
                          <div
                            key={topic.id}
                            className="p-3.5 rounded-xl border border-gray-150 bg-white shadow-xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-gray-800">{topic.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{topic.description}</p>
                              </div>
                              <button
                                id={`btn-delete-topic-${topic.id}`}
                                onClick={() => handleDeleteTopic(topic.id)}
                                className="p-1 hover:bg-rose-100 hover:text-rose-600 rounded text-gray-300 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-gray-50 text-[11px] text-gray-400">
                              <span className="font-mono">{topicLessons.length} lessons integrated</span>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">Auto progressions enabled</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-400 text-sm italic">
                Please select a Subject in the second column to manage topics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enroll & Edit User Modal Overlay */}
      {userModalOpen && (
        <div id="modal-user-overlay" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scale-in border border-gray-100">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-lg">{editingUser ? 'Modify User Profile' : 'Register New User (RBAC)'}</h3>
              <button
                id="btn-close-modal"
                onClick={() => setUserModalOpen(false)}
                className="p-1 hover:bg-indigo-700 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest font-mono">Full Name</label>
                <input
                  id="input-user-form-name"
                  type="text"
                  required
                  placeholder="e.g. Amanda Cole"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full text-sm px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest font-mono">Institutional Email</label>
                <input
                  id="input-user-form-email"
                  type="email"
                  required
                  placeholder="e.g. amanda.cole@mindmastery.edu"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full text-sm px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest font-mono block">Profile Avatar Image</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-inner">
                  <div className="relative shrink-0 select-none">
                    <img
                      src={userFormData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                      alt="Preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-indigo-600 shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10.5px] text-slate-500 font-semibold block leading-tight">Choose a template photo or paste an custom network link:</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
                      {[
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
                        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150'
                      ].map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setUserFormData({ ...userFormData, avatarUrl: url })}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 cursor-pointer shrink-0 ${
                            userFormData.avatarUrl === url
                              ? 'border-indigo-600 ring-2 ring-indigo-100 scale-105'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <input
                  id="input-user-form-avatar"
                  type="url"
                  placeholder="Or paste custom image address (e.g., https://unsplash.com/...)"
                  value={userFormData.avatarUrl}
                  onChange={(e) => setUserFormData({ ...userFormData, avatarUrl: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest font-mono">Security Role (RBAC)</label>
                <select
                  id="select-user-form-role"
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="student">Student (Consumes curriculum & answers evaluations)</option>
                  <option value="teacher">Teacher (Creates topics, uploads lessons, formats quizzes)</option>
                  <option value="admin">Administrator (Universal structural and user management)</option>
                </select>
              </div>

              {/* Conditional options for Students */}
              {userFormData.role === UserRole.STUDENT && (
                <div className="p-4 bg-indigo-50/50 rounded-xl space-y-2 border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700 font-mono tracking-wider block">Student Assignation</span>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Assigned Academic Class:</label>
                    <select
                      id="select-student-class"
                      value={userFormData.classId}
                      onChange={(e) => setUserFormData({ ...userFormData, classId: e.target.value })}
                      className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-indigo-500">The student automatically completes syllabus blocks relevant to their chosen grade level.</p>
                  </div>
                </div>
              )}

              {/* Conditional options for Teachers */}
              {userFormData.role === UserRole.TEACHER && (
                <div className="p-4 bg-pink-50/50 rounded-xl space-y-3 border border-pink-100">
                  <span className="text-xs font-semibold text-pink-700 font-mono tracking-wider block">Teacher Curriculum Control mapping</span>

                  <div className="flex gap-2 items-end bg-white p-2.5 rounded-lg border border-pink-100">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block font-mono">Class</span>
                      <select
                        id="select-teacher-class"
                        className="w-full text-xs px-2 py-1 bg-gray-50 rounded border border-gray-200 cursor-pointer focus:outline-none"
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          const subSelect = document.getElementById('select-teacher-subject') as HTMLSelectElement;
                          if (subSelect) {
                            subSelect.innerHTML = '<option value="">-- Choose Subject --</option>';
                            subjects.filter(s => s.classId === val).forEach(s => {
                              const o = document.createElement('option');
                              o.value = s.id;
                              o.text = s.name;
                              subSelect.add(o);
                            });
                          }
                        }}
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block font-mono">Subject</span>
                      <select
                        id="select-teacher-subject"
                        className="w-full text-xs px-2 py-1 bg-gray-50 rounded border border-gray-200 cursor-pointer focus:outline-none"
                      >
                        <option value="">-- Choose Subject --</option>
                      </select>
                    </div>

                    <button
                      id="btn-assign-subject-teacher"
                      type="button"
                      onClick={() => {
                        const classSelect = document.getElementById('select-teacher-class') as HTMLSelectElement;
                        const subjectSelect = document.getElementById('select-teacher-subject') as HTMLSelectElement;
                        if (classSelect && subjectSelect) {
                          handleAddAssignment(classSelect.value, subjectSelect.value);
                        }
                      }}
                      className="bg-pink-600 hover:bg-pink-750 text-white px-2.5 py-1.5 rounded text-xs font-semibold transition"
                    >
                      Assign
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block font-mono">Assigned Blocks :</span>
                    {userFormData.assignedClassesSubjects.length === 0 ? (
                      <p className="text-[11.5px] italic text-pink-500">No subject access paths assigned to this instructor.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {userFormData.assignedClassesSubjects.map((ass, i) => {
                          const cl = classes.find(c => c.id === ass.classId);
                          const su = subjects.find(s => s.id === ass.subjectId);
                          return (
                            <span key={i} className="flex items-center gap-1 bg-pink-100 text-pink-850 text-xs px-2 py-0.5 rounded border border-pink-200">
                              {cl?.name}: {su?.name}
                              <button
                                id={`btn-remove-assign-${i}`}
                                type="button"
                                onClick={() => handleRemoveAssignment(i)}
                                className="text-pink-600 hover:text-rose-600 font-bold ml-1"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  id="btn-modal-cancel"
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-modal-save"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition"
                >
                  Save User Accounts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-scale-in">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 id="delete-confirm-title" className="text-base font-bold text-slate-900 font-display">{deleteConfirm.title}</h3>
                  <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider font-mono">Destructive Action Confirmation</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed">
                {deleteConfirm.message}
              </p>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-150">
              <button
                id="btn-delete-cancel"
                type="button"
                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel / Return
              </button>
              <button
                id="btn-delete-confirm"
                type="button"
                onClick={() => {
                  if (deleteConfirm.onConfirm) {
                    deleteConfirm.onConfirm();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition shadow-sm hover:shadow cursor-pointer"
              >
                Permanently Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
