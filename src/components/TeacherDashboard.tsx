/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { User, Class, Subject, Topic, Lesson, UserRole, Question, QuestionType, NotePdf } from '../types.ts';
import { db } from '../db.ts';
import { 
  Plus, Edit2, Trash2, Video, BookOpen, Layers, 
  HelpCircle, Eye, Check, RefreshCw, Award, 
  ChevronRight, Save, Clock, ArrowLeft, BarChart2, GraduationCap,
  FileText, Paperclip, X, Upload, Info, File
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor.tsx';

interface TeacherDashboardProps {
  currentUser: User;
}

export default function TeacherDashboard({ currentUser }: TeacherDashboardProps) {
  // DB States
  const [users] = useState<User[]>(() => db.getUsers());
  const [classes] = useState<Class[]>(() => db.getClasses());
  const [subjects] = useState<Subject[]>(() => db.getSubjects());
  const [topics, setTopics] = useState<Topic[]>(() => db.getTopics());
  const [lessons, setLessons] = useState<Lesson[]>(() => db.getLessons());
  const [progress] = useState(() => db.getProgress());

  // Get current teacher's assignments
  const assignments = currentUser.assignedClassesSubjects || [];

  // Local interaction states
  const [selectedMappingIndex, setSelectedMappingIndex] = useState<number>(0);
  const selectedMapping = assignments[selectedMappingIndex];

  // Resolve active objects
  const activeClass = selectedMapping ? classes.find(c => c.id === selectedMapping.classId) : null;
  const activeSubject = selectedMapping ? subjects.find(s => s.id === selectedMapping.subjectId) : null;

  // Active Subject's topics
  const subjectTopics = activeSubject ? topics.filter(t => t.subjectId === activeSubject.id) : [];

  // Active selected topic to view lessons/quizzes
  const [activeTopicId, setActiveTopicId] = useState<string>('');
  const activeTopic = topics.find(t => t.id === activeTopicId);
  const topicLessons = activeTopic ? lessons.filter(l => l.topicId === activeTopic.id) : [];

  // Active student report view or content manager
  const [viewMode, setViewMode] = useState<'content' | 'reports'>('content');

  // Topic Addition form
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicAddOpen, setTopicAddOpen] = useState(false);

  // Custom Delete Confirmation Modal State
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

  // Lesson Creator / Editor states
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  
  // Lesson Form Data
  const [lessonName, setLessonName] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [lessonPdfs, setLessonPdfs] = useState<NotePdf[]>([]);
  const [lessonQuestions, setLessonQuestions] = useState<Question[]>([]);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(true);

  // States to add a single PDF
  const [newPdfName, setNewPdfName] = useState('');
  const [newPdfDescription, setNewPdfDescription] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [pdfManualUrlActive, setPdfManualUrlActive] = useState(false);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  const handlePdfFileChange = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Only PDF documents (.pdf) are accepted.');
      return;
    }
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setNewPdfName(cleanName);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setNewPdfUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Question editing modal helper
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>(QuestionType.MCQ);
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');

  // Save new topic
  const handleAddTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!topicName || !activeSubject) return;

    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      subjectId: activeSubject.id,
      name: topicName,
      description: topicDesc
    };

    const updated = [...topics, newTopic];
    db.saveTopics(updated);
    setTopics(updated);
    setTopicName('');
    setTopicDesc('');
    setTopicAddOpen(false);
    setActiveTopicId(newTopic.id); // select newly created topic
  };

  // Open Lesson Form
  const handleOpenLessonCreator = (lessonId?: string) => {
    setNewPdfName('');
    setNewPdfDescription('');
    setNewPdfUrl('');
    setPdfManualUrlActive(false);
    setIsDraggingPdf(false);

    if (lessonId) {
      // Edit mode
      const target = lessons.find(l => l.id === lessonId);
      if (target) {
        setEditingLessonId(lessonId);
        setLessonName(target.name);
        setVideoTitle(target.videoTitle);
        setVideoDescription(target.videoDescription);
        setVideoUrl(target.videoUrl);
        setLessonDuration(target.duration);
        setLessonNotes(target.notes);
        setLessonPdfs(target.pdfs || []);
        setLessonQuestions(target.questions || []);
        setAllowMultipleAttempts(target.allowMultipleAttempts !== false);
      }
    } else {
      // Create mode
      setEditingLessonId(null);
      setLessonName('');
      setVideoTitle('');
      setVideoDescription('');
      setVideoUrl('https://www.youtube.com/embed/grnP3mDuESc');
      setLessonDuration('05:00');
      setLessonNotes('Type rich theoretical notes, lists, equations, or guidelines here to educate your students.');
      setLessonPdfs([]);
      setLessonQuestions([]);
      setAllowMultipleAttempts(true);
    }
    setLessonEditorOpen(true);
  };

  // Save complete lesson (including its quiz questions and PDF files)
  const handleSaveLesson = () => {
    if (!lessonName || !activeTopicId) return;

    let updatedLessons = [...lessons];

    if (editingLessonId) {
      updatedLessons = updatedLessons.map(l => {
        if (l.id === editingLessonId) {
          return {
            ...l,
            name: lessonName,
            videoTitle,
            videoDescription,
            videoUrl,
            duration: lessonDuration,
            notes: lessonNotes,
            pdfs: lessonPdfs,
            questions: lessonQuestions,
            allowMultipleAttempts: allowMultipleAttempts
          };
        }
        return l;
      });
    } else {
      const newLesson: Lesson = {
        id: `lesson-${Date.now()}`,
        topicId: activeTopicId,
        name: lessonName,
        videoTitle,
        videoDescription,
        videoUrl,
        duration: lessonDuration,
        notes: lessonNotes,
        pdfs: lessonPdfs,
        questions: lessonQuestions,
        allowMultipleAttempts: allowMultipleAttempts
      };
      updatedLessons.push(newLesson);
    }

    db.saveLessons(updatedLessons);
    setLessons(updatedLessons);
    setLessonEditorOpen(false);
    setEditingLessonId(null);
  };

  const handleDeleteLesson = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Lesson Unit',
      message: 'Are you sure you want to permanently delete this lesson and its associated study materials/assessment questions? This action cannot be undone.',
      onConfirm: () => {
        const updated = lessons.filter(l => l.id !== id);
        db.saveLessons(updated);
        setLessons(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Question editing sub-flow
  const handleOpenQuestionEditor = (idx?: number) => {
    if (idx !== undefined && idx !== null) {
      // Edit
      const q = lessonQuestions[idx];
      setEditingQuestionIdx(idx);
      setQText(q.text);
      setQType(q.type);
      setQOptions(q.options);
      setQCorrectAnswer(q.correctAnswer);
      setQExplanation(q.explanation || '');
    } else {
      // Create new
      setEditingQuestionIdx(null);
      setQText('');
      setQType(QuestionType.MCQ);
      setQOptions(['', '', '', '']);
      setQCorrectAnswer('');
      setQExplanation('');
    }
    setQuestionEditorOpen(true);
  };

  const handleSaveQuestion = () => {
    if (!qText || !qCorrectAnswer) return;

    const formattedQuestion: Question = {
      id: editingQuestionIdx !== null ? lessonQuestions[editingQuestionIdx].id : `q-${Date.now()}`,
      text: qText,
      type: qType,
      options: qType === QuestionType.TF ? ['True', 'False'] : qOptions.filter(o => o !== ''),
      correctAnswer: qCorrectAnswer,
      explanation: qExplanation
    };

    const updatedQuestions = [...lessonQuestions];
    if (editingQuestionIdx !== null) {
      updatedQuestions[editingQuestionIdx] = formattedQuestion;
    } else {
      updatedQuestions.push(formattedQuestion);
    }

    setLessonQuestions(updatedQuestions);
    setQuestionEditorOpen(false);
  };

  const handleDeleteQuestion = (idx: number) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Delete Assessment Question',
      message: 'Are you sure you want to delete this question? Note that you will also need to save the lesson unit for these changes to write to store.',
      onConfirm: () => {
        const updated = [...lessonQuestions];
        updated.splice(idx, 1);
        setLessonQuestions(updated);
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Reports compilation helpers:
  // Show list of students that are in this active classroom (activeClass.id)
  const classroomStudents = activeClass 
    ? users.filter(u => u.role === UserRole.STUDENT && u.classId === activeClass.id)
    : [];

  return (
    <div id="teacher-dashboard-root" className="space-y-6 animate-fade-in">
      {/* Selection bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 id="teacher-section-title" className="text-2xl font-bold text-gray-900 tracking-tight">Instructor Panel</h2>
          <p className="text-gray-500 text-sm mt-1">Configure subjects, publish interactive quizzes, and monitor grade progress reports.</p>
        </div>

        {/* Course Mapper */}
        <div className="flex items-center gap-2 self-start bg-pink-50 p-1.5 rounded-xl border border-pink-100 shadow-xs">
          <GraduationCap className="text-pink-600 w-4 h-4 ml-1" />
          <span className="text-xs font-semibold text-pink-700 font-mono">Assigned Subject:</span>
          {assignments.length > 1 ? (
            <select
              id="select-teacher-assignment"
              value={selectedMappingIndex}
              onChange={(e) => {
                setSelectedMappingIndex(Number(e.target.value));
                setActiveTopicId('');
              }}
              className="text-xs border-0 bg-transparent text-pink-900 font-bold pr-6 focus:ring-0 cursor-pointer"
            >
              {assignments.map((ass, i) => {
                const cl = classes.find(c => c.id === ass.classId);
                const su = subjects.find(s => s.id === ass.subjectId);
                return (
                  <option key={i} value={i}>
                    {cl?.name} — {su?.name}
                  </option>
                );
              })}
            </select>
          ) : assignments.length === 1 ? (
            <span className="text-xs font-bold text-pink-900 px-1">
              {classes.find(c => c.id === assignments[0].classId)?.name} — {subjects.find(s => s.id === assignments[0].subjectId)?.name}
            </span>
          ) : (
            <span className="text-xs font-bold text-pink-900">None Assigned</span>
          )}
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">No Assignments Specified</h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            You currently have no classes or subjects assigned to your instructor profile.
            An administrator can associate subjects via the User Directory configuration panel.
          </p>
        </div>
      ) : (
        <>
          {/* Sub-Tabs: content manager vs. student Reports */}
          <div className="flex border-b border-gray-100">
            <button
              id="tab-teacher-content"
              onClick={() => setViewMode('content')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'content'
                  ? 'border-pink-600 text-pink-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Syllabus Curator
            </button>
            <button
              id="tab-teacher-reports"
              onClick={() => setViewMode('reports')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'reports'
                  ? 'border-pink-600 text-pink-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Performance Reports ({classroomStudents.length} Students)
            </button>
          </div>

          {/* SILLABUS CURATOR VIEW */}
          {viewMode === 'content' && !lessonEditorOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Topics List */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-150">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm font-mono uppercase tracking-wider text-pink-600">Syllabus Topics</h3>
                    <span className="text-xs text-gray-400">Chapters within this subject</span>
                  </div>
                  <button
                    id="btn-trigger-topic-add"
                    onClick={() => setTopicAddOpen(!topicAddOpen)}
                    className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-lg transition"
                    title="Add Topic"
                  >
                    <Plus className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Topic quick add drawer */}
                {topicAddOpen && (
                  <form onSubmit={handleAddTopic} className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2">
                    <span className="text-[10px] font-bold text-pink-700 tracking-wide uppercase">Add New Chapter</span>
                    <input
                      id="input-teacher-topic-name"
                      type="text"
                      required
                      placeholder="e.g. Chemical Bonds"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none"
                    />
                    <textarea
                      id="textarea-teacher-topic-desc"
                      placeholder="High-level target description..."
                      value={topicDesc}
                      onChange={(e) => setTopicDesc(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none h-12 resize-none"
                    />
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setTopicAddOpen(false)}
                        className="px-2 py-1 text-[10px] font-semibold text-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[10px] bg-pink-600 text-white font-semibold rounded"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {subjectTopics.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs italic">
                      No topics added for this subject yet.
                    </div>
                  ) : (
                    subjectTopics.map(t => {
                      const topicLesCount = lessons.filter(l => l.topicId === t.id).length;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTopicId(t.id)}
                          className={`p-3.5 rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between ${
                            activeTopicId === t.id 
                              ? 'border-pink-650 bg-pink-50/25 shadow-xs' 
                              : 'border-gray-150 hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm text-gray-800">{t.name}</p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.description || 'No description added'}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded">
                              {topicLesCount} Lessons
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 2 & 3: Selected Topic Lessons list */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                {activeTopic ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{activeTopic.name} Lessons</h3>
                        <p className="text-gray-500 text-xs">Configure instructional media, rich notes, and pass assessments in order.</p>
                      </div>

                      <button
                        id="btn-add-lesson-trigger"
                        onClick={() => handleOpenLessonCreator()}
                        className="flex items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Publish Lesson
                      </button>
                    </div>

                    <div className="space-y-4">
                      {topicLessons.length === 0 ? (
                        <div className="text-center py-20 text-gray-450 text-sm italic">
                          There are currently no lessons published within this chapter. Click "Publish Lesson" above to construct one.
                        </div>
                      ) : (
                        topicLessons.map((les, index) => {
                          const questionCount = les.questions?.length || 0;
                          return (
                            <div key={les.id} className="p-4 rounded-xl border border-gray-200 bg-gray-55/40 hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-pink-100 text-pink-700 text-xs font-bold rounded-full flex items-center justify-center font-mono">
                                    {index + 1}
                                  </span>
                                  <h4 className="font-bold text-gray-800 text-sm">{les.name}</h4>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                  <span className="flex items-center gap-1 font-medium text-gray-500">
                                    <Video className="w-3.5 h-3.5" />
                                    {les.videoTitle || 'Interactive Video'}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5" />
                                    {les.duration} mins
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                    <HelpCircle className="w-3 h-3" />
                                    {questionCount} MCQs Quiz
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end md:self-center">
                                <button
                                  id={`btn-edit-lesson-${les.id}`}
                                  onClick={() => handleOpenLessonCreator(les.id)}
                                  className="p-1 px-3 bg-white text-xs font-semibold hover:bg-gray-100 rounded-lg text-indigo-650 border border-gray-200 transition flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit Content
                                </button>
                                <button
                                  id={`btn-delete-lesson-${les.id}`}
                                  onClick={() => handleDeleteLesson(les.id)}
                                  className="p-1 px-2.5 bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 rounded-lg border border-rose-200 transition flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-24 text-gray-400 text-sm italic">
                    Select a Chapter Topic from the left list to view and manage its curriculum lessons.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PERFORMANCE REPORTS VIEW */}
          {viewMode === 'reports' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 text-lg uppercase font-mono tracking-wider text-pink-600">Student Cohort Performance</h3>
                <p className="text-xs text-gray-400">Classroom grade analytics reflecting lesson completion progress</p>
              </div>

              {classroomStudents.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic text-sm">
                  No active students enrolled in {activeClass?.name} currently.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table id="tbl-teacher-reports" className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 text-xs font-mono font-bold tracking-wider">
                        <th className="py-3 px-6">Enrolled Student</th>
                        <th className="py-3 px-6">Syllabus Completion</th>
                        <th className="py-3 px-6">Average/Top Evaluation Score</th>
                        <th className="py-3 px-6">Lessons Attempted Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {classroomStudents.map(student => {
                        // All lessons scope for this class subject
                        const currentLessons = lessons.filter(l => {
                          const topicOfLesson = topics.find(t => t.id === l.topicId);
                          return topicOfLesson && topicOfLesson.subjectId === activeSubject?.id;
                        });

                        const studentProg = progress.filter(p => p.studentId === student.id);
                        const completedLessonsForSubject = currentLessons.filter(l => 
                          studentProg.some(p => p.lessonId === l.id && p.quizCompleted)
                        );

                        const totalPercent = currentLessons.length > 0
                          ? Math.round((completedLessonsForSubject.length / currentLessons.length) * 100)
                          : 0;

                        // Highest quiz marks average
                        const relevantAttempts = studentProg
                          .filter(p => currentLessons.some(l => l.id === p.lessonId))
                          .flatMap(p => p.attempts);

                        const averageScore = relevantAttempts.length > 0
                          ? Math.round(relevantAttempts.reduce((acc, a) => acc + a.score, 0) / relevantAttempts.length)
                          : 0;

                        return (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition">
                            <td className="py-4 px-6 flex items-center gap-3">
                              <img
                                src={student.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                                alt={student.name}
                                className="w-9 h-9 rounded-full object-cover border"
                              />
                              <div>
                                <p className="font-semibold text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-400">{student.email}</p>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <div className="w-full max-w-xs space-y-1">
                                <div className="flex justify-between text-xs text-gray-500 font-mono">
                                  <span>{completedLessonsForSubject.length} / {currentLessons.length} lessons Completed</span>
                                  <span className="font-bold text-pink-600">{totalPercent}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${totalPercent}%` }} />
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              {relevantAttempts.length > 0 ? (
                                <div className="space-y-0.5">
                                  <span className="text-sm font-bold text-gray-900 font-mono">{averageScore}% avg</span>
                                  <p className="text-[10px] text-gray-400">{relevantAttempts.length} evaluations saved</p>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No exams recorded</span>
                              )}
                            </td>

                            <td className="py-4 px-6">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {currentLessons.map((l, index) => {
                                  const pr = studentProg.find(p => p.lessonId === l.id);
                                  const statusColor = pr?.quizCompleted 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : pr?.videoWatched 
                                    ? 'bg-amber-100 text-amber-800 animate-pulse' 
                                    : 'bg-gray-100 text-gray-500';
                                  return (
                                    <span key={l.id} className={`${statusColor} text-[10px] font-bold px-1.5 py-0.5 rounded`} title={l.name}>
                                      L{index+1}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* LESSON EDITOR SYSTEM */}
          {viewMode === 'content' && lessonEditorOpen && (
            <div id="lesson-editor-scaffold" className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden animate-scale-in">
              <div className="bg-pink-650 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-close-lesson-editor"
                    onClick={() => {
                      setLessonEditorOpen(false);
                      setEditingLessonId(null);
                    }}
                    className="flex items-center gap-1.5 bg-pink-700 hover:bg-pink-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Go Back</span>
                  </button>
                  <h3 className="font-bold text-lg">{editingLessonId ? `Edit Curriculum lesson` : 'Define New Lesson Curriculum'}</h3>
                </div>

                <button
                  id="btn-lesson-editor-save"
                  onClick={handleSaveLesson}
                  className="flex items-center gap-1.5 bg-white text-pink-700 hover:bg-pink-50 font-bold text-xs px-4 py-2 rounded-lg transition"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: General metadata and Video Setup */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-pink-600 font-mono uppercase tracking-wider">Lesson Settings & Video Embed</h4>
                    <button
                      id="btn-lesson-settings-back"
                      type="button"
                      onClick={() => {
                        setLessonEditorOpen(false);
                        setEditingLessonId(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-950 text-xs font-bold cursor-pointer py-1 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
                      <span>Back</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Lesson Name</label>
                    <input
                      id="input-lesson-form-name"
                      type="text"
                      required
                      placeholder="e.g. Introduction to Atomic Orbitals"
                      value={lessonName}
                      onChange={(e) => setLessonName(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Video Target Title</label>
                      <input
                        id="input-lesson-form-vt"
                        type="text"
                        placeholder="e.g. Orbitals & Angular Momentum"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Duration (m:s)</label>
                      <input
                        id="input-lesson-form-dur"
                        type="text"
                        placeholder="e.g. 11:21"
                        value={lessonDuration}
                        onChange={(e) => setLessonDuration(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Video YouTube Embed Link or URL</label>
                    <input
                      id="input-lesson-form-vurl"
                      type="text"
                      placeholder="e.g. https://www.youtube.com/embed/grnP3mDuESc"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
                    />
                    <p className="text-[10px] text-pink-500">Provide a standard YouTube embed iframe link to render an active, interactive preview for testing.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Lesson Theoretical Notes & Lecture Guide (Visual WYSIWYG Editor)</label>
                    <RichTextEditor
                      id="wysiwyg-lesson-form-notes"
                      value={lessonNotes}
                      onChange={(content) => setLessonNotes(content)}
                      placeholder="Draft professional theoretical notes. Format your text with headings, tables, links, bold style, lists, highlighters or mathematical layouts..."
                    />
                  </div>

                  {/* PDF SUPPLEMENTARY STUDY FILES */}
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono block">PDF Lecture Notes Attachments</label>
                      <p className="text-[10px] text-slate-400 mt-0.5">Attach one or multiple reference PDF booklets, academic guides, or formula handouts.</p>
                    </div>

                    {/* PDF drop upload area container */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
                      onDragLeave={() => setIsDraggingPdf(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingPdf(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handlePdfFileChange(file);
                      }}
                      onClick={() => document.getElementById('lesson-pdf-file-selector')?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition select-none flex flex-col items-center justify-center gap-1.5 ${
                        isDraggingPdf 
                          ? 'border-pink-500 bg-pink-50/50 text-pink-700 font-bold' 
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <input 
                        id="lesson-pdf-file-selector"
                        type="file" 
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePdfFileChange(file);
                        }}
                      />
                      <Upload className={`w-6 h-6 ${isDraggingPdf ? 'animate-bounce text-pink-600' : 'text-slate-400'}`} />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold">
                          {newPdfUrl ? '✓ PDF Loaded Successfully' : 'Drag & Drop PDF document here'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {newPdfUrl ? 'Format valid. Configure details below to attach' : 'or click to browse local files (.pdf)'}
                        </p>
                      </div>
                    </div>

                    {/* PDF Title & Brief Description details card */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-705 font-mono text-[10px] tracking-wider uppercase">Configure Selected PDF</span>
                        <button
                          id="btn-toggle-pdf-entry"
                          type="button"
                          onClick={() => setPdfManualUrlActive(!pdfManualUrlActive)}
                          className="text-[10px] text-pink-600 hover:underline font-semibold"
                        >
                          {pdfManualUrlActive ? 'Switch to Upload mode' : 'Enter Web URL directly'}
                        </button>
                      </div>

                      {pdfManualUrlActive && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Web PDF URL Address</label>
                          <input
                            id="input-pdf-manual-url"
                            type="text"
                            placeholder="e.g. https://domain.edu/notes.pdf"
                            value={newPdfUrl}
                            onChange={(e) => setNewPdfUrl(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none font-mono"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Document Name/Title</label>
                        <input
                          id="input-pdf-manual-title"
                          type="text"
                          placeholder="e.g., Orbital Handout Booklet"
                          value={newPdfName}
                          onChange={(e) => setNewPdfName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Brief Description</label>
                        <textarea
                          id="textarea-pdf-manual-desc"
                          rows={2}
                          placeholder="What is this PDF document about? Briefly outline what theoretical details are covered..."
                          value={newPdfDescription}
                          onChange={(e) => setNewPdfDescription(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:outline-none"
                        />
                      </div>

                      <button
                        id="btn-attach-lesson-pdf"
                        type="button"
                        onClick={() => {
                          if (!newPdfName.trim()) {
                            alert('Please define a title/name for the PDF notes.');
                            return;
                          }
                          if (!newPdfUrl) {
                            alert('Please upload a PDF file or provide a PDF URL address first.');
                            return;
                          }
                          const newPdf: NotePdf = {
                            id: `pdf-${Date.now()}`,
                            name: newPdfName,
                            url: newPdfUrl,
                            description: newPdfDescription
                          };
                          setLessonPdfs([...lessonPdfs, newPdf]);
                          setNewPdfName('');
                          setNewPdfDescription('');
                          setNewPdfUrl('');
                        }}
                        className="w-full bg-pink-650 hover:bg-pink-700 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        ✓ Attach PDF to Lesson
                      </button>
                    </div>

                    {/* Attached PDFs list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block">
                        Attached Documents ({lessonPdfs.length})
                      </span>
                      {lessonPdfs.length === 0 ? (
                        <p className="text-[10px] italic text-slate-400 bg-slate-50 p-2 text-center rounded border border-dashed border-slate-150">
                          No supplemental PDF handbooks attached to this lesson. Everything is delivered via the theoretical notes form.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {lessonPdfs.map((pdf, idx) => (
                            <div key={pdf.id} className="flex items-start justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:bg-slate-100/50 transition">
                              <div className="flex gap-1.5 min-w-0">
                                <FileText className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 truncate leading-tight capitalize">{pdf.name}</p>
                                  {pdf.description ? (
                                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{pdf.description}</p>
                                  ) : (
                                    <p className="text-[10px] italic text-slate-400 mt-0.5">No supplementary description available.</p>
                                  )}
                                  <span className="text-[9px] font-mono text-slate-400 bg-white border border-slate-150 px-1 rounded block w-max mt-1">
                                    Source: {pdf.url.startsWith('data:') ? 'Local Uploaded Attachment' : 'External Web URL'}
                                  </span>
                                </div>
                              </div>
                              <button
                                id={`btn-delete-attached-pdf-${idx}`}
                                type="button"
                                onClick={() => {
                                  setLessonPdfs(lessonPdfs.filter((_, i) => i !== idx));
                                }}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded transition shrink-0"
                                title="Remove PDF attachment"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono block">Assessment Settings</label>
                    <label className="flex items-center gap-2 text-xs font-bold font-sans text-gray-700 cursor-pointer bg-gray-50 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-100 select-none transition">
                      <input
                        id="checkbox-lesson-form-multiple-attempts"
                        type="checkbox"
                        checked={allowMultipleAttempts}
                        onChange={(e) => setAllowMultipleAttempts(e.target.checked)}
                        className="accent-pink-600 w-4 h-4 cursor-pointer"
                      />
                      <span>Allow Multiple Quiz Attempts</span>
                    </label>
                    <p className="text-[10px] text-gray-500">If checked, students can retake the quiz multiple times. If unchecked, students can only submit once and are locked down to their final score.</p>
                  </div>
                </div>

                {/* Right Side: Quiz Question Builder */}
                <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-pink-600 font-mono uppercase tracking-wider">Interactive Lesson Quiz</h4>
                    <button
                      id="btn-add-question-trigger"
                      type="button"
                      onClick={() => handleOpenQuestionEditor()}
                      className="flex items-center gap-1 bg-pink-50 text-pink-700 hover:bg-pink-100 text-xs px-2 py-1 rounded font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Question
                    </button>
                  </div>

                  {/* Question listing */}
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {lessonQuestions.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs text-slate-400">
                        No evaluation questions formulated. Use "Add Question" above to construct the immediate pass exam.
                      </div>
                    ) : (
                      lessonQuestions.map((q, qidx) => (
                        <div key={q.id} className="p-3 bg-gray-50 rounded-xl border border-gray-150 space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-gray-800 leading-tight">
                              Q{qidx + 1}: {q.text}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenQuestionEditor(qidx)}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(qidx)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-[10px] font-mono font-semibold px-1 rounded uppercase">
                              {q.type}
                            </span>
                            <span className="text-emerald-700 bg-emerald-50 text-[10px] items-center inline-flex px-1.5 py-0.5 rounded font-semibold">
                              <Check className="w-2.5 h-2.5 mr-0.5" />
                              Ans: {q.correctAnswer}
                            </span>
                          </div>

                          {q.explanation && (
                            <p className="text-[10px] text-gray-500 italic bg-white p-1.5 rounded border border-gray-100">
                              Exp: {q.explanation}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 select-none font-sans">
                <button
                  id="btn-lesson-editor-bottom-cancel"
                  type="button"
                  onClick={() => {
                    setLessonEditorOpen(false);
                    setEditingLessonId(null);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-2xs hover:border-gray-300 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                  <span>Cancel & Go Back</span>
                </button>
                
                <button
                  id="btn-lesson-editor-bottom-save"
                  type="button"
                  onClick={handleSaveLesson}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-pink-605 hover:bg-pink-700 bg-pink-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Lesson Curriculum</span>
                </button>
              </div>
            </div>
          )}

          {/* QUESTION BUILDER INLINE MODAL OVERLAY */}
          {questionEditorOpen && (
            <div id="modal-question-overlay" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-in border border-pink-100">
                <div className="bg-pink-650 px-5 py-3.5 flex items-center justify-between text-white">
                  <h4 className="font-bold text-sm">Assemble Quiz Question</h4>
                  <button
                    id="btn-close-question-modal"
                    onClick={() => setQuestionEditorOpen(false)}
                    className="text-white hover:text-pink-100 font-semibold"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-650 block">Question Title</span>
                    <input
                      id="input-q-text"
                      type="text"
                      required
                      placeholder="e.g. Which particle orbits outside the atomic nucleus?"
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-gray-650 block">Configuration Format</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="qtype"
                          checked={qType === QuestionType.MCQ}
                          onChange={() => {
                            setQType(QuestionType.MCQ);
                            setQOptions(['', '', '', '']);
                            setQCorrectAnswer('');
                          }}
                          className="accent-pink-600"
                        />
                        Multiple Choice (MCQ)
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="qtype"
                          checked={qType === QuestionType.TF}
                          onChange={() => {
                            setQType(QuestionType.TF);
                            setQOptions(['True', 'False']);
                            setQCorrectAnswer('True');
                          }}
                          className="accent-pink-600"
                        />
                        True / False (TF)
                      </label>
                    </div>
                  </div>

                  {qType === QuestionType.MCQ ? (
                    <div className="p-3 bg-pink-50/20 rounded-xl space-y-2 border border-pink-100/50">
                      <span className="font-bold text-pink-700 tracking-wide block uppercase text-[10px]">Customize MCQ Options</span>
                      {qOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="font-mono text-gray-400 font-bold">{idx + 1}.</span>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...qOptions];
                              updated[idx] = e.target.value;
                              setQOptions(updated);
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-gray-200 bg-white rounded focus:outline-none"
                          />
                        </div>
                      ))}

                      <div className="space-y-1 pt-2">
                        <span className="font-semibold text-pink-850 block">Identify Correct Option String</span>
                        <select
                          id="select-correct-option"
                          value={qCorrectAnswer}
                          onChange={(e) => setQCorrectAnswer(e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-pink-200 bg-white rounded font-medium text-pink-900 cursor-pointer focus:outline-none"
                        >
                          <option value="">-- Choose Option --</option>
                          {qOptions.filter(o => o !== '').map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="font-semibold text-gray-650 block">Set Correct Choice</span>
                      <select
                        id="select-tf-correct"
                        value={qCorrectAnswer}
                        onChange={(e) => setQCorrectAnswer(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 bg-white rounded cursor-pointer focus:outline-none"
                      >
                        <option value="True">True</option>
                        <option value="False">False</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="font-semibold text-gray-650 block">Corrective Explanation (Optional)</span>
                    <input
                      id="input-q-exp"
                      type="text"
                      placeholder="Provide helpful reasoning for incorrect selections..."
                      value={qExplanation}
                      onChange={(e) => setQExplanation(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setQuestionEditorOpen(false)}
                      className="px-3.5 py-1.5 border border-gray-150 rounded text-gray-500 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuestion}
                      className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg"
                    >
                      Apply Question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
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
                  <h3 id="teacher-delete-confirm-title" className="text-base font-bold text-slate-900 font-display">{deleteConfirm.title}</h3>
                  <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider font-mono">Destructive Action Confirmation</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed">
                {deleteConfirm.message}
              </p>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-150">
              <button
                id="btn-teacher-delete-cancel"
                type="button"
                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel / Return
              </button>
              <button
                id="btn-teacher-delete-confirm"
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
