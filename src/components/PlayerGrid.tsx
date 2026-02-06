import React from 'react';
import { Player, Question, GameState } from '@/types';
import { PlayerCard } from './PlayerCard';

interface PlayerGridProps {
  players: Player[];
  gameState: GameState;
  currentQuestion: Question | null;
  operationInProgress: string | null;
  onManualOverride: (playerId: string) => void;
  onRemoveOverride: (playerId: string) => void;
}

export function PlayerGrid({
  players,
  gameState,
  currentQuestion,
  operationInProgress,
  onManualOverride,
  onRemoveOverride,
}: PlayerGridProps) {
  return (
    <div className="p-4 flex-1 pb-20">
      <h3 className="text-xl font-bold mb-4">
        Players ({players.length})
      </h3>

      {players.length === 0 ? (
        <div className="text-center text-gray-400 mt-8">
          <p>No players connected yet.</p>
          <p className="text-sm mt-2">Players can join at the main page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map((player, index) => (
            <PlayerCard
              key={player.id || `player-${index}`}
              player={player}
              index={index}
              gameState={gameState}
              currentQuestion={currentQuestion}
              operationInProgress={operationInProgress}
              onManualOverride={onManualOverride}
              onRemoveOverride={onRemoveOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}