import React, { useState } from 'react';
import {
  Trophy,
  HelpCircle,
  Eye,
  CheckCircle2,
  RotateCcw,
  Play,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { chessAudio } from '../../utils/chessAudio';

export function PuzzleSolver({
  game,
  turn = 'w',
  bestMove,
  bestLines = [],
  onPlayMove,
  onResetPosition,
  onSwitchToAnalysis,
}) {
  const [status, setStatus] = useState('solving'); // 'solving' | 'completed'
  const [hintLevel, setHintLevel] = useState(0); // 0 = none, 1 = from-square, 2 = full move
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Derive piece name from square
  const getPieceNameAt = (square) => {
    if (!game || !square) return '';
    try {
      const piece = game.get(square.toLowerCase());
      if (!piece) return '';
      const names = {
        p: 'Pawn',
        n: 'Knight',
        b: 'Bishop',
        r: 'Rook',
        q: 'Queen',
        k: 'King',
      };
      return names[piece.type] || '';
    } catch {
      return '';
    }
  };

  // Progressive Hint
  const handleShowHint = () => {
    if (!bestMove || bestMove.length < 4) {
      setFeedbackMsg('Analyzing best continuation... please wait a moment.');
      return;
    }
    const fromSq = bestMove.substring(0, 2).toLowerCase();
    const toSq = bestMove.substring(2, 4).toLowerCase();
    const pieceName = getPieceNameAt(fromSq);

    if (hintLevel === 0) {
      setHintLevel(1);
      setFeedbackMsg(
        pieceName
          ? `Hint 1: Focus on your ${pieceName} on ${fromSq.toUpperCase()}!`
          : `Hint 1: Focus on the piece on ${fromSq.toUpperCase()}!`
      );
    } else {
      setHintLevel(2);
      const topSan = bestLines[0]?.sanMoves?.[0]?.san;
      const moveDisplay = topSan ? `${topSan} (${fromSq.toUpperCase()} → ${toSq.toUpperCase()})` : `${fromSq.toUpperCase()} → ${toSq.toUpperCase()}`;
      setFeedbackMsg(`Hint 2: Play ${moveDisplay}`);
    }
  };

  // Show Solution
  const handleShowSolution = () => {
    if (bestLines.length > 0 && bestLines[0].sanMoves && bestLines[0].sanMoves.length > 0) {
      const solutionStr = bestLines[0].sanMoves.map((m) => `${m.prefix}${m.san}`).join(' ');
      setFeedbackMsg(`Solution: ${solutionStr}`);
      setStatus('completed');
      chessAudio.playSuccess();
    } else if (bestMove) {
      setFeedbackMsg(`Solution: ${bestMove.toUpperCase()}`);
      setStatus('completed');
    } else {
      setFeedbackMsg('Calculating solution... please wait a moment.');
    }
  };

  // Play Best Move directly on board
  const handlePlayBestMove = () => {
    if (bestMove && onPlayMove) {
      onPlayMove(bestMove);
      setStatus('completed');
      setFeedbackMsg(`Played recommended move: ${bestMove.toUpperCase()}`);
    } else {
      setFeedbackMsg('Analyzing position... move will be available shortly.');
    }
  };

  // Reset to original position
  const handleReset = () => {
    setStatus('solving');
    setHintLevel(0);
    setFeedbackMsg(null);
    if (onResetPosition) {
      onResetPosition();
    }
  };

  return (
    <div className="bg-chess-card border border-chess text-chess-primary rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col gap-3 transition-colors">
      {/* 1. Header with Title & Subtitle */}
      <div className="flex items-center justify-between pb-2.5 border-b border-chess">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-active-bg)] text-[var(--color-active-text)] flex items-center justify-center border border-[var(--color-primary)]/30">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-chess-primary">
              Solve Puzzles
            </h3>
            <p className="text-[10px] text-chess-secondary">
              Find best continuation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="btn-chess-secondary text-xs px-2.5 py-1"
          title="Reset position to start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 2. Side to Move (Clean strip without good/bad move judgments) */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-chess-surface border border-chess text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-chess-secondary">Side to play:</span>
          <span className="font-semibold text-xs text-chess-primary">
            {turn === 'w' ? 'White to start' : 'Black to start'}
          </span>
        </div>

        {status === 'completed' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-active-bg)] text-[var(--color-active-text)] border border-[var(--color-primary)]/30">
            <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
            <span>Solved</span>
          </span>
        )}
      </div>

      {/* 3. Feedback / Status Banner (Visible only when hint or solution is explicitly requested) */}
      {feedbackMsg && (
        <div
          className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
            status === 'completed'
              ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border-[var(--color-primary)]/35 font-semibold'
              : 'bg-chess-surface border-chess text-chess-primary'
          }`}
        >
          {status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
          ) : (
            <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span className="leading-tight select-text">{feedbackMsg}</span>
        </div>
      )}

      {/* 4. Solver Tools: Hint, Show Solution, Play Move, Open in Analysis */}
      <div className="flex flex-col gap-2 pt-1 border-t border-chess">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {/* Progressive Hint */}
          <button
            type="button"
            onClick={handleShowHint}
            className="btn-chess-secondary text-xs py-1.5 justify-center gap-1.5"
            title="Request progressive hint"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'Next Hint' : 'Hint Shown'}
            </span>
          </button>

          {/* Show Solution */}
          <button
            type="button"
            onClick={handleShowSolution}
            className="btn-chess-secondary text-xs py-1.5 justify-center gap-1.5"
            title="Reveal complete solution continuation"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>Show Solution</span>
          </button>

          {/* Play Best Move */}
          <button
            type="button"
            onClick={handlePlayBestMove}
            className="btn-chess-secondary text-xs py-1.5 justify-center gap-1.5 col-span-2 sm:col-span-1"
            title="Play the recommended continuation move on the board"
          >
            <Play className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
            <span>Play Move</span>
          </button>
        </div>

        {/* Open in Analysis Button */}
        {onSwitchToAnalysis && (
          <button
            type="button"
            onClick={onSwitchToAnalysis}
            className="btn-chess-tertiary text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[var(--color-primary)] hover:bg-[var(--color-active-bg)] transition-colors border border-[var(--color-primary)]/20 font-semibold"
            title="Open position in Analysis mode with Stockfish evaluation lines and evaluation bar"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Open in Analysis Mode →</span>
          </button>
        )}
      </div>
    </div>
  );
}
