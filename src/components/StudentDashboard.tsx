/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Class, Subject, Topic, Lesson, UserRole, StudentProgress, Question, QuestionType } from '../types.ts';
import { db } from '../db.ts';
import { 
  BookOpen, Video, FileText, HelpCircle, CheckCircle, Lock, 
  ChevronRight, Award, Zap, RefreshCw, BarChart2, Star,
  AlertCircle, Check, Play, ArrowRight, BookMarked, Maximize2, Minimize2
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
    setQuizActive(true);
    setCurrentQuestionIdx(0);
    setSelectedChoice('');
    setImmediateFeedback(null);
    setQuizAnswers({});
    setCorrectCount(0);
    setQuizFinished(false);
    setLatestQuizScore(null);
  };

  const handleSelectChoice = (choice: string, q: Question) => {
    if (immediateFeedback !== null) return; // Prevent double selecting
    setSelectedChoice(choice);
    
    const isCorrect = choice === q.correctAnswer;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
    setImmediateFeedback(isCorrect);
    
    setQuizAnswers({
      ...quizAnswers,
      [q.id]: choice
    });
  };

  const handleNextQuestion = (totalQuestions: number) => {
    if (currentQuestionIdx + 1 < totalQuestions) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedChoice('');
      setImmediateFeedback(null);
    } else {
      // Finished!
      const finalScorePct = Math.round((correctCount / totalQuestions) * 100);
      const passed = finalScorePct >= 75;

      const attempt = {
        id: `attempt-${Date.now()}`,
        studentId: currentUser.id,
        lessonId: selectedLessonId,
        score: finalScorePct,
        passed,
        date: new Date().toISOString(),
        selectedAnswers: quizAnswers
      };

      db.addQuizAttempt(attempt, passed, finalScorePct);
      setLatestQuizScore(finalScorePct);
      setQuizFinished(true);
      setQuizActive(false);
      reloadProgress();
    }
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
              onClick={() => setSelectedSubjectId(sub.id)}
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
        <div id="student-syllabus-tracker" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b pb-3 border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm font-mono uppercase tracking-wider text-indigo-600">Syllabus Index</h3>
            <p className="text-xs text-slate-400 mt-0.5">Chapters & lessons mapped in linear alignment</p>
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {topics.filter(t => t.subjectId === selectedSubjectId).map((topic, tidx) => {
              const topicLessons = lessons.filter(l => l.topicId === topic.id);
              return (
                <div key={topic.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded font-bold">
                      Chapter {tidx + 1}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs truncate font-display">{topic.name}</h4>
                  </div>

                  <div className="space-y-1.5 pl-3 border-l-2 border-indigo-50">
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
                              
                              <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-1.5">
                                <span className="font-mono">{les.duration} mins</span>
                                {isCompleted ? (
                                  <span className="text-emerald-600 font-mono flex items-center font-semibold gap-0.5 bg-emerald-50 px-1 rounded">
                                    <Check className="w-2.5 h-2.5" /> Complete
                                  </span>
                                ) : progRecord?.highestQuizScore ? (
                                  <span className="text-amber-600 font-mono font-medium">Attempted ({progRecord.highestQuizScore}%)</span>
                                ) : (
                                  <span className="text-slate-400">Not Completed</span>
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Workspace panel for study content */}
        <div id="student-active-curriculum-panel" className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          {activeLesson ? (
            <>
              {/* Header */}
              <div className="bg-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono opacity-80">STUDYING LESSON</span>
                  <h3 className="font-bold text-lg mt-0.5">{activeLesson.name}</h3>
                </div>
                
                {progress.find(p => p.lessonId === activeLesson.id)?.quizCompleted && (
                  <span className="text-[11px] bg-emerald-550 border border-emerald-500 font-semibold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
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
                  
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto font-sans shadow-inner">
                    <div className="prose max-w-none text-left">
                      {/<[a-z][\s\S]*>/i.test(activeLesson.notes || '') ? (
                        <div dangerouslySetInnerHTML={{ __html: activeLesson.notes || '' }} />
                      ) : (
                        formatTextWithBreaks(activeLesson.notes || '')
                      )}
                    </div>
                  </div>

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
                <div className="space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-700 font-mono tracking-wider block uppercase">Step 3: Concepts Mastery evaluation</span>
                      <p className="text-[11px] text-slate-400">A scoring mark of at least <span className="font-semibold text-slate-700">75% or higher</span> is required to proceed.</p>
                    </div>

                    {progress.find(p => p.lessonId === activeLesson.id)?.highestQuizScore ? (
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 shadow-xs animate-scale-in">
                        Top Mark: {progress.find(p => p.lessonId === activeLesson.id)?.highestQuizScore}%
                      </span>
                    ) : null}
                  </div>

                  {!quizActive && !quizFinished ? (
                    <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-3.5 shadow-xs">
                      <Award className="w-8 h-8 text-indigo-600 mx-auto" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">Mastery Assessment Quiz</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">Test your comprehension on the content! Pass with at least 75% to unlock successive lessons.</p>
                      </div>

                      <button
                        id="btn-trigger-quiz"
                        onClick={() => startQuiz(activeLesson)}
                        className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-100 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Begin Evaluation Quiz ({activeLesson.questions?.length || 0} Questions)
                      </button>
                    </div>
                  ) : null}

                  {/* ACTIVE QUIZ FORM */}
                  {quizActive && activeLesson.questions && activeLesson.questions.length > 0 && (
                    <div id="quiz-scaffold" className="p-5 border border-indigo-150 rounded-2xl bg-white space-y-4 shadow-sm text-left animate-scale-in">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs font-bold font-mono text-indigo-700">
                        <span>QUESTION {currentQuestionIdx + 1} OF {activeLesson.questions.length}</span>
                        <span className="bg-indigo-50 px-2 py-0.5 rounded">Score: {correctCount} correct</span>
                      </div>

                      {(() => {
                        const q = activeLesson.questions[currentQuestionIdx];
                        return (
                          <div className="space-y-4">
                            <h4 className="font-bold text-sm text-gray-900 leading-snug">{q.text}</h4>

                            <div className="grid grid-cols-1 gap-2.5">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = selectedChoice === opt;
                                const isAnswered = immediateFeedback !== null;
                                
                                let styleClass = 'border-gray-200 hover:bg-gray-50 bg-white';
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
                                    className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all select-none ${styleClass}`}
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

                            {/* Immediate answer reasoning block */}
                            {immediateFeedback !== null && (
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

                            {immediateFeedback !== null && (
                              <div className="flex justify-end pt-2">
                                <button
                                  id="btn-quiz-next"
                                  onClick={() => handleNextQuestion(activeLesson.questions.length)}
                                  className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
                                >
                                  {currentQuestionIdx + 1 < activeLesson.questions.length ? 'Next Question' : 'Finish Evaluation & Grade'}
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* QUIZ TERMINATED REPORT CARD */}
                  {quizFinished && latestQuizScore !== null && (
                    <div id="quiz-grades-report" className="p-6 border border-slate-200 rounded-2xl bg-white text-center space-y-4 animate-scale-in">
                      <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg font-mono">
                        {latestQuizScore >= 75 ? (
                          <div className="w-16 h-16 bg-emerald-500 text-white flex items-center justify-center rounded-full shadow-md animate-bounce">
                            <Check className="w-8 h-8" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-rose-500 text-white flex items-center justify-center rounded-full shadow-md">
                            &times;
                          </div>
                        )}
                      </div>

                      <div>
                        {latestQuizScore >= 75 ? (
                          <>
                            <h4 className="font-bold text-base text-emerald-800">Syllabus Concept Mastered!</h4>
                            <p className="text-xs text-slate-500 mt-1">Awesome effort! You scored <span className="font-bold text-gray-800 font-mono text-sm">{latestQuizScore}%</span>, exceeding the course pass requirements.</p>
                          </>
                        ) : (
                          <>
                            <h4 className="font-bold text-base text-rose-800">Mastery Attempt Pending</h4>
                            <p className="text-xs text-slate-500 mt-1">You achieved <span className="font-bold text-gray-800 font-mono text-sm">{latestQuizScore}%</span>. Go back through the video lecture and review notes, then click Attempt below to re-evaluate.</p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          id="btn-quiz-retry"
                          onClick={() => startQuiz(activeLesson)}
                          className="px-4 py-2 border border-gray-250 text-xs text-gray-600 hover:bg-gray-50 rounded-lg font-semibold transition"
                        >
                          Retake Quiz
                        </button>
                        {latestQuizScore >= 75 && (
                          <button
                            id="btn-quiz-proceed-ok"
                            onClick={() => {
                              setQuizFinished(false);
                            }}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                          >
                            Close Report Card
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lock Warning if student attempts quiz but hasn't watched video or notes */}
                  {!(progress.find(p => p.lessonId === activeLesson.id)?.videoWatched && progress.find(p => p.lessonId === activeLesson.id)?.notesRead) && !quizActive && !quizFinished && (
                    <p className="text-[11px] text-center italic text-amber-600 bg-amber-50 p-2 rounded-lg">
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

            {/* Scrollable Focusable Text Content */}
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
