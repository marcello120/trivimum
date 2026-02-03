import { FirebaseError, FirebaseErrorCode, UserFriendlyError, ErrorState } from '@/types/errors';

// Map Firebase error codes to user-friendly messages
export const getFirebaseErrorDetails = (error: any, context?: string): FirebaseError => {
  const code = error?.code || 'unknown';
  const message = error?.message || 'An unknown error occurred';

  return {
    code: normalizeErrorCode(code),
    message,
    originalError: error,
    context,
    timestamp: Date.now()
  };
};

// Normalize Firebase error codes
const normalizeErrorCode = (code: string): FirebaseErrorCode => {
  // Firebase error codes often have prefixes like 'database/' or 'auth/'
  const normalizedCode = code.replace(/^(database|auth|storage|functions)\//, '');

  switch (normalizedCode) {
    case 'permission-denied':
    case 'PERMISSION_DENIED':
      return 'permission-denied';
    case 'network-request-failed':
    case 'NETWORK_ERROR':
      return 'network-request-failed';
    case 'unavailable':
    case 'UNAVAILABLE':
      return 'unavailable';
    case 'invalid-argument':
    case 'INVALID_ARGUMENT':
      return 'invalid-argument';
    case 'not-found':
    case 'NOT_FOUND':
      return 'not-found';
    case 'already-exists':
    case 'ALREADY_EXISTS':
      return 'already-exists';
    case 'resource-exhausted':
    case 'RESOURCE_EXHAUSTED':
      return 'resource-exhausted';
    case 'failed-precondition':
    case 'FAILED_PRECONDITION':
      return 'failed-precondition';
    case 'aborted':
    case 'ABORTED':
      return 'aborted';
    case 'out-of-range':
    case 'OUT_OF_RANGE':
      return 'out-of-range';
    case 'unimplemented':
    case 'UNIMPLEMENTED':
      return 'unimplemented';
    case 'internal':
    case 'INTERNAL':
      return 'internal';
    case 'data-loss':
    case 'DATA_LOSS':
      return 'data-loss';
    case 'unauthenticated':
    case 'UNAUTHENTICATED':
      return 'unauthenticated';
    case 'deadline-exceeded':
    case 'DEADLINE_EXCEEDED':
      return 'deadline-exceeded';
    case 'cancelled':
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'unknown';
  }
};

// Convert Firebase errors to user-friendly messages
export const getUserFriendlyError = (firebaseError: FirebaseError, isAdmin = false): UserFriendlyError => {
  const { code, context } = firebaseError;

  switch (code) {
    case 'permission-denied':
      return {
        title: 'Access Denied',
        description: isAdmin
          ? 'Your Firebase database rules are blocking this operation. Check your Firebase Console security rules.'
          : 'Unable to connect to the game. The host may need to update their Firebase settings.',
        actionText: isAdmin ? 'Check Firebase Rules' : 'Contact Host',
        actionType: isAdmin ? 'configure' : 'contact',
        technicalDetails: `Firebase permission denied in context: ${context}`,
        severity: 'high'
      };

    case 'network-request-failed':
      return {
        title: 'Connection Problem',
        description: 'Unable to connect to the internet. Check your network connection and try again.',
        actionText: 'Retry',
        actionType: 'retry',
        technicalDetails: 'Network request failed - check internet connectivity',
        severity: 'medium'
      };

    case 'unavailable':
      return {
        title: 'Service Unavailable',
        description: 'The quiz service is temporarily unavailable. This usually resolves itself quickly.',
        actionText: 'Retry',
        actionType: 'retry',
        technicalDetails: 'Firebase service unavailable - likely temporary outage',
        severity: 'high'
      };

    case 'invalid-argument':
      return {
        title: 'Invalid Data',
        description: isAdmin
          ? 'Invalid data was sent to Firebase. This is likely a configuration issue.'
          : 'Something went wrong with your submission. Please try again.',
        actionText: 'Retry',
        actionType: 'retry',
        technicalDetails: `Invalid argument in context: ${context}`,
        severity: 'medium'
      };

    case 'not-found':
      return {
        title: 'Game Not Found',
        description: isAdmin
          ? 'Firebase database not found. Check your NEXT_PUBLIC_FIREBASE_DATABASE_URL in .env.local'
          : 'The game session could not be found. The host may need to restart the game.',
        actionText: isAdmin ? 'Check Config' : 'Contact Host',
        actionType: isAdmin ? 'configure' : 'contact',
        technicalDetails: 'Firebase database or path not found',
        severity: 'critical'
      };

    case 'resource-exhausted':
      return {
        title: 'Service Overloaded',
        description: isAdmin
          ? 'Firebase quota exceeded. Your project has hit usage limits.'
          : 'The game is experiencing high traffic. Please wait a moment and try again.',
        actionText: isAdmin ? 'Check Quota' : 'Wait & Retry',
        actionType: isAdmin ? 'configure' : 'retry',
        technicalDetails: 'Firebase quota/limits exceeded',
        severity: 'high'
      };

    case 'failed-precondition':
      return {
        title: 'Configuration Error',
        description: isAdmin
          ? 'Firebase project configuration is invalid. Check your Firebase Console setup.'
          : 'Game setup is incomplete. Please contact the host.',
        actionText: isAdmin ? 'Check Setup' : 'Contact Host',
        actionType: isAdmin ? 'configure' : 'contact',
        technicalDetails: 'Firebase precondition failed - likely configuration issue',
        severity: 'critical'
      };

    case 'unauthenticated':
      return {
        title: 'Authentication Required',
        description: isAdmin
          ? 'Firebase requires authentication. Check your auth configuration.'
          : 'You need to be authenticated to join the game.',
        actionText: 'Refresh',
        actionType: 'refresh',
        technicalDetails: 'Firebase authentication required',
        severity: 'medium'
      };

    case 'deadline-exceeded':
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete. Your connection might be slow.',
        actionText: 'Retry',
        actionType: 'retry',
        technicalDetails: 'Firebase request deadline exceeded',
        severity: 'medium'
      };

    default:
      return {
        title: 'Unexpected Error',
        description: isAdmin
          ? 'An unexpected error occurred. Check browser console for details.'
          : 'Something went wrong. Please refresh the page and try again.',
        actionText: 'Refresh',
        actionType: 'refresh',
        technicalDetails: `Unknown error: ${firebaseError.message}`,
        severity: 'medium'
      };
  }
};

// Check if error is retryable
export const isRetryableError = (errorCode: FirebaseErrorCode): boolean => {
  const retryableErrors: FirebaseErrorCode[] = [
    'network-request-failed',
    'unavailable',
    'deadline-exceeded',
    'internal',
    'aborted',
    'cancelled'
  ];
  return retryableErrors.includes(errorCode);
};

// Check if error indicates configuration issue
export const isConfigurationError = (errorCode: FirebaseErrorCode): boolean => {
  const configErrors: FirebaseErrorCode[] = [
    'permission-denied',
    'not-found',
    'failed-precondition',
    'unauthenticated',
    'invalid-config'
  ];
  return configErrors.includes(errorCode);
};

// Check if error indicates network/connectivity issue
export const isNetworkError = (errorCode: FirebaseErrorCode): boolean => {
  const networkErrors: FirebaseErrorCode[] = [
    'network-request-failed',
    'unavailable',
    'deadline-exceeded',
    'offline'
  ];
  return networkErrors.includes(errorCode);
};

// Generate debugging information for developers
export const getDebuggingInfo = (error: FirebaseError): string => {
  const info = {
    timestamp: new Date(error.timestamp).toISOString(),
    errorCode: error.code,
    context: error.context,
    originalMessage: error.message,
    userAgent: navigator.userAgent,
    url: window.location.href,
    online: navigator.onLine,
    firebaseSDKVersion: 'Check package.json'
  };

  return JSON.stringify(info, null, 2);
};

// Firebase configuration validation
export const validateFirebaseConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    errors.push('Missing NEXT_PUBLIC_FIREBASE_API_KEY');
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    errors.push('Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL');
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    errors.push('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }


  return {
    isValid: errors.length === 0,
    errors
  };
};