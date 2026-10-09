import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  AIDifficulty,
  Game,
  GameEvent,
  GameMode,
  GameStatus,
  GameWinner,
  PlayerMark,
} from '../types/game';

const LOCAL_GAMES_PREFIX = 'tictactoe_local_game_';
const LOCAL_EVENTS_PREFIX = 'tictactoe_local_events_';

// Generates a readable 6-character game code like "X7K9P2"
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getLocalGame(gameId: string): Game | null {
  try {
    const raw = localStorage.getItem(LOCAL_GAMES_PREFIX + gameId);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setLocalGame(game: Game) {
  try {
    localStorage.setItem(LOCAL_GAMES_PREFIX + game.id, JSON.stringify(game));
    window.dispatchEvent(new CustomEvent('local_game_change', { detail: game.id }));
  } catch (e) {}
}

function getLocalEvents(gameId: string): GameEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_PREFIX + gameId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addLocalEvent(gameId: string, event: GameEvent) {
  try {
    const current = getLocalEvents(gameId);
    current.push(event);
    localStorage.setItem(LOCAL_EVENTS_PREFIX + gameId, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('local_game_change', { detail: gameId }));
  } catch (e) {}
}

export async function createGame(params: {
  userId: string;
  userName?: string | null;
  userPhoto?: string | null;
  mode: GameMode;
  aiDifficulty?: AIDifficulty;
}): Promise<Game> {
  const gameCode = generateGameCode();

  const isLocalGuest = !auth.currentUser;

  const initialGame: any = {
    id: gameCode,
    gameCode,
    creatorId: params.userId,
    creatorName: params.userName || 'Player X',
    creatorPhoto: params.userPhoto || '',
    mode: params.mode,
    aiDifficulty: params.aiDifficulty || 'hard',
    playerXId: params.userId,
    playerXName: params.userName || 'Player X',
    playerOId: params.mode === 'ai' ? 'ai' : null,
    playerOName:
      params.mode === 'ai'
        ? `Minimax AI (${params.aiDifficulty || 'hard'})`
        : null,
    status: params.mode === 'ai' ? 'in_progress' : 'waiting',
    winner: 'none',
    currentTurn: 'X',
    totalEvents: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialEventId = 'evt_0000';
  const initialEvent: any = {
    id: initialEventId,
    gameId: gameCode,
    eventNumber: 0,
    type: 'GAME_STARTED',
    playerId: params.userId,
    timestamp: new Date().toISOString(),
  };

  if (isLocalGuest) {
    setLocalGame(initialGame);
    addLocalEvent(gameCode, initialEvent);
    return initialGame;
  }

  // Cloud Firestore execution for authenticated or anonymous Firebase users
  const gameDocRef = doc(db, 'games', gameCode);
  const initialEventRef = doc(db, 'games', gameCode, 'events', initialEventId);

  const firestoreGame = {
    ...initialGame,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const firestoreEvent = {
    ...initialEvent,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(gameDocRef, firestoreGame);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `games/${gameCode}`);
  }

  try {
    await setDoc(initialEventRef, firestoreEvent);
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `games/${gameCode}/events/${initialEventId}`
    );
  }

  return initialGame;
}

export async function fetchGame(gameId: string): Promise<Game | null> {
  const cleanId = gameId.trim().toUpperCase();

  // Check local game first
  const local = getLocalGame(cleanId);
  if (local) return local;

  if (!auth.currentUser) {
    return null;
  }

  const docRef = doc(db, 'games', cleanId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Game;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `games/${cleanId}`);
  }
}

export async function joinGame(
  gameId: string,
  user: { uid: string; displayName?: string | null }
): Promise<void> {
  const cleanId = gameId.trim().toUpperCase();

  const local = getLocalGame(cleanId);
  if (local) {
    local.playerOId = user.uid;
    local.playerOName = user.displayName || 'Player O';
    local.status = 'in_progress';
    local.updatedAt = new Date().toISOString();
    setLocalGame(local);
    return;
  }

  const docRef = doc(db, 'games', cleanId);
  try {
    await updateDoc(docRef, {
      playerOId: user.uid,
      playerOName: user.displayName || 'Player O',
      status: 'in_progress',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `games/${cleanId}`);
  }
}

export async function recordMove(
  gameId: string,
  params: {
    eventNumber: number;
    turnNumber: number;
    player: PlayerMark;
    playerId: string;
    cellIndex: number;
    nextTurn: PlayerMark;
    newWinner: GameWinner;
    newStatus: GameStatus;
    totalEvents: number;
  }
): Promise<void> {
  const eventId = `evt_${String(params.eventNumber).padStart(4, '0')}`;
  const local = getLocalGame(gameId);

  if (local || !auth.currentUser) {
    const localEvent: GameEvent = {
      id: eventId,
      gameId,
      eventNumber: params.eventNumber,
      type: 'MOVE_PLAYED',
      turnNumber: params.turnNumber,
      player: params.player,
      playerId: params.playerId,
      cellIndex: params.cellIndex,
      timestamp: new Date().toISOString(),
    };
    addLocalEvent(gameId, localEvent);

    if (local) {
      local.currentTurn = params.nextTurn;
      local.status = params.newStatus;
      local.winner = params.newWinner || 'none';
      local.totalEvents = params.totalEvents;
      local.updatedAt = new Date().toISOString();
      setLocalGame(local);
    }
    return;
  }

  const eventRef = doc(db, 'games', gameId, 'events', eventId);
  const gameRef = doc(db, 'games', gameId);

  const eventPayload: any = {
    id: eventId,
    gameId,
    eventNumber: params.eventNumber,
    type: 'MOVE_PLAYED',
    turnNumber: params.turnNumber,
    player: params.player,
    playerId: params.playerId,
    cellIndex: params.cellIndex,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(eventRef, eventPayload);
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `games/${gameId}/events/${eventId}`
    );
  }

  try {
    await updateDoc(gameRef, {
      currentTurn: params.nextTurn,
      status: params.newStatus,
      winner: params.newWinner || 'none',
      totalEvents: params.totalEvents,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
  }
}

export async function recordRollback(
  gameId: string,
  params: {
    eventNumber: number;
    targetTurnNumber: number;
    playerId: string;
    currentTurn: PlayerMark;
    winner: GameWinner;
    status: GameStatus;
    totalEvents: number;
  }
): Promise<void> {
  const eventId = `evt_${String(params.eventNumber).padStart(4, '0')}`;
  const local = getLocalGame(gameId);

  if (local || !auth.currentUser) {
    const localRollbackEvent: GameEvent = {
      id: eventId,
      gameId,
      eventNumber: params.eventNumber,
      type: 'GAME_ROLLED_BACK',
      targetTurnNumber: params.targetTurnNumber,
      playerId: params.playerId,
      timestamp: new Date().toISOString(),
    };
    addLocalEvent(gameId, localRollbackEvent);

    if (local) {
      local.currentTurn = params.currentTurn;
      local.status = params.status;
      local.winner = params.winner || 'none';
      local.totalEvents = params.totalEvents;
      local.updatedAt = new Date().toISOString();
      setLocalGame(local);
    }
    return;
  }

  const eventRef = doc(db, 'games', gameId, 'events', eventId);
  const gameRef = doc(db, 'games', gameId);

  const rollbackPayload: any = {
    id: eventId,
    gameId,
    eventNumber: params.eventNumber,
    type: 'GAME_ROLLED_BACK',
    targetTurnNumber: params.targetTurnNumber,
    playerId: params.playerId,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(eventRef, rollbackPayload);
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `games/${gameId}/events/${eventId}`
    );
  }

  try {
    await updateDoc(gameRef, {
      currentTurn: params.currentTurn,
      status: params.status,
      winner: params.winner || 'none',
      totalEvents: params.totalEvents,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
  }
}

export async function recordReset(
  gameId: string,
  params: {
    eventNumber: number;
    playerId: string;
    totalEvents: number;
  }
): Promise<void> {
  const eventId = `evt_${String(params.eventNumber).padStart(4, '0')}`;
  const local = getLocalGame(gameId);

  if (local || !auth.currentUser) {
    const localResetEvent: GameEvent = {
      id: eventId,
      gameId,
      eventNumber: params.eventNumber,
      type: 'GAME_RESET',
      playerId: params.playerId,
      timestamp: new Date().toISOString(),
    };
    addLocalEvent(gameId, localResetEvent);

    if (local) {
      local.currentTurn = 'X';
      local.status = 'in_progress';
      local.winner = 'none';
      local.totalEvents = params.totalEvents;
      local.updatedAt = new Date().toISOString();
      setLocalGame(local);
    }
    return;
  }

  const eventRef = doc(db, 'games', gameId, 'events', eventId);
  const gameRef = doc(db, 'games', gameId);

  const resetPayload: any = {
    id: eventId,
    gameId,
    eventNumber: params.eventNumber,
    type: 'GAME_RESET',
    playerId: params.playerId,
    timestamp: serverTimestamp(),
  };

  try {
    await setDoc(eventRef, resetPayload);
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `games/${gameId}/events/${eventId}`
    );
  }

  try {
    await updateDoc(gameRef, {
      currentTurn: 'X',
      status: 'in_progress',
      winner: 'none',
      totalEvents: params.totalEvents,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
  }
}

export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game | null) => void,
  onError?: (err: unknown) => void
) {
  const local = getLocalGame(gameId);
  if (local || !auth.currentUser) {
    onUpdate(local);
    const listener = (e: any) => {
      if (e.detail === gameId) {
        onUpdate(getLocalGame(gameId));
      }
    };
    window.addEventListener('local_game_change', listener);
    return () => window.removeEventListener('local_game_change', listener);
  }

  const docRef = doc(db, 'games', gameId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate(snap.data() as Game);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `games/${gameId}`);
    }
  );
}

export function subscribeToGameEvents(
  gameId: string,
  onUpdate: (events: GameEvent[]) => void,
  onError?: (err: unknown) => void
) {
  const local = getLocalGame(gameId);
  if (local || !auth.currentUser) {
    onUpdate(getLocalEvents(gameId));
    const listener = (e: any) => {
      if (e.detail === gameId) {
        onUpdate(getLocalEvents(gameId));
      }
    };
    window.addEventListener('local_game_change', listener);
    return () => window.removeEventListener('local_game_change', listener);
  }

  const eventsColRef = collection(db, 'games', gameId, 'events');
  const q = query(eventsColRef, orderBy('eventNumber', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const events: GameEvent[] = [];
      snapshot.forEach((d) => {
        events.push(d.data() as GameEvent);
      });
      onUpdate(events);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `games/${gameId}/events`);
    }
  );
}

export async function getUserRecentGames(userId: string): Promise<Game[]> {
  if (!auth.currentUser) {
    return [];
  }

  const gamesRef = collection(db, 'games');
  const q = query(
    gamesRef,
    where('creatorId', '==', userId),
    limit(8)
  );

  try {
    const snap = await getDocs(q);
    const games: Game[] = [];
    snap.forEach((docSnap) => {
      games.push(docSnap.data() as Game);
    });
    return games;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'games');
  }
}
