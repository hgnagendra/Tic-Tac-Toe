import React from 'react';
import { BoardArray, CellValue, PlayerMark } from '../types/game';

interface GameBoardProps {
  board: BoardArray;
  onCellClick: (index: number) => void;
  disabled: boolean;
  winningLine: number[] | null;
  lastMovedCellIndex?: number;
  previewMode?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  onCellClick,
  disabled,
  winningLine,
  lastMovedCellIndex,
  previewMode = false,
}) => {
  const renderMark = (value: CellValue) => {
    if (!value) return null;

    if (value === 'X') {
      return (
        <svg
          viewBox="0 0 100 100"
          className="w-14 h-14 sm:w-20 sm:h-20 stroke-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
        >
          <line x1="20" y1="20" x2="80" y2="80" />
          <line x1="80" y1="20" x2="20" y2="80" />
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 100 100"
        className="w-14 h-14 sm:w-20 sm:h-20 stroke-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
        fill="none"
        strokeWidth="12"
        strokeLinecap="round"
      >
        <circle cx="50" cy="50" r="32" />
      </svg>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[420px] aspect-square select-none">
      {/* Visual background card */}
      <div className="absolute inset-0 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl p-3 sm:p-4">
        {/* The 3x3 Grid */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3.5 w-full h-full">
          {board.map((cell, index) => {
            const isWinningCell = winningLine?.includes(index);
            const isLastMove = lastMovedCellIndex === index;
            const canClick = !disabled && cell === null && !previewMode;

            return (
              <button
                key={index}
                type="button"
                disabled={!canClick}
                onClick={() => onCellClick(index)}
                aria-label={`Cell ${index + 1}: ${cell || 'empty'}`}
                className={`
                  relative flex items-center justify-center rounded-2xl transition-all duration-200
                  ${
                    isWinningCell
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02] z-10'
                      : isLastMove
                      ? 'bg-slate-800/90 border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'
                  }
                  ${
                    canClick
                      ? 'cursor-pointer hover:bg-slate-800/60 hover:scale-[1.03] active:scale-95 shadow-sm'
                      : 'cursor-default'
                  }
                `}
              >
                {/* Cell content */}
                <div className="transform transition-transform duration-150 animate-in zoom-in-75">
                  {renderMark(cell)}
                </div>

                {/* Subtle cell index badge in preview mode */}
                {previewMode && (
                  <span className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-600">
                    #{index}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
