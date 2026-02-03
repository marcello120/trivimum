'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onDisconnect, serverTimestamp, set, onValue, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import { ErrorState, FirebaseError } from '@/types/errors';
import { getFirebaseErrorDetails, isRetryableError, validateFirebaseConfig } from '@/lib/errorHandling';

interface ConnectionState {
  isConnected: boolean;
  isOnline: boolean;
  lastConnected: number | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

interface UseFirebaseConnectionReturn {
  connectionState: ConnectionState;
  errorState: ErrorState;
  retryConnection: () => Promise<void>;
  clearError: () => void;
}

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

export function useFirebaseConnection(): UseFirebaseConnectionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isOnline: navigator.onLine,
    lastConnected: null,
    connectionQuality: 'offline'
  });

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    isRetrying: false,
    retryCount: 0
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const connectionTestRef = useRef<any>(null);

  // Test Firebase connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const testRef = ref(db, '.info/connected');
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          off(testRef);
          reject(new Error('Connection test timeout'));
        }, 5000);

        const unsubscribe = onValue(testRef, (snapshot) => {
          clearTimeout(timeout);
          off(testRef);
          resolve(snapshot.val() === true);
        }, (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, []);

  // Monitor connection quality
  const updateConnectionQuality = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectionState(prev => ({ ...prev, connectionQuality: 'offline' }));
      return;
    }

    const startTime = performance.now();
    try {
      const isConnected = await testConnection();
      const responseTime = performance.now() - startTime;

      let quality: ConnectionState['connectionQuality'];
      if (!isConnected) {
        quality = 'offline';
      } else if (responseTime < 500) {
        quality = 'excellent';
      } else if (responseTime < 1500) {
        quality = 'good';
      } else {
        quality = 'poor';
      }

      setConnectionState(prev => ({
        ...prev,
        isConnected,
        connectionQuality: quality,
        lastConnected: isConnected ? Date.now() : prev.lastConnected
      }));
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'offline'
      }));
    }
  }, [testConnection]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(async () => {
    if (errorState.isRetrying || errorState.retryCount >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    const delay = RETRY_DELAYS[Math.min(errorState.retryCount, RETRY_DELAYS.length - 1)];

    try {
      await new Promise(resolve => setTimeout(resolve, delay));

      const isConnected = await testConnection();

      if (isConnected) {
        // Connection successful, reset error state
        setErrorState({
          hasError: false,
          error: null,
          isRetrying: false,
          retryCount: 0
        });

        await updateConnectionQuality();
      } else {
        throw new Error('Connection test failed after retry');
      }
    } catch (error) {
      const firebaseError = getFirebaseErrorDetails(error, 'retryConnection');

      setErrorState(prev => ({
        hasError: true,
        error: firebaseError,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
        lastRetryAt: Date.now()
      }));

      // Auto-retry if error is retryable and we haven't exceeded max attempts
      if (isRetryableError(firebaseError.code) && errorState.retryCount + 1 < MAX_RETRY_ATTEMPTS) {
        retryTimeoutRef.current = setTimeout(() => {
          retryConnection();
        }, delay * 2);
      }
    }
  }, [errorState.retryCount, errorState.isRetrying, testConnection, updateConnectionQuality]);

  // Clear error state
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState({
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0
    });
  }, []);

  // Handle Firebase errors
  const handleFirebaseError = useCallback((error: any, context: string) => {
    const firebaseError = getFirebaseErrorDetails(error, context);

    setErrorState(prev => ({
      hasError: true,
      error: firebaseError,
      isRetrying: false,
      retryCount: prev.retryCount
    }));

    // Auto-retry for retryable errors
    if (isRetryableError(firebaseError.code) && errorState.retryCount < MAX_RETRY_ATTEMPTS) {
      setTimeout(() => retryConnection(), 2000);
    }
  }, [errorState.retryCount, retryConnection]);

  // Monitor browser online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState(prev => ({ ...prev, isOnline: true }));
      updateConnectionQuality();
    };

    const handleOffline = () => {
      setConnectionState(prev => ({
        ...prev,
        isOnline: false,
        isConnected: false,
        connectionQuality: 'offline'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateConnectionQuality]);

  // Initial connection setup
  useEffect(() => {
    // Validate Firebase configuration first
    const configValidation = validateFirebaseConfig();

    if (!configValidation.isValid) {
      const configError: FirebaseError = {
        code: 'invalid-config',
        message: `Firebase configuration errors: ${configValidation.errors.join(', ')}`,
        context: 'Firebase configuration validation',
        timestamp: Date.now()
      };

      setErrorState({
        hasError: true,
        error: configError,
        isRetrying: false,
        retryCount: 0
      });
      return;
    }

    // Set up Firebase connection monitoring
    const connectedRef = ref(db, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val() === true;

      setConnectionState(prev => ({
        ...prev,
        isConnected,
        lastConnected: isConnected ? Date.now() : prev.lastConnected
      }));

      if (isConnected) {
        // Set up presence system (optional)
        const presenceRef = ref(db, `presence/${Date.now()}`);
        set(presenceRef, {
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent
        });

        // Remove presence on disconnect
        onDisconnect(presenceRef).remove();

        updateConnectionQuality();

        // Clear any connection errors if we're now connected
        if (errorState.hasError && errorState.error?.code === 'network-request-failed') {
          clearError();
        }
      }
    }, (error) => {
      handleFirebaseError(error, 'Firebase connection monitoring');
    });

    connectionTestRef.current = unsubscribe;

    // Initial connection test
    updateConnectionQuality();

    return () => {
      if (connectionTestRef.current) {
        connectionTestRef.current();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [updateConnectionQuality, handleFirebaseError, errorState.hasError, errorState.error?.code, clearError]);

  return {
    connectionState,
    errorState,
    retryConnection,
    clearError
  };
}