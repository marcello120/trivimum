export type GameStatus = 'LOBBY' | 'QUESTION_ACTIVE' | 'REVEAL_ANSWER' | 'LEADERBOARD';

export type QuestionType = 'MCQ' | 'TEXT';

export interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[]; // Defined only for MCQ
  correctAnswer: string | string[]; // Can be array for multiple valid text answers
}

export interface Player {
  id: string;          // UUID from localStorage
  name: string;
  score: number;
  currentAnswer: string; // What they have locked in
  liveTyping: string;    // What they are currently typing (for Admin view)
  manuallyCorrectAnswers: number;
}

// The Main Source of Truth in Firebase
export interface GameState {
  status: GameStatus;
  currentQuestionIndex: number;
  players: Record<string, Player>; // Map of ID -> Player
  previousStatus?: GameStatus; // Track state before showing leaderboard
  selectedQuizId?: string; // ID of the currently selected quiz
}

// Re-export error types for convenience
export type { FirebaseError, FirebaseErrorCode, ErrorState, UserFriendlyError } from './types/errors';