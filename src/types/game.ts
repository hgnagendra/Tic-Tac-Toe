import { Timestamp } from 'firebase/firestore';

export type PlayerMark = 'X' | 'O';
export type GameMode = 'ai' | 'multiplayer';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameWinner = 'X' | 'O' | 'draw' | 'none' | null;

export type CellValue = PlayerMark | null;
export type BoardArray = CellValue[]; // Array of 9 cells: indices 0 to 8

export interface Game {
  id: string;
  gameCode: string;
  creatorId: string;
  creatorName?: string;
  creatorPhoto?: string;
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
  playerXId: string;
  playerXName?: string;
  playerOId?: string | null;
  playerOName?: string | null;
  status: GameStatus;
  winner?: GameWinner;
  currentTurn: PlayerMark;
  totalEvents: number;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export type GameEventType =
  | 'GAME_STARTED'
  | 'MOVE_PLAYED'
  | 'GAME_ROLLED_BACK'
  | 'GAME_RESET';

export interface GameEvent {
  id: string;
  gameId: string;
  eventNumber: number;
  type: GameEventType;
  turnNumber?: number;
  targetTurnNumber?: number;
  player?: PlayerMark;
  playerId: string;
  cellIndex?: number;
  timestamp: Timestamp | string | Date;
}

export interface TurnSnapshot {
  turnNumber: number;
  board: BoardArray;
  currentTurn: PlayerMark;
  winner: GameWinner;
  winningLine: number[] | null;
  lastMove?: {
    player: PlayerMark;
    cellIndex: number;
    turnNumber: number;
    timestamp: any;
  };
  eventOrigin: GameEvent;
}

export interface ReconstructedGameState {
  board: BoardArray;
  currentTurn: PlayerMark;
  winner: GameWinner;
  winningLine: number[] | null;
  turnCount: number;
  appliedEvents: GameEvent[];
  snapshots: TurnSnapshot[];
  isTerminal: boolean;
}
