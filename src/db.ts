/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Class, Subject, Topic, Lesson, User, StudentProgress, QuizAttempt } from './types.ts';
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

export const getStoredData = <T>(key: string, backup: T): T => {
  try {
    const val = localStorage.getItem(key);
    if (val) {
      return JSON.parse(val) as T;
    }
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
  }
  // If not found or error, write backup
  localStorage.setItem(key, JSON.stringify(backup));
  return backup;
};

export const saveStoredData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing localStorage key', key, e);
  }
};

// Database Initialization & CRUD Helpers
export const db = {
  init: () => {
    getStoredData(KEYS.CLASSES, INITIAL_CLASSES);
    getStoredData(KEYS.SUBJECTS, INITIAL_SUBJECTS);
    getStoredData(KEYS.TOPICS, INITIAL_TOPICS);
    getStoredData(KEYS.LESSONS, INITIAL_LESSONS);
    getStoredData(KEYS.USERS, INITIAL_USERS);
    getStoredData(KEYS.PROGRESS, INITIAL_PROGRESS);
  },

  resetAll: () => {
    localStorage.setItem(KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
    localStorage.setItem(KEYS.TOPICS, JSON.stringify(INITIAL_TOPICS));
    localStorage.setItem(KEYS.LESSONS, JSON.stringify(INITIAL_LESSONS));
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(INITIAL_PROGRESS));
    window.location.reload();
  },

  // Users
  getUsers: (): User[] => getStoredData(KEYS.USERS, INITIAL_USERS),
  saveUsers: (users: User[]) => saveStoredData(KEYS.USERS, users),

  // Classes
  getClasses: (): Class[] => {
    const cls = getStoredData(KEYS.CLASSES, INITIAL_CLASSES);
    return cls.filter(c => !c.archived);
  },
  getAllClassesIncludingArchived: (): Class[] => getStoredData(KEYS.CLASSES, INITIAL_CLASSES),
  saveClasses: (classes: Class[]) => saveStoredData(KEYS.CLASSES, classes),

  // Subjects
  getSubjects: (): Subject[] => getStoredData(KEYS.SUBJECTS, INITIAL_SUBJECTS),
  saveSubjects: (subjects: Subject[]) => saveStoredData(KEYS.SUBJECTS, subjects),

  // Topics
  getTopics: (): Topic[] => getStoredData(KEYS.TOPICS, INITIAL_TOPICS),
  saveTopics: (topics: Topic[]) => saveStoredData(KEYS.TOPICS, topics),

  // Lessons
  getLessons: (): Lesson[] => getStoredData(KEYS.LESSONS, INITIAL_LESSONS),
  saveLessons: (lessons: Lesson[]) => saveStoredData(KEYS.LESSONS, lessons),

  // Progress
  getProgress: (): StudentProgress[] => getStoredData(KEYS.PROGRESS, INITIAL_PROGRESS),
  saveProgress: (progress: StudentProgress[]) => saveStoredData(KEYS.PROGRESS, progress),

  // Derived queries
  getStudentProgress: (studentId: string): StudentProgress[] => {
    return db.getProgress().filter(p => p.studentId === studentId);
  },

  // Update a specific student progress
  updateStudentProgress: (studentId: string, lessonId: string, updates: Partial<StudentProgress>) => {
    const currentProgress = db.getProgress();
    const index = currentProgress.findIndex(p => p.studentId === studentId && p.lessonId === lessonId);

    if (index > -1) {
      currentProgress[index] = { ...currentProgress[index], ...updates };
    } else {
      currentProgress.push({
        studentId,
        lessonId,
        videoWatched: false,
        notesRead: false,
        quizCompleted: false,
        highestQuizScore: 0,
        attempts: [],
        ...updates
      });
    }

    db.saveProgress(currentProgress);
    return db.getProgress();
  },

  // Save quiz attempt
  addQuizAttempt: (attempt: QuizAttempt, passed: boolean, score: number) => {
    const progressList = db.getProgress();
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

    db.saveProgress(progressList);
    return record;
  }
};
