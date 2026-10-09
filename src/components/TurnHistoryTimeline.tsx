import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Database,
  Clock,
  Layers,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { GameEvent, TurnSnapshot } from '../types/game';

interface TurnHistoryTimelineProps {
  snapshots: TurnSnapshot[];
  activeSnapshotIndex: number;
  onSelectSnapshot: (index: number) => void;
  onRollbackConfirm: (targetTurnNumber: number) => void;
  onFastForward: () => void;
  events: GameEvent[];
  isRollingBack: boolean;
  canRollback: boolean;
}

export const TurnHistoryTimeline: React.FC<TurnHistoryTimelineProps> = ({
  snapshots,
  activeSnapshotIndex,
  onSelectSnapshot,
  onRollbackConfirm,
  onFastForward,
  events,
  isRollingBack,
  canRollback,
}) => {
  const [showEventLog, setShowEventLog] = useState(false);
  const [confirmRollbackOpen, setConfirmRollbackOpen] = useState(false);

  const isLive = activeSnapshotIndex === snapshots.length - 1;
  const currentSnapshot = snapshots[activeSnapshotIndex] || snapshots[0];
  const totalTurns = snapshots.length - 1;

  const getPositionName = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const rows = ['Top', 'Middle', 'Bottom'];
    const cols = ['Left', 'Center', 'Right'];
    return `${rows[row]}-${cols[col]} (R${row + 1}, C${col + 1})`;
  };

  const handleTriggerRollback = () => {
    setConfirmRollbackOpen(true);
  };

  const handleExecuteRollback = () => {
    setConfirmRollbackOpen(false);
    onRollbackConfirm(currentSnapshot.turnNumber);
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Turn History & Time Travel</span>
              {!isLive && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Rewound (Turn {currentSnapshot.turnNumber} of {totalTurns})
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Reconstructed from Firestore event sourcing subcollection
            </p>
          </div>
        </div>

        {/* View toggle for raw events */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEventLog(!showEventLog)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showEventLog ? 'Hide Event Log' : 'View Event Log'}</span>
          </button>
        </div>
      </div>

      {/* Scrub Navigation Controls */}
      <div className="flex items-center justify-between gap-2 mb-3 bg-slate-950/60 p-2 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-1">
          <button
            disabled={activeSnapshotIndex === 0}
            onClick={() => onSelectSnapshot(activeSnapshotIndex - 1)}
            title="Previous Turn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:text-slate-700 hover:bg-slate-800/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 px-2 font-semibold">
            {activeSnapshotIndex === 0 ? 'Start (Empty)' : `Turn #${activeSnapshotIndex}`}
          </span>
          <button
            disabled={isLive}
            onClick={() => onSelectSnapshot(activeSnapshotIndex + 1)}
            title="Next Turn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:text-slate-700 hover:bg-slate-800/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live jump button */}
        {!isLive && (
          <button
            onClick={onFastForward}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Fast-Forward to Live</span>
          </button>
        )}
      </div>

      {/* Turn Pills Stepper */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        {snapshots.map((s, idx) => {
          const isSelected = activeSnapshotIndex === idx;
          const isCurrentLive = idx === snapshots.length - 1;

          return (
            <button
              key={s.turnNumber}
              onClick={() => onSelectSnapshot(idx)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all
                ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg shadow-cyan-500/25 scale-[1.02]'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                }
              `}
            >
              {idx === 0 ? (
                <span>Start</span>
              ) : (
                <>
                  <span
                    className={`font-bold ${
                      s.lastMove?.player === 'X' ? 'text-cyan-300' : 'text-amber-300'
                    }`}
                  >
                    {s.lastMove?.player}
                  </span>
                  <span>#{idx}</span>
                </>
              )}
              {isCurrentLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Historical Turn Inspection & Rollback Action Bar */}
      {!isLive && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>Historical Turn #{currentSnapshot.turnNumber}</span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {currentSnapshot.turnNumber === 0 ? (
                  'Match beginning state before any moves were placed.'
                ) : (
                  <>
                    Player{' '}
                    <strong className="text-white">
                      {currentSnapshot.lastMove?.player}
                    </strong>{' '}
                    placed mark at{' '}
                    <span className="font-mono text-white">
                      {currentSnapshot.lastMove?.cellIndex !== undefined &&
                        getPositionName(currentSnapshot.lastMove.cellIndex)}
                    </span>
                    . Next turn was{' '}
                    <strong className="text-white">
                      {currentSnapshot.currentTurn}
                    </strong>
                    .
                  </>
                )}
              </p>
            </div>

            {canRollback && (
              <button
                disabled={isRollingBack}
                onClick={handleTriggerRollback}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {isRollingBack
                    ? 'Rewinding...'
                    : `Roll Back Game to Turn #${currentSnapshot.turnNumber}`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Rollback */}
      {confirmRollbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Confirm Rollback</h4>
                <p className="text-xs text-slate-400">Time-travel game state</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Restoring the match to{' '}
              <strong className="text-amber-300">
                Turn #{currentSnapshot.turnNumber}
              </strong>{' '}
              will record a new <code className="text-cyan-400">GAME_ROLLED_BACK</code>{' '}
              event in Firestore. Both players will resume play from this reconstructed point.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRollbackOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRollback}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 shadow-md shadow-amber-500/25 transition-all"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Event Sourcing Subcollection Inspector */}
      {showEventLog && (
        <div className="mt-4 pt-4 border-t border-slate-800 animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Firestore Event Stream (subcollection: /events)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Total Events: {events.length}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-300 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400">
                    #{evt.eventNumber} {evt.type}
                  </span>
                  <span className="text-[10px] text-slate-500">ID: {evt.id}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                  {evt.turnNumber !== undefined && (
                    <span>Turn: #{evt.turnNumber}</span>
                  )}
                  {evt.targetTurnNumber !== undefined && (
                    <span className="text-amber-400 font-semibold">
                      Restored To Turn: #{evt.targetTurnNumber}
                    </span>
                  )}
                  {evt.player && (
                    <span>
                      Player:{' '}
                      <strong
                        className={
                          evt.player === 'X' ? 'text-cyan-400' : 'text-amber-400'
                        }
                      >
                        {evt.player}
                      </strong>
                    </span>
                  )}
                  {evt.cellIndex !== undefined && (
                    <span>Cell: #{evt.cellIndex}</span>
                  )}
                  <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    By: {evt.playerId}
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
