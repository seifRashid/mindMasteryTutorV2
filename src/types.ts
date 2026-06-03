/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export enum LessonProgressStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export enum QuestionType {
  MCQ = 'MCQ',
  TF = 'TF'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  classId?: string; // For students
  assignedClassesSubjects?: { classId: string; subjectId: string }[]; // For teachers
}

export interface Class {
  id: string;
  name: string;
  description: string;
  archived: boolean;
}

export interface Subject {
  id: string;
  classId: string;
  name: string;
  description: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string; // The correct option string or index
  explanation?: string;
}

export interface NotePdf {
  id: string;
  name: string;
  url: string; // Base64 or a local/web path
  description: string;
}

export interface Lesson {
  id: string;
  topicId: string;
  name: string;
  videoTitle: string;
  videoDescription: string;
  videoUrl: string; // can be YouTube ID or a clean sample video URL
  duration: string; // e.g. "12:15"
  notes: string; // rich markdown-compatible content
  pdfs?: NotePdf[];
  questions: Question[];
  allowMultipleAttempts?: boolean;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  lessonId: string;
  score: number; // percentage, e.g. 80
  passed: boolean;
  date: string;
  selectedAnswers: Record<string, string>; // questionId -> answer selected
}

export interface StudentProgress {
  studentId: string;
  lessonId: string;
  videoWatched: boolean;
  notesRead: boolean;
  quizCompleted: boolean;
  highestQuizScore: number;
  attempts: QuizAttempt[];
}
