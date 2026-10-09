import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Volume2, VolumeX, LogIn, LogOut, History, Sparkles, User as UserIcon, Ghost } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface NavbarProps {
  onNewGameClick: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewGameClick,
  soundEnabled,
  onToggleSound,
}) => {
  const { currentUser, isSigningIn, isGuest, signInWithGoogle, signInAsGuest, signOutUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={onNewGameClick}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                Tic-Tac-Toe
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Event-Sourced
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-1 hidden sm:block">
              Turn-by-Turn Time Travel & Minimax AI
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors border border-slate-800"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* New Game / Lobby Button */}
          {currentUser && (
            <button
              onClick={onNewGameClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Lobby
            </button>
          )}

          {/* Auth status */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-cyan-500/30 object-cover"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                      isGuest
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {isGuest ? <Ghost className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-medium text-slate-200 max-w-[120px] truncate flex items-center gap-1.5">
                    <span>{currentUser.displayName || 'Player'}</span>
                    {isGuest && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Guest
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 max-w-[120px] truncate">
                    {currentUser.email || 'Local / Guest Play'}
                  </div>
                </div>
              </div>

              {isGuest && (
                <button
                  onClick={signInWithGoogle}
                  title="Link with Google Account"
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Save Account</span>
                </button>
              )}

              <button
                onClick={signOutUser}
                title={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={isSigningIn}
                onClick={signInAsGuest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 transition-all active:scale-95 disabled:opacity-50"
              >
                <Ghost className="w-3.5 h-3.5" />
                <span>Guest Mode</span>
              </button>

              <button
                disabled={isSigningIn}
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSigningIn ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>{isSigningIn ? 'Signing in...' : 'Google'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
