import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Shield,
  Send,
} from 'lucide-react';

export function PositionControls({
  currentFen,
  onUpdateFen,
}) {
  const [copied, setCopied] = useState(false);
  const [fenInput, setFenInput] = useState(currentFen || '');
  const [fenError, setFenError] = useState('');

  // Keep input synchronized with external changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setFenInput(currentFen || '');
      setFenError('');
    }, 0);
    return () => clearTimeout(timer);
  }, [currentFen]);

  // Parse FEN components
  const fenParts = (currentFen || '').split(' ');
  const piecePlacement = fenParts[0] || '8/8/8/8/8/8/8/8';
  const sideToMove = fenParts[1] || 'w';
  const castlingRights = fenParts[2] || '-';
  const enPassant = fenParts[3] || '-';
  const halfMove = fenParts[4] || '0';
  const fullMove = fenParts[5] || '1';

  const hasWhiteKingside = castlingRights.includes('K');
  const hasWhiteQueenside = castlingRights.includes('Q');
  const hasBlackKingside = castlingRights.includes('k');
  const hasBlackQueenside = castlingRights.includes('q');

  const applyFenModification = (newTurn, newCastling) => {
    const turn = newTurn !== undefined ? newTurn : sideToMove;
    let castle = newCastling !== undefined ? newCastling : castlingRights;
    if (!castle) castle = '-';

    const newFen = `${piecePlacement} ${turn} ${castle} ${enPassant} ${halfMove} ${fullMove}`;
    onUpdateFen(newFen);
  };

  const handleToggleSideToMove = (side) => {
    if (side === sideToMove) return;
    applyFenModification(side, undefined);
  };

  const handleToggleCastling = (char) => {
    let current = castlingRights === '-' ? '' : castlingRights;
    if (current.includes(char)) {
      current = current.replace(char, '');
    } else {
      const order = ['K', 'Q', 'k', 'q'];
      const set = new Set([...current.split(''), char]);
      current = order.filter((c) => set.has(c)).join('');
    }
    applyFenModification(undefined, current || '-');
  };

  const handleCopyFen = () => {
    if (currentFen) {
      navigator.clipboard.writeText(currentFen);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyCustomFen = () => {
    const trimmed = fenInput.trim();
    if (!trimmed) return;
    try {
      const parts = trimmed.split(' ');
      if (parts.length < 2) {
        const completedFen = `${parts[0]} w - - 0 1`;
        onUpdateFen(completedFen);
      } else {
        onUpdateFen(trimmed);
      }
      setFenError('');
    } catch {
      setFenError('Invalid FEN format');
    }
  };

  return (
    <div className="bg-chess-card border border-chess text-chess-primary rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col gap-3 transition-colors">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-chess">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="font-bold text-xs sm:text-sm text-chess-primary">Rules & FEN Parameters</h3>
        </div>
        <button
          onClick={handleCopyFen}
          className="btn-chess-secondary py-1 px-2 text-[11px]"
          title="Copy current FEN string to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-[var(--color-primary)]" /> : <Copy className="w-3 h-3 text-chess-secondary" />}
          <span>{copied ? 'Copied' : 'Copy FEN'}</span>
        </button>
      </div>

      {/* Side to Move Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-chess-primary flex items-center justify-between">
          <span>Active Turn:</span>
          <span className="text-[10px] text-chess-secondary">Select which side moves first</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleToggleSideToMove('w')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              sideToMove === 'w'
                ? 'nav-pill-active'
                : 'btn-chess-secondary text-chess-secondary'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400" />
            <span>White to Move</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleSideToMove('b')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              sideToMove === 'b'
                ? 'nav-pill-active'
                : 'btn-chess-secondary text-chess-secondary'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E1C1A] border border-gray-600" />
            <span>Black to Move</span>
          </button>
        </div>
      </div>

      {/* Castling Rights Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-chess-primary flex items-center justify-between">
          <span>Castling Rights:</span>
          <span className="text-[10px] font-mono text-[var(--color-primary)] bg-chess-surface px-1.5 py-0.2 rounded border border-chess">
            {castlingRights}
          </span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: 'K', label: 'White O-O', active: hasWhiteKingside },
            { key: 'Q', label: 'White O-O-O', active: hasWhiteQueenside },
            { key: 'k', label: 'Black O-O', active: hasBlackKingside },
            { key: 'q', label: 'Black O-O-O', active: hasBlackQueenside },
          ].map(({ key, label, active }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleToggleCastling(key)}
              className={`py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${
                active
                  ? 'nav-pill-active'
                  : 'btn-chess-secondary text-chess-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* FEN Input & Apply */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-chess">
        <label className="text-[11px] font-semibold text-chess-primary">
          Custom FEN String:
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={fenInput}
            onChange={(e) => setFenInput(e.target.value)}
            placeholder="Paste FEN here..."
            className="flex-1 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-chess bg-chess-surface text-chess-primary focus:outline-hidden focus:border-[var(--color-primary)]"
          />
          <button
            onClick={handleApplyCustomFen}
            className="btn-chess-primary px-3"
            title="Load this FEN onto the board"
          >
            <Send className="w-3 h-3" />
            <span>Apply</span>
          </button>
        </div>
        {fenError && <span className="text-[10px] text-rose-500 font-medium">{fenError}</span>}
      </div>
    </div>
  );
}
