export type Locale = 'en' | 'vi';
export type Currency = 'VND' | 'USD';
export type ThemeMode = 'dark' | 'light';
export type WorkspaceTab =
  | 'catalog'
  | 'algorithms'
  | 'sandbox'
  | 'flashcards'
  | 'certificate'
  | 'checkout';

export type CourseCategory = 'backend' | 'frontend' | 'ai' | 'data';
export type CourseDifficulty = 'intermediate' | 'advanced' | 'architect';

export interface BilingualText {
  en: string;
  vi: string;
}

export interface LessonItem {
  id: string;
  title: BilingualText;
  durationMin: number;
  type: 'concept' | 'lab' | 'architecture' | 'quiz';
  keyConcept: BilingualText;
}

export interface CourseModule {
  id: string;
  title: BilingualText;
  lessons: LessonItem[];
}

export interface Course {
  id: string;
  code: string;
  slug: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  accentHex: string;
  title: BilingualText;
  subtitle: BilingualText;
  summary: BilingualText;
  instructor: string;
  instructorRole: BilingualText;
  durationHours: number;
  rating: number;
  enrolledCount: number;
  priceVnd: number;
  originalPriceVnd: number;
  skills: string[];
  outcomes: BilingualText[];
  modules: CourseModule[];
  featuredLabId: string;
}

export interface CodeTestCase {
  id: string;
  name: BilingualText;
  args: unknown[];
  expected: unknown;
}

export interface CodingChallenge {
  id: string;
  courseId: string;
  functionName: string;
  difficulty: CourseDifficulty;
  xpReward: number;
  title: BilingualText;
  prompt: BilingualText;
  signature: string;
  starterCode: string;
  referenceSolution: string;
  hints: [BilingualText, BilingualText];
  testCases: CodeTestCase[];
}

export interface TestCaseResult {
  id: string;
  name: BilingualText;
  passed: boolean;
  inputPreview: string;
  expectedPreview: string;
  actualPreview: string;
  durationMs: number;
  error?: string;
}

export interface CodeGradeReport {
  challengeId: string;
  passedAll: boolean;
  passedCount: number;
  totalCount: number;
  scorePct: number;
  xpAwarded: number;
  totalDurationMs: number;
  securityBlocked: boolean;
  compileError?: string;
  results: TestCaseResult[];
}

export interface QuizQuestion {
  id: string;
  courseId: string;
  topic: string;
  question: BilingualText;
  options: [BilingualText, BilingualText, BilingualText, BilingualText];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: BilingualText;
}

export interface QuizAnswerBreakdown {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

export interface QuizGradeReport {
  correctCount: number;
  totalCount: number;
  scorePct: number;
  xpAwarded: number;
  passed: boolean;
  breakdown: QuizAnswerBreakdown[];
}

export type Sm2Rating = 'again' | 'good' | 'easy';

export interface FlashcardItem {
  id: string;
  courseId: string;
  tag: string;
  front: BilingualText;
  back: BilingualText;
  codeSnippet?: string;
}

export interface Sm2CardState {
  cardId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: number;
  lapses: number;
  lastRating: Sm2Rating | null;
  reviewsCount: number;
}

export interface CertificateSpec {
  studentName: string;
  courseId: string;
  courseCode: string;
  courseTitleEn: string;
  courseTitleVi: string;
  durationHours: number;
  skills: string[];
  issueDateIso: string;
  honors: boolean;
  credentialId: string;
  verificationUrl: string;
  locale: Locale;
}

export interface VoucherDefinition {
  code: string;
  discountRate: number;
  label: BilingualText;
}

export interface CartPricingSummary {
  courseCount: number;
  subtotalVnd: number;
  bundleRate: number;
  bundleDiscountVnd: number;
  voucherCode: string | null;
  voucherRate: number;
  voucherDiscountVnd: number;
  totalDiscountVnd: number;
  finalTotalVnd: number;
  finalTotalUsd: number;
  savingsPct: number;
}

export interface LearnerState {
  xp: number;
  streakDays: number;
  lastActiveDateIso: string;
  weeklyActivity: number[];
  completedLessons: string[];
  solvedChallenges: string[];
  quizBestScores: Record<string, number>;
  sm2States: Record<string, Sm2CardState>;
  enrolledCourseIds: string[];
  cartCourseIds: string[];
  studentName: string;
}
