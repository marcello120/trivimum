import {GameState, GameStatus, Player} from '@/types';

/**
 * Ensures a game state object has all required properties with safe defaults
 */
export function normalizeGameState(gameState: any): GameState {
    if (!gameState || typeof gameState !== 'object') {
        return createDefaultGameState();
    }

    // Normalize players to ensure they all have valid IDs and data
    let normalizedPlayers = {};
    if (gameState.players && typeof gameState.players === 'object') {
        normalizedPlayers = Object.entries(gameState.players).reduce((acc, [playerId, player]) => {
            if (player && typeof player === 'object') {
                // Try to sanitize the player data instead of discarding invalid players
                const sanitizedPlayer = sanitizePlayer(player);
                if (sanitizedPlayer) {
                    acc[playerId] = sanitizedPlayer;
                }
            }
            return acc;
        }, {} as Record<string, any>);
    }

    const normalized: GameState = {
        status: (gameState.status as GameStatus) || 'LOBBY',
        currentQuestionIndex: typeof gameState.currentQuestionIndex === 'number'
            ? gameState.currentQuestionIndex
            : 0,
        players: normalizedPlayers
    };

    // Only include previousStatus if it exists and is not null/undefined
    if (gameState.previousStatus && gameState.previousStatus !== null) {
        normalized.previousStatus = gameState.previousStatus;
    }

    return normalized;
}

/**
 * Sanitizes a player object by fixing invalid data
 * Returns null if the player cannot be salvaged
 */
function sanitizePlayer(player: any): Player | null {
    if (!player || typeof player !== 'object') {
        return null;
    }

    // Check required string fields
    if (typeof player.id !== 'string' || player.id.length === 0 ||
        typeof player.name !== 'string' || player.name.length === 0) {
        return null;
    }

    // Sanitize optional string fields
    const currentAnswer = typeof player.currentAnswer === 'string' ? player.currentAnswer : '';
    const liveTyping = typeof player.liveTyping === 'string' ? player.liveTyping : '';

    // Sanitize score - fix NaN or invalid scores
    let score = 0;
    if (typeof player.score === 'number' && !isNaN(player.score)) {
        score = player.score;
    }

    return {
        id: player.id,
        name: player.name,
        score,
        currentAnswer,
        liveTyping,
        manuallyCorrectAnswers: typeof player.manuallyCorrectAnswers === 'number' && !isNaN(player.manuallyCorrectAnswers) ? player.manuallyCorrectAnswers : 0,
    };
}

/**
 * Validates if a player object has all required properties
 */
function isValidPlayer(player: any): boolean {
    return (
        player &&
        typeof player === 'object' &&
        typeof player.id === 'string' &&
        player.id.length > 0 &&
        typeof player.name === 'string' &&
        player.name.length > 0 &&
        typeof player.score === 'number' &&
        !isNaN(player.score) &&  // Ensure score is not NaN
        typeof player.currentAnswer === 'string' &&
        typeof player.liveTyping === 'string'
    );
}

/**
 * Creates a default game state with all required properties
 */
export function createDefaultGameState(): GameState {
    return {
        status: 'LOBBY',
        currentQuestionIndex: 0,
        players: {}
        // previousStatus omitted when undefined
    };
}

/**
 * Safely gets player count from game state
 */
export function getPlayerCount(gameState: GameState | null): number {
    if (!gameState?.players) return 0;
    return Object.keys(gameState.players).length;
}

/**
 * Safely gets player list from game state
 * Ensures all players have valid IDs for React keys
 */
export function getPlayerList(gameState: GameState | null) {
    if (!gameState?.players) return [];

    return Object.values(gameState.players).filter((player): player is NonNullable<typeof player> => {
        // Filter out null/undefined players and ensure they have valid IDs
        console.log("players", gameState.players);
        console.log("playe", player);
        return player != null &&
            typeof player === 'object' &&
            typeof player.id === 'string' &&
            player.id.length > 0;
    });
}

/**
 * Checks if a game state is valid and complete
 */
export function isValidGameState(gameState: any): gameState is GameState {
    return (
        gameState &&
        typeof gameState === 'object' &&
        typeof gameState.status === 'string' &&
        typeof gameState.currentQuestionIndex === 'number' &&
        gameState.players &&
        typeof gameState.players === 'object'
    );
}

/**
 * Safely gets a player by ID from game state
 */
export function getPlayer(gameState: GameState | null, playerId: string) {
    if (!gameState?.players || !playerId) return null;
    return gameState.players[playerId] || null;
}

/**
 * Gets players sorted by score (highest first)
 */
export function getPlayersByScore(gameState: GameState | null) {
    const players = getPlayerList(gameState);
    return players.sort((a, b) => b.score - a.score);
}