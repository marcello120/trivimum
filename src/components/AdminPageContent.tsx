'use client';

import {useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {GameState, Player} from '@/types';
import {QUESTIONS} from '@/lib/questions';
import {checkAnswer} from '@/lib/utils';
import {ErrorBoundary} from '@/components/ErrorBoundary';
import ConnectionStatus from '@/components/ConnectionStatus';
import {FirebaseOperationError, safeGet, safeListener, safeSet, safeUpdate} from '@/lib/firebaseOperations';
import {ErrorState, FirebaseError} from '@/types/errors';
import {getPlayerList, normalizeGameState} from '@/lib/gameStateHelpers';
import {
    AlertTriangle,
    ChevronDown,
    Clock,
    ExternalLink,
    Eye,
    EyeOff,
    Loader2,
    MessageSquare,
    Play,
    RefreshCw,
    Settings,
    SkipBack,
    SkipForward,
    Trophy,
    Users,
    X,
    Zap
} from 'lucide-react';

export default function AdminPageContent() {
    const searchParams = useSearchParams();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [errorState, setErrorState] = useState<ErrorState>({
        hasError: false,
        error: null,
        isRetrying: false,
        retryCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [operationInProgress, setOperationInProgress] = useState<string | null>(null);
    const [isQuestionSectionCollapsed, setIsQuestionSectionCollapsed] = useState(false);
    const [isControlPanelExpanded, setIsControlPanelExpanded] = useState(false);

    // Check authorization
    useEffect(() => {
        const code = searchParams.get('code');
        if (code === 'admin123') {
            setIsAuthorized(true);
        }
    }, [searchParams]);

    // Listen to game state
    useEffect(() => {
        if (!isAuthorized) return;

        setIsLoading(true);

        const unsubscribe = safeListener(
            'game',
            (data) => {
                setIsLoading(false);
                setErrorState(prev => ({...prev, hasError: false, error: null}));

                if (data) {
                    setGameState(normalizeGameState(data));
                } else {
                    // Initialize game state if not exists
                    const initialState: GameState = {
                        status: 'LOBBY',
                        currentQuestionIndex: 0,
                        players: {}
                    };

                    safeSet('game', initialState, {
                        onError: (error) => {
                            setErrorState({
                                hasError: true,
                                error: {
                                    ...error,
                                    context: 'Failed to initialize game state'
                                },
                                isRetrying: false,
                                retryCount: 0
                            });
                        }
                    });
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
                }
            }
        );

        return unsubscribe;
    }, [isAuthorized]);

    const handleNextQuestion = async () => {
        if (!gameState || operationInProgress) return;

        const nextIndex = gameState.currentQuestionIndex + 1;
        if (nextIndex >= QUESTIONS.length) return;

        setOperationInProgress('nextQuestion');

        // Clear all player answers
        const updates: Record<string, any> = {};
        Object.keys(gameState.players || {}).forEach(playerId => {
            updates[`players/${playerId}/currentAnswer`] = '';
            updates[`players/${playerId}/liveTyping`] = '';
        });

        updates.status = 'QUESTION_ACTIVE';
        updates.currentQuestionIndex = nextIndex;
        updates.previousStatus = null; // Remove the field from Firebase

        try {
            await safeUpdate('game', updates, {
                timeout: 15000,
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to move to next question'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                },
                onRetry: (attempt) => {
                    console.log(`Retrying next question operation (attempt ${attempt})`);
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to move to next question after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    const handleRevealAnswer = async () => {
        if (!gameState || operationInProgress) return;

        const currentQuestion = QUESTIONS[gameState.currentQuestionIndex];
        if (!currentQuestion) return;

        setOperationInProgress('revealAnswer');

        try {
            // Get current snapshot of players
            const players = await safeGet('game/players', {
                timeout: 10000,
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to get player data for scoring'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            }) || {};

            // Calculate scores
            const updatedPlayers: Record<string, Player> = {};
            Object.keys(players).forEach(playerId => {
                const player = players[playerId];
                const isCorrect = checkAnswer(player.currentAnswer, currentQuestion);

                updatedPlayers[playerId] = {
                    ...player,
                    score: isCorrect ? player.score + 100 : player.score
                };
            });

            // Update game state with new scores and status
            await safeUpdate('game', {
                status: 'REVEAL_ANSWER',
                players: updatedPlayers,
                previousStatus: null // Remove the field from Firebase
            }, {
                timeout: 15000,
                retries: 5, // Critical operation - retry more
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to reveal answer and update scores'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                },
                onRetry: (attempt) => {
                    console.log(`Retrying reveal answer operation (attempt ${attempt})`);
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to reveal answer after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    const handleShowLeaderboard = async () => {
        if (operationInProgress || !gameState) return;

        setOperationInProgress('showLeaderboard');

        try {
            // Store current status so we can return to it when hiding leaderboard
            await safeUpdate('game', {
                status: 'LEADERBOARD',
                previousStatus: gameState.status
            }, {
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to show leaderboard'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to show leaderboard after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    const handleHideLeaderboard = async () => {
        if (operationInProgress || !gameState) return;

        setOperationInProgress('hideLeaderboard');

        try {
            // Return to the previous status before leaderboard was shown
            const statusToReturn = gameState.previousStatus || 'REVEAL_ANSWER';

            await safeUpdate('game', {
                status: statusToReturn,
                previousStatus: null // Remove the field from Firebase
            }, {
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to hide leaderboard'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to hide leaderboard after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    const handlePreviousQuestion = async () => {
        if (!gameState || operationInProgress || gameState.currentQuestionIndex <= 0) return;

        setOperationInProgress('previousQuestion');

        const prevIndex = gameState.currentQuestionIndex - 1;

        // Clear all player answers
        const updates: Record<string, any> = {};
        Object.keys(gameState.players || {}).forEach(playerId => {
            updates[`players/${playerId}/currentAnswer`] = '';
            updates[`players/${playerId}/liveTyping`] = '';
        });

        updates.status = 'REVEAL_ANSWER'; // Go to reveal state for previous question
        updates.currentQuestionIndex = prevIndex;
        updates.previousStatus = null; // Remove the field from Firebase

        try {
            await safeUpdate('game', updates, {
                timeout: 15000,
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to go to previous question'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                },
                onRetry: (attempt) => {
                    console.log(`Retrying previous question operation (attempt ${attempt})`);
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to go to previous question after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    const handleResetGame = async () => {
        if (operationInProgress) return;

        const confirmReset = confirm('Are you sure you want to reset the game? This will clear all player data.');
        if (!confirmReset) return;

        setOperationInProgress('resetGame');

        try {
            const initialState: GameState = {
                status: 'LOBBY',
                currentQuestionIndex: 0,
                players: {}
                // previousStatus omitted - it will be undefined by default
            };

            await safeSet('game', initialState, {
                timeout: 15000,
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to reset game'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to reset game after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    const handleStartQuestion = async () => {
        if (!gameState || operationInProgress) return;

        setOperationInProgress('startQuestion');

        // Clear all player answers and start first question
        const updates: Record<string, any> = {};
        Object.keys(gameState.players || {}).forEach(playerId => {
            updates[`players/${playerId}/currentAnswer`] = '';
            updates[`players/${playerId}/liveTyping`] = '';
        });

        updates.status = 'QUESTION_ACTIVE';
        updates.previousStatus = null; // Remove the field from Firebase

        try {
            await safeUpdate('game', updates, {
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to start question'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to start question after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-white rounded-lg p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600">You need the correct admin code to access this page.</p>
                    <p className="text-sm text-gray-500 mt-2">Hint: Add ?code=password to the URL</p>
                </div>
            </div>
        );
    }

    // Show loading state
    if (!gameState || isLoading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
                <div
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-10 text-center border border-gray-700 shadow-2xl animate-scale-up">
                    <div
                        className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/50">
                        <Loader2 className="w-8 h-8 text-white animate-spin"/>
                    </div>
                    <div className="text-white text-2xl mb-3 font-bold">
                        {isLoading ? 'Loading Admin Panel...' : 'Initializing Game...'}
                    </div>
                    <div className="text-gray-400 mb-4">
                        Please wait while we set up your control center
                    </div>
                    {errorState.isRetrying && (
                        <div
                            className="flex items-center justify-center text-yellow-400 text-sm bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30">
                            <AlertTriangle className="w-4 h-4 mr-2"/>
                            Retrying connection ({errorState.retryCount}/5)...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Show critical error state for admins
    if (errorState.hasError && errorState.error) {
        const isConfigError = ['permission-denied', 'not-found', 'failed-precondition', 'invalid-config'].includes(errorState.error.code);

        if (isConfigError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
                        <div className="flex items-center mb-4">
                            <div
                                className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 animate-pulse">
                                <AlertTriangle className="w-6 h-6 text-red-500"/>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Configuration Error</h1>
                                <p className="text-sm text-gray-500">Error Code: {errorState.error.code}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-700 mb-4">{errorState.error.message}</p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-semibold text-yellow-800 mb-2">Quick Fixes:</h3>
                                <ul className="text-sm text-yellow-700 space-y-1">
                                    <li>• Check your .env.local file has correct Firebase credentials</li>
                                    <li>• Verify Firebase Realtime Database is enabled</li>
                                    <li>• Update Firebase security rules to allow read/write access</li>
                                    <li>• Ensure Firebase project is active and billing is set up</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                            <button
                                onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                            >
                                <ExternalLink className="w-4 h-4 mr-2"/>
                                Firebase Console
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    }

    const currentQuestion = QUESTIONS[gameState.currentQuestionIndex];
    const playerList = getPlayerList(gameState);

    return (
        <ErrorBoundary isAdmin={true}>
            <div className="min-h-screen bg-gray-900 text-white relative">
                <ConnectionStatus
                    isAdmin={true}
                    showDetailed={true}
                    forceVisible={errorState.hasError && ['permission-denied', 'not-found', 'failed-precondition', 'invalid-config'].includes(errorState.error?.code || '')}
                />

                {/* Header */}
                <div
                    className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-700 p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div className="animate-fade-in">
                            <div className="flex items-center mb-2">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    QuizApp Admin
                                </h1>
                            </div>
                            <div className="flex items-center text-gray-300">
                                <p>Question {gameState.currentQuestionIndex + 1} of {QUESTIONS.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div
                                className="flex items-center bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600">
                                <Users className="w-4 h-4 mr-2 text-blue-400"/>
                                <span className="text-sm text-gray-300">{playerList.length}</span>
                            </div>
                            <div
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    gameState.status === 'LOBBY' ? 'bg-blue-600 shadow-blue-600/50 shadow-lg' :
                                        gameState.status === 'QUESTION_ACTIVE' ? 'bg-green-600 shadow-green-600/50 shadow-lg animate-pulse' :
                                            gameState.status === 'REVEAL_ANSWER' ? 'bg-yellow-600 shadow-yellow-600/50 shadow-lg' :
                                                'bg-purple-600 shadow-purple-600/50 shadow-lg'
                                }`}>
                                {gameState.status === 'QUESTION_ACTIVE' && <Zap className="w-4 h-4 mr-2"/>}
                                {gameState.status === 'REVEAL_ANSWER' && <Eye className="w-4 h-4 mr-2"/>}
                                {gameState.status === 'LEADERBOARD' && <Trophy className="w-4 h-4 mr-2"/>}
                                {gameState.status === 'LOBBY' && <Clock className="w-4 h-4 mr-2"/>}
                                {gameState.status.replace('_', ' ')}
                            </div>
                        </div>
                    </div>

                    {currentQuestion && (
                        <div className="mt-4 bg-gray-700 rounded-lg overflow-hidden">
                            {/* Collapsible Header */}
                            <button
                                onClick={() => setIsQuestionSectionCollapsed(!isQuestionSectionCollapsed)}
                                className="w-full p-4 text-left hover:bg-gray-600/50 transition-colors duration-200 flex items-center justify-between"
                            >
                                <div className="flex items-center">
                                    <MessageSquare className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0"/>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">{currentQuestion.text}</h2>
                                    </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                                    isQuestionSectionCollapsed ? '' : 'rotate-180'
                                }`}/>
                            </button>

                            {/* Collapsible Content */}
                            {!isQuestionSectionCollapsed && (
                                <div className="px-4 pb-4 border-t border-gray-600/30 animate-fade-in">
                                    {currentQuestion.options && (
                                        <div className="mb-3">
                                            <span className="text-gray-400">Options: </span>
                                            <span className="text-white">
                                                {currentQuestion.options.map((option, i) => (
                                                    <span key={i}>
                                                        <span className={
                                                            (Array.isArray(currentQuestion.correctAnswer)
                                                                ? currentQuestion.correctAnswer.some(ans => ans.toLowerCase() === option.toLowerCase())
                                                                : currentQuestion.correctAnswer.toLowerCase() === option.toLowerCase())
                                                                ? 'text-green-400 font-medium'
                                                                : ''
                                                        }>
                                                            {option}
                                                        </span>
                                                        {!!currentQuestion.options && i < currentQuestion.options.length - 1 && ', '}
                                                    </span>
                                                ))}
                                            </span></div>
                                    )}
                                    {currentQuestion.type === 'TEXT' && <div>
                                        <span className="text-gray-400">Correct Answer: </span>
                                        <span className="text-green-400 font-medium">
                                            {Array.isArray(currentQuestion.correctAnswer)
                                                ? currentQuestion.correctAnswer.join(' / ')
                                                : currentQuestion.correctAnswer}
                                        </span>
                                    </div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Player Grid */}
                <div className="p-4 flex-1 pb-20">
                    <h3 className="text-xl font-bold mb-4">
                        Players ({playerList.length})
                    </h3>

                    {playerList.length === 0 ? (
                        <div className="text-center text-gray-400 mt-8">
                            <p>No players connected yet.</p>
                            <p className="text-sm mt-2">Players can join at the main page.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {playerList.map((player, index) => (
                                <div key={player.id || `player-${index}`}
                                     className={`bg-gray-800 rounded-lg p-4 border ${player.currentAnswer ? 'border-green-500' : 'border-gray-700'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-lg">{player.name}</h4>
                                        <span className="text-blue-400 font-mono">{player.score}</span>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {player.currentAnswer && (
                                            <div>
                                                <span className="text-gray-400">Submitted: </span>
                                                <span className="text-white font-medium">{player.currentAnswer}</span>
                                            </div>
                                        )}

                                        {player.liveTyping && !player.currentAnswer && (
                                            <div>
                                                <span className="text-gray-400">Typing: </span>
                                                <span
                                                    className="text-yellow-400 font-medium">{player.liveTyping}...</span>
                                            </div>
                                        )}

                                        {!player.currentAnswer && !player.liveTyping && gameState.status === 'QUESTION_ACTIVE' && (
                                            <div className="text-gray-500">No response yet</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Action Button Control Panel */}
                <div className="fixed bottom-6 right-20">
                    {/* Operation Status Notification */}
                    {operationInProgress && (
                        <div
                            className="mb-4 bg-yellow-900/90 backdrop-blur-sm border border-yellow-500/50 rounded-lg p-3 text-center animate-fade-in shadow-lg">
                            <div className="flex items-center justify-center text-yellow-300 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                Processing {operationInProgress}...
                            </div>
                        </div>
                    )}

                    {/* Error Notification */}
                    {errorState.hasError && !['permission-denied', 'not-found', 'failed-precondition', 'invalid-config'].includes(errorState.error?.code || '') && (
                        <div
                            className="mb-4 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-lg p-3 animate-fade-in shadow-lg">
                            <p className="text-red-200 text-sm text-center">
                                {errorState.error?.context || 'An error occurred'}
                            </p>
                            <button
                                onClick={() => setErrorState(prev => ({...prev, hasError: false, error: null}))}
                                className="w-full text-red-400 hover:text-red-300 underline text-xs mt-2 flex items-center justify-center"
                            >
                                <X className="w-3 h-3 mr-1"/>
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* Expanded Control Panel */}
                    {isControlPanelExpanded && (
                        <div
                            className="mb-4 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-xl p-4 shadow-2xl fab-panel max-w-sm">
                            <div className="flex flex-col gap-3">
                                {/* Primary Action Buttons */}
                                {gameState.status === 'LOBBY' && (
                                    <button
                                        onClick={handleStartQuestion}
                                        disabled={!!operationInProgress}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
                                    >
                                        {operationInProgress === 'startQuestion' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                        ) : (
                                            <Play className="w-4 h-4 mr-2"/>
                                        )}
                                        Start Question
                                    </button>
                                )}

                                {gameState.status === 'QUESTION_ACTIVE' && (
                                    <button
                                        onClick={handleRevealAnswer}
                                        disabled={!!operationInProgress}
                                        className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
                                    >
                                        {operationInProgress === 'revealAnswer' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                        ) : (
                                            <Eye className="w-4 h-4 mr-2"/>
                                        )}
                                        Reveal Answer
                                    </button>
                                )}
                                {(gameState.status === 'REVEAL_ANSWER' || gameState.status === 'LEADERBOARD') && (
                                    <div className="flex gap-2">
                                        {gameState.currentQuestionIndex > 0 && (
                                            <button
                                                onClick={handlePreviousQuestion}
                                                disabled={!!operationInProgress}
                                                className="flex-1 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-3 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg text-sm"
                                            >
                                                {operationInProgress === 'previousQuestion' ? (
                                                    <Loader2 className="w-4 h-10 animate-spin"/>
                                                ) : (
                                                    <>
                                                        <SkipBack className="w-4 h-6 mr-1"/>
                                                        Prev
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {gameState.currentQuestionIndex < QUESTIONS.length - 1 && (
                                            <button
                                                onClick={handleNextQuestion}
                                                disabled={!!operationInProgress}
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-3 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg text-sm"
                                            >
                                                {operationInProgress === 'nextQuestion' ? (
                                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                                ) : (
                                                    <>
                                                        <SkipForward className="w-4 h-4 mr-1"/>
                                                        Next
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Leaderboard Controls */}
                                {gameState.status !== 'LEADERBOARD' ? (
                                    <button
                                        onClick={handleShowLeaderboard}
                                        disabled={!!operationInProgress}
                                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
                                    >
                                        {operationInProgress === 'showLeaderboard' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                        ) : (
                                            <Trophy className="w-4 h-4 mr-2"/>
                                        )}
                                        Show Leaderboard
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleHideLeaderboard}
                                        disabled={!!operationInProgress}
                                        className="w-full bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
                                    >
                                        {operationInProgress === 'hideLeaderboard' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                        ) : (
                                            <EyeOff className="w-4 h-4 mr-2"/>
                                        )}
                                        Hide Leaderboard
                                    </button>
                                )}

                                {/* Danger Zone */}
                                <div className="pt-2 border-t border-gray-600/50">
                                    <button
                                        onClick={handleResetGame}
                                        disabled={!!operationInProgress}
                                        className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
                                    >
                                        {operationInProgress === 'resetGame' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                        ) : (
                                            <RefreshCw className="w-4 h-4 mr-2"/>
                                        )}
                                        Reset Game
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FAB Toggle Button */}
                    <button
                        onClick={() => setIsControlPanelExpanded(!isControlPanelExpanded)}
                        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full fab-button flex items-center justify-center group ${
                            isControlPanelExpanded ? 'rotate-45 scale-110' : 'hover:scale-110'
                        }`}
                    >
                        {isControlPanelExpanded ? (
                            <X className="w-6 h-6 text-white transition-transform duration-200"/>
                        ) : (
                            <Settings
                                className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200"/>
                        )}
                    </button>
                </div>
            </div>
        </ErrorBoundary>
    );
}