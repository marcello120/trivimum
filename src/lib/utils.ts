import levenshtein from 'fast-levenshtein';
import {Question} from '@/types';
import {type ClassValue, clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function checkAnswer(playerInput: string, question: Question): boolean {
    if (!playerInput) return false;

    const cleanInput = playerInput.trim().toLowerCase();

    // Handle array of correct answers for TEXT questions
    const correctAnswers = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];

    return correctAnswers.some(correctAnswer => {
        const cleanCorrect = correctAnswer.trim().toLowerCase();

        // 1. Exact Match (normalized)
        if (cleanInput === cleanCorrect) return true;

        // 2. Levenshtein Distance (Allow 1 mistake for text questions)
        if (question.type === 'TEXT' && isNaN(Number(cleanInput))) {
            const distance = levenshtein.get(cleanInput, cleanCorrect);
            return distance <= 1;
        }

        return false;
    });
}