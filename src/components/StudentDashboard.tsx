/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Class, Subject, Topic, Lesson, UserRole, StudentProgress, Question, QuestionType, QuizAttempt, NotePdf } from '../types.ts';
import { db } from '../db.ts';
import { 
  BookOpen, Video, FileText, HelpCircle, CheckCircle, Lock, 
  ChevronRight, Award, Zap, RefreshCw, BarChart2, Star,
  AlertCircle, Check, Play, ArrowRight, BookMarked, Maximize2, Minimize2, Send, ArrowLeft,
  Download, ExternalLink, Info
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User;
}

export default function StudentDashboard({ currentUser }: StudentDashboardProps) {
  // DB States
  const [classes] = useState<Class[]>(() => db.getClasses());
  const [subjects] = useState<Subject[]>(() => db.getSubjects());
  const [topics] = useState<Topic[]>(() => db.getTopics());
  const [lessons] = useState<Lesson[]>(() => db.getLessons());
  
  // Dynamic Progress state managed locally
  const [progress, setProgress] = useState<StudentProgress[]>(() => db.getStudentProgress(currentUser.id));

  // Resolved Student Class
  const studentClass = classes.find(c => c.id === currentUser.classId);

  // Available subjects for this class
  const classSubjects = studentClass 
    ? subjects.filter(s => s.classId === studentClass.id)
    : [];

  // Enrolled Navigation
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Active Lesson being read
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const activeLesson = lessons.find(l => l.id === selectedLessonId);

  // Full Screen Focus Reader States
  const [isNotesFullscreen, setIsNotesFullscreen] = useState(false);
  const [focusTextSize, setFocusTextSize] = useState<'normal' | 'lg' | 'xl'>('lg');
  const [focusTheme, setFocusTheme] = useState<'clean' | 'sepia' | 'dark'>('clean');

  // Mobile responsive views and accordion chapters
  const [mobileActiveView, setMobileActiveView] = useState<'syllabus' | 'lesson'>('syllabus');
  const [expandedTopicId, setExpandedTopicId] = useState<string>('');

  // PDF Document Viewer States
  const [selectedPdfNotesTab, setSelectedPdfNotesTab] = useState<'text' | 'pdfs'>('text');
  const [activePdfId, setActivePdfId] = useState<string>('');

  // Auto-select first PDF when active lesson updates
  useEffect(() => {
    if (activeLesson) {
      if (activeLesson.pdfs && activeLesson.pdfs.length > 0) {
        setActivePdfId(activeLesson.pdfs[0].id);
      } else {
        setActivePdfId('');
        setSelectedPdfNotesTab('text');
      }
    }
  }, [selectedLessonId, activeLesson]);

  // Auto-select first subject & lesson on mount
  useEffect(() => {
    if (classSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubjectId]);

  // Handle auto selecting first lesson when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      const subTopics = topics.filter(t => t.subjectId === selectedSubjectId);
      if (subTopics.length > 0) {
        const firstTopicLessons = lessons.filter(l => l.topicId === subTopics[0].id);
        if (firstTopicLessons.length > 0) {
          setSelectedLessonId(firstTopicLessons[0].id);
        }
      }
    }
  }, [selectedSubjectId]);

  // Handle keyboard event to exit fullscreen with escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotesFullscreen(false);
      }
    };
    if (isNotesFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotesFullscreen]);

  // Quiz interactive states
  const [quizActive, setQuizActive] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [immediateFeedback, setImmediateFeedback] = useState<boolean | null>(null); // null = not answered yet, boolean = was choice correct
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [latestQuizScore, setLatestQuizScore] = useState<number | null>(null);
  
  // Custom enhanced quiz states
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [selectedAttemptToReview, setSelectedAttemptToReview] = useState<QuizAttempt | null>(null);
  const [isInstantCorrectnessEnabled, setIsInstantCorrectnessEnabled] = useState(false);

  // Reload progress data safely
  const reloadProgress = () => {
    setProgress(db.getStudentProgress(currentUser.id));
  };

  // Check if a lesson at index in a topic is unlocked
  // Dynamic Progression Engine:
  // Lesson k is unlocked if:
  //   k === 0 (first lesson of this topic)
  //   OR if lesson at k - 1 is fully completed (videoWatched, notesRead, quizCompleted)
  const isLessonUnlocked = (lessonToCheck: Lesson, topicLessonsList: Lesson[]): boolean => {
    const idx = topicLessonsList.findIndex(l => l.id === lessonToCheck.id);
    if (idx <= 0) return true; // first is always unlocked
    
    // Check previous lesson status
    const prevLesson = topicLessonsList[idx - 1];
    const prevProg = progress.find(p => p.lessonId === prevLesson.id);
    
    return !!(prevProg?.videoWatched && prevProg?.notesRead && prevProg?.quizCompleted);
  };

  // Track Video Watched
  const handleMarkVideoWatched = (lessonId: string, watched: boolean) => {
    db.updateStudentProgress(currentUser.id, lessonId, { videoWatched: watched });
    reloadProgress();
  };

  // Track Notes Read
  const handleMarkNotesRead = (lessonId: string, read: boolean) => {
    db.updateStudentProgress(currentUser.id, lessonId, { notesRead: read });
    reloadProgress();
  };

  // Active quiz actions
  const startQuiz = (lessonItem: Lesson) => {
    if (!lessonItem.questions || lessonItem.questions.length === 0) {
      alert("No questions configured for this lesson quiz yet!");
      return;
    }
    
    // Load any existing draft answer or start fresh
    const savedDraftsRaw = localStorage.getItem(`draft_quiz_${currentUser.id}_${lessonItem.id}`);
    const initialAnswers = savedDraftsRaw ? JSON.parse(savedDraftsRaw) : {};

    setQuizActive(true);
    setCurrentQuestionIdx(0);
    const q0 = lessonItem.questions[0];
    setSelectedChoice(initialAnswers[q0.id] || '');
    setImmediateFeedback(null);
    setQuizAnswers(initialAnswers);
    setCorrectCount(0);
    setQuizFinished(false);
    setLatestQuizScore(null);
    setShowSubmitConfirmation(false);
    setSelectedAttemptToReview(null);
    setIsInstantCorrectnessEnabled(false); // Default to comprehensive exam-style mode
  };

  const handleSelectChoice = (choice: string, q: Question) => {
    if (isInstantCorrectnessEnabled && immediateFeedback !== null) return; // Prevent changing in instant mode once answered
    
    setSelectedChoice(choice);
    
    const nextAnswers = {
      ...quizAnswers,
      [q.id]: choice
    };
    setQuizAnswers(nextAnswers);

    // Persist draft answers in localStorage immediately to support "In Progress" status and crash/refresh resilience
    localStorage.setItem(`draft_quiz_${currentUser.id}_${selectedLessonId}`, JSON.stringify(nextAnswers));
    
    if (isInstantCorrectnessEnabled) {
      const isCorrect = choice === q.correctAnswer;
      setImmediateFeedback(isCorrect);
    }
  };

  const handleNextQuestion = (totalQuestions: number) => {
    if (currentQuestionIdx + 1 < totalQuestions) {
      const nextIndex = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIndex);
      const nextQ = activeLesson ? activeLesson.questions[nextIndex] : null;
      if (nextQ) {
        setSelectedChoice(quizAnswers[nextQ.id] || '');
      }
      setImmediateFeedback(null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      const prevIndex = currentQuestionIdx - 1;
      setCurrentQuestionIdx(prevIndex);
      const prevQ = activeLesson ? activeLesson.questions[prevIndex] : null;
      if (prevQ) {
        setSelectedChoice(quizAnswers[prevQ.id] || '');
      }
      setImmediateFeedback(null);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    if (activeLesson && activeLesson.questions && index >= 0 && index < activeLesson.questions.length) {
      setCurrentQuestionIdx(index);
      const targetQ = activeLesson.questions[index];
      setSelectedChoice(quizAnswers[targetQ.id] || '');
      setImmediateFeedback(null);
    }
  };

  const handleSubmitQuiz = () => {
    if (!activeLesson || !activeLesson.questions) return;

    let correct = 0;
    activeLesson.questions.forEach(q => {
      if (quizAnswers[q.id] === q.correctAnswer) {
        correct += 1;
      }
    });

    const finalScorePct = Math.round((correct / activeLesson.questions.length) * 100);
    const passed = finalScorePct >= 75;

    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      studentId: currentUser.id,
      lessonId: selectedLessonId,
      score: finalScorePct,
      passed,
      date: new Date().toISOString(),
      selectedAnswers: quizAnswers
    };

    db.addQuizAttempt(attempt, passed, finalScorePct);
    
    // Clear out draft from localStorage upon successful submission
    localStorage.removeItem(`draft_quiz_${currentUser.id}_${selectedLessonId}`);
    
    setLatestQuizScore(finalScorePct);
    setCorrectCount(correct);
    setQuizFinished(true);
    setQuizActive(false);
    setShowSubmitConfirmation(false);
    reloadProgress();
  };

  // Calculate Overall completion percentages across active subject
  const currentSubjectLessons = lessons.filter(l => {
    const parentTopic = topics.find(t => t.id === l.topicId);
    return parentTopic && parentTopic.subjectId === selectedSubjectId;
  });

  const subjectCompletedLessonsCount = currentSubjectLessons.filter(l => {
    const progRecord = progress.find(p => p.lessonId === l.id);
    return progRecord && progRecord.quizCompleted && progRecord.videoWatched && progRecord.notesRead;
  }).length;

  const subjectProgressPercent = currentSubjectLessons.length > 0
    ? Math.round((subjectCompletedLessonsCount / currentSubjectLessons.length) * 100)
    : 0;

  // Render notes with linebreaks nicely
  const formatTextWithBreaks = (text: string) => {
    return text.split('\n').map((str, idx) => {
      if (str.startsWith('### ')) {
        return <h4 key={idx} className="text-base font-bold text-gray-900 mt-4 mb-2">{str.replace('### ', '')}</h4>;
      }
      if (str.startsWith('#### ')) {
        return <h5 key={idx} className="text-sm font-bold text-gray-800 mt-3 mb-1.5">{str.replace('#### ', '')}</h5>;
      }
      if (str.startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-xs text-gray-650 my-1">{str.replace('* ', '')}</li>;
      }
      if (str.startsWith('1. ')) {
        return <li key={idx} className="ml-4 list-decimal text-xs text-gray-650 my-1">{str.replace(/^\d+\.\s/, '')}</li>;
      }
      if (str.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-xs text-gray-700 leading-relaxed my-1">{str}</p>;
    });
  };

  return (
    <div id="student-dashboard" className="space-y-6 animate-fade-in text-slate-800">
      {/* Grade Details Panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 shadow-sm">
            {studentClass?.name?.substring(0, 3) || 'G8'}
          </div>
          <div>
            <h2 id="student-cohort-heading" className="text-2xl font-bold text-slate-900 tracking-tight font-display">Active Student Learning Hub</h2>
            <p className="text-slate-500 text-sm mt-0.5">Welcome back, {currentUser.name}! You are registered in <span className="font-semibold text-indigo-650">{studentClass?.name || 'Unassigned Grade'}</span>.</p>
          </div>
        </div>

        {/* Dynamic Class progression summary (Sleek Dark Badge Card Option style) */}
        <div className="bg-slate-900 px-5 py-4 rounded-xl text-white text-sm shadow-md w-full md:w-72 shrink-0 select-none animate-scale-in">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-xs tracking-wider uppercase text-slate-400 font-mono">Curriculum Progression</span>
            <span className="font-mono text-xs font-bold text-indigo-400">{subjectProgressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mb-1.5 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${subjectProgressPercent}%` }}></div>
          </div>
          <p className="text-[10.5px] text-slate-400 font-mono">Completed: {subjectCompletedLessonsCount} of {currentSubjectLessons.length} lessons</p>
        </div>
      </div>

      {/* Subject TABS bar */}
      <div id="student-subjects-rail" className="flex items-center gap-2 overflow-x-auto pb-1">
        {classSubjects.length === 0 ? (
          <div className="text-sm italic text-slate-400">No subjects currently assigned to this classroom grade level.</div>
        ) : (
          classSubjects.map((sub) => (
            <button
              key={sub.id}
              id={`student-sub-tab-${sub.id}`}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                setMobileActiveView('syllabus');
                setExpandedTopicId('');
              }}
              className={`px-5 py-2.5 text-xs font-semibold rounded-full border transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                selectedSubjectId === sub.id
                  ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-md shadow-indigo-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              {sub.name}
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SIDEBAR: Topics and Lessons lists */}
        <div 
          id="student-syllabus-tracker" 
          className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 ${
            mobileActiveView === 'lesson' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="border-b pb-3 border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm font-mono uppercase tracking-wider text-indigo-600">Syllabus Index</h3>
            <p className="text-xs text-slate-400 mt-0.5">Chapters & lessons mapped in linear alignment</p>
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {topics.filter(t => t.subjectId === selectedSubjectId).map((topic, tidx) => {
              const topicLessons = lessons.filter(l => l.topicId === topic.id);
              const hasActiveLesson = topicLessons.some(l => l.id === selectedLessonId);
              const isExpanded = hasActiveLesson || expandedTopicId === topic.id;

              return (
                <div key={topic.id} className="space-y-2 border-b border-slate-100 last:border-b-0 pb-3 last:pb-0">
                  {/* Chapter Accordion Header */}
                  <div
                    id={`student-chapter-header-${topic.id}`}
                    onClick={() => {
                      setExpandedTopicId(prev => prev === topic.id ? '' : topic.id);
                    }}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer select-none"
                    role="button"
                    title="Toggle Chapter Lessons"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 transition-colors ${
                        hasActiveLesson 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        Chapter {tidx + 1}
                      </span>
                      <h4 className={`text-xs truncate font-display transition-colors ${
                        hasActiveLesson ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'
                      }`}>
                        {topic.name}
                      </h4>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-455 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90 text-indigo-500 font-bold' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-indigo-50 animate-slide-down">
                      {topicLessons.map((les, lessonIndex) => {
                        const progRecord = progress.find(p => p.lessonId === les.id);
                        
                        // Mastery Completed?
                        const isCompleted = progRecord && progRecord.quizCompleted && progRecord.videoWatched && progRecord.notesRead;
                        
                        // Evaluated Lock
                        const unlocked = isLessonUnlocked(les, topicLessons);

                        return (
                          <div
                            key={les.id}
                            id={`student-lesson-item-${les.id}`}
                            onClick={() => {
                              if (unlocked) {
                                setSelectedLessonId(les.id);
                                setQuizActive(false);
                                setQuizFinished(false);
                                setMobileActiveView('lesson');
                                // Scroll smoothly to panel
                                setTimeout(() => {
                                  document.getElementById('student-active-curriculum-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 50);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 justify-between ${
                              !unlocked
                                ? 'bg-slate-50/50 border-slate-100 opacity-60 pointer-events-none'
                                : selectedLessonId === les.id
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex gap-2 min-w-0 pr-1">
                              <span className="shrink-0 text-xs font-mono font-bold mt-0.5 text-slate-400 w-4">
                                {lessonIndex + 1}.
                              </span>
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold leading-tight capitalize truncate ${selectedLessonId === les.id ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                                  {les.name}
                                </p>
                                
                                <div className="flex flex-wrap gap-1.5 items-center text-[10px] text-slate-400 mt-1.5">
                                  <span className="font-mono bg-slate-150 text-slate-600 px-1 rounded font-medium shrink-0">{les.duration} mins</span>
                                  {isCompleted ? (
                                    <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1 rounded border border-emerald-100 shrink-0">
                                      Mastered
                                    </span>
                                  ) : (
                                    <>
                                      {progRecord?.quizCompleted ? (
                                        <span className="text-indigo-700 font-mono font-bold bg-indigo-50 px-1 rounded border border-indigo-100 shrink-0">
                                          Submitted ({progRecord.highestQuizScore}%)
                                        </span>
                                      ) : localStorage.getItem(`draft_quiz_${currentUser.id}_${les.id}`) ? (
                                        <span className="text-amber-700 font-mono font-bold bg-amber-50 px-1 rounded border border-amber-100 shrink-0 animate-pulse">
                                          In Progress
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 bg-slate-50 border border-slate-150 px-1 rounded shrink-0">
                                          Not Started
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 mt-0.5">
                              {!unlocked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              ) : isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                              ) : (
                                <Play className={`w-3 h-3 ${selectedLessonId === les.id ? 'text-indigo-650 fill-indigo-650' : 'text-slate-400'}`} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workspace panel for study content */}
        <div 
          id="student-active-curriculum-panel" 
          className={`lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between ${
            mobileActiveView === 'syllabus' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activeLesson ? (
            <>
              {/* Header */}
              <div className="bg-indigo-600 px-6 py-4.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Back to Chapters index button - visible only on mobile (lg hidden) */}
                  <button
                    id="btn-back-to-syllabus-mobile"
                    onClick={() => setMobileActiveView('syllabus')}
                    className="lg:hidden p-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-indigo-500 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="pr-1">Chapters</span>
                  </button>
                  <div className="text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono opacity-80">STUDYING LESSON</span>
                    <h3 className="font-bold text-sm sm:text-lg mt-0.5 leading-snug">{activeLesson.name}</h3>
                  </div>
                </div>
                
                {progress.find(p => p.lessonId === activeLesson.id)?.quizCompleted && (
                  <span className="text-[11px] bg-emerald-550 border border-emerald-500 font-semibold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 self-start sm:self-auto">
                    <StarsBadgeIcon />
                    Mastery Verified
                  </span>
                )}
              </div>

              {/* Main instructional studio */}
              <div className="p-6 space-y-6">
                
                {/* Visual Video Embed Player with custom tracker option */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-indigo-700 font-mono tracking-wider block uppercase">Step 1: Audio/Visual Media Lecture</span>
                  
                  {/* YouTube Player simulator */}
                  <div className="relative rounded-2xl bg-slate-900 overflow-hidden shadow-lg aspect-video border border-slate-950">
                    <iframe
                      id="video-player-iframe"
                      width="100%"
                      height="100%"
                      src={activeLesson.videoUrl || 'https://www.youtube.com/embed/grnP3mDuESc'}
                      title={activeLesson.videoTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                    />
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-slate-905">{activeLesson.videoTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{activeLesson.videoDescription || 'Listen to this comprehensive conceptual overview.'}</p>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold font-mono tracking-wide text-indigo-900 cursor-pointer bg-white p-2 border border-slate-200 rounded-lg shadow-xs select-none hover:bg-slate-50">
                      <input
                        id="checkbox-video-watched"
                        type="checkbox"
                        checked={!!progress.find(p => p.lessonId === activeLesson.id)?.videoWatched}
                        onChange={(e) => handleMarkVideoWatched(activeLesson.id, e.target.checked)}
                        className="accent-indigo-600 w-4 h-4 cursor-pointer"
                      />
                      Mark Video as Watched
                    </label>
                  </div>
                </div>

                {/* SILLABUS notes */}
                <div className="space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-700 font-mono tracking-wider block uppercase">Step 2: Rich Theoretical Lecture Notes</span>
                    
                    <button
                      id="btn-trigger-fullscreen-notes"
                      type="button"
                      onClick={() => setIsNotesFullscreen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-850 text-xs font-bold font-mono tracking-wide rounded-lg transition border border-indigo-100 cursor-pointer self-start sm:self-auto shadow-3xs"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Focus Full Screen</span>
                    </button>
                  </div>
                  
                  {/* Tabs for Lecture text vs PDF attachments */}
                  {activeLesson.pdfs && activeLesson.pdfs.length > 0 && (
                    <div className="flex border-b border-slate-200 gap-2 select-none">
                      <button
                        id="btn-student-notes-text-tab"
                        type="button"
                        onClick={() => setSelectedPdfNotesTab('text')}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                          selectedPdfNotesTab === 'text'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Default Theoretical Text
                      </button>
                      <button
                        id="btn-student-notes-pdfs-tab"
                        type="button"
                        onClick={() => setSelectedPdfNotesTab('pdfs')}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedPdfNotesTab === 'pdfs'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Attached PDF Booklets ({activeLesson.pdfs.length})</span>
                      </button>
                    </div>
                  )}

                  {selectedPdfNotesTab === 'text' || !activeLesson.pdfs || activeLesson.pdfs.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto font-sans shadow-inner animate-slide-down">
                      <div className="prose max-w-none text-left">
                        {/<[a-z][\s\S]*>/i.test(activeLesson.notes || '') ? (
                          <div dangerouslySetInnerHTML={{ __html: activeLesson.notes || '' }} />
                        ) : (
                          formatTextWithBreaks(activeLesson.notes || '')
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-200 bg-slate-50 rounded-2xl p-4 animate-slide-down min-h-[580px]">
                      {/* Left: PDFs Navigation list with brief descriptions */}
                      <div className="md:col-span-1 space-y-3 max-h-[550px] overflow-y-auto pr-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono block">Document Catalog</span>
                        <div className="space-y-2">
                          {(activeLesson.pdfs || []).map((pdf) => (
                            <div
                              key={pdf.id}
                              id={`student-pdf-nav-item-${pdf.id}`}
                              onClick={() => setActivePdfId(pdf.id)}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition select-none flex flex-col justify-between gap-1.5 ${
                                (activePdfId || activeLesson.pdfs?.[0]?.id) === pdf.id
                                  ? 'border-indigo-600 bg-white shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-100/50'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${
                                  (activePdfId || activeLesson.pdfs?.[0]?.id) === pdf.id ? 'text-indigo-650' : 'text-slate-400'
                                }`} />
                                <div className="min-w-0">
                                  <p className={`text-xs font-bold truncate leading-snug capitalize ${
                                    (activePdfId || activeLesson.pdfs?.[0]?.id) === pdf.id ? 'text-indigo-950 font-bold' : 'text-slate-800'
                                  }`}>
                                    {pdf.name}
                                  </p>
                                  {pdf.description && (
                                    <p className="text-[10px] text-slate-500 leading-normal mt-1 line-clamp-3">
                                      {pdf.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Rich Interactive PDF Reader Frame */}
                      <div className="md:col-span-2 flex flex-col justify-between space-y-3">
                        {(() => {
                          const currentPdf = (activeLesson.pdfs || []).find(p => p.id === activePdfId) || (activeLesson.pdfs || [])[0];
                          if (!currentPdf) return (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans border border-dashed rounded-xl border-slate-200 bg-white">
                              <FileText className="w-10 h-10 text-slate-305 mb-2" />
                              <span className="text-xs">No active PDF handout selected for studying</span>
                            </div>
                          );

                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1 flex flex-col justify-between">
                              {/* Header details with quick action links */}
                              <div className="border-b border-slate-100 pb-3 mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                                <div className="min-w-0">
                                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">PDF Notes Document</span>
                                  <h4 className="font-bold text-slate-900 text-sm mt-1 capitalize truncate">{currentPdf.name}</h4>
                                  {currentPdf.description && (
                                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{currentPdf.description}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                                  <a
                                    id="btn-student-download-pdf"
                                    href={currentPdf.url}
                                    download={`${currentPdf.name}.pdf`}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    rel="noreferrer"
                                    className="p-2 border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer select-none"
                                    title="Download PDF to device"
                                  >
                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="hidden sm:inline">Download</span>
                                  </a>
                                  <a
                                    id="btn-student-native-pdf"
                                    href={currentPdf.url}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    rel="noreferrer"
                                    className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer select-none"
                                    title="Open PDF in a fresh tab"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-indigo-150" />
                                    <span>New Tab</span>
                                  </a>
                                </div>
                              </div>

                              {/* Interactive embedding frame content view */}
                              <div className="relative flex-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 h-[400px]">
                                <iframe
                                  id="student-pdf-viewer"
                                  src={currentPdf.url}
                                  title={currentPdf.name}
                                  className="absolute inset-0 w-full h-full border-0 bg-slate-50"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              {/* Helpful sandbox fallback notice block */}
                              <div className="mt-3 bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-lg flex gap-2 text-left">
                                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-indigo-950 leading-normal">
                                  <span className="font-semibold">Security Note:</span> Some active workspaces restrict rendering nested iFrame attachments directly. If the document viewer looks blank, simply use the <span className="font-semibold text-indigo-700">"New Tab"</span> or <span className="font-semibold text-indigo-700">"Download"</span> action buttons on the top right to study the notes in perfect pixel detail!
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-slate-400">
                      Tip: Read complex formulas and core proofs in fullscreen comfort.
                    </span>
                    
                    <label className="flex items-center gap-2 text-xs font-bold font-mono tracking-wide text-indigo-900 cursor-pointer bg-white p-2 border border-slate-200 rounded-lg shadow-xs select-none hover:bg-slate-50">
                      <input
                        id="checkbox-notes-read"
                        type="checkbox"
                        checked={!!progress.find(p => p.lessonId === activeLesson.id)?.notesRead}
                        onChange={(e) => handleMarkNotesRead(activeLesson.id, e.target.checked)}
                        className="accent-indigo-600 w-4 h-4 cursor-pointer"
                      />
                      Mark Notes as Read
                    </label>
                  </div>
                </div>

                {/* EVALUATION QUIZ PORTLET */}
                <div className="space-y-4 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-700 font-mono tracking-wider block uppercase">Step 3: Concepts Mastery evaluation</span>
                      <p className="text-[11px] text-slate-400">A scoring mark of at least <span className="font-semibold text-slate-700">75% or higher</span> is required to proceed.</p>
                    </div>

                    <div className="flex gap-2 font-mono">
                      {localStorage.getItem(`draft_quiz_${currentUser.id}_${activeLesson.id}`) && !quizActive && !quizFinished && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100 shadow-3xs animate-pulse">
                          Draft in Progress
                        </span>
                      )}
                      {progress.find(p => p.lessonId === activeLesson.id)?.highestQuizScore ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 shadow-3xs animate-scale-in">
                          Top Mark: {progress.find(p => p.lessonId === activeLesson.id)?.highestQuizScore}%
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {!quizActive && !quizFinished && (
                    <div className="space-y-4">
                      <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-3.5 shadow-3xs">
                        <Award className="w-8 h-8 text-indigo-600 mx-auto" />
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-750 border border-indigo-150 mb-2">
                            {progress.find(p => p.lessonId === activeLesson.id)?.quizCompleted ? '● Completed & Submitted' : localStorage.getItem(`draft_quiz_${currentUser.id}_${activeLesson.id}`) ? '● In Progress (Draft Saved)' : '● Not Started'}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">Mastery Assessment Quiz</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">Test your comprehension on the content! Pass with at least 75% to unlock successive lessons.</p>
                        </div>

                        {/* Determine if retaking is allowed */}
                        {(activeLesson.allowMultipleAttempts !== false || !progress.find(p => p.lessonId === activeLesson.id)?.quizCompleted) ? (
                          <button
                            id="btn-trigger-quiz"
                            onClick={() => startQuiz(activeLesson)}
                            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-100 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {localStorage.getItem(`draft_quiz_${currentUser.id}_${activeLesson.id}`) ? 'Continue Assessment Quiz' : 'Begin Evaluation Quiz'} ({activeLesson.questions?.length || 0} Questions)
                          </button>
                        ) : (
                          <div className="max-w-xs mx-auto p-3 bg-slate-100 border border-slate-250 rounded-xl text-slate-500 font-mono text-xs font-bold flex items-center justify-center gap-1.5">
                            <Lock className="w-4 h-4 text-slate-400" />
                            Assessment Attempts Locked
                          </div>
                        )}
                      </div>

                      {/* PRIOR SUBMISSIONS & ATTEMPT HISTORY LIST (Premium Assessment History Feature) */}
                      {(() => {
                        const progRec = progress.find(p => p.lessonId === activeLesson.id);
                        const attempts = progRec?.attempts || [];
                        if (attempts.length === 0) return null;

                        return (
                          <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3.5">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">Assessment Submission History ({attempts.length} attempts)</h5>
                              <span className="text-[10px] text-slate-400 font-mono">Passing Mark: 75%</span>
                            </div>

                            <div className="space-y-2">
                              {attempts.map((attempt, aIdx) => {
                                const isSelected = selectedAttemptToReview?.id === attempt.id;
                                return (
                                  <div key={attempt.id} className="space-y-3">
                                    <div className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl bg-slate-50 hover:bg-slate-100/55 transition text-xs">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs ${attempt.passed ? 'bg-emerald-105 text-emerald-800' : 'bg-rose-105 text-rose-800'}`}>
                                          #{aIdx + 1}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-805">
                                            Score: <span className={attempt.passed ? "text-emerald-700 font-black font-mono" : "text-rose-750 font-black font-mono"}>{attempt.score}%</span>
                                          </p>
                                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            Submitted: {new Date(attempt.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 font-bold font-mono text-[9px] rounded-full uppercase tracking-wider ${attempt.passed ? 'bg-emerald-100 text-emerald-750 border border-emerald-200' : 'bg-rose-100 text-rose-750 border border-rose-200'}`}>
                                          {attempt.passed ? 'Passed / Mastered' : 'Failed'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedAttemptToReview(isSelected ? null : attempt)}
                                          className="text-[11px] font-bold text-indigo-650 bg-white border border-slate-205 hover:bg-white px-2.5 py-1 rounded-lg shadow-3xs cursor-pointer select-none"
                                        >
                                          {isSelected ? 'Hide Review' : 'Review Answers'}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Attempt slide down details */}
                                    {isSelected && (
                                      <div className="p-4.5 border border-indigo-150 bg-indigo-50/10 rounded-xl space-y-4 animate-scale-in text-left">
                                        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                                          <span className="font-bold text-xs text-indigo-900 font-mono">Attempt #{aIdx + 1} Answers Details</span>
                                          <span className="text-[10.5px] font-mono text-indigo-750 font-bold">Automatic Evaluation Summary</span>
                                        </div>

                                        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                                          {activeLesson.questions.map((q, qIdx) => {
                                            const studentChoice = attempt.selectedAnswers[q.id];
                                            const choiceIsCorrect = studentChoice === q.correctAnswer;
                                            return (
                                              <div key={q.id} className={`p-4 rounded-xl border text-xs space-y-1.5 bg-white shadow-3xs ${
                                                choiceIsCorrect ? 'border-emerald-200 bg-emerald-50/10' : studentChoice ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'
                                              }`}>
                                                <div className="flex justify-between items-center text-[10px]">
                                                  <span className="text-slate-450 font-mono font-bold">Q{qIdx + 1} COMPREHENSION TEST</span>
                                                  {choiceIsCorrect ? (
                                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">CORRECT</span>
                                                  ) : studentChoice ? (
                                                    <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded">INCORRECT</span>
                                                  ) : (
                                                    <span className="text-slate-500 font-bold bg-slate-50 px-1.5 py-0.2 rounded">BLANK</span>
                                                  )}
                                                </div>
                                                <p className="font-bold text-slate-800 leading-snug">{q.text}</p>
                                                <p className="text-[11px] text-slate-500">
                                                  Selected Answer: <span className={choiceIsCorrect ? 'text-emerald-700 font-semibold' : studentChoice ? 'text-rose-700 font-semibold' : 'italic text-slate-400'}>
                                                    {studentChoice || 'None / Blank'}
                                                  </span>
                                                </p>
                                                {!choiceIsCorrect && (
                                                  <p className="text-[11px] text-emerald-800 font-semibold font-mono">Standard Correct option: {q.correctAnswer}</p>
                                                )}
                                                {q.explanation && (
                                                  <p className="text-[11px] text-slate-500 italic bg-slate-50/50 p-2 rounded-lg mt-1 border-l-2 border-indigo-300">
                                                    <strong>Explanation:</strong> {q.explanation}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* ACTIVE QUIZ FORM */}
                  {quizActive && activeLesson.questions && activeLesson.questions.length > 0 && (
                    <div id="quiz-scaffold" className="space-y-4">
                      {showSubmitConfirmation ? (
                        /* SECURE ACCIDENT-PREVENTION SUBMIT CONFIRMATION SCREEN */
                        <div className="p-6 border-2 border-indigo-205 bg-indigo-50/10 rounded-2xl space-y-4 animate-scale-in text-left">
                          <div className="flex items-center gap-2 text-indigo-700">
                            <AlertCircle className="w-5 h-5 text-indigo-600 animate-pulse" />
                            <h4 className="font-bold text-sm uppercase tracking-wider font-mono">Confirm Quiz Submission</h4>
                          </div>
                          
                          <p className="text-xs text-slate-600 leading-relaxed">
                            You are about to submit your assessment answers for official grading evaluation. Please review your choices summary checklist below:
                          </p>

                          <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-indigo-100 shadow-3xs text-center font-mono text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Items</span>
                              <p className="text-base font-bold text-slate-800">{activeLesson.questions.length}</p>
                            </div>
                            <div className="space-y-1 border-l border-slate-150">
                              <span className="text-[10px] text-emerald-600 uppercase font-bold">Answered</span>
                              <p className="text-base font-bold text-emerald-600">
                                {Object.keys(quizAnswers).length}
                              </p>
                            </div>
                            <div className="space-y-1 border-l border-slate-150">
                              <span className="text-[10px] text-amber-600 uppercase font-bold">Unanswered</span>
                              <p className={`text-base font-bold ${activeLesson.questions.length - Object.keys(quizAnswers).length > 0 ? 'text-amber-655 font-extrabold' : 'text-slate-400'}`}>
                                {activeLesson.questions.length - Object.keys(quizAnswers).length}
                              </p>
                            </div>
                          </div>

                          {activeLesson.questions.length - Object.keys(quizAnswers).length > 0 ? (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed flex gap-1.5 items-start">
                              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>
                                <strong>Warning:</strong> You have unanswered questions. We highly recommend navigating back and making a selection for every item before submitting to maximize your potential grade scoring mark.
                              </span>
                            </div>
                          ) : (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] leading-relaxed flex gap-1.5 items-start">
                              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                              <span>
                                <strong>Excellent:</strong> You have successfully selected an answer option for every single question. Your assessment is complete and fully prepared for submission.
                              </span>
                            </div>
                          )}

                          <p className="text-[10.5px] text-slate-400">
                            * Once submitted, your scores and choices will be logged officially. Duplicate submissions settings will govern retake privileges.
                          </p>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              id="btn-quiz-back-review"
                              onClick={() => setShowSubmitConfirmation(false)}
                              className="px-4 py-2 border border-slate-250 text-xs font-semibold hover:bg-slate-50 text-slate-600 rounded-lg transition"
                            >
                              Go Back & Review
                            </button>
                            <button
                              id="btn-quiz-confirm-submit"
                              onClick={handleSubmitQuiz}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition border border-emerald-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Yes, Submit Assessment
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* CLASSIC QUESTION INTERACTIVE WORKSPACE */
                        <div id="quiz-scaffold-main" className="p-5 border border-indigo-150 rounded-2xl bg-white space-y-4 shadow-sm text-left animate-scale-in">
                          
                          {/* TOP HEADER CONTROLS BAR WITH FREE NAVIGATION INDICATOR */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 text-xs font-bold font-mono">
                            <div className="text-indigo-700 uppercase tracking-widest text-[10px]">
                              QUESTION {currentQuestionIdx + 1} OF {activeLesson.questions.length}
                            </div>
                            
                            <div className="flex items-center gap-2.5">
                              {/* Option to toggle instant correctness / flashcard view for study purposes */}
                              <label className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-205 px-2 py-0.5 rounded-md cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isInstantCorrectnessEnabled}
                                  onChange={(e) => {
                                    setIsInstantCorrectnessEnabled(e.target.checked);
                                    setImmediateFeedback(null);
                                  }}
                                  className="w-3 h-3 accent-indigo-650 cursor-pointer"
                                />
                                <span className="font-mono text-slate-600 text-[9.5px]">Instant correctness mode</span>
                              </label>

                              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[10px]">
                                {Object.keys(quizAnswers).length} / {activeLesson.questions.length} Answered
                              </span>
                            </div>
                          </div>

                          {/* INTERACTIVE QUESTION NAVIGATOR GRID (Row of shortcut jumps) */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-dashed border-slate-100">
                            <span className="text-[9.5px] font-mono text-slate-400 font-bold shrink-0 uppercase">Jump to:</span>
                            {activeLesson.questions.map((q, idx) => {
                              const isSelectedIdx = currentQuestionIdx === idx;
                              const isHasAnswer = !!quizAnswers[q.id];
                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => handleJumpToQuestion(idx)}
                                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition shrink-0 cursor-pointer ${
                                    isSelectedIdx
                                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300 ring-offset-1'
                                      : isHasAnswer
                                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500'
                                  }`}
                                  title={`Move to Question ${idx + 1}`}
                                >
                                  {idx + 1}
                                </button>
                              );
                            })}
                          </div>

                          {(() => {
                            const q = activeLesson.questions[currentQuestionIdx];
                            const isAnswered = isInstantCorrectnessEnabled && immediateFeedback !== null;
                            const savedAnswerForQ = quizAnswers[q.id] || '';

                            return (
                              <div className="space-y-4">
                                <h4 className="font-bold text-sm text-gray-900 leading-snug">{q.text}</h4>

                                <div className="grid grid-cols-1 gap-2.5">
                                  {q.options.map((opt, oIdx) => {
                                    const isSelected = savedAnswerForQ === opt;
                                    
                                    let styleClass = 'border-gray-200 hover:bg-gray-50 bg-white hover:border-slate-350';
                                    if (isSelected) {
                                      styleClass = 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500';
                                    }
                                    if (isAnswered) {
                                      if (opt === q.correctAnswer) {
                                        styleClass = 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500';
                                      } else if (isSelected) {
                                        styleClass = 'border-rose-450 bg-rose-50 text-rose-950 ring-1 ring-rose-350';
                                      } else {
                                        styleClass = 'border-gray-150 bg-white opacity-40';
                                      }
                                    }

                                    return (
                                      <button
                                        key={oIdx}
                                        id={`quiz-option-${oIdx}`}
                                        disabled={isAnswered}
                                        onClick={() => handleSelectChoice(opt, q)}
                                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all select-none cursor-pointer ${styleClass}`}
                                      >
                                        <span>{opt}</span>
                                        {isAnswered && opt === q.correctAnswer && (
                                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        )}
                                        {isAnswered && isSelected && opt !== q.correctAnswer && (
                                          <AlertCircle className="w-4 h-4 text-rose-500" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Immediate feedback reasoning details block */}
                                {isAnswered && (
                                  <div className={`p-3.5 rounded-xl text-xs space-y-1 ${immediateFeedback ? 'bg-emerald-50 border border-emerald-150' : 'bg-rose-50 border border-rose-150'}`}>
                                    <div className="flex items-center gap-1.5 font-bold">
                                      {immediateFeedback ? (
                                        <span className="text-emerald-800">Excellent! Correct Answer.</span>
                                      ) : (
                                        <span className="text-rose-800">Incorrect choice.</span>
                                      )}
                                    </div>
                                    {q.explanation && (
                                      <p className="text-gray-600 leading-relaxed italic">{q.explanation}</p>
                                    )}
                                  </div>
                                )}

                                {/* FOOTER SUBMISSION WORKSPACE CORES */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                  {/* Back / Previous Navigator Button */}
                                  <button
                                    type="button"
                                    disabled={currentQuestionIdx === 0}
                                    onClick={handlePrevQuestion}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                                      currentQuestionIdx === 0
                                        ? 'border-slate-100 bg-slate-50/50 text-slate-300 pointer-events-none'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-950 text-slate-600 cursor-pointer'
                                    }`}
                                  >
                                    Previous
                                  </button>

                                  {/* Grand "Submit Quiz" trigger button (Always clearly visible on active pages) */}
                                  <button
                                    type="button"
                                    id="btn-quiz-submit-action"
                                    onClick={() => setShowSubmitConfirmation(true)}
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs px-4.5 py-1.5 rounded-xl shadow-md cursor-pointer transition-all border border-emerald-700"
                                    title="Officially submit all selected choices for automatic grading evaluation."
                                  >
                                    <Send className="w-3.5 h-3.5 shrink-0" />
                                    <span>Submit Quiz</span>
                                  </button>

                                  {/* Next Navigator Button */}
                                  <button
                                    type="button"
                                    disabled={currentQuestionIdx === activeLesson.questions.length - 1}
                                    onClick={() => handleNextQuestion(activeLesson.questions.length)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                                      currentQuestionIdx === activeLesson.questions.length - 1
                                        ? 'border-slate-100 bg-slate-50/50 text-slate-300 pointer-events-none'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-950 text-slate-600 cursor-pointer'
                                    }`}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* QUIZ TERMINATED REPORT CARD */}
                  {quizFinished && latestQuizScore !== null && (
                    <div id="quiz-grades-report" className="border border-slate-200 rounded-2xl bg-white text-left animate-scale-in overflow-hidden shadow-sm">
                      {/* Report Card Header (Automatic evaluation coloring) */}
                      <div className={`p-4.5 text-white flex items-center justify-between transition ${
                        latestQuizScore >= 75 ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        <div className="flex items-center gap-3">
                          {latestQuizScore >= 75 ? (
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                              <Check className="w-6 h-6 animate-pulse" />
                            </div>
                          ) : (
                            <span className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">&times;</span>
                          )}
                          <div>
                            <h4 className="font-bold text-xs tracking-wide uppercase font-mono text-white/90">Assessment Graded</h4>
                            <h3 className="text-lg font-black mt-0.5">{latestQuizScore >= 75 ? 'PASSED (Mastered)' : 'ATTEMPT INCOMPLETE'}</h3>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <span className="text-[9.5px] block opacity-85">YOUR SCORE</span>
                          <span className="text-2xl font-black">{latestQuizScore}%</span>
                        </div>
                      </div>

                      <div className="p-6 space-y-5">
                        {/* Summary and descriptive automatic commentary feedback */}
                        <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-xl">
                          <h5 className="font-extrabold text-slate-900 text-xs">Evaluation Feedback:</h5>
                          <p className="mt-1">
                            {latestQuizScore >= 75 
                              ? "Outstanding effort! You successfully met the 75% threshold benchmark. The concept mastery has been recorded, unlocking subsequent syllabus content."
                              : "The mark achieved is currently below the 75% progression benchmark. Don't worry! This is a core part of learning. We encourage you to review the notes or video lecture again and take another attempt."
                            }
                          </p>
                        </div>

                        {/* LINE-BY-LINE STUDY QUESTION REPORT CARDS (Instant automatic grading feedback) */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <h5 className="font-bold text-xs text-slate-400 uppercase tracking-widest font-mono font-sans pb-1 block">Answers Evaluation Breakdown</h5>
                          <div className="space-y-4 max-h-[290px] overflow-y-auto pr-1">
                            {activeLesson.questions.map((q, qIdx) => {
                              const selectedAnswer = quizAnswers[q.id];
                              const choiceIsCorrect = selectedAnswer === q.correctAnswer;
                              return (
                                <div key={q.id} className={`p-4 rounded-xl border text-xs space-y-2 text-left transition ${
                                  choiceIsCorrect ? 'bg-emerald-50/30 border-emerald-150' : selectedAnswer ? 'bg-rose-50/30 border-rose-150' : 'bg-slate-50 border-slate-200'
                                }`}>
                                  <div className="flex justify-between gap-1.5 items-center">
                                    <span className="font-mono font-bold text-[9.5px] text-slate-400 font-sans">QUESTION #{qIdx + 1}</span>
                                    {choiceIsCorrect ? (
                                      <span className="text-emerald-700 font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded text-[9.5px] tracking-wider font-sans">CORRECT</span>
                                    ) : selectedAnswer ? (
                                      <span className="text-rose-700 font-mono font-bold bg-rose-100 px-2 py-0.5 rounded text-[9.5px] tracking-wider font-sans">INCORRECT</span>
                                    ) : (
                                      <span className="text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-[9.5px] tracking-wider font-sans">UNANSWERED / BLANK</span>
                                    )}
                                  </div>
                                  
                                  <p className="font-bold text-slate-800 leading-snug">{q.text}</p>
                                  
                                  <div className="grid grid-cols-1 gap-1 pt-1 text-[11px] font-medium font-mono text-slate-650">
                                    <p>Selected choice: <span className={choiceIsCorrect ? 'text-emerald-700 font-bold' : selectedAnswer ? 'text-rose-700 font-bold font-mono' : 'italic text-slate-405'}>{selectedAnswer || 'Left Blank'}</span></p>
                                    {!choiceIsCorrect && (
                                      <p className="text-emerald-750 font-bold">Standard Correct: <span className="font-bold text-slate-900">{q.correctAnswer}</span></p>
                                    )}
                                  </div>

                                  {q.explanation && (
                                    <div className="p-2.5 bg-white border border-dashed border-slate-200 text-slate-500 italic text-[11px] leading-relaxed rounded-xl font-sans">
                                      <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Summary Bottom Actions Footer */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-slate-150 pt-4.5">
                          <span className="text-[10.5px] text-slate-400 font-mono">
                            Attempt graded securely at: {new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {activeLesson.allowMultipleAttempts !== false ? (
                              <button
                                id="btn-quiz-retry"
                                onClick={() => startQuiz(activeLesson)}
                                className="px-4 py-2 border border-slate-250 hover:bg-slate-55 text-xs text-slate-600 rounded-xl font-bold transition cursor-pointer select-none"
                              >
                                Retake Assessment
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 bg-slate-100 px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 font-mono select-none">
                                <Lock className="w-3.5 h-3.5" />
                                Retakes Locked
                              </span>
                            )}
                            
                            <button
                              id="btn-quiz-proceed-ok"
                              onClick={() => {
                                setQuizFinished(false);
                              }}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer select-none"
                            >
                              Close Review Report
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lock Warning if student attempts quiz but hasn't watched video or notes */}
                  {!(progress.find(p => p.lessonId === activeLesson.id)?.videoWatched && progress.find(p => p.lessonId === activeLesson.id)?.notesRead) && !quizActive && !quizFinished && (
                    <p className="text-[11px] text-center italic text-amber-600 bg-amber-50/50 p-2 rounded-lg">
                      Tip: We highly recommend marking both the Video and Notes as read of the active lesson before evaluating your score!
                    </p>
                  )}

                </div>

              </div>
            </>
          ) : (
            <div className="text-center py-32 text-gray-400 text-sm italic">
              Please choose an unlocked lesson in the syllabus tree to expand your learning workspace.
            </div>
          )}
        </div>

      </div>
      
      {/* Immersive Lecture Notes Full-Screen Focus Mode Reader */}
      {isNotesFullscreen && activeLesson && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 md:p-8 select-none font-sans"
          id="notes-fullscreen-portal"
        >
          <div 
            className={`w-full max-w-5xl h-full max-h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border transition duration-300 ${
              focusTheme === 'sepia' 
                ? 'bg-[#fbf6eb] text-[#433422] border-[#e1d5c3]' 
                : focusTheme === 'dark'
                  ? 'bg-slate-900 text-slate-100 border-slate-800'
                  : 'bg-white text-slate-850 border-slate-200'
            }`}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none ${
              focusTheme === 'sepia'
                ? 'border-[#ede2d0] bg-[#f5ecda]'
                : focusTheme === 'dark'
                  ? 'border-slate-800 bg-slate-950'
                  : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="text-left w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold font-mono tracking-wider px-2 py-0.5 rounded ${
                    focusTheme === 'sepia'
                      ? 'bg-[#e1d5c3] text-[#70543e]'
                      : focusTheme === 'dark'
                        ? 'bg-indigo-950 text-indigo-300'
                        : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    Theoretical Notes Focus Mode
                  </span>
                  <span className="text-xs font-mono text-slate-400 hidden sm:inline">Press Esc to exit</span>
                </div>
                <h3 className={`text-base font-bold mt-1 ${
                  focusTheme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeLesson.name}
                </h3>
              </div>

              {/* Utility Tools */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Font Size controls */}
                <div className={`p-1 rounded-lg flex items-center border ${
                  focusTheme === 'sepia'
                    ? 'bg-[#ede2d0] border-[#e1d5c3]'
                    : focusTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setFocusTextSize('normal')}
                    className={`px-2 py-1 text-xs font-bold rounded cursor-pointer ${
                      focusTextSize === 'normal'
                        ? (focusTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white shadow-3xs text-indigo-600')
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Small/Normal text size"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusTextSize('lg')}
                    className={`px-2 py-1 text-sm font-bold rounded cursor-pointer ${
                      focusTextSize === 'lg'
                        ? (focusTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white shadow-3xs text-indigo-600')
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Large font size"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusTextSize('xl')}
                    className={`px-2 py-1 text-base font-bold rounded cursor-pointer ${
                      focusTextSize === 'xl'
                        ? (focusTheme === 'dark' ? 'bg-slate-700 text-white' : 'bg-white shadow-3xs text-indigo-600')
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Extra Large text size"
                  >
                    A++
                  </button>
                </div>

                {/* Theme choice controls */}
                <div className={`p-1 rounded-lg flex items-center border ${
                  focusTheme === 'sepia'
                    ? 'bg-[#ede2d0] border-[#e1d5c3]'
                    : focusTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setFocusTheme('clean')}
                    className={`w-5 h-5 rounded-full border bg-white ${
                      focusTheme === 'clean' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-300'
                    } cursor-pointer`}
                    title="Day Light mode"
                  />
                  <button
                    type="button"
                    onClick={() => setFocusTheme('sepia')}
                    className={`w-5 h-5 ml-1.5 rounded-full border bg-[#f4ebd0] ${
                      focusTheme === 'sepia' ? 'ring-2 ring-amber-600 border-amber-600' : 'border-[#dccab0]'
                    } cursor-pointer`}
                    title="Comfort Sepia mode"
                  />
                  <button
                    type="button"
                    onClick={() => setFocusTheme('dark')}
                    className={`w-5 h-5 ml-1.5 rounded-full border bg-slate-900 ${
                      focusTheme === 'dark' ? 'ring-2 ring-sky-400 border-sky-400' : 'border-slate-705'
                    } cursor-pointer`}
                    title="Midnight Dark mode"
                  />
                </div>

                {/* Exit Full Screen Button */}
                <button
                  id="btn-close-fullscreen-notes"
                  type="button"
                  onClick={() => setIsNotesFullscreen(false)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Focus</span>
                </button>
              </div>
            </div>

            {/* Fullscreen PDF study tabs */}
            {activeLesson.pdfs && activeLesson.pdfs.length > 0 && (
              <div className={`px-6 sm:px-12 md:px-16 flex border-b gap-2 select-none justify-start ${
                focusTheme === 'sepia'
                  ? 'border-[#ede2d0] bg-[#f5ecda]/60'
                  : focusTheme === 'dark'
                    ? 'border-slate-800 bg-slate-950/60'
                    : 'border-slate-200 bg-slate-50/65'
              }`}>
                <button
                  id="btn-student-fullscreen-notes-text-tab"
                  type="button"
                  onClick={() => setSelectedPdfNotesTab('text')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    selectedPdfNotesTab === 'text'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : focusTheme === 'dark'
                        ? 'border-transparent text-slate-400 hover:text-slate-200'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Lecture Text Notes
                </button>
                <button
                  id="btn-student-fullscreen-notes-pdfs-tab"
                  type="button"
                  onClick={() => setSelectedPdfNotesTab('pdfs')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedPdfNotesTab === 'pdfs'
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : focusTheme === 'dark'
                        ? 'border-transparent text-slate-400 hover:text-slate-200'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Attached PDF Handouts ({activeLesson.pdfs.length})</span>
                </button>
              </div>
            )}

            {/* Scrollable Focusable Text Content OR PDF Reader */}
            {selectedPdfNotesTab === 'text' || !activeLesson.pdfs || activeLesson.pdfs.length === 0 ? (
              <div className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-16 py-8 select-text">
                <div 
                  className={`prose max-w-none text-left tracking-wider leading-relaxed ${
                    focusTextSize === 'xl' 
                      ? 'text-lg md:text-xl' 
                      : focusTextSize === 'lg'
                        ? 'text-base md:text-lg'
                        : 'text-sm md:text-base'
                  } ${
                    focusTheme === 'sepia'
                      ? 'prose-amber text-[#433422]'
                      : focusTheme === 'dark'
                        ? 'prose-invert text-slate-100'
                        : 'prose-slate text-slate-800'
                  }`}
                >
                  {/<[a-z][\s\S]*>/i.test(activeLesson.notes || '') ? (
                    <div dangerouslySetInnerHTML={{ __html: activeLesson.notes || '' }} />
                  ) : (
                    formatTextWithBreaks(activeLesson.notes || '')
                  )}
                </div>
              </div>
            ) : (
              <div className={`flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 sm:p-6 overflow-hidden select-text ${
                focusTheme === 'dark' 
                  ? 'bg-slate-900' 
                  : focusTheme === 'sepia' 
                    ? 'bg-[#fbf6eb]' 
                    : 'bg-slate-50'
              }`}>
                {/* PDF Left Selector Side Drawer */}
                <div className={`md:col-span-1 space-y-3 overflow-y-auto pr-1 border-r text-left ${
                  focusTheme === 'dark' 
                    ? 'border-slate-800' 
                    : focusTheme === 'sepia' 
                      ? 'border-[#e1d5c3]' 
                      : 'border-slate-200'
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono block">Document Catalog</span>
                  <div className="space-y-2">
                    {(activeLesson.pdfs || []).map((pdf) => (
                      <div
                        key={pdf.id}
                        onClick={() => setActivePdfId(pdf.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition select-none flex flex-col justify-between gap-1.5 ${
                          (activePdfId || activeLesson.pdfs?.[0]?.id) === pdf.id
                            ? 'border-indigo-600 bg-indigo-50/10 shadow-xs'
                            : focusTheme === 'dark'
                              ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300'
                              : focusTheme === 'sepia'
                                ? 'border-[#e1d5c3] hover:border-[#dccab0] bg-[#f5ecda]/40 text-[#433422]'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-100/50 text-slate-705'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${
                            (activePdfId || activeLesson.pdfs?.[0]?.id) === pdf.id 
                              ? 'text-indigo-500' 
                              : 'text-slate-400'
                          }`} />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate leading-snug capitalize ${
                              (activePdfId || activeLesson.pdfs?.[0]?.id) === pdf.id 
                                ? 'text-indigo-400 font-bold' 
                                : focusTheme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                            }`}>
                              {pdf.name}
                            </p>
                            {pdf.description && (
                              <p className="text-[10px] opacity-70 leading-normal mt-1 line-clamp-3">
                                {pdf.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PDF Viewer Frame */}
                <div className="md:col-span-3 flex flex-col h-full justify-between overflow-hidden">
                  {(() => {
                    const currentPdf = (activeLesson.pdfs || []).find(p => p.id === activePdfId) || (activeLesson.pdfs || [])[0];
                    if (!currentPdf) return (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans">
                        <FileText className="w-10 h-10 text-slate-305 mb-2" />
                        <span className="text-xs">No active PDF handout selected</span>
                      </div>
                    );

                    return (
                      <div className={`border rounded-xl p-4 flex-1 flex flex-col justify-between h-full overflow-hidden ${
                        focusTheme === 'dark'
                          ? 'bg-slate-950/40 border-slate-800'
                          : focusTheme === 'sepia'
                            ? 'bg-[#f5ecda]/40 border-[#ede2d0]'
                            : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        {/* Header controls inside focus mode */}
                        <div className="border-b pb-3 mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-550 block">Focused PDF Viewer</span>
                            <h4 className={`font-bold text-sm mt-1 capitalize truncate ${
                              focusTheme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}>{currentPdf.name}</h4>
                            {currentPdf.description && (
                              <p className="text-[11px] opacity-80 leading-snug mt-0.5">{currentPdf.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                            <a
                              id="btn-student-fullscreen-download-pdf"
                              href={currentPdf.url}
                              download={`${currentPdf.name}.pdf`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noreferrer"
                              className={`p-2 border text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer select-none ${
                                focusTheme === 'dark'
                                  ? 'border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                                  : focusTheme === 'sepia'
                                    ? 'border-[#ede2d0] hover:border-[#e1d5c3] bg-[#fbf6eb] text-[#433422] hover:bg-[#ede2d0]'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                              title="Download PDF booklet"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Download</span>
                            </a>
                            <a
                              id="btn-student-fullscreen-open-pdf"
                              href={currentPdf.url}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noreferrer"
                              className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer select-none"
                              title="Open PDF in a fresh browser tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-150" />
                              <span>New Tab</span>
                            </a>
                          </div>
                        </div>

                        {/* Centered raw PDF viewer */}
                        <div className="relative flex-1 bg-slate-905 rounded-xl overflow-hidden border border-slate-950 min-h-[300px]">
                          <iframe
                            id="student-fullscreen-pdf-iframe"
                            src={currentPdf.url}
                            title={currentPdf.name}
                            className="absolute inset-0 w-full h-full border-0 bg-slate-900"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Security notice banner */}
                        <div className={`mt-3 border p-2.5 rounded-lg flex gap-2 text-left ${
                          focusTheme === 'dark'
                            ? 'bg-slate-900/60 border-slate-800 text-indigo-200'
                            : focusTheme === 'sepia'
                              ? 'bg-[#ede2d0]/30 border-[#e1d5c3] text-[#433422]'
                              : 'bg-indigo-50/50 border-indigo-100 text-indigo-950'
                        }`}>
                          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <div className="text-[10px] leading-normal font-sans">
                            <span className="font-semibold">Workspace Alert:</span> If your browser sandbox refuses to construct base64 object frames inside nested viewports, click the <span className="font-semibold text-indigo-600">"New Tab"</span> or <span className="font-semibold text-indigo-600">"Download"</span> controls to read this notes booklet in complete clarity.
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Footer with checklist feedback */}
            <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 select-none ${
              focusTheme === 'sepia'
                ? 'border-[#ede2d0] bg-[#f5ecda]'
                : focusTheme === 'dark'
                  ? 'border-slate-800 bg-slate-950'
                  : 'border-slate-100 bg-slate-50'
            }`}>
              <p className="text-xs text-slate-400 text-left">
                Tip: Adjust formatting on the toolbar above. Changes persist for this session.
              </p>
              
              <div className="flex items-center gap-4">
                <label className={`flex items-center gap-2 text-xs font-bold font-mono tracking-wide cursor-pointer p-2 border rounded-lg shadow-xs select-none ${
                  focusTheme === 'sepia'
                    ? 'bg-white hover:bg-slate-50 text-[#433422] border-[#e1d5c3]'
                    : focusTheme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-indigo-900 border-slate-200'
                }`}>
                  <input
                    id="checkbox-fullscreen-notes-read"
                    type="checkbox"
                    checked={!!progress.find(p => p.lessonId === activeLesson.id)?.notesRead}
                    onChange={(e) => handleMarkNotesRead(activeLesson.id, e.target.checked)}
                    className="accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  Mark Notes as Read
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsNotesFullscreen(false)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer text-right w-full sm:w-auto"
                >
                  Done Reading
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons inlined to bypass extra imports or SVGs
function StarsBadgeIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
