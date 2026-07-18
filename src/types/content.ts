export type PartId = 'inorganic' | 'organic';
export type UnitStatus = 'available' | 'coming-soon';
export type LessonStatus = 'available' | 'coming-soon';
export type QuestionLevel = 'basic' | 'applied' | 'hsg';
export type QuestionCategory = 'theory' | 'calculation';
export type QuestionType =
  | 'single-choice'
  | 'multi-choice'
  | 'fill-blank'
  | 'balance';

export interface TheoryCard {
  id: string;
  heading: string;
  body: string;
}

interface BaseQuestion {
  id: string;
  type: QuestionType;
  level: QuestionLevel;
  category: QuestionCategory;
  prompt: string;
  explanation: string;
  source?: string;
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice';
  options: string[];
  answer: number;
}

export interface MultiChoiceQuestion extends BaseQuestion {
  type: 'multi-choice';
  options: string[];
  answers: number[];
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank';
  answer: string;
  acceptedAnswers?: string[];
  placeholder?: string;
}

export interface BalanceQuestion extends BaseQuestion {
  type: 'balance';
  left: string[];
  right: string[];
  answer: number[];
}

export type Question =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | FillBlankQuestion
  | BalanceQuestion;

export interface Lesson {
  id: string;
  title: string;
  order: number;
  summary: string;
  status: LessonStatus;
  cards: TheoryCard[];
  questions: Question[];
}

export interface LessonSummary {
  id: string;
  title: string;
  order: number;
  summary: string;
  status: LessonStatus;
  theoryQuestionCount?: number;
  calculationQuestionCount?: number;
}

export interface UnitContent {
  id: string;
  part: PartId;
  code: string;
  title: string;
  order: number;
  description: string;
  status: UnitStatus;
  lessons: Lesson[];
}

export interface UnitSummary {
  id: string;
  part: PartId;
  code: string;
  title: string;
  order: number;
  description: string;
  status: UnitStatus;
  lessons: LessonSummary[];
}
