import React, { useState } from 'react';
import { BishopLogo } from '../Navigation/BishopLogo';
import { ChessPiece } from '../ChessBoard/ChessPiece';
import { Trash2, Undo, Check, X } from 'lucide-react';

export function BoardEditor({
  fen,
  onSave,
  onClose,
}) {
  // Parse 8x8 squares from FEN
  const parseFenToGrid = (fenStr) => {
    const rows = (fenStr || '8/8/8/8/8/8/8/8').split(' ')[0].split('/');
    const grid = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      const rowStr = rows[r] || '8';
      for (const char of rowStr) {
        if (!isNaN(char)) {
          const count = parseInt(char, 10);
          for (let i = 0; i < count; i++) row.push(null);
        } else {
          row.push(char);
        }
      }
      while (row.length < 8) row.push(null);
      grid.push(row.slice(0, 8));
    }
    return grid;
  };

  const gridToFenPlacement = (grid) => {
    return grid
      .map((row) => {
        let res = '';
        let empty = 0;
        for (let c = 0; c < 8; c++) {
          const val = row[c];
          if (!val) {
            empty++;
          } else {
            if (empty > 0) {
              res += empty;
              empty = 0;
            }
            res += val;
          }
        }
        if (empty > 0) res += empty;
        return res || '8';
      })
      .join('/');
  };

  const [grid, setGrid] = useState(() => parseFenToGrid(fen));
  const [selectedPiece, setSelectedPiece] = useState('P'); // 'P', 'p', 'N', etc. or null (erase)

  const handleSquareClick = (r, c) => {
    const newGrid = grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? selectedPiece : val))
    );
    setGrid(newGrid);
  };

  const handleSave = () => {
    const parts = (fen || '8/8/8/8/8/8/8/8 w - - 0 1').split(' ');
    const newPlacement = gridToFenPlacement(grid);
    const turn = parts[1] || 'w';
    const castle = parts[2] || '-';
    const ep = parts[3] || '-';
    const half = parts[4] || '0';
    const full = parts[5] || '1';

    const newFen = `${newPlacement} ${turn} ${castle} ${ep} ${half} ${full}`;
    onSave(newFen);
  };

  const whitePalette = ['K', 'Q', 'R', 'B', 'N', 'P'];
  const blackPalette = ['k', 'q', 'r', 'b', 'n', 'p'];

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-chess-modal text-chess-primary border border-[#414B59] rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-colors">
        {/* Header: Persistent Dark Header with standard SolveChess logo style */}
        <div className="header-dark bg-[#272D37] border-b border-[#414B59] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BishopLogo size="md" />
            <div>
              <h2 className="text-base font-bold flex items-center tracking-tight">
                <span className="text-[var(--color-primary)] font-black">Solve</span>
                <span className="font-bold text-white">Chess</span>
                <span className="ml-1.5 font-bold text-white">Board Editor</span>
              </h2>
              <p className="text-[11px] text-[#AAB3C0]">
                Select a piece from the palette and click any square to place it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-chess-secondary p-1.5 text-[#AAB3C0] hover:text-white"
            title="Close Editor"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto">

        {/* Piece Palette */}
        <div className="flex flex-col gap-2 bg-chess-surface p-3 rounded-xl border border-chess">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-chess-primary">White Pieces:</span>
            <span className="text-xs font-semibold text-chess-primary">Black Pieces:</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            {/* White palette */}
            <div className="flex gap-1.5">
              {whitePalette.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPiece(p)}
                  className={`w-10 h-10 rounded-lg p-1 flex items-center justify-center border transition-all cursor-pointer ${
                    selectedPiece === p
                      ? 'bg-[var(--color-active-bg)] border-2 border-[var(--color-primary)] shadow-xs scale-105'
                      : 'bg-chess-card border-chess hover:border-[var(--color-primary)]'
                  }`}
                >
                  <ChessPiece piece={p} />
                </button>
              ))}
            </div>

            {/* Eraser / Trash */}
            <button
              onClick={() => setSelectedPiece(null)}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                selectedPiece === null
                  ? 'bg-rose-500/25 border-rose-500 text-rose-500 shadow-xs'
                  : 'btn-chess-surface text-chess-secondary hover:text-chess-primary'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Erase
            </button>

            {/* Black palette */}
            <div className="flex gap-1.5">
              {blackPalette.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPiece(p)}
                  className={`w-10 h-10 rounded-lg p-1 flex items-center justify-center border transition-all cursor-pointer ${
                    selectedPiece === p
                      ? 'bg-[var(--color-active-bg)] border-2 border-[var(--color-primary)] shadow-xs scale-105'
                      : 'bg-chess-card border-chess hover:border-[var(--color-primary)]'
                  }`}
                >
                  <ChessPiece piece={p} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 8x8 Grid */}
        <div className="aspect-square max-w-[380px] w-full mx-auto grid grid-cols-8 grid-rows-8 border-2 border-chess rounded-lg overflow-hidden shadow-md">
          {grid.map((row, r) =>
            row.map((pieceChar, c) => {
              const isLight = (r + c) % 2 === 0;
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors hover:ring-2 hover:ring-[var(--color-primary)] ${
                    isLight ? 'bg-[#EEEED2]' : 'bg-[#769656]'
                  }`}
                >
                  {pieceChar && (
                    <div className="w-[85%] h-[85%]">
                      <ChessPiece piece={pieceChar} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-chess pt-3">
          <button
            onClick={() => setGrid(parseFenToGrid('8/8/8/8/8/8/8/8'))}
            className="btn-chess-surface flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          >
            <Undo className="w-4 h-4" />
            Clear Board
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn-chess-surface px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-chess-primary flex items-center gap-2 px-5 py-2 text-xs font-bold shadow-md"
            >
              <Check className="w-4 h-4" />
              Apply to Board
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
