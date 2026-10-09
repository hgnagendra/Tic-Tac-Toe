import { BoardArray, CellValue, GameWinner, PlayerMark, AIDifficulty } from '../types/game';

export const WINNING_COMBINATIONS = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

export interface WinnerResult {
  winner: GameWinner;
  line: number[] | null;
}

export function evaluateBoard(board: BoardArray): WinnerResult {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] as PlayerMark,
        line: combo,
      };
    }
  }

  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return {
      winner: 'draw',
      line: null,
    };
  }

  return {
    winner: null,
    line: null,
  };
}

export function getAvailableMoves(board: BoardArray): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      moves.push(i);
    }
  }
  return moves;
}

// Minimax algorithm without any LLM calls
function minimax(
  board: BoardArray,
  depth: number,
  isMaximizing: boolean,
  aiMark: PlayerMark,
  humanMark: PlayerMark
): number {
  const result = evaluateBoard(board);
  if (result.winner === aiMark) {
    return 10 - depth;
  }
  if (result.winner === humanMark) {
    return depth - 10;
  }
  if (result.winner === 'draw') {
    return 0;
  }

  const availableMoves = getAvailableMoves(board);

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const move of availableMoves) {
      board[move] = aiMark;
      const score = minimax(board, depth + 1, false, aiMark, humanMark);
      board[move] = null;
      bestScore = Math.max(score, bestScore);
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (const move of availableMoves) {
      board[move] = humanMark;
      const score = minimax(board, depth + 1, true, aiMark, humanMark);
      board[move] = null;
      bestScore = Math.min(score, bestScore);
    }
    return bestScore;
  }
}

export function findBestMove(
  board: BoardArray,
  aiMark: PlayerMark = 'O',
  difficulty: AIDifficulty = 'hard'
): number {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return -1;

  const humanMark: PlayerMark = aiMark === 'X' ? 'O' : 'X';

  // Easy mode: 75% random, 25% minimax
  if (difficulty === 'easy') {
    if (Math.random() < 0.75) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      return availableMoves[randomIndex];
    }
  }

  // Medium mode: 40% random/tactical, 60% minimax
  if (difficulty === 'medium') {
    // If AI can win right now, always take it
    for (const move of availableMoves) {
      board[move] = aiMark;
      if (evaluateBoard(board).winner === aiMark) {
        board[move] = null;
        return move;
      }
      board[move] = null;
    }
    // If human is about to win, 80% chance to block
    for (const move of availableMoves) {
      board[move] = humanMark;
      if (evaluateBoard(board).winner === humanMark) {
        board[move] = null;
        if (Math.random() < 0.8) {
          return move;
        }
      }
      board[move] = null;
    }

    if (Math.random() < 0.35) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      return availableMoves[randomIndex];
    }
  }

  // Hard mode: Pure optimal Minimax
  let bestScore = -Infinity;
  let bestMove = availableMoves[0];

  for (const move of availableMoves) {
    board[move] = aiMark;
    const score = minimax(board, 0, false, aiMark, humanMark);
    board[move] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
