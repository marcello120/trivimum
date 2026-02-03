'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player } from '@/types';
import { QUESTIONS } from '@/lib/questions';
import LoginScreen from '@/components/LoginScreen';
import GameScreen from '@/components/GameScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ConnectionStatus from '@/components/ConnectionStatus';
import { safeSet, safeUpdate, safeListener, FirebaseOperationError } from '@/lib/firebaseOperations';
import { ErrorState, FirebaseError } from '@/types/errors';

export default function Home() {
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    isRetrying: false,
    retryCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Helper function to clear player data and reset state
  const clearPlayerData = (reason: string) => {
    console.log(`Clearing player data: ${reason}`);
    localStorage.removeItem('quizapp_player_name');
    setPlayerName('');
    setCurrentPlayer(null);
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
  };

  // Initialize player identity
  useEffect(() => {
    let id = localStorage.getItem('quizapp_player_id');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('quizapp_player_id', id);
    }
    setPlayerId(id);

    const name = localStorage.getItem('quizapp_player_name');
    if (name) {
      setPlayerName(name);
    }
  }, []);

  // Listen to game state changes
  useEffect(() => {
    if (!playerId) return;

    setIsLoading(true);

    const unsubscribe = safeListener(
      'game',
      (data) => {
        setIsLoading(false);
        setErrorState(prev => ({ ...prev, hasError: false, error: null }));

        if (data) {
          setGameState(data);
          // Get current player data
          const player = data.players?.[playerId];
          if (player) {
            setCurrentPlayer(player);
            // Clear timeout if player successfully connected
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              setConnectionTimeout(null);
            }
          } else if (playerName) {
            // Player has name in localStorage but doesn't exist in Firebase
            // This happens when admin resets the game - clear localStorage and force re-login
            clearPlayerData('Player data not found in Firebase after game reset');
          }
        } else if (playerName) {
          // No game data exists but player has name in localStorage
          // This can happen during game reset or initialization - clear localStorage
          clearPlayerData('No game data found but player name exists in localStorage');
        }
      },
      {
        retries: 5,
        retryDelay: 2000,
        onError: (error: FirebaseError) => {
          setIsLoading(false);
          setErrorState({
            hasError: true,
            error,
            isRetrying: false,
            retryCount: 0
          });
        },
        onRetry: (attempt: number, error: FirebaseError) => {
          setErrorState(prev => ({
            ...prev,
            isRetrying: true,
            retryCount: attempt,
            lastRetryAt: Date.now()
          }));
        },
        onConnectionLost: () => {
          console.log('Lost connection to Firebase');
        },
        onConnectionRestored: () => {
          console.log('Connection to Firebase restored');
          setErrorState(prev => ({ ...prev, hasError: false, error: null }));
        }
      }
    );

    // Cleanup connection timeout on unmount
    return () => {
      unsubscribe();
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [playerId, connectionTimeout]);

  // Auto-cleanup localStorage if player is stuck connecting for too long
  useEffect(() => {
    if (playerName && !currentPlayer && !isLoading) {
      // Player has name but no Firebase data and not actively loading
      // Set timeout to clear localStorage after 10 seconds of being stuck
      const timeout = setTimeout(() => {
        clearPlayerData('Connection timeout - player stuck connecting for too long');
      }, 10000); // 10 second timeout

      setConnectionTimeout(timeout);

      return () => {
        clearTimeout(timeout);
        setConnectionTimeout(null);
      };
    } else if (connectionTimeout) {
      // Clear timeout if conditions change
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
  }, [playerName, currentPlayer, isLoading, connectionTimeout]);

  const handleLogin = async (name: string) => {
    if (!name.trim() || !playerId) return;

    // Clear any existing connection timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }

    const trimmedName = name.trim();
    setPlayerName(trimmedName);
    localStorage.setItem('quizapp_player_name', trimmedName);

    // Add player to Firebase
    const playerData: Player = {
      id: playerId,
      name: trimmedName,
      score: 0,
      currentAnswer: '',
      liveTyping: ''
    };

    try {
      await safeSet(`game/players/${playerId}`, playerData, {
        retries: 3,
        onError: (error) => {
          setErrorState({
            hasError: true,
            error,
            isRetrying: false,
            retryCount: 0
          });
        }
      });
    } catch (error) {
      if (error instanceof FirebaseOperationError) {
        console.error('Failed to add player after retries:', error.firebaseError);
      }
    }
  };

  const updateLiveTyping = async (text: string) => {
    if (!playerId) return;

    try {
      await safeUpdate(`game/players/${playerId}`, {
        liveTyping: text
      }, {
        retries: 2,
        retryDelay: 500,
        timeout: 5000,
        onError: (error) => {
          // Don't show UI errors for live typing failures - they're not critical
          console.warn('Live typing update failed:', error);
        }
      });
    } catch (error) {
      // Silently fail for live typing - it's not critical
      console.warn('Live typing update failed after retries');
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!playerId || !answer.trim()) return;

    try {
      await safeUpdate(`game/players/${playerId}`, {
        currentAnswer: answer.trim(),
        liveTyping: ''
      }, {
        retries: 5, // Answer submission is critical
        onError: (error) => {
          setErrorState({
            hasError: true,
            error: {
              ...error,
              context: 'Answer submission failed - please try again'
            },
            isRetrying: false,
            retryCount: 0
          });
        },
        onRetry: (attempt) => {
          console.log(`Retrying answer submission (attempt ${attempt})`);
        }
      });
    } catch (error) {
      if (error instanceof FirebaseOperationError) {
        console.error('Failed to submit answer after retries:', error.firebaseError);
        // The error state was already set in the onError callback
      }
    }
  };

  // Show loading while initializing
  if (!playerId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-800 text-xl">
            {!playerId ? 'Initializing...' : 'Connecting to game...'}
          </div>
          {errorState.isRetrying && (
            <div className="text-gray-600 text-sm mt-2">
              Retrying connection ({errorState.retryCount}/5)...
            </div>
          )}
          {playerName && !currentPlayer && !isLoading && connectionTimeout && (
            <div className="text-yellow-600 text-sm mt-3 bg-yellow-50 p-3 rounded-lg">
              <p>Taking longer than expected...</p>
              <p className="text-xs mt-1">The host may have reset the game. You'll be redirected to re-join shortly.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show critical error state
  if (errorState.hasError && errorState.error) {
    const isConfigError = ['permission-denied', 'not-found', 'failed-precondition'].includes(errorState.error.code);
    const isCritical = ['critical', 'high'].includes(
      errorState.error.code === 'permission-denied' ? 'high' :
      errorState.error.code === 'not-found' ? 'critical' : 'medium'
    );

    if (isCritical || isConfigError) {
      return (
        <ErrorBoundary isAdmin={false}>
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {errorState.error.code === 'permission-denied' && 'Access Denied'}
                {errorState.error.code === 'not-found' && 'Game Not Found'}
                {!['permission-denied', 'not-found'].includes(errorState.error.code) && 'Connection Error'}
              </h1>
              <p className="text-gray-600 mb-6">
                {errorState.error.code === 'permission-denied' && 'Unable to connect to the game. Please contact the host.'}
                {errorState.error.code === 'not-found' && 'The game session could not be found. The host may need to start a new game.'}
                {!['permission-denied', 'not-found'].includes(errorState.error.code) && 'Unable to connect to the game server. Please try again later.'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </ErrorBoundary>
      );
    }
  }

  return (
    <ErrorBoundary isAdmin={false}>
      <div className="relative">
        <ConnectionStatus
          showDetailed={false}
          forceVisible={errorState.hasError && ['permission-denied', 'not-found', 'failed-precondition'].includes(errorState.error?.code || '')}
        />

        {/* Show login screen if no name */}
        {!playerName ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          // Show game screen
          <GameScreen
            gameState={gameState}
            currentPlayer={currentPlayer}
            questions={QUESTIONS}
            onUpdateLiveTyping={updateLiveTyping}
            onSubmitAnswer={submitAnswer}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}