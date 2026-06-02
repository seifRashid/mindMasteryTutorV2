/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Class, Subject, Topic, Lesson, UserRole, QuestionType, StudentProgress } from './types.ts';

export const INITIAL_CLASSES: Class[] = [
  { id: 'class-g8', name: 'Grade 8', description: 'Curriculum designed for Grade 8 junior students.', archived: false },
  { id: 'class-g9', name: 'Grade 9', description: 'Curriculum designed for Grade 9 intermediate students.', archived: false },
  { id: 'class-g10', name: 'Grade 10', description: 'Curriculum designed for Grade 10 advanced studies.', archived: false }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@mindmastery.edu',
    role: UserRole.ADMIN,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 'user-teacher-math',
    name: 'Sarah Miller',
    email: 'sarah.miller@mindmastery.edu',
    role: UserRole.TEACHER,
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
    assignedClassesSubjects: [
      { classId: 'class-g8', subjectId: 'subject-m8' },
      { classId: 'class-g9', subjectId: 'subject-m9' }
    ]
  },
  {
    id: 'user-teacher-chem',
    name: 'Robert Chen',
    email: 'robert.chen@mindmastery.edu',
    role: UserRole.TEACHER,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
    assignedClassesSubjects: [
      { classId: 'class-g8', subjectId: 'subject-c8' }
    ]
  },
  {
    id: 'user-student-alex',
    name: 'Alex Mercer',
    email: 'alex.mercer@mindmastery.edu',
    role: UserRole.STUDENT,
    classId: 'class-g8',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: 'user-student-lily',
    name: 'Lily Evans',
    email: 'lily.evans@mindmastery.edu',
    role: UserRole.STUDENT,
    classId: 'class-g8',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
  }
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'subject-m8', classId: 'class-g8', name: 'Mathematics', description: 'Core algebraic concepts, geometry, graphing, and formulas.' },
  { id: 'subject-c8', classId: 'class-g8', name: 'Chemistry', description: 'Introduction to matter, elements, the periodic table, and basic reactions.' },
  { id: 'subject-m9', classId: 'class-g9', name: 'Mathematics (Advanced)', description: 'Quadratic equations, polynomials, and basic trigonometry.' },
  { id: 'subject-p9', classId: 'class-g9', name: 'Physics', description: 'Thermodynamics, mechanical kinetic energy, and electromagnetism basics.' }
];

export const INITIAL_TOPICS: Topic[] = [
  { id: 'topic-alg8', subjectId: 'subject-m8', name: 'Algebra Fundamentals', description: 'Getting comfortable using variables and equations to find unknown quantities.' },
  { id: 'topic-geo8', subjectId: 'subject-m8', name: 'Basic Geometry', description: 'Exploring 2D and 3D shapes, area, volume, and angles.' },
  { id: 'topic-atoms', subjectId: 'subject-c8', name: 'Atomic Structure', description: 'The inner workings of atoms, particles, and electron distributions.' }
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'lesson-intro-alg',
    topicId: 'topic-alg8',
    name: 'Introduction to Algebra',
    videoTitle: 'Basics of Algebra & Variables',
    videoDescription: 'An intuitive, student-friendly explanation of why we use variables like x and y instead of standard numbers.',
    videoUrl: 'https://www.youtube.com/embed/grnP3mDuESc',
    duration: '08:24',
    notes: `### Why do we study Algebra?

Algebra is simply generalized arithmetic. Instead of writing concrete equations like '3 + 4 = 7', we can write formulas to solve problems that work for **any** input!

#### Key Vocabulary:
1. **Variable**: A letter or symbol representing an unknown value. Frequently we use $x$, $y$, or $z$.
2. **Constant**: A number that doesn't change value, such as $5$, $-3$, or $100$.
3. **Term**: A single number, variable, or numbers and variables multiplied. E.g. $2x$ or $7$.
4. **Expression**: Terms combined together using $+$, $-$, $\\times$, or $\\div$. E.g. $4x + 3$.
5. **Equation**: Two expressions separated by an equals sign ($=$) showing structural equivalence. E.g. $2x + 1 = 9$.`,
    questions: [
      {
        id: 'q-alg-1-1',
        text: 'What is a variable in algebraic terms?',
        type: QuestionType.MCQ,
        options: [
          'A constant number like 8',
          'A placeholder letter representing an unknown number',
          'An equals sign that balances the scale',
          'The plus or minus arithmetic operators'
        ],
        correctAnswer: 'A placeholder letter representing an unknown number',
        explanation: 'Variables (usually lowercase letters) stand in for numbers that must be calculated or vary depending on conditions.'
      },
      {
        id: 'q-alg-1-2',
        text: 'Identify the coefficient in the term "5y".',
        type: QuestionType.MCQ,
        options: [
          'y',
          '5',
          '5y',
          'Multiplication'
        ],
        correctAnswer: '5',
        explanation: 'The coefficient is the numeric factor multiplied by the variable. Here, that number is 5.'
      },
      {
        id: 'q-alg-1-3',
        text: 'True or False: "3x + 10" is an algebraic expression, not an algebraic equation.',
        type: QuestionType.TF,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'True. An algebraic expression stands alone without an equals sign. The moment you write an equals (=) symbol (e.g. 3x + 10 = 16), it becomes an equation.'
      }
    ]
  },
  {
    id: 'lesson-alg-expr',
    topicId: 'topic-alg8',
    name: 'Algebraic Expressions',
    videoTitle: 'Evaluating & Simplifying Expressions',
    videoDescription: 'Learn how to substitute real numbers into algebraic variables and simplify messy equations by grouping terms.',
    videoUrl: 'https://www.youtube.com/embed/vDqOoI-4Z6M',
    duration: '10:15',
    notes: `### Working with Algebraic Expressions

Learn how to interact with algebraic expressions using two simple exercises.

#### 1. Evaluation by Substitution
Substitution means replacing a letter with a given constant value, then solving using standard orders of operations (PEMDAS/BODMAS).

**Example**: Evaluate the expression $3n + 8$ if $n = 4$.
* Replace $n$ with $4$: $3(4) + 8$
* Calculate multiplication first: $12 + 8$
* Final answer: **20**

#### 2. Simplifying by Combining Like Terms
* **Like Terms**: Terms with the *identical variable* and *identical exponent* (e.g., $3x$ and $-2x$).
* **Unlike Terms**: Cannot be combined (e.g., $5x$ and $3y$).

**Example**: Simplify $5x + 3y - 2x + 2y$
* Group the $x$ terms: $(5x - 2x) = 3x$
* Group the $y$ terms: $(3y + 2y) = 5y$
* Result: $3x + 5y$`,
    questions: [
      {
        id: 'q-alg-2-1',
        text: 'Evaluate the algebraic expression "4a - 5" when a = 6.',
        type: QuestionType.MCQ,
        options: ['19', '24', '1', '14'],
        correctAnswer: '19',
        explanation: 'Substitute a=6: 4(6) - 5 = 24 - 5 = 19.'
      },
      {
        id: 'q-alg-2-2',
        text: 'Which elements qualify as like terms in the expression: 4x + 7y - x?',
        type: QuestionType.MCQ,
        options: [
          '4x and 7y',
          '7y and -x',
          '4x and -x',
          'None'
        ],
        correctAnswer: '4x and -x',
        explanation: 'Like terms share the exact same variable with the same power. Both 4x and -x use the variable x.'
      },
      {
        id: 'q-alg-2-3',
        text: 'Simplify: 2a + 3b + 4a + b',
        type: QuestionType.MCQ,
        options: [
          '10a',
          '6a + 4b',
          '4a + 3b',
          '6a + 3b'
        ],
        correctAnswer: '6a + 4b',
        explanation: '(2a + 4a) = 6a, and (3b + b) = 4b. Combining gives 6a + 4b.'
      }
    ]
  },
  {
    id: 'lesson-solve-eq',
    topicId: 'topic-alg8',
    name: 'Solving Linear Equations',
    videoTitle: 'Solving Equations using Inverse Operations',
    videoDescription: 'Solving basic equations to isolate the variables using inverse arithmetic concepts.',
    videoUrl: 'https://www.youtube.com/embed/L0_K9hX9uJw',
    duration: '12:40',
    notes: `### Isolating the Variable

To find the value of an unknown variable, we must perform inverse mathematical operations to "undo" everything around it.

#### The Inverse Rule:
* Addition ($+$) is undone by **Subtraction** ($-$).
* Subtraction ($-$) is undone by **Addition** ($+$).
* Multiplication ($\\times$) is undone by **Division** ($\\div$).
* Division ($\\div$) is undone by **Multiplication** ($\\times$).

#### Multi-Step Equation Example:
Solve $3x - 5 = 10$:
1. Add $5$ to both sides to isolate the $x$ term:
   $$3x = 10 + 5 \\implies 3x = 15$$
2. Divide both sides by $3$ to find the value of $1x$:
   $$x = 15 \\div 3 \\implies x = 5$$`,
    questions: [
      {
        id: 'q-alg-3-1',
        text: 'Solve the one-step equation: x - 7 = 12',
        type: QuestionType.MCQ,
        options: ['x = 5', 'x = 19', 'x = -5', 'x = 84'],
        correctAnswer: 'x = 19',
        explanation: 'Add 7 to both sides of the equation to isolate x: x = 12 + 7 = 19.'
      },
      {
        id: 'q-alg-3-2',
        text: 'Solve the two-step linear equation: 5k + 6 = 36',
        type: QuestionType.MCQ,
        options: ['k = 8', 'k = 30', 'k = 6', 'k = 5'],
        correctAnswer: 'k = 6',
        explanation: 'Subtract 6 from both sides to get 5k = 30. Divide by 5 to isolate k: k = 6.'
      },
      {
        id: 'q-alg-3-3',
        text: 'True or False: If x/4 = 3, then x must be 1.25.',
        type: QuestionType.TF,
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: 'False. Since x is divided by 4, we must multiply both sides by 4 to solve. x = 3 * 4 = 12, not 1.25.'
      }
    ]
  },
  {
    id: 'lesson-atom-parts',
    topicId: 'topic-atoms',
    name: 'Structure of the Atom',
    videoTitle: 'Introduction to Atoms',
    videoDescription: 'Demystifying protons, neutrons, electrons, other subatomic structures, and the dense atomic nucleus.',
    videoUrl: 'https://www.youtube.com/embed/IP57gEWcisY',
    duration: '09:30',
    notes: `### Atoms: The Building blocks of Universe

Every material object around us consists of microscopic units called **Atoms**. Despite being microscopic, atoms contain highly precise systems inside.

#### 1. The Central Nucleus
At the core of the atom lies a tightly bound nucleus consisting of:
* **Protons**: carry a positive electrical charge of $+1$ and weigh 1 amu.
* **Neutrons**: carry no charge (neutral, weight 1 amu).

#### 2. The Electrons
Negatively charged particles ($-1$) that orbit in energy levels (or electron shells) surrounding the nucleus. They travel almost at the speed of light, and have almost 0 mass.

#### Balancing Act:
A neutral atom always possesses **exactly the same number of Protons and Electrons**. For instance, Carbon has 6 protons and 6 electrons, yielding a total charge of zero.`,
    questions: [
      {
        id: 'q-atom-1-1',
        text: 'Which fundamental particle is found outside the nucleus of an atom?',
        type: QuestionType.MCQ,
        options: ['Proton', 'Neutron', 'Electron', 'Nucleolus'],
        correctAnswer: 'Electron',
        explanation: 'Electrons reside and spin in orbitals outside of the central dense nucleus.'
      },
      {
        id: 'q-atom-1-2',
        text: 'What subatomic particles have an atomic mass of roughly 1 amu (Atomic Mass Unit)?',
        type: QuestionType.MCQ,
        options: [
          'Protons and Electrons',
          'Protons and Neutrons',
          'Electrons and Neutrons',
          'Only Neutrons'
        ],
        correctAnswer: 'Protons and Neutrons',
        explanation: 'Protons and Neutrons are the relatively massive nuclear particles (each ~1 amu). Electrons are roughly 1/1840th of that weight.'
      },
      {
        id: 'q-atom-1-3',
        text: 'What is the electrical charge of a proton?',
        type: QuestionType.MCQ,
        options: ['-1 (Negative)', '0 (Neutral)', '+1 (Positive)', '+2 (Divalent)'],
        correctAnswer: '+1 (Positive)',
        explanation: 'Protons of any element are positively charged (+) with a value of +1.'
      }
    ]
  }
];

// Seed standard progress states to demonstrate mastery rules
// Alex: Lesson 1 incomplete (video watched, notes read, quiz not passed - scored 33% on first attempt)
// Lily: Lesson 1 passed (100%), Lesson 2 passed (100%), Lesson 3 not started. This shows Lily can access Lesson 3, but Alex cannot access Lesson 2!
export const INITIAL_PROGRESS: StudentProgress[] = [
  {
    studentId: 'user-student-alex',
    lessonId: 'lesson-intro-alg',
    videoWatched: true,
    notesRead: true,
    quizCompleted: false,
    highestQuizScore: 33,
    attempts: [
      {
        id: 'attempt-alex-1',
        studentId: 'user-student-alex',
        lessonId: 'lesson-intro-alg',
        score: 33,
        passed: false,
        date: '2026-06-01T15:20:00Z',
        selectedAnswers: {
          'q-alg-1-1': 'A constant number like 8', // Wrong
          'q-alg-1-2': '5', // Correct
          'q-alg-1-3': 'False' // Wrong
        }
      }
    ]
  },
  {
    studentId: 'user-student-lily',
    lessonId: 'lesson-intro-alg',
    videoWatched: true,
    notesRead: true,
    quizCompleted: true,
    highestQuizScore: 100,
    attempts: [
      {
        id: 'attempt-lily-1',
        studentId: 'user-student-lily',
        lessonId: 'lesson-intro-alg',
        score: 100,
        passed: true,
        date: '2026-05-30T10:00:00Z',
        selectedAnswers: {
          'q-alg-1-1': 'A placeholder letter representing an unknown number',
          'q-alg-1-2': '5',
          'q-alg-1-3': 'True'
        }
      }
    ]
  },
  {
    studentId: 'user-student-lily',
    lessonId: 'lesson-alg-expr',
    videoWatched: true,
    notesRead: true,
    quizCompleted: true,
    highestQuizScore: 100,
    attempts: [
      {
        id: 'attempt-lily-2',
        studentId: 'user-student-lily',
        lessonId: 'lesson-alg-expr',
        score: 100,
        passed: true,
        date: '2026-05-31T11:15:00Z',
        selectedAnswers: {
          'q-alg-2-1': '19',
          'q-alg-2-2': '4x and -x',
          'q-alg-2-3': '6a + 4b'
        }
      }
    ]
  }
];
