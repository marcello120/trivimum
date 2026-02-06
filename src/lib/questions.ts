import { Question } from '@/types';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

// General Knowledge Quiz
const GENERAL_KNOWLEDGE_QUIZ: Quiz = {
  id: 'general-knowledge',
  title: 'General Knowledge',
  description: 'A mix of general knowledge questions covering various topics',
  questions: [
    {
      id: 1,
      text: "What represents the letter 'K' in NATO phonetic alphabet?",
      type: 'MCQ',
      options: ['Kilo', 'King', 'Kite', 'Karma'],
      correctAnswer: 'Kilo'
    },
    {
      id: 2,
      text: "Name the capital of France.",
      type: 'TEXT',
      correctAnswer: 'Paris'
    },
    {
      id: 3,
      text: "Which planet is closest to the Sun?",
      type: 'MCQ',
      options: ['Venus', 'Mercury', 'Mars', 'Earth'],
      correctAnswer: 'Mercury'
    },
    {
      id: 4,
      text: "What is 7 × 8?",
      type: 'TEXT',
      correctAnswer: ['56', 'fifty-six', 'fifty six']
    },
    {
      id: 5,
      text: "Which programming language is known as the 'language of the web'?",
      type: 'MCQ',
      options: ['Python', 'JavaScript', 'Java', 'C++'],
      correctAnswer: 'JavaScript'
    }
  ]
};

// Science & Technology Quiz
const SCIENCE_TECH_QUIZ: Quiz = {
  id: 'science-tech',
  title: 'Science & Technology',
  description: 'Questions focused on science, technology, and innovation',
  questions: [
    {
      id: 1,
      text: "What does 'AI' stand for in technology?",
      type: 'TEXT',
      correctAnswer: ['Artificial Intelligence', 'artificial intelligence']
    },
    {
      id: 2,
      text: "Which element has the chemical symbol 'H'?",
      type: 'MCQ',
      options: ['Helium', 'Hydrogen', 'Hafnium', 'Holmium'],
      correctAnswer: 'Hydrogen'
    },
    {
      id: 3,
      text: "What is the speed of light in vacuum?",
      type: 'MCQ',
      options: ['299,792,458 m/s', '300,000,000 m/s', '186,000 mi/s', 'All of the above are approximately correct'],
      correctAnswer: 'All of the above are approximately correct'
    },
    {
      id: 4,
      text: "Who developed the theory of relativity?",
      type: 'TEXT',
      correctAnswer: ['Einstein', 'Albert Einstein', 'albert einstein', 'einstein']
    },
    {
      id: 5,
      text: "What does 'HTTP' stand for?",
      type: 'MCQ',
      options: ['HyperText Transfer Protocol', 'High Technology Transfer Process', 'Home Technology Transfer Protocol', 'HyperText Translation Protocol'],
      correctAnswer: 'HyperText Transfer Protocol'
    },
    {
      id: 6,
      text: "Which programming paradigm does Python primarily support?",
      type: 'MCQ',
      options: ['Object-oriented only', 'Functional only', 'Multi-paradigm', 'Procedural only'],
      correctAnswer: 'Multi-paradigm'
    }
  ]
};

// Pop Culture & Entertainment Quiz
const POP_CULTURE_QUIZ: Quiz = {
  id: 'pop-culture',
  title: 'Pop Culture & Entertainment',
  description: 'Movies, music, celebrities, and trending topics',
  questions: [
    {
      id: 1,
      text: "Which movie won the Academy Award for Best Picture in 2020?",
      type: 'MCQ',
      options: ['1917', 'Joker', 'Parasite', 'Once Upon a Time in Hollywood'],
      correctAnswer: 'Parasite'
    },
    {
      id: 2,
      text: "Who is known as the 'King of Pop'?",
      type: 'TEXT',
      correctAnswer: ['Michael Jackson', 'michael jackson']
    },
    {
      id: 3,
      text: "Which streaming platform created 'Stranger Things'?",
      type: 'MCQ',
      options: ['Netflix', 'Amazon Prime', 'Disney+', 'HBO Max'],
      correctAnswer: 'Netflix'
    },
    {
      id: 4,
      text: "What does the acronym 'GOAT' commonly mean in sports and entertainment?",
      type: 'TEXT',
      correctAnswer: ['Greatest Of All Time', 'greatest of all time', 'GREATEST OF ALL TIME']
    },
    {
      id: 5,
      text: "Which social media platform is known for its 280-character limit?",
      type: 'MCQ',
      options: ['Facebook', 'Instagram', 'Twitter/X', 'TikTok'],
      correctAnswer: 'Twitter/X'
    }
  ]
};

// History & Geography Quiz
const HISTORY_GEOGRAPHY_QUIZ: Quiz = {
  id: 'history-geography',
  title: 'History & Geography',
  description: 'Test your knowledge of world history and geography',
  questions: [
    {
      id: 1,
      text: "In which year did World War II end?",
      type: 'MCQ',
      options: ['1944', '1945', '1946', '1947'],
      correctAnswer: '1945'
    },
    {
      id: 2,
      text: "What is the longest river in the world?",
      type: 'TEXT',
      correctAnswer: ['Nile', 'nile', 'The Nile', 'the nile', 'Nile River', 'nile river']
    },
    {
      id: 3,
      text: "Which empire was ruled by Julius Caesar?",
      type: 'MCQ',
      options: ['Greek Empire', 'Roman Empire', 'Byzantine Empire', 'Ottoman Empire'],
      correctAnswer: 'Roman Empire'
    },
    {
      id: 4,
      text: "Name the smallest country in the world by area.",
      type: 'TEXT',
      correctAnswer: ['Vatican City', 'vatican city', 'Vatican', 'vatican']
    },
    {
      id: 5,
      text: "Which continent has the most countries?",
      type: 'MCQ',
      options: ['Asia', 'Europe', 'Africa', 'South America'],
      correctAnswer: 'Africa'
    },
    {
      id: 6,
      text: "What year did the Berlin Wall fall?",
      type: 'TEXT',
      correctAnswer: ['1989', 'nineteen eighty-nine', 'nineteen eighty nine']
    }
  ]
};

// Export hardcoded quizzes as backup/fallback
export const AVAILABLE_QUIZZES: Quiz[] = [
  GENERAL_KNOWLEDGE_QUIZ,
  SCIENCE_TECH_QUIZ,
  POP_CULTURE_QUIZ,
  HISTORY_GEOGRAPHY_QUIZ
];

// Helper function to get a quiz by ID from hardcoded data (sync fallback)
export function getQuizById(id: string): Quiz | undefined {
  return AVAILABLE_QUIZZES.find(quiz => quiz.id === id);
}

// Default quiz (for backwards compatibility)
export const QUESTIONS: Question[] = GENERAL_KNOWLEDGE_QUIZ.questions;

// Re-export Firebase quiz operations for easy access
export {
  fetchQuizzes,
  fetchQuizById,
  saveQuiz,
  deleteQuiz,
  initializeFirebaseQuizzes,
  clearQuizCache,
  hasFirebaseQuizzes
} from './quizOperations';