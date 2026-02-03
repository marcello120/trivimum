import { ref, set, update, get, onValue, off, push, remove, DatabaseReference } from 'firebase/database';
import { db } from '@/lib/firebase';
import { getFirebaseErrorDetails, isRetryableError } from '@/lib/errorHandling';
import { FirebaseError } from '@/types/errors';

interface OperationOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  onError?: (error: FirebaseError) => void;
  onRetry?: (attempt: number, error: FirebaseError) => void;
}

const DEFAULT_OPTIONS: Required<OperationOptions> = {
  retries: 3,
  retryDelay: 1000,
  timeout: 10000,
  onError: () => {},
  onRetry: () => {}
};

// Enhanced Firebase operations with error handling and retry logic

export class FirebaseOperationError extends Error {
  constructor(public firebaseError: FirebaseError) {
    super(firebaseError.message);
    this.name = 'FirebaseOperationError';
  }
}

// Helper function to add timeout to Firebase operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Firebase ${operation} operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

// Retry wrapper for Firebase operations
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: OperationOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: FirebaseError;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await withTimeout(operation(), opts.timeout, operationName);
    } catch (error) {
      const firebaseError = getFirebaseErrorDetails(error, operationName);
      lastError = firebaseError;

      // Don't retry non-retryable errors
      if (!isRetryableError(firebaseError.code)) {
        opts.onError(firebaseError);
        throw new FirebaseOperationError(firebaseError);
      }

      // Don't retry on the last attempt
      if (attempt === opts.retries) {
        opts.onError(firebaseError);
        throw new FirebaseOperationError(firebaseError);
      }

      // Notify about retry
      opts.onRetry(attempt + 1, firebaseError);

      // Wait before retrying (exponential backoff)
      const delay = opts.retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new FirebaseOperationError(lastError!);
}

// Enhanced Firebase operations

export async function safeSet(
  path: string,
  value: any,
  options: OperationOptions = {}
): Promise<void> {
  return withRetry(
    () => set(ref(db, path), value),
    `set(${path})`,
    options
  );
}

export async function safeUpdate(
  path: string,
  updates: any,
  options: OperationOptions = {}
): Promise<void> {
  return withRetry(
    () => update(ref(db, path), updates),
    `update(${path})`,
    options
  );
}

export async function safeGet(
  path: string,
  options: OperationOptions = {}
): Promise<any> {
  return withRetry(
    async () => {
      const snapshot = await get(ref(db, path));
      return snapshot.val();
    },
    `get(${path})`,
    options
  );
}

export async function safePush(
  path: string,
  value: any,
  options: OperationOptions = {}
): Promise<string> {
  return withRetry(
    async () => {
      const pushRef = await push(ref(db, path), value);
      return pushRef.key!;
    },
    `push(${path})`,
    options
  );
}

export async function safeRemove(
  path: string,
  options: OperationOptions = {}
): Promise<void> {
  return withRetry(
    () => remove(ref(db, path)),
    `remove(${path})`,
    options
  );
}

// Enhanced listener with error handling
interface ListenerOptions extends OperationOptions {
  onData?: (data: any) => void;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
}

export function safeListener(
  path: string,
  callback: (data: any) => void,
  options: ListenerOptions = {}
): () => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dbRef = ref(db, path);
  let isConnected = true;
  let retryCount = 0;

  const handleValue = (snapshot: any) => {
    const data = snapshot.val();

    // Reset retry count on successful connection
    if (retryCount > 0) {
      retryCount = 0;
      if (!isConnected && opts.onConnectionRestored) {
        opts.onConnectionRestored();
      }
      isConnected = true;
    }

    callback(data);
  };

  const handleError = (error: any) => {
    const firebaseError = getFirebaseErrorDetails(error, `listener(${path})`);

    if (isConnected && opts.onConnectionLost) {
      opts.onConnectionLost();
      isConnected = false;
    }

    // Try to reconnect for retryable errors
    if (isRetryableError(firebaseError.code) && retryCount < opts.retries) {
      retryCount++;
      opts.onRetry(retryCount, firebaseError);

      // Retry after delay
      setTimeout(() => {
        off(dbRef);
        onValue(dbRef, handleValue, handleError);
      }, opts.retryDelay * Math.pow(2, retryCount - 1));
    } else {
      opts.onError(firebaseError);
    }
  };

  // Set up the listener
  onValue(dbRef, handleValue, handleError);

  // Return cleanup function
  return () => {
    off(dbRef);
  };
}

// Batch operations with transaction-like behavior
export async function safeBatch(
  operations: Array<{
    type: 'set' | 'update' | 'remove';
    path: string;
    value?: any;
  }>,
  options: OperationOptions = {}
): Promise<void> {
  return withRetry(
    async () => {
      // Convert to single update operation for atomicity
      const updates: Record<string, any> = {};

      for (const op of operations) {
        switch (op.type) {
          case 'set':
            updates[op.path] = op.value;
            break;
          case 'update':
            // Flatten nested updates
            if (typeof op.value === 'object' && op.value !== null) {
              Object.keys(op.value).forEach(key => {
                updates[`${op.path}/${key}`] = op.value[key];
              });
            }
            break;
          case 'remove':
            updates[op.path] = null;
            break;
        }
      }

      await update(ref(db), updates);
    },
    'batch operation',
    options
  );
}

// Connection monitoring utilities
export function monitorConnection(
  onConnectionChange: (isConnected: boolean) => void,
  options: OperationOptions = {}
): () => void {
  const connectedRef = ref(db, '.info/connected');

  return safeListener(
    '.info/connected',
    (connected: boolean) => onConnectionChange(connected),
    {
      ...options,
      onError: (error) => {
        console.error('Connection monitoring error:', error);
        onConnectionChange(false);
        if (options.onError) options.onError(error);
      }
    }
  );
}

// Server timestamp utility
export function getServerTimestamp() {
  return { '.sv': 'timestamp' };
}

// Validation utilities
export function validatePath(path: string): boolean {
  // Firebase path validation rules
  const invalidChars = /[.#$[\]]/;
  if (invalidChars.test(path)) return false;

  // Path segments cannot be empty
  const segments = path.split('/');
  if (segments.some(segment => segment === '')) return false;

  // Maximum path depth check (Firebase limit is 32)
  if (segments.length > 32) return false;

  return true;
}

export function validateData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for undefined values (Firebase doesn't allow undefined)
  function checkUndefined(obj: any, path = ''): void {
    if (obj === undefined) {
      errors.push(`Undefined value at path: ${path}`);
      return;
    }

    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        checkUndefined(obj[key], path ? `${path}.${key}` : key);
      });
    }
  }

  checkUndefined(data);

  // Check for invalid key characters
  function checkKeys(obj: any, path = ''): void {
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        const invalidChars = /[.#$[\]]/;
        if (invalidChars.test(key)) {
          errors.push(`Invalid key characters in key "${key}" at path: ${path}`);
        }

        checkKeys(obj[key], path ? `${path}.${key}` : key);
      });
    }
  }

  checkKeys(data);

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Debug utilities
export function debugFirebaseOperation(
  operationName: string,
  path: string,
  data?: any,
  error?: FirebaseError
): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      operation: operationName,
      path,
      data: data ? JSON.stringify(data, null, 2) : 'N/A',
      error: error ? {
        code: error.code,
        message: error.message,
        context: error.context
      } : null,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      url: window.location.href
    };

    console.group(`🔥 Firebase Operation: ${operationName}`);
    console.table(logData);
    if (error) {
      console.error('Error details:', error);
    }
    console.groupEnd();
  }
}