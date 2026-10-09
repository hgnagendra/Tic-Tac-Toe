import React from 'react';
import { Game, GameWinner, PlayerMark } from '../types/game';
import { Copy, Share2, Bot, User, Check, RefreshCw, Trophy } from 'lucide-react';

interface GameHeaderProps {
  game: Game;
  currentTurn: PlayerMark;
  winner: GameWinner;
  onOpenShare: () => void;
  onResetGame: () => void;
  isResetting: boolean;
  currentUserUid?: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  currentTurn,
  winner,
  onOpenShare,
  onResetGame,
  isResetting,
  currentUserUid,
}) => {
  const [copiedCode, setCopiedCode] = React.useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(game.gameCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {}
  };

  const isPlayerXTurn = currentTurn === 'X' && !winner;
  const isPlayerOTurn = currentTurn === 'O' && !winner;

  const isUserX = currentUserUid === game.playerXId;
  const isUserO = currentUserUid === game.playerOId;

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-xl mb-6">
      {/* Top Bar: Match Mode, Code, Share */}
      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/80">
            {game.mode === 'ai' ? (
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Bot className="w-3.5 h-3.5" />
                <span>AI Match ({game.aiDifficulty || 'hard'})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-indigo-400">
                <User className="w-3.5 h-3.5" />
                <span>Online Multiplayer</span>
              </span>
            )}
          </span>

          {game.status === 'waiting' && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              Waiting for Opponent
            </span>
          )}
        </div>

        {/* Short Code & Share Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            title="Copy match code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-cyan-400 hover:border-cyan-500/40 transition-colors"
          >
            <span>{game.gameCode}</span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            )}
          </button>

          {game.mode === 'multiplayer' && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}

          {winner && (
            <button
              disabled={isResetting}
              onClick={onResetGame}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Rematch</span>
            </button>
          )}
        </div>
      </div>

      {/* Players Duel Display */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 relative">
        {/* Player X */}
        <div
          className={`
            relative p-3.5 rounded-2xl border transition-all
            ${
              isPlayerXTurn
                ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                : 'bg-slate-950/60 border-slate-800/80 opacity-80'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-xl sm:text-2xl text-cyan-400">
                X
              </div>
              {isPlayerXTurn && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {game.playerXName || 'Player X'}
                </span>
                {isUserX && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                    You
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {winner === 'X' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner!
                  </span>
                ) : isPlayerXTurn ? (
                  <span className="text-cyan-400 font-medium">Turn to move</span>
                ) : (
                  'Waiting'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player O */}
        <div
          className={`
            relative p-3.5 rounded-2xl border transition-all
            ${
              isPlayerOTurn
                ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
                : 'bg-slate-950/60 border-slate-800/80 opacity-80'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-xl sm:text-2xl text-amber-400">
                O
              </div>
              {isPlayerOTurn && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {game.status === 'waiting'
                    ? 'Waiting for Player...'
                    : game.playerOName || 'Player O'}
                </span>
                {isUserO && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    You
                  </span>
                )}
                {game.mode === 'ai' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                    AI
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {winner === 'O' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner!
                  </span>
                ) : game.status === 'waiting' ? (
                  <button
                    onClick={onOpenShare}
                    className="text-cyan-400 hover:underline text-[11px]"
                  >
                    Send invite link
                  </button>
                ) : isPlayerOTurn ? (
                  <span className="text-amber-400 font-medium">Turn to move</span>
                ) : (
                  'Waiting'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
