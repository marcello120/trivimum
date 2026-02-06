import React from 'react';
import { Player, Question, GameState } from '@/types';
import { checkAnswer } from '@/lib/utils';
import { Check, CheckCircle, X } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  index: number;
  gameState: GameState;
  currentQuestion: Question | null;
  operationInProgress: string | null;
  onManualOverride: (playerId: string) => void;
  onRemoveOverride: (playerId: string) => void;
}

export function PlayerCard({
  player,
  index,
  gameState,
  currentQuestion,
  operationInProgress,
  onManualOverride,
  onRemoveOverride,
}: PlayerCardProps) {
  const isAnswerManuallyOverridden = (player: Player) => {
    return !!player.manuallyCorrectAnswers;
  };

  const isAnswerAutomaticallyCorrect = (player: Player) => {
    return currentQuestion ? checkAnswer(player.currentAnswer, currentQuestion) : false;
  };

  const shouldShowManualOverrideButton = (player: Player) => {
    if (!gameState || !player.currentAnswer) return false;

    // Only show for TEXT questions
    if (!currentQuestion || currentQuestion.type !== 'TEXT') return false;

    // Show during QUESTION_ACTIVE, REVEAL_ANSWER, and LEADERBOARD phases
    if (gameState.status !== 'QUESTION_ACTIVE' && gameState.status !== 'REVEAL_ANSWER' && gameState.status !== 'LEADERBOARD') return false;

    return true;
  };

  const getBorderColor = () => {
    if (!player.currentAnswer) return 'border-gray-700';

    const isCorrect = isAnswerAutomaticallyCorrect(player) || isAnswerManuallyOverridden(player);
    return isCorrect ? 'border-green-500' : 'border-red-500';
  };

  return (
    <div key={player.id || `player-${index}`}
         className={`bg-gray-800 rounded-lg p-4 border ${getBorderColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-lg">{player.name}</h4>
        <span className="text-blue-400 font-mono">{player.score}</span>
      </div>

      <div className="space-y-2 text-sm">
        {player.currentAnswer && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-gray-400">Submitted: </span>
                <span className="text-white font-medium ml-1">{player.currentAnswer}</span>
                {isAnswerManuallyOverridden(player) && (
                  <span title="Manually marked correct">
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </span>
                )}
              </div>
            </div>

            {shouldShowManualOverrideButton(player) && (
              <div className="flex gap-1 mt-1">
                {isAnswerManuallyOverridden(player) ? (
                  <button
                    onClick={() => onRemoveOverride(player.id)}
                    disabled={!!operationInProgress}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-xs flex items-center gap-1"
                    title="Remove manual override"
                  >
                    <X className="w-3 h-3" />
                    Remove Override
                  </button>
                ) : !isAnswerAutomaticallyCorrect(player) ? (
                  <button
                    onClick={() => onManualOverride(player.id)}
                    disabled={!!operationInProgress}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-xs flex items-center gap-1"
                    title="Mark answer as correct"
                  >
                    <Check className="w-3 h-3" />
                    Mark Correct
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}

        {player.liveTyping && !player.currentAnswer && (
          <div>
            <span className="text-gray-400">Typing: </span>
            <span className="text-yellow-400 font-medium">{player.liveTyping}...</span>
          </div>
        )}

        {!player.currentAnswer && !player.liveTyping && gameState.status === 'QUESTION_ACTIVE' && (
          <div className="text-gray-500">No response yet</div>
        )}
      </div>
    </div>
  );
}