import React from 'react';
import { GameState, Question } from '@/types';
import { ErrorState } from '@/types/errors';
import {
  Eye,
  EyeOff,
  Loader2,
  Play,
  RefreshCw,
  Settings,
  SkipBack,
  SkipForward,
  Trophy,
  X
} from 'lucide-react';

interface ControlPanelProps {
  gameState: GameState;
  currentQuestions: Question[];
  localSelectedQuizId: string | undefined;
  operationInProgress: string | null;
  errorState: ErrorState;
  isControlPanelExpanded: boolean;
  onToggleControlPanel: () => void;
  onStartQuestion: () => void;
  onRevealAnswer: () => void;
  onNextQuestion: () => void;
  onPreviousQuestion: () => void;
  onShowLeaderboard: () => void;
  onHideLeaderboard: () => void;
  onResetGame: () => void;
  onDismissError: () => void;
}

export function ControlPanel({
  gameState,
  currentQuestions,
  localSelectedQuizId,
  operationInProgress,
  errorState,
  isControlPanelExpanded,
  onToggleControlPanel,
  onStartQuestion,
  onRevealAnswer,
  onNextQuestion,
  onPreviousQuestion,
  onShowLeaderboard,
  onHideLeaderboard,
  onResetGame,
  onDismissError,
}: ControlPanelProps) {
  return (
    <div className="fixed bottom-6 right-20">
      {/* Operation Status Notification */}
      {operationInProgress && (
        <div className="mb-4 bg-yellow-900/90 backdrop-blur-sm border border-yellow-500/50 rounded-lg p-3 text-center animate-fade-in shadow-lg">
          <div className="flex items-center justify-center text-yellow-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing {operationInProgress}...
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorState.hasError && !['permission-denied', 'not-found', 'failed-precondition', 'invalid-config'].includes(errorState.error?.code || '') && (
        <div className="mb-4 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-lg p-3 animate-fade-in shadow-lg">
          <p className="text-red-200 text-sm text-center">
            {errorState.error?.context || 'An error occurred'}
          </p>
          <button
            onClick={onDismissError}
            className="w-full text-red-400 hover:text-red-300 underline text-xs mt-2 flex items-center justify-center"
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </button>
        </div>
      )}

      {/* Expanded Control Panel */}
      {isControlPanelExpanded && (
        <div className="mb-4 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-xl p-4 shadow-2xl fab-panel max-w-sm">
          <div className="flex flex-col gap-3">
            {/* Primary Action Buttons */}
            {gameState.status === 'LOBBY' && localSelectedQuizId && (
              <button
                onClick={onStartQuestion}
                disabled={!!operationInProgress}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
              >
                {operationInProgress === 'startQuestion' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Question
              </button>
            )}

            {gameState.status === 'QUESTION_ACTIVE' && (
              <button
                onClick={onRevealAnswer}
                disabled={!!operationInProgress}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
              >
                {operationInProgress === 'revealAnswer' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Reveal Answer
              </button>
            )}

            {(gameState.status === 'REVEAL_ANSWER' || gameState.status === 'LEADERBOARD') && (
              <div className="flex gap-2">
                {gameState.currentQuestionIndex > 0 && (
                  <button
                    onClick={onPreviousQuestion}
                    disabled={!!operationInProgress}
                    className="flex-1 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-3 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg text-sm"
                  >
                    {operationInProgress === 'previousQuestion' ? (
                      <Loader2 className="w-4 h-10 animate-spin" />
                    ) : (
                      <>
                        <SkipBack className="w-4 h-6 mr-1" />
                        Prev
                      </>
                    )}
                  </button>
                )}
                {gameState.currentQuestionIndex < currentQuestions.length - 1 && (
                  <button
                    onClick={onNextQuestion}
                    disabled={!!operationInProgress}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-3 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shadow-lg text-sm"
                  >
                    {operationInProgress === 'nextQuestion' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <SkipForward className="w-4 h-4 mr-1" />
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
                onClick={onShowLeaderboard}
                disabled={!!operationInProgress}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
              >
                {operationInProgress === 'showLeaderboard' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trophy className="w-4 h-4 mr-2" />
                )}
                Show Leaderboard
              </button>
            ) : (
              <button
                onClick={onHideLeaderboard}
                disabled={!!operationInProgress}
                className="w-full bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
              >
                {operationInProgress === 'hideLeaderboard' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <EyeOff className="w-4 h-4 mr-2" />
                )}
                Hide Leaderboard
              </button>
            )}

            {/* Danger Zone */}
            <div className="pt-2 border-t border-gray-600/50">
              <button
                onClick={onResetGame}
                disabled={!!operationInProgress}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg"
              >
                {operationInProgress === 'resetGame' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Reset Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Toggle Button */}
      <button
        onClick={onToggleControlPanel}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full fab-button flex items-center justify-center group ${
          isControlPanelExpanded ? 'rotate-45 scale-110' : 'hover:scale-110'
        }`}
      >
        {isControlPanelExpanded ? (
          <X className="w-6 h-6 text-white transition-transform duration-200" />
        ) : (
          <Settings className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
        )}
      </button>
    </div>
  );
}