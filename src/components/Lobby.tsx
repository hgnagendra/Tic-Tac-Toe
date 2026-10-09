import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  Users,
  Play,
  ArrowRight,
  ShieldAlert,
  Zap,
  Sparkles,
  LogIn,
  RotateCcw,
  Clock,
  Layers,
  Ghost,
} from 'lucide-react';
import { AIDifficulty, Game, GameMode } from '../types/game';
import { getUserRecentGames } from '../services/gameService';

interface LobbyProps {
  onCreateGame: (mode: GameMode, difficulty?: AIDifficulty) => Promise<void>;
  onJoinGame: (gameCode: string) => Promise<void>;
  onResumeGame: (gameId: string) => void;
  isCreating: boolean;
  isJoining: boolean;
  initialJoinCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateGame,
  onJoinGame,
  onResumeGame,
  isCreating,
  isJoining,
  initialJoinCode = '',
}) => {
  const { currentUser, isSigningIn, isGuest, signInWithGoogle, signInAsGuest } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('hard');
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode.toUpperCase());
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCodeInput(initialJoinCode.toUpperCase());
    }
  }, [initialJoinCode]);

  useEffect(() => {
    if (currentUser && !isGuest) {
      setLoadingRecent(true);
      getUserRecentGames(currentUser.uid)
        .then((games) => {
          setRecentGames(games);
        })
        .catch((err) => {
          console.warn('Could not load recent games', err);
        })
        .finally(() => {
          setLoadingRecent(false);
        });
    } else {
      setRecentGames([]);
    }
  }, [currentUser, isGuest]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinGame(joinCodeInput.trim().toUpperCase());
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="text-center space-y-3 pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>Event Sourcing & Turn-by-Turn Time Travel</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          Tic-Tac-Toe{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-400 bg-clip-text text-transparent">
            Reimagined
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Play against a mathematical Minimax AI or challenge a friend in live multiplayer.
          Every move is recorded as an immutable event in Firestore with instant state rollback.
        </p>

        {/* Guest Mode Status Banner */}
        {currentUser && isGuest && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <Ghost className="w-4 h-4 text-amber-400" />
            <span>
              Playing in <strong>Guest Mode</strong> ({currentUser.displayName}).
            </span>
            <button
              onClick={signInWithGoogle}
              className="ml-2 font-bold underline hover:text-white transition-colors"
            >
              Sign in with Google to save history
            </button>
          </div>
        )}

        {!currentUser && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              disabled={isSigningIn}
              onClick={signInAsGuest}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Ghost className="w-4 h-4" />
              <span>Play as Guest (Instant)</span>
            </button>

            <button
              disabled={isSigningIn}
              onClick={signInWithGoogle}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xl shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSigningIn ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isSigningIn ? 'Opening Google Sign-In...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Game Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Player AI Card */}
        <div className="relative bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                Minimax Algorithm
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-1.5">
              Play vs Minimax AI
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Challenge pure mathematical decision-making. No external LLMs—powered by
              classic recursive tree search.
            </p>

            {/* Difficulty choices */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Select Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'easy', label: 'Easy', icon: Zap, desc: 'Casual' },
                  { id: 'medium', label: 'Medium', icon: Sparkles, desc: 'Smart' },
                  { id: 'hard', label: 'Unbeatable', icon: ShieldAlert, desc: 'Master' },
                ].map((diff) => {
                  const Icon = diff.icon;
                  const isSelected = selectedDifficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.id as AIDifficulty)}
                      className={`
                        p-3 rounded-2xl border text-left transition-all
                        ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }
                      `}
                    >
                      <Icon
                        className={`w-4 h-4 mb-1.5 ${
                          isSelected ? 'text-cyan-400' : 'text-slate-500'
                        }`}
                      />
                      <div className="text-xs font-bold leading-none">{diff.label}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{diff.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            disabled={isCreating}
            onClick={async () => {
              if (!currentUser) {
                await signInAsGuest();
              }
              onCreateGame('ai', selectedDifficulty);
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isCreating ? 'Setting up Match...' : 'Start Match vs AI'}</span>
          </button>
        </div>

        {/* Multiplayer Card */}
        <div className="relative bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                Peer-to-Peer
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-1.5">
              Online Multiplayer
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Create a match and share the 6-character code or link with a friend to play
              turn-by-turn with live sync.
            </p>

            {/* Host Game Button */}
            <div className="mb-6">
              <button
                disabled={isCreating}
                onClick={() => {
                  if (!currentUser) {
                    signInWithGoogle();
                    return;
                  }
                  onCreateGame('multiplayer');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Host New Match (Generate Code)</span>
              </button>
            </div>

            {/* Join with Code Form */}
            <form onSubmit={handleJoinSubmit} className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Or Join With Match Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. X7K9P2"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-center tracking-widest uppercase placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="px-5 py-2.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Instant link sharing supported</span>
            <span>Real-time Firebase Firestore</span>
          </div>
        </div>
      </div>

      {/* Recent Matches Section */}
      {currentUser && recentGames.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Your Recent Matches</h3>
            </div>
            <span className="text-xs text-slate-500">{recentGames.length} matches</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentGames.map((g) => (
              <div
                key={g.id}
                onClick={() => onResumeGame(g.id)}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.01] group"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold text-cyan-400">
                    {g.gameCode}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      g.status === 'in_progress'
                        ? 'bg-amber-500/10 text-amber-300'
                        : g.status === 'waiting'
                        ? 'bg-blue-500/10 text-blue-300'
                        : 'bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {g.status}
                  </span>
                </div>
                <div className="text-xs text-slate-300 truncate">
                  vs {g.playerOName || (g.mode === 'ai' ? 'AI' : 'Waiting...')}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{g.mode === 'ai' ? 'Minimax AI' : 'Multiplayer'}</span>
                  <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Resume</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
