import {
  BoardArray,
  GameEvent,
  GameWinner,
  PlayerMark,
  ReconstructedGameState,
  TurnSnapshot,
} from '../types/game';
import { evaluateBoard } from './minimax';

export const INITIAL_EMPTY_BOARD: BoardArray = [
  null, null, null,
  null, null, null,
  null, null, null,
];

export function createInitialSnapshot(firstTurn: PlayerMark = 'X'): TurnSnapshot {
  return {
    turnNumber: 0,
    board: [...INITIAL_EMPTY_BOARD],
    currentTurn: firstTurn,
    winner: null,
    winningLine: null,
    eventOrigin: {
      id: 'init',
      gameId: '',
      eventNumber: 0,
      type: 'GAME_STARTED',
      playerId: 'system',
      timestamp: new Date(),
    },
  };
}

/**
 * Replays all game events in sequential order to produce the authoritative game state,
 * complete with turn-by-turn snapshots for time-travel and rollback.
 */
export function reconstructGameState(events: GameEvent[]): ReconstructedGameState {
  const sortedEvents = [...events].sort((a, b) => a.eventNumber - b.eventNumber);

  let currentBoard: BoardArray = [...INITIAL_EMPTY_BOARD];
  let currentTurn: PlayerMark = 'X';
  let winner: GameWinner = null;
  let winningLine: number[] | null = null;
  let turnCount = 0;
  const appliedEvents: GameEvent[] = [];

  const snapshots: TurnSnapshot[] = [createInitialSnapshot()];

  for (const event of sortedEvents) {
    appliedEvents.push(event);

    switch (event.type) {
      case 'GAME_STARTED': {
        currentBoard = [...INITIAL_EMPTY_BOARD];
        currentTurn = 'X';
        winner = null;
        winningLine = null;
        turnCount = 0;
        snapshots.length = 0;
        snapshots.push({
          turnNumber: 0,
          board: [...INITIAL_EMPTY_BOARD],
          currentTurn: 'X',
          winner: null,
          winningLine: null,
          eventOrigin: event,
        });
        break;
      }

      case 'MOVE_PLAYED': {
        if (event.cellIndex !== undefined && event.player) {
          const idx = event.cellIndex;
          if (idx >= 0 && idx < 9 && currentBoard[idx] === null) {
            currentBoard[idx] = event.player;
            const evalResult = evaluateBoard(currentBoard);
            winner = evalResult.winner;
            winningLine = evalResult.line;
            turnCount += 1;
            currentTurn = event.player === 'X' ? 'O' : 'X';

            snapshots.push({
              turnNumber: turnCount,
              board: [...currentBoard],
              currentTurn,
              winner,
              winningLine,
              lastMove: {
                player: event.player,
                cellIndex: idx,
                turnNumber: turnCount,
                timestamp: event.timestamp,
              },
              eventOrigin: event,
            });
          }
        }
        break;
      }

      case 'GAME_ROLLED_BACK': {
        const targetTurn = event.targetTurnNumber ?? 0;
        // Find corresponding snapshot at or before targetTurn
        const matched = snapshots.find((s) => s.turnNumber === targetTurn) || snapshots[0];
        currentBoard = [...matched.board];
        currentTurn = matched.currentTurn;
        winner = matched.winner;
        winningLine = matched.winningLine;
        turnCount = matched.turnNumber;

        // Prune subsequent snapshots so future moves branch cleanly from this restored turn
        const newSnapshots = snapshots.filter((s) => s.turnNumber <= targetTurn);
        snapshots.length = 0;
        snapshots.push(...newSnapshots);
        break;
      }

      case 'GAME_RESET': {
        currentBoard = [...INITIAL_EMPTY_BOARD];
        currentTurn = 'X';
        winner = null;
        winningLine = null;
        turnCount = 0;
        snapshots.length = 0;
        snapshots.push({
          turnNumber: 0,
          board: [...INITIAL_EMPTY_BOARD],
          currentTurn: 'X',
          winner: null,
          winningLine: null,
          eventOrigin: event,
        });
        break;
      }
    }
  }

  return {
    board: currentBoard,
    currentTurn,
    winner,
    winningLine,
    turnCount,
    appliedEvents,
    snapshots,
    isTerminal: winner !== null,
  };
}
