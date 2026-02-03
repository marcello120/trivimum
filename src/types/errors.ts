export type FirebaseErrorCode =
  | 'permission-denied'
  | 'network-request-failed'
  | 'unavailable'
  | 'invalid-argument'
  | 'not-found'
  | 'already-exists'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'data-loss'
  | 'unauthenticated'
  | 'deadline-exceeded'
  | 'cancelled'
  | 'unknown'
  | 'invalid-config'
  | 'connection-lost'
  | 'offline'
  | 'quota-exceeded';

export interface FirebaseError {
  code: FirebaseErrorCode;
  message: string;
  originalError?: any;
  context?: string;
  timestamp: number;
}

export interface ErrorState {
  hasError: boolean;
  error: FirebaseError | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryAt?: number;
}

export interface UserFriendlyError {
  title: string;
  description: string;
  actionText?: string;
  actionType?: 'retry' | 'refresh' | 'contact' | 'configure';
  technicalDetails?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}