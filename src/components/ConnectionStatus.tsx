'use client';

import { useState, useEffect } from 'react';
import { useFirebaseConnection } from '@/hooks/useFirebaseConnection';
import { getUserFriendlyError } from '@/lib/errorHandling';

interface ConnectionStatusProps {
  isAdmin?: boolean;
  showDetailed?: boolean;
  className?: string;
  forceVisible?: boolean; // For critical errors that must be shown
}

export default function ConnectionStatus({
  isAdmin = false,
  showDetailed = false,
  className = '',
  forceVisible = false
}: ConnectionStatusProps) {
  const { connectionState, errorState, retryConnection, clearError } = useFirebaseConnection();
  const [isVisible, setIsVisible] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [userToggled, setUserToggled] = useState(false); // User manually toggled visibility
  const [showConnectionInfo, setShowConnectionInfo] = useState(false); // User preference for showing connection info

  // Show status when there are connection issues or errors, or when user has toggled it on
  useEffect(() => {
    const hasConnectionIssues =
      !connectionState.isOnline ||
      !connectionState.isConnected ||
      connectionState.connectionQuality === 'poor' ||
      errorState.hasError;

    const shouldShow =
      forceVisible || // Force visible for critical errors
      (showConnectionInfo && (hasConnectionIssues || connectionState.isConnected)) || // User wants to see info
      (hasConnectionIssues && !userToggled); // Auto-show for issues (unless user manually hidden)

    setIsVisible(shouldShow);
  }, [connectionState, errorState.hasError, showConnectionInfo, userToggled, forceVisible]);

  // Auto-hide success messages after 3 seconds (only if user hasn't manually toggled)
  useEffect(() => {
    if (connectionState.isConnected && !errorState.hasError && !showConnectionInfo && !userToggled) {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionState.isConnected, errorState.hasError, showConnectionInfo, userToggled]);

  const toggleConnectionInfo = () => {
    const newShowState = !showConnectionInfo;
    setShowConnectionInfo(newShowState);
    setUserToggled(true);

    // If turning off, hide immediately unless there are critical issues
    if (!newShowState && connectionState.isConnected && !errorState.hasError) {
      setIsVisible(false);
    }
  };

  const getStatusColor = () => {
    if (errorState.hasError) return 'bg-red-500';
    if (!connectionState.isOnline) return 'bg-gray-500';
    if (!connectionState.isConnected) return 'bg-orange-500';

    switch (connectionState.connectionQuality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (errorState.isRetrying) {
      return (
        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
        </svg>
      );
    }

    if (errorState.hasError) {
      return (
        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }

    if (!connectionState.isConnected) {
      return (
        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12" />
        </svg>
      );
    }

    return (
      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusMessage = () => {
    if (errorState.hasError && errorState.error) {
      const userError = getUserFriendlyError(errorState.error, isAdmin);
      return userError.title;
    }

    if (errorState.isRetrying) {
      return `Reconnecting... (${errorState.retryCount + 1}/5)`;
    }

    if (!connectionState.isOnline) {
      return 'No internet connection';
    }

    if (!connectionState.isConnected) {
      return 'Connecting to game...';
    }

    switch (connectionState.connectionQuality) {
      case 'excellent': return 'Connected';
      case 'good': return 'Connected (good)';
      case 'poor': return 'Connected (slow)';
      case 'offline': return 'Offline';
      default: return 'Unknown status';
    }
  };

  const handleAction = () => {
    if (errorState.hasError) {
      if (errorState.error) {
        const userError = getUserFriendlyError(errorState.error, isAdmin);

        switch (userError.actionType) {
          case 'retry':
            retryConnection();
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
            // Could implement contact functionality
            break;
        }
      }
    } else if (!connectionState.isConnected) {
      retryConnection();
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      {/* Connection Info Toggle Button - Always visible */}
      <div className="flex flex-col items-end space-y-2">
        <button
          onClick={toggleConnectionInfo}
          className={`p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
            showConnectionInfo
              ? 'bg-blue-500 text-white'
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
          title={showConnectionInfo ? 'Hide connection info' : 'Show connection info'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showConnectionInfo ? (
              // Eye slash icon (hide)
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            ) : (
              // Wifi icon (show)
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            )}
          </svg>
        </button>

        {/* Connection Status Panel - Conditionally visible */}
        {(isVisible || showDetailed) && (
          <div>
            <div
              className={`${getStatusColor()} text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-all duration-300 ${
                isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
              }`}
            >
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusMessage()}</span>

              {/* Action button */}
              {(errorState.hasError || !connectionState.isConnected) && (
                <button
                  onClick={handleAction}
                  disabled={errorState.isRetrying}
                  className="ml-2 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {errorState.isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}

              {/* Dismiss button */}
              <button
                onClick={() => {
                  setIsVisible(false);
                  setShowConnectionInfo(false);
                  setUserToggled(true);
                  if (errorState.hasError) clearError();
                }}
                className="ml-2 text-white hover:text-gray-200 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Detailed error information (for admins) */}
            {isAdmin && errorState.hasError && errorState.error && (
              <div className="mt-2 bg-white border border-red-200 rounded-lg p-3 shadow-lg max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-red-800">Error Details</h4>
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    {showErrorDetails ? 'Hide' : 'Show'} Technical Info
                  </button>
                </div>

                <div className="text-sm text-gray-700">
                  <p className="mb-1">
                    <span className="font-medium">Code:</span> {errorState.error.code}
                  </p>
                  <p className="mb-1">
                    <span className="font-medium">Context:</span> {errorState.error.context}
                  </p>

                  {showErrorDetails && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
                      <p className="mb-1">Message: {errorState.error.message}</p>
                      <p className="mb-1">Timestamp: {new Date(errorState.error.timestamp).toLocaleString()}</p>
                      <p>Retry Count: {errorState.retryCount}</p>
                    </div>
                  )}

                  {/* Quick fixes */}
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="text-xs font-medium text-blue-800 mb-1">Quick Fixes:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Check Firebase Console security rules</li>
                      <li>• Verify .env.local configuration</li>
                      <li>• Check internet connection</li>
                      <li>• Try refreshing the page</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

             {/*Connection quality indicator (detailed view)*/}
            {/*{showDetailed && connectionState.isConnected && (*/}
            {/*  <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg">*/}
            {/*    <h4 className="text-sm font-semibold text-gray-800 mb-2">Connection Info</h4>*/}
            {/*    <div className="text-xs text-gray-600 space-y-1">*/}
            {/*      <p>Quality: {connectionState.connectionQuality}</p>*/}
            {/*      <p>Online: {connectionState.isOnline ? 'Yes' : 'No'}</p>*/}
            {/*      {connectionState.lastConnected && (*/}
            {/*        <p>Last Connected: {new Date(connectionState.lastConnected).toLocaleTimeString()}</p>*/}
            {/*      )}*/}
            {/*    </div>*/}
            {/*  </div>*/}
            {/*)}*/}
          </div>
        )}
      </div>
    </div>
  );
}