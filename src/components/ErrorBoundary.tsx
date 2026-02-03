'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FirebaseError } from '@/types/errors';
import { getFirebaseErrorDetails, getUserFriendlyError, getDebuggingInfo } from '@/lib/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: (error: FirebaseError, resetError: () => void) => ReactNode;
  isAdmin?: boolean;
}

interface State {
  hasError: boolean;
  error: FirebaseError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const firebaseError = getFirebaseErrorDetails(error, 'ErrorBoundary');
    return {
      hasError: true,
      error: firebaseError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const firebaseError = getFirebaseErrorDetails(error, 'ErrorBoundary');

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', {
      error: firebaseError,
      errorInfo,
      debugInfo: getDebuggingInfo(firebaseError)
    });

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureError(firebaseError, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
          isAdmin={this.props.isAdmin}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: FirebaseError;
  resetError: () => void;
  isAdmin?: boolean;
}

function DefaultErrorFallback({ error, resetError, isAdmin = false }: FallbackProps) {
  const userError = getUserFriendlyError(error, isAdmin);
  const [showDetails, setShowDetails] = React.useState(false);

  const handleAction = () => {
    switch (userError.actionType) {
      case 'retry':
        resetError();
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'configure':
        if (isAdmin) {
          window.open('https://console.firebase.google.com/', '_blank');
        }
        break;
      case 'contact':
        // Could open a support modal or redirect to contact page
        break;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        {/* Severity indicator */}
        <div className={`h-1 w-full rounded-t-lg ${getSeverityColor(userError.severity)} mb-4`} />

        {/* Error icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Error content */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {userError.title}
          </h1>
          <p className="text-gray-600 mb-6">
            {userError.description}
          </p>

          {/* Action button */}
          {userError.actionText && (
            <button
              onClick={handleAction}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-3"
            >
              {userError.actionText}
            </button>
          )}

          {/* Technical details toggle (for admins/developers) */}
          {isAdmin && (
            <div className="text-left">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </button>

              {showDetails && (
                <div className="mt-3 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-40">
                  <p className="font-semibold mb-2">Error Code: {error.code}</p>
                  <p className="mb-2">Context: {error.context}</p>
                  <p className="mb-2">Message: {error.message}</p>
                  <details>
                    <summary className="cursor-pointer">Debug Information</summary>
                    <pre className="mt-2 whitespace-pre-wrap">
                      {getDebuggingInfo(error)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick actions for common fixes */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Quick fixes: Check your internet connection • Refresh the page • Clear browser cache
          </p>
        </div>
      </div>
    </div>
  );
}