import React, { memo } from 'react';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';

function MoveHistoryComponent({
  history = [], // array of { san, from, to }
  currentMoveIndex = -1,
  onJumpToMove,
}) {
  // Group moves into pairs (White move, Black move)
  const pairedMoves = [];
  for (let i = 0; i < history.length; i += 2) {
    pairedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: history[i],
      whiteIndex: i,
      black: history[i + 1] || null,
      blackIndex: i + 1,
    });
  }

  return (
    <div className="bg-chess-card border border-chess text-chess-primary rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col gap-2.5 transition-colors">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-chess">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="font-bold text-xs sm:text-sm text-chess-primary">Move History</h3>
        </div>
        <span className="text-[11px] font-mono text-chess-secondary">
          {history.length} {history.length === 1 ? 'ply' : 'plies'} played
        </span>
      </div>

      {/* Move list table */}
      <div className="min-h-[140px] max-h-[220px] overflow-y-auto flex flex-col gap-0.5 text-xs font-mono pr-1">
        {pairedMoves.length === 0 ? (
          <div className="py-8 text-center text-xs text-chess-secondary italic">
            No moves recorded yet. Make a move on the board to start history.
          </div>
        ) : (
          pairedMoves.map((pair) => (
            <div
              key={pair.moveNumber}
              className="flex items-center rounded-md px-2 py-1 hover:bg-chess-surface transition-colors"
            >
              <span className="w-8 text-chess-secondary font-semibold">{pair.moveNumber}.</span>
              <button
                type="button"
                onClick={() => onJumpToMove(pair.whiteIndex)}
                className={`w-20 text-left px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  currentMoveIndex === pair.whiteIndex
                    ? 'nav-pill-active font-bold'
                    : 'text-chess-primary hover:bg-chess-surface'
                }`}
              >
                {pair.white.san}
              </button>
              {pair.black ? (
                <button
                  type="button"
                  onClick={() => onJumpToMove(pair.blackIndex)}
                  className={`w-20 text-left px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    currentMoveIndex === pair.blackIndex
                      ? 'nav-pill-active font-bold'
                      : 'text-chess-primary hover:bg-chess-surface'
                  }`}
                >
                  {pair.black.san}
                </button>
              ) : (
                <span className="w-20" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Step navigation buttons */}
      <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-chess">
        <button
          onClick={() => onJumpToMove(-1)}
          disabled={currentMoveIndex < 0}
          className="btn-chess-secondary p-1.5 disabled:opacity-30"
          title="Jump to start of game"
          aria-label="Start"
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        <button
          onClick={() => onJumpToMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex < 0}
          className="btn-chess-secondary p-1.5 disabled:opacity-30"
          title="Previous move"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onJumpToMove(Math.min(history.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex >= history.length - 1}
          className="btn-chess-secondary p-1.5 disabled:opacity-30"
          title="Next move"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onJumpToMove(history.length - 1)}
          disabled={currentMoveIndex >= history.length - 1}
          className="btn-chess-secondary p-1.5 disabled:opacity-30"
          title="Jump to latest move"
          aria-label="Latest"
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export const MoveHistory = memo(MoveHistoryComponent);
