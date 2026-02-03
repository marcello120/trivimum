import { Question } from '@/types';

export const QUESTIONS: Question[] = [
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
];