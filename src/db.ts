/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Class, Subject, Topic, Lesson, User, StudentProgress, QuizAttempt, UserRole, QuestionType } from './types.ts';
import { INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_TOPICS, INITIAL_LESSONS, INITIAL_USERS, INITIAL_PROGRESS } from './initialData.ts';

// Storage Keys
const KEYS = {
  CLASSES: 'mmt_classes',
  SUBJECTS: 'mmt_subjects',
  TOPICS: 'mmt_topics',
  LESSONS: 'mmt_lessons',
  USERS: 'mmt_users',
  PROGRESS: 'mmt_progress'
};

// Database Constraint Error representation
export class DatabaseConstraintError extends Error {
  constructor(public field: string, message: string) {
    super(`[Database Constraint Violation] ${field}: ${message}`);
    this.name = 'DatabaseConstraintError';
  }
}

// Deep cloning utility to prevent React reference mutations
const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj)) as T;
};

// Standard email format verification regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// 1. DATA ENTITY VALIDATORS
// ==========================================

export const validators = {
  validateUser: (user: User, allUsers: User[]): void => {
    if (!user.id || typeof user.id !== 'string') {
      throw new DatabaseConstraintError('User.id', 'ID is required and must be a string.');
    }
    if (!user.name || typeof user.name !== 'string' || !user.name.trim()) {
      throw new DatabaseConstraintError('User.name', 'User name is required and cannot be blank.');
    }
    if (!user.email || typeof user.email !== 'string' || !EMAIL_REGEX.test(user.email)) {
      throw new DatabaseConstraintError('User.email', `Invalid email format: "${user.email}".`);
    }
    if (!user.role || !Object.values(UserRole).includes(user.role)) {
      throw new DatabaseConstraintError('User.role', `Invalid user role status: "${user.role}".`);
    }

    // Unique Email Check
    const duplicate = allUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase() && u.id !== user.id);
    if (duplicate) {
      throw new DatabaseConstraintError('User.email', `Email address "${user.email}" is already registered in the system (Conflict ID: ${duplicate.id}).`);
    }
  },

  validateClass: (cls: Class): void => {
    if (!cls.id || typeof cls.id !== 'string') {
      throw new DatabaseConstraintError('Class.id', 'Class ID is required.');
    }
    if (!cls.name || typeof cls.name !== 'string' || !cls.name.trim()) {
      throw new DatabaseConstraintError('Class.name', 'Classroom name cannot be blank.');
    }
  },

  validateSubject: (subj: Subject, classes: Class[]): void => {
    if (!subj.id || typeof subj.id !== 'string') {
      throw new DatabaseConstraintError('Subject.id', 'Subject ID is required.');
    }
    if (!subj.classId || typeof subj.classId !== 'string') {
      throw new DatabaseConstraintError('Subject.classId', 'Target class ID reference is required.');
    }
    if (!subj.name || typeof subj.name !== 'string' || !subj.name.trim()) {
      throw new DatabaseConstraintError('Subject.name', 'Subject module name cannot be blank.');
    }

    // Foreign Key Check
    const classExists = classes.some(c => c.id === subj.classId);
    if (!classExists) {
      throw new DatabaseConstraintError('Subject.classId', `Classroom link "${subj.classId}" does not exist in the database.`);
    }
  },

  validateTopic: (topic: Topic, subjects: Subject[]): void => {
    if (!topic.id || typeof topic.id !== 'string') {
      throw new DatabaseConstraintError('Topic.id', 'Topic ID is required.');
    }
    if (!topic.subjectId || typeof topic.subjectId !== 'string') {
      throw new DatabaseConstraintError('Topic.subjectId', 'Parent subject ID reference is required.');
    }
    if (!topic.name || typeof topic.name !== 'string' || !topic.name.trim()) {
      throw new DatabaseConstraintError('Topic.name', 'Topic name cannot be blank.');
    }

    // Foreign Key Check
    const subjectExists = subjects.some(s => s.id === topic.subjectId);
    if (!subjectExists) {
      throw new DatabaseConstraintError('Topic.subjectId', `Subject reference "${topic.subjectId}" does not exist in the database.`);
    }
  },

  validateLesson: (lesson: Lesson, topics: Topic[]): void => {
    if (!lesson.id || typeof lesson.id !== 'string') {
      throw new DatabaseConstraintError('Lesson.id', 'Lesson ID is required.');
    }
    if (!lesson.topicId || typeof lesson.topicId !== 'string') {
      throw new DatabaseConstraintError('Lesson.topicId', 'Parent topic reference ID is required.');
    }
    if (!lesson.name || typeof lesson.name !== 'string' || !lesson.name.trim()) {
      throw new DatabaseConstraintError('Lesson.name', 'Lesson lecture title cannot be blank.');
    }

    // Foreign Key Check
    const topicExists = topics.some(t => t.id === lesson.topicId);
    if (!topicExists) {
      throw new DatabaseConstraintError('Lesson.topicId', `Chapter topic reference "${lesson.topicId}" does not exist in the database.`);
    }

    // Sub-Entity Validation: Assessment Questions list
    if (lesson.questions) {
      lesson.questions.forEach((q, idx) => {
        if (!q.id) {
          throw new DatabaseConstraintError(`Lesson.questions[${idx}].id`, 'Each assessment question must have an ID.');
        }
        if (!q.text || !q.text.trim()) {
          throw new DatabaseConstraintError(`Lesson.questions[${idx}].text`, 'Question text cannot be blank.');
        }
        if (!q.type || !Object.values(QuestionType).includes(q.type)) {
          throw new DatabaseConstraintError(`Lesson.questions[${idx}].type`, `Invalid question format type: "${q.type}".`);
        }
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          throw new DatabaseConstraintError(`Lesson.questions[${idx}].options`, 'Each question must offer at least 2 choice answers.');
        }
        if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '') {
          throw new DatabaseConstraintError(`Lesson.questions[${idx}].correctAnswer`, 'Correct option value is required.');
        }
      });
    }

    // Sub-Entity Validation: Supplementary PDFs list
    if (lesson.pdfs) {
      lesson.pdfs.forEach((pdf, idx) => {
        if (!pdf.id) {
          throw new DatabaseConstraintError(`Lesson.pdfs[${idx}].id`, 'Each supplemental booklet must have a valid ID.');
        }
        if (!pdf.name || !pdf.name.trim()) {
          throw new DatabaseConstraintError(`Lesson.pdfs[${idx}].name`, 'Supplemental documentation name cannot be empty.');
        }
        if (!pdf.url || !pdf.url.trim()) {
          throw new DatabaseConstraintError(`Lesson.pdfs[${idx}].url`, 'Document resource source path or URL is required.');
        }
      });
    }
  },

  validateProgress: (prog: StudentProgress, users: User[], lessons: Lesson[]): void => {
    if (!prog.studentId) {
      throw new DatabaseConstraintError('StudentProgress.studentId', 'Student profile reference is required.');
    }
    if (!prog.lessonId) {
      throw new DatabaseConstraintError('StudentProgress.lessonId', 'Target lesson reference is required.');
    }

    // Foreign Key Checks
    const studentExists = users.some(u => u.id === prog.studentId && u.role === UserRole.STUDENT);
    if (!studentExists) {
      throw new DatabaseConstraintError('StudentProgress.studentId', `Student record "${prog.studentId}" does not exist in the user table.`);
    }

    const lessonExists = lessons.some(l => l.id === prog.lessonId);
    if (!lessonExists) {
      throw new DatabaseConstraintError('StudentProgress.lessonId', `Lesson milestone reference "${prog.lessonId}" does not exist in the lessons table.`);
    }

    if (prog.highestQuizScore < 0 || prog.highestQuizScore > 100) {
      throw new DatabaseConstraintError('StudentProgress.highestQuizScore', 'Highest score metric must reside strictly in range [0 - 100].');
    }

    // Attempts validation
    if (prog.attempts) {
      prog.attempts.forEach((att, idx) => {
        if (!att.id) {
          throw new DatabaseConstraintError(`StudentProgress.attempts[${idx}].id`, 'History assessment logs require an ID.');
        }
        if (att.score < 0 || att.score > 100) {
          throw new DatabaseConstraintError(`StudentProgress.attempts[${idx}].score`, 'Assessment scores must count between 0 and 100 percent.');
        }
      });
    }
  }
};

// ==========================================
// 2. REFERENTIAL CASCADING TRIGGERS
// ==========================================

export const applyCascadeLocks = (
  classes: Class[],
  subjects: Subject[],
  topics: Topic[],
  lessons: Lesson[],
  users: User[],
  progress: StudentProgress[]
) => {
  let cascadeOccurred = false;

  // 1. Set of valid IDs
  const classIds = new Set(classes.map(c => c.id));
  const activeClassIds = new Set(classes.filter(c => !c.archived).map(c => c.id));

  // 2. Cascade Subject removal
  const initialSubjCount = subjects.length;
  subjects = subjects.filter(s => classIds.has(s.classId));
  if (subjects.length !== initialSubjCount) cascadeOccurred = true;

  const subjectIds = new Set(subjects.map(s => s.id));

  // 3. Cascade Topic removal
  const initialTopicCount = topics.length;
  topics = topics.filter(t => subjectIds.has(t.subjectId));
  if (topics.length !== initialTopicCount) cascadeOccurred = true;

  const topicIds = new Set(topics.map(t => t.id));

  // 4. Cascade Lesson removal
  const initialLessonCount = lessons.length;
  lessons = lessons.filter(l => topicIds.has(l.topicId));
  if (lessons.length !== initialLessonCount) cascadeOccurred = true;

  const lessonIds = new Set(lessons.map(l => l.id));

  // 5. Clean up Student Users class references (Set Null if Class deleted)
  users = users.map(u => {
    if (u.role === UserRole.STUDENT && u.classId && !classIds.has(u.classId)) {
      cascadeOccurred = true;
      return { ...u, classId: undefined };
    }
    // Clean up empty/stale teacher assignments
    if (u.role === UserRole.TEACHER && u.assignedClassesSubjects) {
      const initialCount = u.assignedClassesSubjects.length;
      const validAssignments = u.assignedClassesSubjects.filter(
        asg => classIds.has(asg.classId) && subjectIds.has(asg.subjectId)
      );
      if (validAssignments.length !== initialCount) {
        cascadeOccurred = true;
        return { ...u, assignedClassesSubjects: validAssignments };
      }
    }
    return u;
  });

  const userIds = new Set(users.map(u => u.id));

  // 6. Cascade Student progress list
  const initialProgressCount = progress.length;
  progress = progress.filter(p => userIds.has(p.studentId) && lessonIds.has(p.lessonId));
  if (progress.length !== initialProgressCount) cascadeOccurred = true;

  if (cascadeOccurred) {
    console.warn('[Database Trigger] Referential integrity check executed an automatic cascading sweep to prevent orphaned records.');
  }

  return { subjects, topics, lessons, users, progress };
};

// ==========================================
// 3. PERSISTENT STORAGE SERIALIZATION
// ==========================================

export const getStoredData = <T>(key: string, backup: T): T => {
  try {
    const val = localStorage.getItem(key);
    if (val) {
      return JSON.parse(val) as T;
    }
  } catch (e) {
    console.error(`Error deserealizing local storage schema for key: "${key}":`, e);
  }
  // Safe Fallback Setup
  localStorage.setItem(key, JSON.stringify(backup));
  return deepClone(backup); // return cloned copy to keep memory references pure
};

export const saveStoredData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving serialized table to target location: "${key}":`, e);
  }
};

// ==========================================
// 4. DATABASE SERVICE CONTEXT
// ==========================================

export const db = {
  /**
   * Initializes tables, executes validation checks, and applies referential auto-cascading.
   * If data is corrupted, heals and writes healthy presets.
   */
  init: (): void => {
    try {
      let classes = getStoredData(KEYS.CLASSES, INITIAL_CLASSES);
      let subjects = getStoredData(KEYS.SUBJECTS, INITIAL_SUBJECTS);
      let topics = getStoredData(KEYS.TOPICS, INITIAL_TOPICS);
      let lessons = getStoredData(KEYS.LESSONS, INITIAL_LESSONS);
      let users = getStoredData(KEYS.USERS, INITIAL_USERS);
      let progress = getStoredData(KEYS.PROGRESS, INITIAL_PROGRESS);

      // Perform deep validation checks on load
      classes.forEach(c => validators.validateClass(c));
      users.forEach(u => validators.validateUser(u, users));
      subjects.forEach(s => validators.validateSubject(s, classes));
      topics.forEach(t => validators.validateTopic(t, subjects));
      lessons.forEach(l => validators.validateLesson(l, topics));
      progress.forEach(p => validators.validateProgress(p, users, lessons));

      // Synchronize cascade locks to remove any legacy drafts or orphaned seeds
      const synched = applyCascadeLocks(classes, subjects, topics, lessons, users, progress);

      // Save synched elements back to browser
      saveStoredData(KEYS.CLASSES, classes);
      saveStoredData(KEYS.SUBJECTS, synched.subjects);
      saveStoredData(KEYS.TOPICS, synched.topics);
      saveStoredData(KEYS.LESSONS, synched.lessons);
      saveStoredData(KEYS.USERS, synched.users);
      saveStoredData(KEYS.PROGRESS, synched.progress);

      console.log('✔ [MindMastery DB] Relational schemas loaded, validated, and synchronized successfully.');
    } catch (e) {
      console.warn('⚡ [MindMastery DB Heal Process] Validation failed on boot. Relational structures appear corrupt or legacy. Restoring stable seed data...', e);
      // Clean recovery strategy
      db.resetAllNoReload();
    }
  },

  /**
   * Safe Reset that resets browser tables without forcing window reloads immediately
   */
  resetAllNoReload: (): void => {
    localStorage.setItem(KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
    localStorage.setItem(KEYS.TOPICS, JSON.stringify(INITIAL_TOPICS));
    localStorage.setItem(KEYS.LESSONS, JSON.stringify(INITIAL_LESSONS));
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(INITIAL_PROGRESS));
  },

  /**
   * Fully purge local storage schemas and reload context to defaults
   */
  resetAll: (): void => {
    db.resetAllNoReload();
    window.location.reload();
  },

  // ==========================================
  // READ DATA ACCESSORS
  // ==========================================

  getUsers: (): User[] => {
    const users = getStoredData(KEYS.USERS, INITIAL_USERS);
    return deepClone(users);
  },

  getClasses: (): Class[] => {
    const cls = getStoredData(KEYS.CLASSES, INITIAL_CLASSES);
    return deepClone(cls).filter(c => !c.archived);
  },

  getAllClassesIncludingArchived: (): Class[] => {
    const cls = getStoredData(KEYS.CLASSES, INITIAL_CLASSES);
    return deepClone(cls);
  },

  getSubjects: (): Subject[] => {
    const subjects = getStoredData(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    return deepClone(subjects);
  },

  getTopics: (): Topic[] => {
    const topics = getStoredData(KEYS.TOPICS, INITIAL_TOPICS);
    return deepClone(topics);
  },

  getLessons: (): Lesson[] => {
    const lessons = getStoredData(KEYS.LESSONS, INITIAL_LESSONS);
    return deepClone(lessons);
  },

  getProgress: (): StudentProgress[] => {
    const progress = getStoredData(KEYS.PROGRESS, INITIAL_PROGRESS);
    return deepClone(progress);
  },

  getStudentProgress: (studentId: string): StudentProgress[] => {
    return db.getProgress().filter(p => p.studentId === studentId);
  },

  // ==========================================
  // MUTATION COMPLIANCE ACTIONS
  // ==========================================

  saveUsers: (users: User[]): void => {
    // 1. Run schema validation
    users.forEach(u => validators.validateUser(u, users));

    // 2. Persist to cache/serialized storage
    saveStoredData(KEYS.USERS, users);

    // 3. Trigger downward checks to cascade delete progress or set null on invalid keys
    db.syncRelationalIntegrity();
  },

  saveClasses: (classes: Class[]): void => {
    // 1. Validation check
    classes.forEach(c => validators.validateClass(c));

    // 2. Persist class boundaries
    saveStoredData(KEYS.CLASSES, classes);

    // 3. Relational cascading checks
    db.syncRelationalIntegrity();
  },

  saveSubjects: (subjects: Subject[]): void => {
    const classes = db.getAllClassesIncludingArchived();
    subjects.forEach(s => validators.validateSubject(s, classes));

    saveStoredData(KEYS.SUBJECTS, subjects);
    db.syncRelationalIntegrity();
  },

  saveTopics: (topics: Topic[]): void => {
    const subjects = db.getSubjects();
    topics.forEach(t => validators.validateTopic(t, subjects));

    saveStoredData(KEYS.TOPICS, topics);
    db.syncRelationalIntegrity();
  },

  saveLessons: (lessons: Lesson[]): void => {
    const topics = db.getTopics();
    lessons.forEach(l => validators.validateLesson(l, topics));

    saveStoredData(KEYS.LESSONS, lessons);
    db.syncRelationalIntegrity();
  },

  saveProgress: (progress: StudentProgress[]): void => {
    const users = db.getUsers();
    const lessons = db.getLessons();
    progress.forEach(p => validators.validateProgress(p, users, lessons));

    saveStoredData(KEYS.PROGRESS, progress);
  },

  /**
   * Checks dependencies and applies strict Cascading Cleans, synchronizing local storage tables in one transactional block.
   */
  syncRelationalIntegrity: (): void => {
    const classes = getStoredData(KEYS.CLASSES, INITIAL_CLASSES);
    let subjects = getStoredData(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    let topics = getStoredData(KEYS.TOPICS, INITIAL_TOPICS);
    let lessons = getStoredData(KEYS.LESSONS, INITIAL_LESSONS);
    let users = getStoredData(KEYS.USERS, INITIAL_USERS);
    let progress = getStoredData(KEYS.PROGRESS, INITIAL_PROGRESS);

    // Run cascade triggers
    const synched = applyCascadeLocks(classes, subjects, topics, lessons, users, progress);

    // Save outputs back securely
    saveStoredData(KEYS.SUBJECTS, synched.subjects);
    saveStoredData(KEYS.TOPICS, synched.topics);
    saveStoredData(KEYS.LESSONS, synched.lessons);
    saveStoredData(KEYS.USERS, synched.users);
    saveStoredData(KEYS.PROGRESS, synched.progress);
  },

  /**
   * Atomic mutation that updates a single student progress.
   * If record doesn't exist, initializes a fully populated relational record.
   */
  updateStudentProgress: (studentId: string, lessonId: string, updates: Partial<StudentProgress>): StudentProgress[] => {
    const currentProgress = db.getProgress();
    const users = db.getUsers();
    const lessons = db.getLessons();

    // Check FK existances
    const studentUser = users.find(u => u.id === studentId && u.role === UserRole.STUDENT);
    if (!studentUser) {
      throw new DatabaseConstraintError('updateStudentProgress.studentId', `Student Account ID "${studentId}" does not exist in users.`);
    }
    const lessonNode = lessons.find(l => l.id === lessonId);
    if (!lessonNode) {
      throw new DatabaseConstraintError('updateStudentProgress.lessonId', `Lesson milestone address "${lessonId}" is invalid.`);
    }

    const index = currentProgress.findIndex(p => p.studentId === studentId && p.lessonId === lessonId);

    if (index > -1) {
      const merged = { ...currentProgress[index], ...updates };
      validators.validateProgress(merged, users, lessons);
      currentProgress[index] = merged;
    } else {
      const newRecord: StudentProgress = {
        studentId,
        lessonId,
        videoWatched: false,
        notesRead: false,
        quizCompleted: false,
        highestQuizScore: 0,
        attempts: [],
        ...updates
      };
      validators.validateProgress(newRecord, users, lessons);
      currentProgress.push(newRecord);
    }

    db.saveProgress(currentProgress);
    return db.getProgress();
  },

  /**
   * Atomic record writer that submits a new historic QuizAttempt.
   * Keeps track of the student's best score and automatically fulfills lesson checks.
   */
  addQuizAttempt: (attempt: QuizAttempt, passed: boolean, score: number): StudentProgress => {
    const progressList = db.getProgress();
    const users = db.getUsers();
    const lessons = db.getLessons();

    // Verify entity bounds
    const studentExists = users.some(u => u.id === attempt.studentId && u.role === UserRole.STUDENT);
    if (!studentExists) {
      throw new DatabaseConstraintError('QuizAttempt.studentId', `Submitted student ID "${attempt.studentId}" is invalid.`);
    }
    const lessonExists = lessons.some(l => l.id === attempt.lessonId);
    if (!lessonExists) {
      throw new DatabaseConstraintError('QuizAttempt.lessonId', `Target lesson ID "${attempt.lessonId}" does not exist.`);
    }

    if (score < 0 || score > 100) {
      throw new DatabaseConstraintError('QuizAttempt.score', 'Assessment score metrics must represent numbers from 0 to 100.');
    }

    let record = progressList.find(p => p.studentId === attempt.studentId && p.lessonId === attempt.lessonId);

    if (!record) {
      record = {
        studentId: attempt.studentId,
        lessonId: attempt.lessonId,
        videoWatched: false,
        notesRead: false,
        quizCompleted: passed,
        highestQuizScore: score,
        attempts: [attempt]
      };
      progressList.push(record);
    } else {
      record.attempts.push(attempt);
      record.highestQuizScore = Math.max(record.highestQuizScore, score);
      if (passed) {
        record.quizCompleted = true;
      }
    }

    // Verify complete integrity of progress array
    validators.validateProgress(record, users, lessons);

    db.saveProgress(progressList);
    return deepClone(record);
  }
};
