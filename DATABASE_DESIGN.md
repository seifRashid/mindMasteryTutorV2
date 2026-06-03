# Database Design Specification: MindMastery Relational Engine

This document provides a comprehensive structural audit of all data entities, features, workflows, and relationships within the MindMastery Learning Management System (LMS). It specifies a production-ready relational database architecture and outlines the mechanics of the browser-based Local Storage Relational Persistence Engine.

---

## 1. Relational Entities and Normalization Strategy

To ensure data integrity, minimize redundancy, and allow seamless future migration to a cloud database (such as PostgreSQL or Firebase Firestore), the application models its domain using fully normalized, structured entities.

### 1.1 Entites Definitions and Schemas

#### Entity: `Class` (Classroom Grade Division)
Represents a group or grade of students sharing a curriculum.
*   **Primary Key:** `id` (string, `NOT NULL`, e.g., `"class-g8"`)
*   **Fields:**
    *   `name` (string, `NOT NULL`, length $\leq 100$)
    *   `description` (text, length $\leq 500$)
    *   `archived` (boolean, `NOT NULL`, default `false`)
*   **Validation Constraints:** `name` must be non-empty.

#### Entity: `Subject` (Academic Subject Module)
Represents a course of study taught to a Grade Class.
*   **Primary Key:** `id` (string, `NOT NULL`, e.g., `"subject-m8"`)
*   **Foreign Key:** `classId` (string, `NOT NULL`, references `Class.id` on `CASCADE DELETE`)
*   **Fields:**
    *   `name` (string, `NOT NULL`, length $\leq 100$)
    *   `description` (text, length $\leq 500$)
*   **Validation Constraints:** Must reference a valid `classId`.

#### Entity: `Topic` (Academic Chapter/Unit)
Represents a primary chapter dividing a Subject.
*   **Primary Key:** `id` (string, `NOT NULL`, e.g., `"topic-atoms"`)
*   **Foreign Key:** `subjectId` (string, `NOT NULL`, references `Subject.id` on `CASCADE DELETE`)
*   **Fields:**
    *   `name` (string, `NOT NULL`, length $\leq 150$)
    *   `description` (text, length $\leq 1000$)
*   **Validation Constraints:** Must reference a valid `subjectId`.

#### Entity: `Lesson` (Interactive sequential lecture)
Represents an individual learning node containing instruction, notes, and a quiz.
*   **Primary Key:** `id` (string, `NOT NULL`, e.g., `"lesson-intro-alg"`)
*   **Foreign Key:** `topicId` (string, `NOT NULL`, references `Topic.id` on `CASCADE DELETE`)
*   **Fields:**
    *   `name` (string, `NOT NULL`, length $\leq 150$)
    *   `videoTitle` (string, `NOT NULL`)
    *   `videoDescription` (text)
    *   `videoUrl` (string, URL format, `NOT NULL`)
    *   `duration` (string, pattern `"MM:SS"`)
    *   `notes` (text, rich markdown-compatible string)
    *   `allowMultipleAttempts` (boolean, default `true`)
    *   `pdfs` (array of `NotePdf` entries, nested list of attachments)
    *   `questions` (array of `Question` entries, nested list of assessment questions)
*   **Validation Constraints:** Must reference a valid `topicId`. Video URL must be a valid path/YouTube link. Duration must represent logical MM:SS format.

#### Nested Entity: `NotePdf` (Lesson Reference Handouts)
*   **Primary Key:** `id` (string, `NOT NULL`)
*   **Fields:**
    *   `name` (string, `NOT NULL`)
    *   `url` (string, URI/Base64/Web Address, `NOT NULL`)
    *   `description` (text)

#### Nested Entity: `Question` (Assessment Quiz Questions)
Multi-choice or True/False assessment questions configured inside a Lesson.
*   **Primary Key:** `id` (string, `NOT NULL`)
*   **Fields:**
    *   `text` (string, `NOT NULL`)
    *   `type` (enum `MCQ` | `TF`, `NOT NULL`)
    *   `options` (array of strings, size $\geq 2$)
    *   `correctAnswer` (string, must exactly match one of the `options`)
    *   `explanation` (text, optional explanation given post-answering)

#### Entity: `User` (User Identity Profiles)
Represents and authenticates Students, Teachers, and Administrators.
*   **Primary Key:** `id` (string, `NOT NULL`)
*   **Fields:**
    *   `name` (string, `NOT NULL`, length $\leq 100$)
    *   `email` (string, `NOT NULL`, `UNIQUE`)
    *   `role` (enum `admin` | `teacher` | `student`, `NOT NULL`)
    *   `avatarUrl` (string, URL format)
    *   `classId` (string, optional, references `Class.id` on `SET NULL`. Applies strictly to students)
    *   `assignedClassesSubjects` (array of junction pairs `{ classId, subjectId }`, references `Class.id` and `Subject.id` on `CASCADE`. Applies strictly to teachers)
*   **Validation Constraints:** `email` must match structural email regex pattern. Only one user record may occupy an email address (`UNIQUE` key constraint).

#### Entity: `StudentProgress` (Academic completion state)
Tracks a student's study timeline and lesson status checkpoints.
*   **Primary Keys:** Compound Key: `studentId` + `lessonId` (simulated via index mapping)
*   **Foreign Keys:**
    *   `studentId` (string, references `User.id` on `CASCADE DELETE`)
    *   `lessonId` (string, references `Lesson.id` on `CASCADE DELETE`)
*   **Fields:**
    *   `videoWatched` (boolean, default `false`)
    *   `notesRead` (boolean, default `false`)
    *   `quizCompleted` (boolean, default `false`)
    *   `highestQuizScore` (number, integer, range `0-100`, default `0`)
    *   `attempts` (array of `QuizAttempt` models)

#### Nested Entity: `QuizAttempt` (Assessment grade histories)
Tracks historically submitted assessment scores.
*   **Primary Key:** `id` (string, `NOT NULL`)
*   **Foreign Keys:**
    *   `studentId` (string, references `User.id` on `CASCADE DELETE`)
    *   `lessonId` (string, references `Lesson.id` on `CASCADE DELETE`)
*   **Fields:**
    *   `score` (number, range `0-100`)
    *   `passed` (boolean)
    *   `date` (string, ISO timestamp)
    *   `selectedAnswers` (dictionary mapping `questionId` to string answer representing student entries)

---

## 2. Entity Relationship Diagram (ERD) Text Conceptualization

```
  +---------------+               +-----------------+
  |     Class     | 1-------0..N  |      User       |  (Students have classId)
  |---------------|               | (Student/Teach) |
  | PK: id        |               |-----------------|
  |    name       |               | PK: id          |
  |    archived   |               |    email (UQ)   |
  +---------------+               |    role         |
          | 1                     |    classId (FK) |
          |                       +-----------------+
          | 1..N                           | (assignedClassesSubjects)
  +---------------+                        |
  |    Subject    | 0..N                   | (Teacher class-subject mapping)
  |---------------| <----------------------+
  | PK: id        |
  | FK: classId   |
  +---------------+
          | 1
          | 1..N
  +---------------+
  |     Topic     |
  |---------------|
  | PK: id        |
  | FK: subjectId |
  +---------------+
          | 1
          | 1..N
  +---------------+               +-----------------+
  |    Lesson     | 1-----------N | StudentProgress |
  |---------------|               |-----------------|
  | PK: id        |               | PK compound:    |
  | FK: topicId   |               |   studentId (FK)|
  |    notes      |               |   lessonId (FK) |
  |    pdfs[]     |               +-----------------+
  |    questions[]|                        | 1
  +---------------+                        |
                                           | 1..N
                                  +-----------------+
                                  |   QuizAttempt   |
                                  |-----------------|
                                  | PK: id          |
                                  | FK: studentId   |
                                  | FK: lessonId    |
                                  +-----------------+
```

---

## 3. Database Consistency & Integrity Constraints (The Relational Engine)

To guarantee database consistency across browser refreshes, the simulator implements system-level rules modeled after SQL constraints:

### 3.1 Referential Integrity
*   **Unique Email Check:** Prevents creating duplicate accounts.
*   **Missing FK Check:** Throws descriptive relational integrity errors if code attempts to save a topic mapped to a non-existent subject, or a subject mapped to a invalid class.
*   **Cascade Deletion Triggers:**
    *   When an administrator deletes a `Class`, the Database engine automatically scans the database state and removes all associated `Subjects`, `Topics`, `Lessons`, and `StudentProgress` records belonging to that classroom.
    *   When a `Subject` is deleted, its downstream `Topics`, `Lessons`, and progress states are scrubbed.
    *   When a `Topic` is deleted, its `Lessons` and progress are scrubbed.
    *   When a `Lesson` is deleted, its `StudentProgress` states are cleanly removed.
    *   When a `User` is deleted, their associated `StudentProgress` states and history items are destroyed.

### 3.2 Check and Validation Rules
*   **Boundaries Verification:** Assessment scores are restricted to values between 0 and 100.
*   **Format Sanitization:** Text strings are trimmed, emails must correspond to standard regular expression patterns, and missing properties are guaranteed defaults (e.g., initial progress structures are automatically generated on first lookups if missing).
*   **Quiz Verification:** Quiz answers are cross-verified against valid question options before passing attempts.

---

## 4. Local Storage Engine Implementation Detail

### 4.1 Serialization and Outgoing Sanitization
Data is stored directly in browser-side local storage. To prevent reference mutation issues and component side-effects, the database engine returns **deeply cloned** state arrays (`JSON.parse` and `JSON.stringify` serialization isolation). 

### 4.2 Graceful Recovery, Outdated Storage & Corrupt Schema Healing
*   **Validation & Repair:** If local storage is corrupted, contains outdated schemas, or encounters JSON parsing exceptions, the engine:
    1.  Logs an informative console warning detailing the recovery process.
    2.  Attempts to load stable, seed-data presets (`src/initialData.ts`) to avoid UI white-screens.
    3.  Runs a **Referential Integrity Repair sweep** across the restored data, cleaning and linking orphaned entities so that the student, teacher, and administrator dashboards boot up seamlessly.
*   **Central State Synchronization:** A unified, encapsulated database object (`db`) processes all database modifications.
