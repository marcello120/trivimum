'use client';

import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {GameState, Player, Question} from '@/types';
import {AVAILABLE_QUIZZES, getQuizById, QUESTIONS, fetchQuizzes, fetchQuizById, initializeFirebaseQuizzes, Quiz} from '@/lib/questions';
import {checkAnswer} from '@/lib/utils';
import {ErrorBoundary} from '@/components/ErrorBoundary';
import ConnectionStatus from '@/components/ConnectionStatus';
import {PlayerGrid} from '@/components/PlayerGrid';
import {QuizSelection} from '@/components/QuizSelection';
import {QuizPreview} from '@/components/QuizPreview';
import {EditableQuizPreview} from '@/components/EditableQuizPreview';
import {ControlPanel} from '@/components/ControlPanel';
import {CurrentQuizInfo} from '@/components/CurrentQuizInfo';
import {FirebaseOperationError, safeGet, safeListener, safeSet, safeUpdate} from '@/lib/firebaseOperations';
import {ErrorState, FirebaseError} from '@/types/errors';
import {getPlayerList, normalizeGameState} from '@/lib/gameStateHelpers';
import {
    AlertTriangle,
    ChevronDown,
    Clock,
    ExternalLink,
    Eye,
    Loader2,
    MessageSquare,
    Trophy,
    Users,
    Zap
} from 'lucide-react';

function AdminPageContent() {
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
    const [localSelectedQuizId, setLocalSelectedQuizId] = useState<string | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'admin' | 'quiz-preview' | 'quiz-edit'>('admin');
    const [previewQuizId, setPreviewQuizId] = useState<string | undefined>(undefined);
    const [availableQuizzes, setAvailableQuizzes] = useState(AVAILABLE_QUIZZES); // Start with hardcoded fallback
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

    // Check authorization
    useEffect(() => {
        const code = searchParams.get('code');
        if (code === 'admin123') {
            setIsAuthorized(true);
        }
    }, [searchParams]);

    // Fetch quizzes from Firebase
    useEffect(() => {
        if (!isAuthorized) return;

        const loadQuizzes = async () => {
            setIsLoadingQuizzes(true);
            try {
                // Try to initialize Firebase quizzes first (will skip if already exists)
                await initializeFirebaseQuizzes();

                // Fetch quizzes from Firebase
                const quizzes = await fetchQuizzes();
                setAvailableQuizzes(quizzes);
            } catch (error) {
                console.error('Failed to load quizzes from Firebase, using hardcoded fallback:', error);
                // availableQuizzes is already initialized with AVAILABLE_QUIZZES as fallback
            } finally {
                setIsLoadingQuizzes(false);
            }
        };

        loadQuizzes();
    }, [isAuthorized]);

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

    // Sync local selected quiz ID with game state on initial load
    useEffect(() => {
        if (gameState && localSelectedQuizId === undefined) {
            setLocalSelectedQuizId(gameState.selectedQuizId);
        }
    }, [gameState?.selectedQuizId, localSelectedQuizId]);

    // Load current quiz when selection changes
    useEffect(() => {
        if (!localSelectedQuizId) {
            setCurrentQuiz(null);
            return;
        }

        const loadCurrentQuiz = async () => {
            try {
                const quiz = await fetchQuizById(localSelectedQuizId);
                setCurrentQuiz(quiz || null);
            } catch (error) {
                console.error('Failed to load current quiz, using hardcoded fallback:', error);
                // Fallback to hardcoded data
                const fallbackQuiz = getQuizById(localSelectedQuizId);
                setCurrentQuiz(fallbackQuiz || null);
            }
        };

        loadCurrentQuiz();
    }, [localSelectedQuizId]);

    // Load preview quiz when preview ID changes
    useEffect(() => {
        if (!previewQuizId || previewQuizId.trim() === '') {
            setPreviewQuiz(null);
            return;
        }

        const loadPreviewQuiz = async () => {
            // If we already have a preview quiz with the same ID, don't fetch again
            // This handles the case where we create a new quiz locally
            if (previewQuiz && previewQuiz.id === previewQuizId) {
                return;
            }

            try {
                const quiz = await fetchQuizById(previewQuizId);
                setPreviewQuiz(quiz || null);
            } catch (error) {
                console.error('Failed to load preview quiz, using hardcoded fallback:', error);
                // Fallback to hardcoded data
                const fallbackQuiz = getQuizById(previewQuizId);
                setPreviewQuiz(fallbackQuiz || null);
            }
        };

        loadPreviewQuiz();
    }, [previewQuizId]);

    const currentQuestions = useMemo(() =>
            currentQuiz?.questions || [],
        [currentQuiz]
    );

    const currentQuestion = useMemo(() =>
            gameState ? currentQuestions[gameState.currentQuestionIndex] : null,
        [currentQuestions, gameState?.currentQuestionIndex]
    );

    const playerList = useMemo(() =>
            getPlayerList(gameState),
        [gameState?.players]
    );

    const handleNextQuestion = useCallback(async () => {
        if (!gameState || operationInProgress) return;

        const nextIndex = gameState.currentQuestionIndex + 1;
        if (nextIndex >= currentQuestions.length) return;

        setOperationInProgress('nextQuestion');

        // Clear all player answers and manual overrides
        const updates: Record<string, any> = {};
        Object.keys(gameState.players || {}).forEach(playerId => {
            updates[`players/${playerId}/currentAnswer`] = '';
            updates[`players/${playerId}/liveTyping`] = '';
            updates[`players/${playerId}/manuallyCorrectAnswers`] = 0;
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
    }, [gameState?.currentQuestionIndex, gameState?.players, operationInProgress, currentQuestions.length]);

    const handleRevealAnswer = useCallback(async () => {
        if (!gameState || operationInProgress) return;

        const currentQuestion = currentQuestions[gameState.currentQuestionIndex];
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
                const isAutomaticallyCorrect = checkAnswer(player.currentAnswer, currentQuestion);
                const isManuallyCorrect = !!player.manuallyCorrectAnswers;
                const isCorrect = isAutomaticallyCorrect || isManuallyCorrect;

                // Ensure score is a valid number, default to 0 if NaN or not a number
                const currentScore = typeof player.score === 'number' && !isNaN(player.score) ? player.score : 0;

                updatedPlayers[playerId] = {
                    ...player,
                    score: isCorrect ? currentScore + 100 : currentScore
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
    }, [gameState?.currentQuestionIndex, operationInProgress, currentQuestions]);

    const handleShowLeaderboard = useCallback(async () => {
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
    }, [gameState?.status, operationInProgress]);

    const handleHideLeaderboard = useCallback(async () => {
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
    }, [gameState?.previousStatus, operationInProgress]);

    const handlePreviousQuestion = useCallback(async () => {
        if (!gameState || operationInProgress || gameState.currentQuestionIndex <= 0) return;

        setOperationInProgress('previousQuestion');

        const prevIndex = gameState.currentQuestionIndex - 1;

        // Clear all player answers and manual overrides
        const updates: Record<string, any> = {};
        Object.keys(gameState.players || {}).forEach(playerId => {
            updates[`players/${playerId}/currentAnswer`] = '';
            updates[`players/${playerId}/liveTyping`] = '';
            updates[`players/${playerId}/manuallyCorrectAnswers`] = 0;
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
    }, [gameState?.currentQuestionIndex, gameState?.players, operationInProgress]);

    const handleResetGame = async () => {
        if (operationInProgress) return;

        const confirmReset = confirm('Are you sure you want to reset the game? This will clear all player data.');
        if (!confirmReset) return;

        setOperationInProgress('resetGame');

        // Clear local selected quiz as well
        setLocalSelectedQuizId(undefined);

        try {
            const initialState: GameState = {
                status: 'LOBBY',
                currentQuestionIndex: 0,
                players: {}
                // selectedQuizId and previousStatus omitted - they will be undefined by default
                // Firebase doesn't accept undefined values, so we omit optional properties instead
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

    const handleSelectQuiz = useCallback((quizId: string) => {
        if (operationInProgress) return;
        setLocalSelectedQuizId(quizId || undefined);
    }, [operationInProgress]);

    const handleClearQuizSelection = useCallback(() => handleSelectQuiz(''), [handleSelectQuiz]);

    const handlePreviewQuestions = useCallback(async (quizId: string) => {
        try {
            const quiz = await fetchQuizById(quizId);
            if (quiz) {
                setPreviewQuizId(quizId);
                setViewMode('quiz-preview');
            }
        } catch (error) {
            console.error('Failed to fetch quiz for preview, using hardcoded fallback:', error);
            // Fallback to hardcoded data
            const fallbackQuiz = getQuizById(quizId);
            if (fallbackQuiz) {
                setPreviewQuizId(quizId);
                setViewMode('quiz-preview');
            }
        }
    }, []);

    const handleEditQuiz = useCallback(async (quizId: string) => {
        try {
            const quiz = await fetchQuizById(quizId);
            if (quiz) {
                setPreviewQuizId(quizId);
                setViewMode('quiz-edit');
            }
        } catch (error) {
            console.error('Failed to fetch quiz for editing, using hardcoded fallback:', error);
            // Fallback to hardcoded data
            const fallbackQuiz = getQuizById(quizId);
            if (fallbackQuiz) {
                setPreviewQuizId(quizId);
                setViewMode('quiz-edit');
            }
        }
    }, []);

    const handleCreateNewQuiz = useCallback(() => {
        // Generate a unique ID for the new quiz
        const newQuizId = `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        // Create a new empty quiz
        const newQuiz: Quiz = {
            id: newQuizId,
            title: 'New Quiz',
            description: 'A new quiz waiting to be created',
            questions: [
                {
                    id: 1,
                    text: 'Sample question - edit this text',
                    type: 'TEXT',
                    correctAnswer: ''
                }
            ]
        };

        // Set the new quiz as preview quiz and switch to edit mode
        setPreviewQuiz(newQuiz);
        setPreviewQuizId(newQuizId);
        setViewMode('quiz-edit');
    }, []);

    const handleBackToAdmin = useCallback(() => {
        setViewMode('admin');
        setPreviewQuizId(undefined);
    }, []);

    const handleStartQuestion = useCallback(async () => {
        if (!gameState || operationInProgress) return;

        setOperationInProgress('startQuestion');

        // Clear all player answers and manual overrides, start first question
        const updates: Record<string, any> = {};
        Object.keys(gameState.players || {}).forEach(playerId => {
            updates[`players/${playerId}/currentAnswer`] = '';
            updates[`players/${playerId}/liveTyping`] = '';
            updates[`players/${playerId}/manuallyCorrectAnswers`] = 0;
        });

        updates.status = 'QUESTION_ACTIVE';
        updates.previousStatus = null; // Remove the field from Firebase

        // Persist the locally selected quiz to Firebase when starting
        if (localSelectedQuizId) {
            updates.selectedQuizId = localSelectedQuizId;
            updates.currentQuestionIndex = 0; // Reset to first question
        }

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
    }, [gameState?.players, operationInProgress, localSelectedQuizId]);

    const handleManualOverride = useCallback(async (playerId: string) => {
        if (!gameState || operationInProgress) return;

        setOperationInProgress('manualOverride');

        try {
            const player = gameState.players[playerId];

            if (!player) return;

            // Set the manual override flag for this player
            // Only update the override status, don't change score here
            // Score will be calculated correctly in handleRevealAnswer
            await safeUpdate(`game/players/${playerId}`, {
                manuallyCorrectAnswers: 1
            }, {
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to manually override answer'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to manually override answer after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    }, [gameState, operationInProgress]);

    const handleRemoveOverride = useCallback(async (playerId: string) => {
        if (!gameState || operationInProgress) return;

        setOperationInProgress('removeOverride');

        try {
            const player = gameState.players[playerId];

            if (!player || !player.manuallyCorrectAnswers) return;

            // Clear the manual override flag for this player
            // Only update the override status, don't change score here
            // Score will be calculated correctly in handleRevealAnswer
            await safeUpdate(`game/players/${playerId}`, {
                manuallyCorrectAnswers: 0
            }, {
                retries: 3,
                onError: (error) => {
                    setErrorState({
                        hasError: true,
                        error: {
                            ...error,
                            context: 'Failed to remove manual override'
                        },
                        isRetrying: false,
                        retryCount: 0
                    });
                }
            });
        } catch (error) {
            if (error instanceof FirebaseOperationError) {
                console.error('Failed to remove manual override after retries:', error.firebaseError);
            }
        } finally {
            setOperationInProgress(null);
        }
    }, [gameState, operationInProgress]);


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

    // Render quiz preview view
    if (viewMode === 'quiz-preview') {
        if (previewQuiz) {
            return <QuizPreview quiz={previewQuiz} onBackToAdmin={handleBackToAdmin} />;
        } else if (previewQuizId) {
            // Show loading state while quiz is being fetched
            return (
                <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p>Loading quiz preview...</p>
                    </div>
                </div>
            );
        }
    }

    // Render quiz edit view
    if (viewMode === 'quiz-edit') {
        if (previewQuiz) {
            return <EditableQuizPreview quiz={previewQuiz} onBackToAdmin={handleBackToAdmin} />;
        } else if (previewQuizId) {
            // Show loading state while quiz is being fetched
            return (
                <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p>Loading quiz editor...</p>
                    </div>
                </div>
            );
        }
    }

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
                                    Trivimum Admin
                                </h1>
                            </div>
                            <div className="flex items-center text-gray-300">
                                <p>Question {gameState.currentQuestionIndex + 1} of {currentQuestions.length}</p>
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
                                <ChevronDown className={`w-12 h-12 text-gray-400 transition-transform duration-200 ${
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
                                                {currentQuestion.options.map((option: string, i: number) => (
                                                    <span key={i}>
                                                        <span className={
                                                            (Array.isArray(currentQuestion.correctAnswer)
                                                                ? currentQuestion.correctAnswer.some((ans: string) => ans.toLowerCase() === option.toLowerCase())
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

                {/* Quiz Selection Section */}
                {gameState.status === 'LOBBY' && !localSelectedQuizId && (
                    isLoadingQuizzes ? (
                        <div className="p-6 bg-gray-800 border-t border-gray-700">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                <p className="text-gray-400">Loading available quizzes...</p>
                            </div>
                        </div>
                    ) : (
                        <QuizSelection
                            availableQuizzes={availableQuizzes}
                            operationInProgress={operationInProgress}
                            onSelectQuiz={handleSelectQuiz}
                            onPreviewQuestions={handlePreviewQuestions}
                            onEditQuiz={handleEditQuiz}
                            onCreateNewQuiz={handleCreateNewQuiz}
                        />
                    )
                )}

                {/* Current Quiz Info */}
                {gameState.status === 'LOBBY' && localSelectedQuizId && currentQuiz && (
                    <CurrentQuizInfo
                        quiz={currentQuiz}
                        operationInProgress={operationInProgress}
                        onClearQuizSelection={handleClearQuizSelection}
                    />
                )}

                {/* Player Grid */}
                <PlayerGrid
                    players={playerList}
                    gameState={gameState}
                    currentQuestion={currentQuestion}
                    operationInProgress={operationInProgress}
                    onManualOverride={handleManualOverride}
                    onRemoveOverride={handleRemoveOverride}
                />

                {/* Floating Action Button Control Panel */}
                <ControlPanel
                    gameState={gameState}
                    currentQuestions={currentQuestions}
                    localSelectedQuizId={localSelectedQuizId}
                    operationInProgress={operationInProgress}
                    errorState={errorState}
                    isControlPanelExpanded={isControlPanelExpanded}
                    onToggleControlPanel={() => setIsControlPanelExpanded(!isControlPanelExpanded)}
                    onStartQuestion={handleStartQuestion}
                    onRevealAnswer={handleRevealAnswer}
                    onNextQuestion={handleNextQuestion}
                    onPreviousQuestion={handlePreviousQuestion}
                    onShowLeaderboard={handleShowLeaderboard}
                    onHideLeaderboard={handleHideLeaderboard}
                    onResetGame={handleResetGame}
                    onDismissError={() => setErrorState(prev => ({...prev, hasError: false, error: null}))}
                />
            </div>
        </ErrorBoundary>
    );
}

// Export memoized component to prevent unnecessary rerenders
export default memo(AdminPageContent);