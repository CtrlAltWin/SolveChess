import React from 'react';
import { BishopLogo } from './BishopLogo';
import {
  X,
} from 'lucide-react';

export function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-chess-modal text-chess-primary border border-[#414B59] rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-colors">
        {/* Header: Persistent Dark Header with standard SolveChess logo style */}
        <div className="header-dark bg-[#272D37] border-b border-[#414B59] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BishopLogo size="md" />
            <div>
              <h2 className="text-base font-bold flex items-center tracking-tight">
                <span className="text-[var(--color-primary)] font-black">Solve</span>
                <span className="font-bold text-white">Chess</span>
                <span className="ml-1.5 font-bold text-white">Guide</span>
              </h2>
              <p className="text-[11px] text-[#AAB3C0]">Book puzzle solving & Stockfish NNUE workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-chess-secondary p-1.5 text-[#AAB3C0] hover:text-white"
            title="Close guide"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto">

        {/* Steps */}
        <div className="flex flex-col gap-4 text-xs text-chess-secondary">
          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <strong className="text-chess-primary block mb-0.5">Capture or Upload the Book Diagram</strong>
              <p className="leading-relaxed">
                Click <strong>"Scan Diagram"</strong> or drag-and-drop an image directly onto the window.
                You can also use your camera, browse photos, or press <kbd className="px-1 py-0.5 rounded bg-chess-surface border border-chess font-mono text-[10px]">Ctrl+V</kbd> to paste a screenshot.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <strong className="text-chess-primary block mb-0.5">Align the 4 Corners If Needed</strong>
              <p className="leading-relaxed">
                If the book photo was taken at an angle, drag the corner pins (TL, TR, BR, BL) to match the outer corners of the chessboard.
                The tool will perspective-correct and flatten the board.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <strong className="text-chess-primary block mb-0.5">Check Turn & Castling Rights</strong>
              <p className="leading-relaxed">
                Puzzle books specify who moves (e.g. <em>"White to play and win"</em> or <em>"Black to move"</em>).
                Click <strong>"White to Move"</strong> or <strong>"Black to Move"</strong>. Also toggle castling rights (O-O, O-O-O) if relevant.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center shrink-0 text-xs">
              4
            </span>
            <div>
              <strong className="text-chess-primary block mb-0.5">Analyze with Stockfish 19 NNUE or Solve</strong>
              <p className="leading-relaxed">
                Turn on the <strong>Stockfish NNUE</strong> engine to view the continuous Evaluation Bar, best moves, and main lines (multi-PV).
                Switch to <strong>"Solve"</strong> mode to test your moves against the computer with progressive hints and solutions!
              </p>
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div className="p-3 bg-chess-surface rounded-xl border border-chess text-xs text-chess-primary flex items-center gap-2">
          <span>💡</span>
          <span><strong>Quick tip:</strong> You can download a clean, standard <strong>.PGN file</strong> or copy it anytime from the top banner or move history!</span>
        </div>

        <button
          onClick={onClose}
          className="btn-chess-primary w-full py-2.5 text-xs font-semibold shadow-xs"
        >
          Got it, let's play!
        </button>
        </div>
      </div>
    </div>
  );
}
