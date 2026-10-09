import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { GameHeader } from './components/GameHeader';
import { GameBoard } from './components/GameBoard';
import { TurnHistoryTimeline } from './components/TurnHistoryTimeline';
import { ShareModal } from './components/ShareModal';
import {
  AIDifficulty,
  Game,
  GameEvent,
  GameMode,
  PlayerMark,
  ReconstructedGameState,
} from './types/game';
import {
  createGame,
  fetchGame,
  joinGame,
  recordMove,
  recordReset,
  recordRollback,
  subscribeToGame,
  subscribeToGameEvents,
} from './services/gameService';
import { reconstructGameState } from './utils/eventSourcing';
import { evaluateBoard, findBestMove } from './utils/minimax';
import { sounds } from './utils/soundEffects';
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react';

function TicTacToeApp() {
  const { currentUser, loading: authLoading, isSigningIn, signInWithGoogle, authError, clearAuthError } = useAuth();

  // Navigation & session state
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [rawEvents, setRawEvents] = useState<GameEvent[]>([]);
  const [loadingGame, setLoadingGame] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  // Time-travel preview snapshot index (null = viewing latest live turn)
  const [inspectedSnapshotIndex, setInspectedSnapshotIndex] = useState<number | null>(null);

  // Modals & action states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [aiIsThinking, setAiIsThinking] = useState(false);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // AI lock to prevent duplicate moves during rapid triggers
  const aiMovingRef = useRef(false);

  // 1. Check URL parameters for match code (e.g., ?game=CODE) on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('game') || params.get('join');
    if (codeFromUrl) {
      setPendingInviteCode(codeFromUrl.trim().toUpperCase());
    }
  }, []);

  // 2. Once Firebase Auth is ready, load game if user is authenticated
  useEffect(() => {
    if (authLoading) return;

    if (pendingInviteCode && currentUser) {
      loadGameByCode(pendingInviteCode);
    }
  }, [authLoading, currentUser, pendingInviteCode]);

  // 3. Strictly gate real-time subscriptions to when auth is ready and user is authenticated
  useEffect(() => {
    if (!activeGameId || !currentUser || authLoading) {
      setActiveGame(null);
      setRawEvents([]);
      return;
    }

    setLoadingGame(true);
    let unsubGame: (() => void) | null = null;
    let unsubEvents: (() => void) | null = null;

    try {
      unsubGame = subscribeToGame(
        activeGameId,
        (game) => {
          setActiveGame(game);
          setLoadingGame(false);
        },
        (err) => {
          console.error('Game subscription error:', err);
          setErrorMessage('Could not load game. Please check your match code.');
          setLoadingGame(false);
        }
      );

      unsubEvents = subscribeToGameEvents(
        activeGameId,
        (events) => {
          setRawEvents(events);
        },
        (err) => {
          console.error('Events subscription error:', err);
        }
      );
    } catch (err: any) {
      console.error('Setup subscription error', err);
      setLoadingGame(false);
    }

    return () => {
      if (unsubGame) unsubGame();
      if (unsubEvents) unsubEvents();
    };
  }, [activeGameId, currentUser, authLoading]);

  // 3. Reconstruct game state purely from events (Event Sourcing)
  const reconstructedState: ReconstructedGameState = useMemo(() => {
    return reconstructGameState(rawEvents);
  }, [rawEvents]);

  // Keep inspector snapshot synchronized with latest live state if not actively browsing history
  const activeSnapshotIndex = useMemo(() => {
    if (inspectedSnapshotIndex !== null) {
      // Clamp within current snapshots count
      return Math.min(
        inspectedSnapshotIndex,
        Math.max(0, reconstructedState.snapshots.length - 1)
      );
    }
    return Math.max(0, reconstructedState.snapshots.length - 1);
  }, [inspectedSnapshotIndex, reconstructedState.snapshots.length]);

  const activeSnapshot = reconstructedState.snapshots[activeSnapshotIndex] ||
    reconstructedState.snapshots[0];
  const isPreviewMode = activeSnapshotIndex < reconstructedState.snapshots.length - 1;

  // Trigger celebration on win
  const prevWinnerRef = useRef<string | null>(null);
  useEffect(() => {
    const currentWinner = reconstructedState.winner;
    if (currentWinner && currentWinner !== 'none' && currentWinner !== prevWinnerRef.current) {
      if (currentWinner === 'draw') {
        sounds.playDraw();
      } else {
        sounds.playWin();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }
    }
    prevWinnerRef.current = currentWinner;
  }, [reconstructedState.winner]);

  // 4. Handle AI player response move (Pure Minimax, zero LLM)
  useEffect(() => {
    if (
      !activeGame ||
      activeGame.mode !== 'ai' ||
      activeGame.status !== 'in_progress' ||
      reconstructedState.winner !== null ||
      reconstructedState.currentTurn !== 'O' ||
      aiMovingRef.current
    ) {
      return;
    }

    // AI is Player O
    aiMovingRef.current = true;
    setAiIsThinking(true);

    const timer = setTimeout(async () => {
      try {
        const boardCopy = [...reconstructedState.board];
        const aiMove = findBestMove(
          boardCopy,
          'O',
          activeGame.aiDifficulty || 'hard'
        );

        if (aiMove !== -1) {
          const nextBoard = [...reconstructedState.board];
          nextBoard[aiMove] = 'O';
          const evalResult = evaluateBoard(nextBoard);

          const nextTurn: PlayerMark = 'X';
          const newWinner = evalResult.winner;
          const newStatus = newWinner ? 'completed' : 'in_progress';

          const nextEventNumber = Math.max(rawEvents.length, activeGame.totalEvents || 0);
          const nextTurnNumber = reconstructedState.turnCount + 1;

          await recordMove(activeGame.id, {
            eventNumber: nextEventNumber,
            turnNumber: nextTurnNumber,
            player: 'O',
            playerId: 'ai',
            cellIndex: aiMove,
            nextTurn,
            newWinner,
            newStatus,
            totalEvents: nextEventNumber + 1,
          });

          sounds.playMove('O');
        }
      } catch (err) {
        console.error('Failed to commit AI move:', err);
      } finally {
        aiMovingRef.current = false;
        setAiIsThinking(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      aiMovingRef.current = false;
      setAiIsThinking(false);
    };
  }, [
    activeGame?.id,
    activeGame?.mode,
    activeGame?.status,
    activeGame?.aiDifficulty,
    reconstructedState.currentTurn,
    reconstructedState.winner,
    reconstructedState.board,
    rawEvents.length,
  ]);

  // Load game by 6-character code
  const loadGameByCode = async (code: string) => {
    if (!currentUser) {
      setPendingInviteCode(code);
      return;
    }

    setLoadingGame(true);
    setErrorMessage(null);
    try {
      const game = await fetchGame(code);
      if (!game) {
        setErrorMessage(`Game with code "${code}" was not found.`);
        setLoadingGame(false);
        return;
      }

      setActiveGameId(game.id);
      setActiveGame(game);
      setPendingInviteCode(null);
      setInspectedSnapshotIndex(null);

      // Update URL query parameter cleanly
      const newUrl = `${window.location.pathname}?game=${encodeURIComponent(game.gameCode)}`;
      window.history.replaceState(null, '', newUrl);

      // Auto-join if multiplayer and second slot is open
      if (
        currentUser &&
        game.mode === 'multiplayer' &&
        game.status === 'waiting' &&
        game.playerXId !== currentUser.uid &&
        !game.playerOId
      ) {
        await joinGame(game.id, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
        });
      }
    } catch (err: any) {
      console.error('Error fetching game:', err);
      setErrorMessage('Failed to load game. Please check your network connection.');
    } finally {
      setLoadingGame(false);
    }
  };

  // Create new game handler
  const handleCreateGame = async (mode: GameMode, difficulty: AIDifficulty = 'hard') => {
    if (!currentUser) return;
    setIsCreatingGame(true);
    setErrorMessage(null);
    try {
      const newGame = await createGame({
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Player X',
        userPhoto: currentUser.photoURL,
        mode,
        aiDifficulty: difficulty,
      });

      setActiveGameId(newGame.id);
      setActiveGame(newGame);
      setInspectedSnapshotIndex(null);

      const newUrl = `${window.location.pathname}?game=${encodeURIComponent(newGame.gameCode)}`;
      window.history.replaceState(null, '', newUrl);

      if (mode === 'multiplayer') {
        setShareModalOpen(true);
      }
    } catch (err: any) {
      console.error('Error creating game:', err);
      setErrorMessage('Could not create game. Please try again.');
    } finally {
      setIsCreatingGame(false);
    }
  };

  // Join existing game handler
  const handleJoinGame = async (gameCode: string) => {
    if (!currentUser) {
      await signInWithGoogle();
      return;
    }
    setIsJoiningGame(true);
    setErrorMessage(null);
    try {
      await loadGameByCode(gameCode);
    } finally {
      setIsJoiningGame(false);
    }
  };

  // Cell click handler
  const handleCellClick = async (cellIndex: number) => {
    if (!activeGame || !currentUser || isPreviewMode || aiIsThinking) return;

    // Check if game is already completed or waiting
    if (activeGame.status !== 'in_progress' || reconstructedState.winner !== null) {
      return;
    }

    // Determine current user mark
    const isPlayerX = currentUser.uid === activeGame.playerXId;
    const isPlayerO = currentUser.uid === activeGame.playerOId;

    if (!isPlayerX && !isPlayerO) return;

    const myMark: PlayerMark = isPlayerX ? 'X' : 'O';

    // Must be user's turn
    if (reconstructedState.currentTurn !== myMark) {
      return;
    }

    // Cell must be unoccupied
    if (reconstructedState.board[cellIndex] !== null) {
      return;
    }

    // Play move
    sounds.playMove(myMark);

    const nextBoard = [...reconstructedState.board];
    nextBoard[cellIndex] = myMark;
    const evalResult = evaluateBoard(nextBoard);

    const nextTurn: PlayerMark = myMark === 'X' ? 'O' : 'X';
    const newWinner = evalResult.winner;
    const newStatus = newWinner ? 'completed' : 'in_progress';

    const nextEventNumber = Math.max(rawEvents.length, activeGame.totalEvents || 0);
    const nextTurnNumber = reconstructedState.turnCount + 1;

    try {
      await recordMove(activeGame.id, {
        eventNumber: nextEventNumber,
        turnNumber: nextTurnNumber,
        player: myMark,
        playerId: currentUser.uid,
        cellIndex,
        nextTurn,
        newWinner,
        newStatus,
        totalEvents: nextEventNumber + 1,
      });
    } catch (err) {
      console.error('Error recording move:', err);
      setErrorMessage('Failed to save move to Firestore.');
    }
  };

  // Rollback to prior turn handler
  const handleRollback = async (targetTurnNumber: number) => {
    if (!activeGame || !currentUser || isRollingBack) return;

    // Must be participant
    const isParticipant =
      currentUser.uid === activeGame.playerXId ||
      currentUser.uid === activeGame.playerOId;

    if (!isParticipant) return;

    setIsRollingBack(true);
    sounds.playRollback();

    try {
      const targetSnapshot =
        reconstructedState.snapshots.find((s) => s.turnNumber === targetTurnNumber) ||
        reconstructedState.snapshots[0];

      const nextEventNumber = Math.max(rawEvents.length, activeGame.totalEvents || 0);

      await recordRollback(activeGame.id, {
        eventNumber: nextEventNumber,
        targetTurnNumber,
        playerId: currentUser.uid,
        currentTurn: targetSnapshot.currentTurn,
        winner: targetSnapshot.winner,
        status: targetSnapshot.winner ? 'completed' : 'in_progress',
        totalEvents: nextEventNumber + 1,
      });

      // Reset inspector to live view
      setInspectedSnapshotIndex(null);
    } catch (err) {
      console.error('Failed to rollback game:', err);
      setErrorMessage('Could not complete rollback in Firestore.');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Rematch / Reset handler
  const handleResetGame = async () => {
    if (!activeGame || !currentUser || isResetting) return;

    setIsResetting(true);
    try {
      const nextEventNumber = Math.max(rawEvents.length, activeGame.totalEvents || 0);
      await recordReset(activeGame.id, {
        eventNumber: nextEventNumber,
        playerId: currentUser.uid,
        totalEvents: nextEventNumber + 1,
      });
      setInspectedSnapshotIndex(null);
    } catch (err) {
      console.error('Failed to reset game:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Exit to lobby
  const handleReturnToLobby = () => {
    setActiveGameId(null);
    setActiveGame(null);
    setRawEvents([]);
    setInspectedSnapshotIndex(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Sound toggle
  const handleToggleSound = () => {
    const nextState = sounds.toggleSound();
    setSoundEnabled(nextState);
  };

  // Determine board disabled status
  const isBoardDisabled =
    !activeGame ||
    activeGame.status !== 'in_progress' ||
    reconstructedState.winner !== null ||
    isPreviewMode ||
    aiIsThinking ||
    (currentUser
      ? reconstructedState.currentTurn === 'X'
        ? currentUser.uid !== activeGame.playerXId
        : currentUser.uid !== activeGame.playerOId
      : true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        onNewGameClick={handleReturnToLobby}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {/* Error notification banner */}
        {(errorMessage || authError) && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-xs font-medium">
                {errorMessage || authError}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMessage(null);
                clearAuthError();
              }}
              className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Auth initialization loader */}
        {authLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Connecting to Firebase...
            </p>
          </div>
        )}

        {/* Loading game view */}
        {!authLoading && loadingGame && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Synchronizing game state from Firestore...
            </p>
          </div>
        )}

        {/* View 1: Lobby View */}
        {!authLoading && !loadingGame && !activeGame && (
          <Lobby
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
            onResumeGame={(id) => loadGameByCode(id)}
            isCreating={isCreatingGame}
            isJoining={isJoiningGame}
            initialJoinCode={pendingInviteCode || ''}
          />
        )}

        {/* View 2: Active Match View */}
        {!loadingGame && activeGame && (
          <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* Duel Header */}
            <GameHeader
              game={activeGame}
              currentTurn={reconstructedState.currentTurn}
              winner={reconstructedState.winner}
              onOpenShare={() => setShareModalOpen(true)}
              onResetGame={handleResetGame}
              isResetting={isResetting}
              currentUserUid={currentUser?.uid}
            />

            {/* Waiting for Player Banner if multiplayer */}
            {activeGame.status === 'waiting' && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Waiting for Player 2 to join...
                  </h4>
                  <p className="text-xs text-indigo-300/80">
                    Match Code:{' '}
                    <span className="font-mono font-bold text-cyan-300">
                      {activeGame.gameCode}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20"
                >
                  Share Invite Link
                </button>
              </div>
            )}

            {/* AI Thinking Indicator */}
            {aiIsThinking && (
              <div className="flex items-center justify-center gap-2 py-1 text-xs text-indigo-300 font-medium animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Minimax AI is computing optimal move...</span>
              </div>
            )}

            {/* The 3x3 Game Board */}
            <div className="py-2">
              <GameBoard
                board={activeSnapshot.board}
                onCellClick={handleCellClick}
                disabled={isBoardDisabled}
                winningLine={activeSnapshot.winningLine}
                lastMovedCellIndex={activeSnapshot.lastMove?.cellIndex}
                previewMode={isPreviewMode}
              />
            </div>

            {/* Turn History & Event Sourcing Time Machine */}
            <TurnHistoryTimeline
              snapshots={reconstructedState.snapshots}
              activeSnapshotIndex={activeSnapshotIndex}
              onSelectSnapshot={(idx) => setInspectedSnapshotIndex(idx)}
              onRollbackConfirm={handleRollback}
              onFastForward={() => setInspectedSnapshotIndex(null)}
              events={rawEvents}
              isRollingBack={isRollingBack}
              canRollback={
                Boolean(currentUser) &&
                (currentUser?.uid === activeGame.playerXId ||
                  currentUser?.uid === activeGame.playerOId)
              }
            />
          </div>
        )}
      </main>

      {/* Share Match Modal */}
      {activeGame && (
        <ShareModal
          gameCode={activeGame.gameCode}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>
          Built with Firebase Firestore event sourcing & Google Sign-In. Zero LLMs
          used in gameplay algorithms.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TicTacToeApp />
    </AuthProvider>
  );
}
