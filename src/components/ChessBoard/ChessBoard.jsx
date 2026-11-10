import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { ChessPiece } from './ChessPiece';
import { chessAudio } from '../../utils/chessAudio';

const THEMES = {
  emerald: {
    name: 'Neo Green',
    light: '#EEEED2',
    dark: '#769656',
  },
  wood: {
    name: 'Classic Wood',
    light: '#f0d9b5',
    dark: '#b58863',
  },
  blue: {
    name: 'Slate Blue',
    light: '#dee3e6',
    dark: '#8ca2ad',
  },
  modern: {
    name: 'Neutral Dark',
    light: '#F0F1F2',
    dark: '#4B4846',
  },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function ChessBoardComponent({
  game, // Chess instance from chess.js
  onMove, // callback (move) => {}
  orientation = 'white', // 'white' or 'black'
  bestMove = null, // e.g. "e2e4" from engine
  showBestMoveArrow = true,
  lastMove = null, // { from: 'e2', to: 'e4' }
  interactive = true,
  theme = 'emerald',
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [promotionPending, setPromotionPending] = useState(null); // { from, to }

  const boardRef = useRef(null);

  const colors = THEMES[theme] || THEMES.emerald;

  const displayedFiles = orientation === 'white' ? FILES : [...FILES].reverse();
  const displayedRanks = orientation === 'white' ? RANKS : [...RANKS].reverse();

  // Find King in check square
  const inCheckSquare = useMemo(() => {
    if (!game || !game.inCheck()) return null;
    const turn = game.turn();
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${FILES[c]}${8 - r}`;
        }
      }
    }
    return null;
  }, [game]);

  // Compute legal moves for selected square
  const updateLegalMoves = useCallback((square) => {
    if (!game || !square) {
      setLegalMoves([]);
      return;
    }
    try {
      const moves = game.moves({ square, verbose: true });
      setLegalMoves(moves);
    } catch {
      setLegalMoves([]);
    }
  }, [game]);

  const executeMove = useCallback(({ from, to, promotion = 'q' }) => {
    try {
      const moveObj = game.move({ from, to, promotion });
      if (moveObj) {
        // Play Chess.com sound matching event
        if (game.isCheckmate()) {
          chessAudio.playSuccess();
        } else if (game.inCheck()) {
          chessAudio.playCheck();
        } else if (moveObj.captured) {
          chessAudio.playCapture();
        } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
          chessAudio.playCastle();
        } else if (moveObj.flags.includes('p')) {
          chessAudio.playPromote();
        } else {
          chessAudio.playMove();
        }

        if (onMove) {
          onMove(moveObj);
        }
      }
    } catch (err) {
      console.warn('Illegal move attempted:', err);
      chessAudio.playError();
    } finally {
      setSelectedSquare(null);
      setLegalMoves([]);
      setPromotionPending(null);
    }
  }, [game, onMove]);

  const attemptMove = useCallback((from, to) => {
    const piece = game.get(from);
    if (!piece) return;

    // Check if this is a pawn promotion move
    const isPawnPromotion =
      piece.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPawnPromotion) {
      setPromotionPending({ from, to, color: piece.color });
      return;
    }

    executeMove({ from, to });
  }, [game, executeMove]);

  const handleSquareClick = (square) => {
    if (!interactive) return;

    if (promotionPending) return;

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const matchedMove = legalMoves.find((m) => m.to === square);
    if (matchedMove) {
      attemptMove(matchedMove.from, matchedMove.to);
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      updateLegalMoves(square);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Drag and drop handlers
  const handleMouseDown = (e, square) => {
    if (!interactive || e.button !== 0) return;
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setDraggedSquare(square);
      setSelectedSquare(square);
      updateLegalMoves(square);
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleTouchStart = (e, square) => {
    if (!interactive) return;
    const touch = e.touches[0];
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setDraggedSquare(square);
      setSelectedSquare(square);
      updateLegalMoves(square);
      setDragPos({ x: touch.clientX, y: touch.clientY });
    }
  };

  // Window-level mouse/touch move and up listeners while dragging
  useEffect(() => {
    if (!draggedSquare) return;

    const handleMouseMove = (e) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e) => {
      if (e.touches[0]) {
        setDragPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    const handleEnd = (clientX, clientY) => {
      if (!boardRef.current) {
        setDraggedSquare(null);
        return;
      }

      const rect = boardRef.current.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const squareWidth = rect.width / 8;
        const squareHeight = rect.height / 8;

        const colIndex = Math.floor((clientX - rect.left) / squareWidth);
        const rowIndex = Math.floor((clientY - rect.top) / squareHeight);

        if (colIndex >= 0 && colIndex < 8 && rowIndex >= 0 && rowIndex < 8) {
          const targetSquare = `${displayedFiles[colIndex]}${displayedRanks[rowIndex]}`;
          if (targetSquare !== draggedSquare) {
            const matched = legalMoves.find((m) => m.to === targetSquare);
            if (matched) {
              attemptMove(draggedSquare, targetSquare);
            }
          }
        }
      }
      setDraggedSquare(null);
    };

    const onMouseUp = (e) => handleEnd(e.clientX, e.clientY);
    const onTouchEnd = (e) => {
      if (e.changedTouches[0]) {
        handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      } else {
        setDraggedSquare(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [draggedSquare, legalMoves, displayedFiles, displayedRanks, attemptMove]);

  // Convert square coordinates (e.g. "e2") to board percentage { x, y }
  const getSquareCenterPercent = useCallback((square) => {
    if (!square || square.length < 2) return { x: 50, y: 50 };
    const f = square[0];
    const r = square[1];
    const col = displayedFiles.indexOf(f);
    const row = displayedRanks.indexOf(r);
    if (col === -1 || row === -1) return { x: 50, y: 50 };
    return {
      x: col * 12.5 + 6.25,
      y: row * 12.5 + 6.25,
    };
  }, [displayedFiles, displayedRanks]);

  // Best move arrow coordinates
  const arrowCoordinates = useMemo(() => {
    if (!showBestMoveArrow || !bestMove || bestMove.length < 4) return null;
    const from = bestMove.substring(0, 2);
    const to = bestMove.substring(2, 4);
    const p1 = getSquareCenterPercent(from);
    const p2 = getSquareCenterPercent(to);
    return { from, to, p1, p2 };
  }, [showBestMoveArrow, bestMove, getSquareCenterPercent]);

  return (
    <div className="relative select-none touch-none aspect-square w-full max-w-[360px] sm:max-w-[400px] lg:max-w-[min(430px,calc(100vh-210px))] mx-auto rounded-xl shadow-md overflow-hidden border-2 border-chess bg-chess-card">
      {/* 8x8 Board Grid */}
      <div ref={boardRef} className="w-full h-full grid grid-cols-8 grid-rows-8 relative">
        {displayedRanks.map((rank, rowIdx) =>
          displayedFiles.map((file, colIdx) => {
            const square = `${file}${rank}`;
            const isLight = (colIdx + rowIdx) % 2 === 0;
            const piece = game ? game.get(square) : null;
            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove && lastMove.from === square;
            const isLastMoveTo = lastMove && lastMove.to === square;
            const isInCheck = inCheckSquare === square;
            const isLegalDest = legalMoves.some((m) => m.to === square);
            const isCapture = isLegalDest && piece !== null;
            const isBeingDragged = draggedSquare === square;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onMouseDown={(e) => handleMouseDown(e, square)}
                onTouchStart={(e) => handleTouchStart(e, square)}
                style={{ backgroundColor: isLight ? colors.light : colors.dark }}
                className="relative flex items-center justify-center cursor-pointer transition-colors duration-75"
              >
                {/* Chess.com Authentic Last Move Highlight */}
                {(isLastMoveFrom || isLastMoveTo) && (
                  <div className="absolute inset-0 bg-[#bbcb44]/60 pointer-events-none" />
                )}

                {/* Chess.com Authentic Selected Square Highlight */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#baca2b]/70 ring-2 ring-inset ring-[#baca2b] pointer-events-none" />
                )}

                {/* Check warning pulse */}
                {isInCheck && (
                  <div className="absolute inset-0 bg-[#eb4747]/65 animate-pulse pointer-events-none" />
                )}

                {/* File coordinate notation (bottom row) */}
                {rowIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-bold leading-none pointer-events-none select-none opacity-85 ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Rank coordinate notation (left column) */}
                {colIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-bold leading-none pointer-events-none select-none opacity-85 ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {rank}
                  </span>
                )}

                {/* Piece representation */}
                {piece && (
                  <div
                    className={`w-[86%] h-[86%] flex items-center justify-center transition-transform ${
                      isBeingDragged ? 'opacity-25 scale-90' : 'opacity-100 hover:scale-105'
                    }`}
                  >
                    <ChessPiece piece={piece} />
                  </div>
                )}

                {/* Legal Move indicator: Small Dot for quiet move, Ring for capture */}
                {isLegalDest && !isCapture && (
                  <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black/20 ring-2 ring-white/30 pointer-events-none" />
                )}
                {isLegalDest && isCapture && (
                  <div className="absolute inset-1 rounded-full border-4 border-black/25 pointer-events-none" />
                )}
              </div>
            );
          })
        )}

        {/* SVG Overlay for Best Move Arrows */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrow-stockfish"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--color-primary, #3978D4)" />
            </marker>
          </defs>

          {arrowCoordinates && (
            <line
              x1={arrowCoordinates.p1.x}
              y1={arrowCoordinates.p1.y}
              x2={arrowCoordinates.p2.x}
              y2={arrowCoordinates.p2.y}
              stroke="var(--color-primary, #3978D4)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeOpacity="0.9"
              markerEnd="url(#arrow-stockfish)"
            />
          )}
        </svg>

        {/* Floating Ghost Piece while dragging */}
        {draggedSquare && (
          <div
            className="fixed pointer-events-none z-50 w-14 h-14 sm:w-16 sm:h-16 -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
            style={{
              left: `${dragPos.x}px`,
              top: `${dragPos.y}px`,
            }}
          >
            <ChessPiece piece={game.get(draggedSquare)} />
          </div>
        )}

        {/* Pawn Promotion Modal */}
        {promotionPending && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-30 p-4">
            <div className="bg-chess-modal border-2 border-chess p-3 sm:p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2.5">
              <span className="text-xs sm:text-sm font-semibold text-chess-primary">Promote pawn to:</span>
              <div className="flex gap-2">
                {['q', 'r', 'b', 'n'].map((pType) => (
                  <button
                    key={pType}
                    onClick={() =>
                      executeMove({
                        from: promotionPending.from,
                        to: promotionPending.to,
                        promotion: pType,
                      })
                    }
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-chess-surface hover:border-[var(--color-primary)] border border-chess rounded-lg p-2 transition-all flex items-center justify-center hover:scale-110 cursor-pointer"
                  >
                    <ChessPiece piece={{ type: pType, color: promotionPending.color }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const ChessBoard = memo(ChessBoardComponent);
