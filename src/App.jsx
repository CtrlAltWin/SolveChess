import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navigation/Navbar';
import { ChessBoard } from './components/ChessBoard/ChessBoard';
import { EvalBar } from './components/ChessBoard/EvalBar';
import { EngineLines } from './components/EnginePanel/EngineLines';
import { PositionControls } from './components/PositionControls/PositionControls';
import { BoardEditor } from './components/PositionControls/BoardEditor';
import { ChessScanner } from './components/Scanner/ChessScanner';
import { PuzzleSolver } from './components/PuzzleSolver/PuzzleSolver';
import { MoveHistory } from './components/ChessBoard/MoveHistory';
import { HelpModal } from './components/Navigation/HelpModal';
import { stockfishService } from './services/stockfishService';
import { chessAudio } from './utils/chessAudio';
import { generatePgn, downloadPgnFile, copyPgnToClipboard } from './utils/pgnExport';
import {
  RotateCcw,
  ArrowRightLeft,
  Download,
  Copy,
  Check,
  Upload,
  Cpu,
  History,
  Sliders,
  Trophy,
} from 'lucide-react';

// Exact standard starting position per specification
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function App() {
  // Theme mode: Default to 'light' per specification
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('chess_theme_mode') || 'light';
  });

  // Global drag-and-drop state
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);

  // Chess instance state: starts in standard starting position
  const [fen, setFen] = useState(STARTING_FEN);
  const [initialFen, setInitialFen] = useState(STARTING_FEN);
  const [puzzleCaption, setPuzzleCaption] = useState('');
  const [orientation, setOrientation] = useState('white');
  // Default board theme: 'modern' (Neutral Dark) per specification
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chess_board_theme') || 'modern';
  });
  const [isMuted, setIsMuted] = useState(false);
  const [activeMode, setActiveMode] = useState('analysis'); // 'analysis' | 'solver'

  // Right panel active tab: 'main' (Engine in Analysis, Solve in Solve mode) | 'moves' | 'rules'
  const [analysisTab, setAnalysisTab] = useState('main');

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedBannerPgn, setCopiedBannerPgn] = useState(false);

  // Move history
  const [moveHistory, setMoveHistory] = useState([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  // Stockfish is OFF by default per specification
  const [isEngineOn, setIsEngineOn] = useState(false);
  const [multiPv, setMultiPv] = useState(2);
  const [engineData, setEngineData] = useState({
    status: 'paused',
    depth: 0,
    nps: 0,
    bestMove: null,
    whiteScoreCp: 0,
    evalText: '0.0',
    winChance: 50,
    lines: [],
    isSearching: false,
  });

  // Single source of truth for the chessboard state
  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess(STARTING_FEN);
    }
  }, [fen]);

  // Terminal state evaluation (Guarantees checkmate is NEVER 50%)
  const { isCheckmate, isDraw, terminalEvalText, terminalWinChance, terminalWhiteScoreCp, checkmateWinner } = useMemo(() => {
    try {
      if (game.isCheckmate()) {
        const turn = game.turn();
        const winner = turn === 'b' ? 'White' : 'Black';
        const isWhiteWinner = turn === 'b';
        return {
          isCheckmate: true,
          isDraw: false,
          checkmateWinner: winner,
          terminalEvalText: isWhiteWinner ? '# 1-0' : '# 0-1',
          terminalWinChance: isWhiteWinner ? 100 : 0, // 100% or 0%, NEVER 50%!
          terminalWhiteScoreCp: isWhiteWinner ? 100000 : -100000,
        };
      }
      if (game.isDraw() || game.isStalemate()) {
        return {
          isCheckmate: false,
          isDraw: true,
          checkmateWinner: null,
          terminalEvalText: '½-½',
          terminalWinChance: 50,
          terminalWhiteScoreCp: 0,
        };
      }
    } catch {
      // ignore
    }
    return {
      isCheckmate: false,
      isDraw: false,
      checkmateWinner: null,
      terminalEvalText: null,
      terminalWinChance: null,
      terminalWhiteScoreCp: null,
    };
  }, [game]);

  // Displayed evaluation values (prioritize terminal states)
  const currentEvalText = isCheckmate || isDraw ? terminalEvalText : engineData.evalText;
  const currentWinChance = isCheckmate || isDraw ? terminalWinChance : engineData.winChance;
  const currentWhiteScoreCp = isCheckmate || isDraw ? terminalWhiteScoreCp : engineData.whiteScoreCp;

  // Trigger celebration on checkmate
  useEffect(() => {
    if (isCheckmate) {
      chessAudio.playSuccess();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [isCheckmate]);

  // Persist theme mode to localStorage and root html tag
  useEffect(() => {
    localStorage.setItem('chess_theme_mode', themeMode);
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  const handleToggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Global window drag-and-drop listener: drop chess diagram image anywhere
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsWindowDragOver(true);
      }
    };

    const handleDragLeave = (e) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsWindowDragOver(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsWindowDragOver(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          setDroppedFile(file);
          setShowScanner(true);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Subscribe to Stockfish engine updates
  useEffect(() => {
    const unsubscribe = stockfishService.subscribe((data) => {
      setEngineData((prev) => ({
        ...prev,
        ...data,
      }));
    });

    return () => {
      unsubscribe();
      stockfishService.terminate();
    };
  }, []);

  // Update engine whenever FEN or activeMode or engine switch changes
  useEffect(() => {
    if (isEngineOn) {
      stockfishService.startEvaluation(fen);
    } else if (activeMode === 'solver') {
      // Evaluate silently in background for puzzle solving hints and solutions
      stockfishService.startEvaluation(fen, true);
    } else {
      stockfishService.stop();
    }
  }, [fen, isEngineOn, activeMode]);

  const handleToggleEngine = (enable) => {
    setIsEngineOn(enable);
    stockfishService.setEngineOn(enable);
  };

  const handleChangeMultiPv = (count) => {
    setMultiPv(count);
    stockfishService.setMultiPv(count);
  };

  // Switch to Analysis mode seamlessly from Solver panel
  const handleSwitchToAnalysis = useCallback(() => {
    setActiveMode('analysis');
    setAnalysisTab('main');
    setIsEngineOn(true);
    stockfishService.setEngineOn(true);
  }, []);

  // Making a move on the board
  const handleBoardMove = (moveObj) => {
    const nextFen = game.fen();
    setFen(nextFen);

    const prevHistory = historyPointer >= 0 ? moveHistory.slice(0, historyPointer + 1) : [];
    const newHistory = [
      ...prevHistory,
      {
        san: moveObj.san,
        from: moveObj.from,
        to: moveObj.to,
        fen: nextFen,
        flags: moveObj.flags,
        captured: moveObj.captured,
        piece: moveObj.piece,
      },
    ];
    setMoveHistory(newHistory);
    setHistoryPointer(newHistory.length - 1);
  };

  // Play engine move directly
  const handlePlayEngineMove = (uciMove) => {
    if (!uciMove || uciMove.length < 4) return;
    try {
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : undefined;
      const res = game.move({ from, to, promotion });
      if (res) {
        if (game.inCheck()) {
          chessAudio.playCheck();
        } else if (res.captured) {
          chessAudio.playCapture();
        } else {
          chessAudio.playMove();
        }
        handleBoardMove(res);
      }
    } catch (err) {
      console.warn('Engine move could not be played:', err);
    }
  };

  // Jump to move in history with authentic audio feedback
  const handleJumpToMove = useCallback((idx) => {
    if (idx === historyPointer) return;

    if (idx < 0) {
      setFen(initialFen);
      setHistoryPointer(-1);
      chessAudio.playMove();
    } else if (idx < moveHistory.length) {
      const targetMove = moveHistory[idx];
      setFen(targetMove.fen);
      setHistoryPointer(idx);

      if (targetMove.san) {
        if (targetMove.san.includes('#')) {
          chessAudio.playSuccess();
        } else if (targetMove.san.includes('+')) {
          chessAudio.playCheck();
        } else if (targetMove.san.includes('x') || targetMove.captured) {
          chessAudio.playCapture();
        } else if (targetMove.san.includes('O-O')) {
          chessAudio.playCastle();
        } else if (targetMove.san.includes('=')) {
          chessAudio.playPromote();
        } else {
          chessAudio.playMove();
        }
      } else {
        chessAudio.playMove();
      }
    }
  }, [historyPointer, initialFen, moveHistory]);

  // Global Keyboard Navigation for Move History (ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      // Don't intercept if any modal is currently open
      if (showScanner || showEditor || showHelp) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        if (moveHistory.length > 0 && historyPointer > -1) {
          e.preventDefault();
          handleJumpToMove(historyPointer - 1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        if (moveHistory.length > 0 && historyPointer < moveHistory.length - 1) {
          e.preventDefault();
          handleJumpToMove(historyPointer + 1);
        }
      } else if (e.key === 'Home') {
        if (moveHistory.length > 0 && historyPointer > -1) {
          e.preventDefault();
          handleJumpToMove(-1);
        }
      } else if (e.key === 'End') {
        if (moveHistory.length > 0 && historyPointer < moveHistory.length - 1) {
          e.preventDefault();
          handleJumpToMove(moveHistory.length - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHistory, historyPointer, handleJumpToMove, showScanner, showEditor, showHelp]);

  // Load a scanned position
  const handleLoadPosition = (newFen, caption) => {
    try {
      const testGame = new Chess(newFen);
      setFen(newFen);
      setInitialFen(newFen);
      setMoveHistory([]);
      setHistoryPointer(-1);
      if (caption) setPuzzleCaption(caption);

      const turn = testGame.turn();
      setOrientation(turn === 'w' ? 'white' : 'black');

      if (isEngineOn) {
        stockfishService.startEvaluation(newFen);
      } else if (activeMode === 'solver') {
        stockfishService.startEvaluation(newFen, true);
      }
    } catch (err) {
      console.error('Invalid FEN loaded:', err);
    }
  };

  // Update FEN from manual controls
  const handleUpdateFen = (newFen) => {
    try {
      new Chess(newFen);
      setFen(newFen);
      setInitialFen(newFen);
      setMoveHistory([]);
      setHistoryPointer(-1);
      if (newFen === STARTING_FEN) {
        setPuzzleCaption('');
        setOrientation('white');
      }
      if (isEngineOn) {
        stockfishService.startEvaluation(newFen);
      } else if (activeMode === 'solver') {
        stockfishService.startEvaluation(newFen, true);
      }
    } catch (err) {
      console.warn('Invalid FEN applied:', err);
    }
  };

  // Single unified Reset Position action: Restores original imported puzzle position reliably
  const handleResetPosition = () => {
    const targetFen = initialFen || STARTING_FEN;
    setFen(targetFen);
    setMoveHistory([]);
    setHistoryPointer(-1);
    if (isEngineOn) {
      stockfishService.startEvaluation(targetFen);
    } else if (activeMode === 'solver') {
      stockfishService.startEvaluation(targetFen, true);
    }
  };

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleChangeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('chess_board_theme', newTheme);
  };

  const handleToggleMute = () => {
    chessAudio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // PGN generation & download
  const handleDownloadPgn = useCallback(() => {
    let result = '*';
    if (game.isCheckmate()) {
      result = game.turn() === 'b' ? '1-0' : '0-1';
    } else if (game.isDraw() || game.isStalemate()) {
      result = '1/2-1/2';
    }

    const pgnString = generatePgn({
      fen,
      initialFen,
      history: moveHistory.slice(0, historyPointer + 1),
      caption: puzzleCaption,
      title: puzzleCaption || 'Chess Analysis',
      result,
      engineLines: engineData.lines,
    });

    const fenPrefix = (initialFen || fen).split(' ')[0].replace(/\//g, '-').slice(0, 16);
    downloadPgnFile(pgnString, `chess-${fenPrefix}.pgn`);
  }, [fen, initialFen, moveHistory, historyPointer, puzzleCaption, game, engineData.lines]);

  const handleCopyPgn = useCallback(async () => {
    let result = '*';
    if (game.isCheckmate()) {
      result = game.turn() === 'b' ? '1-0' : '0-1';
    } else if (game.isDraw() || game.isStalemate()) {
      result = '1/2-1/2';
    }

    const pgnString = generatePgn({
      fen,
      initialFen,
      history: moveHistory.slice(0, historyPointer + 1),
      caption: puzzleCaption,
      title: puzzleCaption || 'Chess Analysis',
      result,
      engineLines: engineData.lines,
    });

    const ok = await copyPgnToClipboard(pgnString);
    if (ok) {
      setCopiedBannerPgn(true);
      setTimeout(() => setCopiedBannerPgn(false), 2000);
    }
    return ok;
  }, [fen, initialFen, moveHistory, historyPointer, puzzleCaption, game, engineData.lines]);

  const lastMove = useMemo(() => {
    if (historyPointer >= 0 && historyPointer < moveHistory.length) {
      const item = moveHistory[historyPointer];
      return { from: item.from, to: item.to };
    }
    return null;
  }, [historyPointer, moveHistory]);

  return (
    <div className="min-h-screen flex flex-col bg-chess-app text-chess-primary transition-colors duration-200 select-none">
      {/* Global Drag and Drop Fullscreen Overlay */}
      {isWindowDragOver && (
        <div className="fixed inset-0 z-50 bg-[#20242C]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-[var(--color-primary)]">
          <div className="w-20 h-20 rounded-3xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center mb-4 animate-bounce">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            Drop Chess Diagram to Scan!
          </h2>
          <p className="text-[var(--color-secondary-text)] text-sm max-w-md text-center">
            Release image here to instantly analyze with Fenshot Neural Network and Stockfish 19 NNUE.
          </p>
        </div>
      )}

      {/* Top Navbar: SolveChess Brand & Navigation (Single row on mobile) */}
      <Navbar
        onOpenScanner={() => {
          setDroppedFile(null);
          setShowScanner(true);
        }}
        onOpenEditor={() => setShowEditor(true)}
        onOpenHelp={() => setShowHelp(true)}
        activeMode={activeMode}
        onToggleMode={(mode) => setActiveMode(mode)}
        theme={theme}
        onChangeTheme={handleChangeTheme}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        themeMode={themeMode}
        onToggleThemeMode={handleToggleThemeMode}
      />

      {/* Main Responsive Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-2 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 lg:pt-8 pb-4 sm:pb-6 md:pb-8 flex flex-col gap-3 md:gap-4">
        {/* 2-Column Responsive Layout: Board on Left, Info Strip + Analysis Panel on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN: Clean Chessboard with NO full-width header strip above it */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-center gap-1.5 w-full">
            <div className="w-full flex items-stretch justify-center gap-2">
              {/* Vertical Evaluation Bar (visible when engine is ON or in Checkmate) */}
              {(isEngineOn || isCheckmate) && activeMode === 'analysis' && (
                <EvalBar
                  whiteScoreCp={currentWhiteScoreCp}
                  evalText={currentEvalText}
                  winChance={currentWinChance}
                  orientation={orientation}
                  isSearching={engineData.isSearching && !isCheckmate}
                />
              )}

              {/* Responsive Bounded Chessboard */}
              <div className="flex-1 flex justify-center max-w-[min(100vw-24px,430px)]">
                <ChessBoard
                  game={game}
                  onMove={handleBoardMove}
                  orientation={orientation}
                  bestMove={activeMode === 'analysis' && isEngineOn && !isCheckmate ? engineData.bestMove : null}
                  showBestMoveArrow={activeMode === 'analysis' && isEngineOn && !isCheckmate}
                  lastMove={lastMove}
                  interactive={!isCheckmate}
                  theme={theme}
                />
              </div>
            </div>

            {/* Status Bar below Board: Facing, Turn, and Flip Board */}
            <div className="w-full max-w-[430px] flex items-center justify-between text-[11px] px-1 text-chess-secondary">
              <div className="flex items-center gap-2">
                <span>
                  Facing: <strong className="text-chess-primary capitalize font-semibold">{orientation}</strong>
                </span>
                <span>•</span>
                <span>
                  Turn: <strong className="text-chess-primary font-semibold">{game.turn() === 'w' ? 'White' : 'Black'}</strong>
                </span>
                {isCheckmate && (
                  <span className="text-amber-500 font-extrabold animate-pulse"># MATE</span>
                )}
                {!isCheckmate && game.inCheck() && (
                  <span className="text-rose-500 font-bold animate-pulse">+ CHECK</span>
                )}
                {isDraw && (
                  <span className="text-amber-500 font-bold">½ DRAW</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleFlipBoard}
                className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                title="Flip board perspective"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Flip</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Position Strip immediately ABOVE Analysis/Solve Panel */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-2.5 w-full">
            {/* Position Action Toolbar (Reset Position, PGN, Copy) */}
            <div className="grid grid-cols-3 gap-2 border border-chess bg-chess-card rounded-xl p-1.5 shadow-xs transition-colors">
              <button
                type="button"
                onClick={handleResetPosition}
                className="btn-chess-secondary py-1.5 px-2 text-xs flex items-center justify-center gap-1.5"
                title="Reset to initial position"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Reset Position</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPgn}
                className="btn-chess-secondary py-1.5 px-2 text-xs flex items-center justify-center gap-1.5"
                title="Download clean PGN file"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>PGN</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPgn}
                className="btn-chess-secondary py-1.5 px-2 text-xs flex items-center justify-center gap-1.5"
                title="Copy PGN to clipboard"
              >
                {copiedBannerPgn ? <Check className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                <span>{copiedBannerPgn ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Unified 3-Tab Header (Shared between Analysis and Solve mode) */}
            <div className="flex items-center rounded-xl p-1 border border-chess bg-chess-card shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setAnalysisTab('main')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  analysisTab === 'main' || analysisTab === 'engine' || analysisTab === 'solve'
                    ? 'nav-pill-active'
                    : 'nav-pill-inactive'
                }`}
              >
                {activeMode === 'solver' ? (
                  <>
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Solve</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Engine</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAnalysisTab('moves')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  analysisTab === 'moves'
                    ? 'nav-pill-active'
                    : 'nav-pill-inactive'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Moves</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisTab('rules')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  analysisTab === 'rules'
                    ? 'nav-pill-active'
                    : 'nav-pill-inactive'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Rules / FEN</span>
              </button>
            </div>

            {/* TAB 1: Engine Panel in Analysis Mode vs Solver Panel in Solve Mode */}
            {(analysisTab === 'main' || analysisTab === 'engine' || analysisTab === 'solve') && (
              activeMode === 'analysis' ? (
                <EngineLines
                  isEngineOn={isEngineOn}
                  onToggleEngine={handleToggleEngine}
                  engineStatus={isEngineOn ? (engineData.status || (engineData.isSearching ? 'active' : 'ready')) : 'paused'}
                  lines={
                    isCheckmate
                      ? [
                          {
                            pvIndex: 1,
                            depth: 0,
                            evalText: currentEvalText,
                            whiteScoreCp: currentWhiteScoreCp,
                            sanMoves: [
                              {
                                san: `${checkmateWinner} wins by checkmate (${game.turn() === 'b' ? '1-0' : '0-1'})`,
                                prefix: '',
                              },
                            ],
                          },
                        ]
                      : engineData.lines
                  }
                  depth={isCheckmate ? 0 : engineData.depth}
                  nps={isCheckmate ? 0 : engineData.nps}
                  bestMove={engineData.bestMove}
                  multiPv={multiPv}
                  onChangeMultiPv={handleChangeMultiPv}
                  onPlayMove={handlePlayEngineMove}
                  whiteScoreCp={currentWhiteScoreCp}
                  evalText={currentEvalText}
                />
              ) : (
                <PuzzleSolver
                  game={game}
                  turn={game.turn()}
                  bestMove={engineData.bestMove}
                  bestLines={engineData.lines}
                  onPlayMove={handlePlayEngineMove}
                  onResetPosition={handleResetPosition}
                  onSwitchToAnalysis={handleSwitchToAnalysis}
                />
              )
            )}

            {/* TAB 2: Move History (Identical in both Analysis and Solve modes) */}
            {analysisTab === 'moves' && (
              <MoveHistory
                history={moveHistory}
                currentMoveIndex={historyPointer}
                onJumpToMove={handleJumpToMove}
              />
            )}

            {/* TAB 3: Rules & FEN Controls (Identical in both Analysis and Solve modes) */}
            {analysisTab === 'rules' && (
              <PositionControls
                currentFen={fen}
                onUpdateFen={handleUpdateFen}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modals: Scan, Editor, Help */}
      {showScanner && (
        <ChessScanner
          onLoadPosition={handleLoadPosition}
          onClose={() => {
            setShowScanner(false);
            setDroppedFile(null);
          }}
          initialFile={droppedFile}
        />
      )}

      {showEditor && (
        <BoardEditor
          fen={fen}
          onSave={(newFen) => {
            handleUpdateFen(newFen);
            setShowEditor(false);
          }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
