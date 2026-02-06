import { Quiz } from '@/lib/questions';
import { safeGet, safeSet, safeUpdate } from '@/lib/firebaseOperations';
import { AVAILABLE_QUIZZES as HARDCODED_QUIZZES } from '@/lib/questions';

/**
 * Firebase quiz operations with hardcoded fallback
 */

// Cache for quizzes to avoid repeated Firebase calls
let quizCache: Quiz[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize Firebase with hardcoded quiz data (admin only)
 * This should be called once to populate Firebase with initial data
 */
export async function initializeFirebaseQuizzes(): Promise<boolean> {
  try {
    // Check if quizzes already exist in Firebase
    const existingQuizzes = await safeGet('quizzes', {
      timeout: 10000,
      retries: 2
    });

    if (existingQuizzes && Object.keys(existingQuizzes).length > 0) {
      console.log('Firebase quizzes already exist, skipping initialization');
      return true;
    }

    // Convert array to object with quiz IDs as keys
    const quizzesObject: Record<string, Quiz> = {};
    HARDCODED_QUIZZES.forEach(quiz => {
      quizzesObject[quiz.id] = quiz;
    });

    // Upload to Firebase
    await safeSet('quizzes', quizzesObject, {
      timeout: 30000,
      retries: 3
    });

    console.log('Successfully initialized Firebase with hardcoded quizzes');
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase quizzes:', error);
    return false;
  }
}

/**
 * Fetch all quizzes from Firebase with hardcoded fallback
 */
export async function fetchQuizzes(): Promise<Quiz[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (quizCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return quizCache;
    }

    // Fetch from Firebase
    const quizzesData = await safeGet('quizzes', {
      timeout: 10000,
      retries: 2
    });

    if (quizzesData && typeof quizzesData === 'object') {
      // Convert Firebase object to array
      const quizzes = Object.values(quizzesData) as Quiz[];

      // Update cache
      quizCache = quizzes;
      cacheTimestamp = now;

      return quizzes;
    }

    // Firebase returned null/empty, fall back to hardcoded
    console.warn('No quizzes found in Firebase, using hardcoded fallback');
    return HARDCODED_QUIZZES;

  } catch (error) {
    console.error('Failed to fetch quizzes from Firebase, using hardcoded fallback:', error);
    return HARDCODED_QUIZZES;
  }
}

/**
 * Fetch a specific quiz by ID from Firebase with hardcoded fallback
 */
export async function fetchQuizById(id: string): Promise<Quiz | undefined> {
  try {
    // Try to get from cache first
    if (quizCache) {
      const cachedQuiz = quizCache.find(quiz => quiz.id === id);
      if (cachedQuiz) {
        return cachedQuiz;
      }
    }

    // Fetch specific quiz from Firebase
    const quizData = await safeGet(`quizzes/${id}`, {
      timeout: 10000,
      retries: 2
    });

    if (quizData) {
      return quizData as Quiz;
    }

    // Fall back to hardcoded data
    console.warn(`Quiz ${id} not found in Firebase, using hardcoded fallback`);
    return HARDCODED_QUIZZES.find(quiz => quiz.id === id);

  } catch (error) {
    console.error(`Failed to fetch quiz ${id} from Firebase, using hardcoded fallback:`, error);
    return HARDCODED_QUIZZES.find(quiz => quiz.id === id);
  }
}

/**
 * Add or update a quiz in Firebase (admin only)
 */
export async function saveQuiz(quiz: Quiz): Promise<boolean> {
  try {
    await safeUpdate(`quizzes/${quiz.id}`, quiz, {
      timeout: 15000,
      retries: 3
    });

    // Update cache if it exists
    if (quizCache) {
      const existingIndex = quizCache.findIndex(q => q.id === quiz.id);
      if (existingIndex >= 0) {
        quizCache[existingIndex] = quiz;
      } else {
        quizCache.push(quiz);
      }
    }

    console.log(`Successfully saved quiz: ${quiz.id}`);
    return true;
  } catch (error) {
    console.error(`Failed to save quiz ${quiz.id}:`, error);
    return false;
  }
}

/**
 * Delete a quiz from Firebase (admin only)
 */
export async function deleteQuiz(quizId: string): Promise<boolean> {
  try {
    await safeUpdate(`quizzes/${quizId}`, null, {
      timeout: 15000,
      retries: 3
    });

    // Update cache if it exists
    if (quizCache) {
      quizCache = quizCache.filter(quiz => quiz.id !== quizId);
    }

    console.log(`Successfully deleted quiz: ${quizId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete quiz ${quizId}:`, error);
    return false;
  }
}

/**
 * Clear the quiz cache (useful for forcing fresh data)
 */
export function clearQuizCache(): void {
  quizCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if Firebase is available and has quiz data
 */
export async function hasFirebaseQuizzes(): Promise<boolean> {
  try {
    const quizzesData = await safeGet('quizzes', {
      timeout: 5000,
      retries: 1
    });
    return quizzesData && Object.keys(quizzesData).length > 0;
  } catch (error) {
    return false;
  }
}