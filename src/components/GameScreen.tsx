'use client';

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {GameState, Player, Question} from '@/types';
import {Award, CheckCircle2, Loader2, Medal, Send, Star, Trophy, User, XCircle} from 'lucide-react';

interface GameScreenProps {
    gameState: GameState | null;
    currentPlayer: Player | null;
    questions: Question[];
    onUpdateLiveTyping: (text: string) => void;
    onSubmitAnswer: (answer: string) => void;
    isLoadingQuiz?: boolean;
}

function GameScreen({
                        gameState,
                        currentPlayer,
                        questions,
                        onUpdateLiveTyping,
                        onSubmitAnswer,
                        isLoadingQuiz = false
                    }: GameScreenProps) {
    const [inputValue, setInputValue] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

    // Debounce live typing updates
    const debouncedUpdateLiveTyping = useCallback(
        debounce((text: string) => onUpdateLiveTyping(text), 300),
        [onUpdateLiveTyping]
    );

    // Handle input changes for text questions
    useEffect(() => {
        if (gameState?.status === 'QUESTION_ACTIVE' && !hasSubmitted) {
            debouncedUpdateLiveTyping(inputValue);
        }
    }, [inputValue, gameState?.status, hasSubmitted, debouncedUpdateLiveTyping]);

    // Memoize current answer to avoid unnecessary effect triggers
    const currentAnswer = currentPlayer?.currentAnswer;
    const questionIndex = gameState?.currentQuestionIndex;
    const gameStatus = gameState?.status;

    // Reset submission state when question changes (but not when just changing views)
    useEffect(() => {
        if (gameStatus === 'QUESTION_ACTIVE') {
            // Only reset if we don't have a submitted answer for this question
            const hasAnswerInFirebase = currentAnswer && currentAnswer.trim() !== '';

            if (hasAnswerInFirebase) {
                // Player already submitted an answer for this question - maintain submitted state
                setHasSubmitted(true);
                setSubmittedAnswer(currentAnswer);
                setInputValue(''); // Clear input but keep submitted state
            } else {
                // No answer submitted yet - allow new input
                setHasSubmitted(false);
                setSubmittedAnswer(null);
                setInputValue('');
            }
        }
    }, [questionIndex, gameStatus, currentAnswer]);

    // Sync local submission state with Firebase state
    useEffect(() => {
        if (currentAnswer && currentAnswer.trim() !== '') {
            // Player has a submitted answer in Firebase - sync local state
            setHasSubmitted(true);
            setSubmittedAnswer(currentAnswer);
        }
    }, [currentAnswer]);

    // Memoized leaderboard data - calculated at top level to follow Rules of Hooks
    const leaderboardData = useMemo(() => {
        if (gameState?.status !== 'LEADERBOARD') return {players: [], currentPlayerRank: 0};

        const players = Object.values(gameState.players || {}).sort((a, b) => b.score - a.score);
        const currentPlayerRank = players.findIndex(p => p.id === currentPlayer?.id) + 1;

        return {players, currentPlayerRank};
    }, [gameState?.players, gameState?.status, currentPlayer?.id]);

    const handleAnswerSubmit = (answer: string) => {
        if (hasSubmitted) return;
        setHasSubmitted(true);
        setSubmittedAnswer(answer);
        onSubmitAnswer(answer);
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && !hasSubmitted) {
            handleAnswerSubmit(inputValue.trim());
        }
    };

    if (!gameState || !currentPlayer) {
        return (
            <div
                className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center animate-pulse">
                    <div
                        className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-white animate-spin"/>
                    </div>
                    <div className="text-gray-700 text-xl font-medium">Connecting...</div>
                    <div className="text-gray-500 text-sm mt-2">Please wait while we connect you to the game</div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[gameState.currentQuestionIndex];

    // Show loading state if quiz questions are being fetched
    if (isLoadingQuiz && gameState.status !== 'LOBBY') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Quiz Questions</h2>
                    <p className="text-gray-600">Please wait while we fetch the latest quiz content...</p>
                </div>
            </div>
        );
    }

    // Lobby View
    if (gameState.status === 'LOBBY') {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div
                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center max-w-md w-full transform hover:scale-105 transition-all duration-500 animate-fade-in">
                    <div className="mb-6">
                        <div className="relative">
                            <div
                                className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow shadow-lg">
                                <User className="w-8 h-8 text-white"/>
                            </div>
                            <div
                                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse">
                                <CheckCircle2 className="w-4 h-4 text-white ml-0.5 mt-0.5"/>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2 animate-fade-in-up">
                            Welcome, {currentPlayer.name}!
                        </h1>
                        <div className="flex items-center justify-center text-gray-600 mb-4">
                            <p>Waiting for the host to start the game...</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center justify-center mb-2">
                            <Trophy className="w-5 h-5 text-gray-500 mr-2"/>
                            <p className="text-sm text-gray-500">Current Score</p>
                        </div>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{currentPlayer.score}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Question Active View
    if (gameState.status === 'QUESTION_ACTIVE' && currentQuestion) {
        return (
            <div
                className="mobile-keyboard-container flex flex-col p-4 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
                <div className="flex-1 flex flex-col">
                    {/* Question Header */}
                    <div
                        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 mobile-keyboard-compact sm:mb-6 border border-indigo-100 animate-slide-down mobile-keyboard-question-header">
                        <div className="text-center">
                            <div className="flex items-center justify-center mb-3">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                                    <div className="flex items-center">
                                        <Star className="w-4 h-4 mr-2"/>
                                        Question {gameState.currentQuestionIndex + 1} of {questions.length}
                                    </div>
                                </div>
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 animate-fade-in-up">
                                {currentQuestion.text}
                            </h1>
                        </div>
                    </div>

                    {/* Answer Interface */}
                    <div
                        className="flex-1 flex items-start justify-center mobile-keyboard-compact-answers sm:pt-0 sm:items-center min-h-0">
                        {currentQuestion.type === 'MCQ' ? (
                            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                                {currentQuestion.options?.map((option, index) => {
                                    const colors = [
                                        'bg-red-500 hover:bg-red-600',
                                        'bg-blue-500 hover:bg-blue-600',
                                        'bg-yellow-500 hover:bg-yellow-600',
                                        'bg-green-500 hover:bg-green-600'
                                    ];
                                    return (
                                        <button
                                            key={`option-${index}-${option}`}
                                            onClick={() => handleAnswerSubmit(option)}
                                            disabled={hasSubmitted}
                                            className={`${
                                                hasSubmitted
                                                    ? submittedAnswer?.toLowerCase() === option?.toLowerCase()
                                                        ? 'bg-blue-600'
                                                        : 'bg-gray-400'
                                                    : colors[index]
                                            } text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none text-base sm:text-lg shadow-lg`}>
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="w-full max-w-md">
                                <form onSubmit={handleTextSubmit} className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={currentAnswer ? currentAnswer : "Type your answer..."}
                                            className="w-full px-4 sm:px-6 py-3 sm:py-4 text-lg sm:text-xl border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center mobile-text-input"
                                            disabled={hasSubmitted}
                                            maxLength={50}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim() || hasSubmitted}
                                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none text-base sm:text-lg shadow-lg mobile-submit-button"
                                    >
                                        <div className="flex items-center justify-center">
                                            {hasSubmitted ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 mr-2"/>
                                                    Answer Submitted!
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5 mr-2"/>
                                                    Submit Answer
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Answer Reveal View
    if (gameState.status === 'REVEAL_ANSWER' && currentQuestion) {
        const isCorrect = currentPlayer.currentAnswer &&
            (currentQuestion.type === 'MCQ'
                ? currentPlayer.currentAnswer === currentQuestion.correctAnswer
                : currentPlayer.manuallyCorrectAnswers === 1 || (Array.isArray(currentQuestion.correctAnswer)
                ? currentQuestion.correctAnswer.some(answer =>
                    answer.toLowerCase() === currentPlayer.currentAnswer.toLowerCase())
                : currentQuestion.correctAnswer.toLowerCase() === currentPlayer.currentAnswer.toLowerCase()));

        return (
            <div
                className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${
                    isCorrect
                        ? 'bg-gradient-to-br from-green-400 via-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-400 via-red-500 to-rose-600'
                }`}>
                <div
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center max-w-md w-full animate-scale-up border border-white/20">
                    <div className="mb-6">
                        <div
                            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce-once ${
                                isCorrect ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'
                            }`}>
                            {isCorrect ? (
                                <CheckCircle2 className="w-12 h-12 text-white"/>
                            ) : (
                                <XCircle className="w-12 h-12 text-white"/>
                            )}
                        </div>
                        <h1 className={`text-3xl font-bold mb-4 animate-fade-in-up ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {isCorrect ? 'Correct!' : 'Incorrect!'}
                        </h1>
                        <p className="text-gray-600 mb-4">
                            Your answer: <span
                            className="font-semibold">{currentPlayer.currentAnswer || 'No answer'}</span>
                        </p>
                        <p className="text-gray-600">
                            Correct answer: <span className="font-semibold">
                {Array.isArray(currentQuestion.correctAnswer)
                    ? currentQuestion.correctAnswer[0]
                    : currentQuestion.correctAnswer}
              </span>
                        </p>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Your Score</p>
                        <p className="text-3xl font-bold text-blue-600">{currentPlayer.score}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Leaderboard View
    if (gameState.status === 'LEADERBOARD') {

        return (
            <div
                className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-white to-yellow-50">
                <div
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-full max-w-md border border-amber-200 animate-scale-up">
                    <div className="text-center mb-6">
                        <div className="relative mb-4">
                            <div
                                className="w-20 h-20 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-yellow-500/50 animate-pulse-glow">
                                <Trophy className="w-10 h-10 text-white"/>
                            </div>
                            <div className="absolute -top-2 -right-6 animate-bounce">
                                <Star className="w-6 h-6 text-yellow-500 fill-current"/>
                            </div>
                            <div className="absolute -top-1 -left-6 animate-bounce delay-300">
                                <Medal className="w-5 h-5 text-amber-500 fill-current"/>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2 animate-fade-in-up">🏆 Leaderboard 🏆</h1>
                        <div
                            className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg px-4 py-2 border border-amber-200">
                            <p className="text-gray-700 font-medium">
                                <span
                                    className="text-amber-600 font-bold">#{leaderboardData.currentPlayerRank}
                                </span> of {leaderboardData.players.length}
                            </p>
                        </div>
                        <div
                            className="bg-gradient-to-r from-indigo-300 to-blue-100 rounded-lg px-4 py-2 border border-blue-300 mt-2">
                            <p className="text-gray-700 font-medium">Score: {currentPlayer.score}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {leaderboardData.players.slice(0, 10).map((player, index) => {
                            const isCurrentPlayer = player.id === currentPlayer.id;
                            const rankIcons = [
                                {icon: Trophy, color: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/50'},
                                {icon: Medal, color: 'from-gray-300 to-gray-500', shadow: 'shadow-gray-500/50'},
                                {icon: Award, color: 'from-orange-400 to-amber-600', shadow: 'shadow-orange-500/50'}
                            ];
                            const isTopThree = index < 3;

                            return (
                                <div
                                    key={player.id || `player-${index}`}
                                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-102 animate-slide-up ${
                                        isCurrentPlayer
                                            ? 'bg-gradient-to-r from-blue-50 to-indigo-100 border-2 border-blue-400 shadow-lg shadow-blue-500/25'
                                            : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:shadow-md'
                                    }`}
                                    style={{animationDelay: `${index * 100}ms`}}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="relative">
                                            {isTopThree ? (
                                                <div
                                                    className={`w-10 h-10 bg-gradient-to-br ${rankIcons[index].color} rounded-full flex items-center justify-center text-white font-bold shadow-lg ${rankIcons[index].shadow} animate-pulse-glow`}>
                                                    {React.createElement(rankIcons[index].icon, {className: "w-5 h-5"})}
                                                </div>
                                            ) : (
                                                <div
                                                    className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold border-2 border-white shadow-md">
                                                    {index + 1}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center">
                                                <p className={`font-bold ${isCurrentPlayer ? 'text-blue-800' : 'text-gray-800'}`}>
                                                    {player.name}
                                                </p>
                                                {isCurrentPlayer && (
                                                    <div
                                                        className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full animate-pulse">
                                                        <User className="w-3 h-3 inline mr-1"/>
                                                        You
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <Trophy
                                            className={`w-4 h-4 mr-2 ${isCurrentPlayer ? 'text-blue-500' : 'text-gray-400'}`}/>
                                        <div
                                            className={`font-bold text-lg ${isCurrentPlayer ? 'text-blue-600' : 'text-gray-600'}`}>
                                            {player.score}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-white text-xl">Waiting for next question...</div>
        </div>
    );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Custom comparison function for React.memo
function arePropsEqual(
    prevProps: GameScreenProps,
    nextProps: GameScreenProps
): boolean {
    // Check if functions are the same reference (important for callback optimization)
    if (prevProps.onUpdateLiveTyping !== nextProps.onUpdateLiveTyping ||
        prevProps.onSubmitAnswer !== nextProps.onSubmitAnswer) {
        return false;
    }

    // Questions array is likely static, but check reference
    if (prevProps.questions !== nextProps.questions) {
        return false;
    }

    // Deep comparison for gameState - only check relevant fields
    const prevGameState = prevProps.gameState;
    const nextGameState = nextProps.gameState;

    if (prevGameState !== nextGameState) {
        if (!prevGameState || !nextGameState) return false;

        // Check critical game state fields
        if (prevGameState.status !== nextGameState.status ||
            prevGameState.currentQuestionIndex !== nextGameState.currentQuestionIndex) {
            return false;
        }

        // For players, only trigger rerender if there are structural changes
        // or if the current player's relevant data has changed
        const prevPlayers = prevGameState.players || {};
        const nextPlayers = nextGameState.players || {};
        const playerKeys = Object.keys(nextPlayers);

        if (playerKeys.length !== Object.keys(prevPlayers).length) {
            return false; // Player count changed
        }

        // Check if current player's critical data changed
        const currentPlayerId = nextProps.currentPlayer?.id;
        if (currentPlayerId) {
            const prevPlayerData = prevPlayers[currentPlayerId];
            const nextPlayerData = nextPlayers[currentPlayerId];

            if (!prevPlayerData || !nextPlayerData) return false;

            // Only care about changes that affect rendering
            if (prevPlayerData.score !== nextPlayerData.score ||
                prevPlayerData.currentAnswer !== nextPlayerData.currentAnswer ||
                prevPlayerData.name !== nextPlayerData.name) {
                return false;
            }
        }

        // For leaderboard view, check if any player scores changed
        if (nextGameState.status === 'LEADERBOARD') {
            for (const playerId of playerKeys) {
                const prevPlayer = prevPlayers[playerId];
                const nextPlayer = nextPlayers[playerId];

                if (!prevPlayer || !nextPlayer ||
                    prevPlayer.score !== nextPlayer.score ||
                    prevPlayer.name !== nextPlayer.name) {
                    return false;
                }
            }
        }
    }

    // Check currentPlayer changes
    const prevPlayer = prevProps.currentPlayer;
    const nextPlayer = nextProps.currentPlayer;

    if (prevPlayer !== nextPlayer) {
        if (!prevPlayer || !nextPlayer) return false;

        // Only rerender if relevant player data changed
        if (prevPlayer.id !== nextPlayer.id ||
            prevPlayer.name !== nextPlayer.name ||
            prevPlayer.score !== nextPlayer.score ||
            prevPlayer.currentAnswer !== nextPlayer.currentAnswer) {
            return false;
        }
    }

    return true; // Props are functionally equivalent
}

// Export memoized component
export default memo(GameScreen, arePropsEqual);