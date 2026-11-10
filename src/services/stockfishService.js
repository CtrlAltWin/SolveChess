import { Chess } from 'chess.js';

class StockfishService {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.isEngineOn = false; // Turned off by default per specification
    this.currentFen = null;
    this.pendingFen = null;
    this.pendingForce = false;
    this.listeners = new Set();
    this.multiPv = 2; // Default 2 lines of analysis
    this.depth = 18;
    this.currentLines = {};
    this.activeSearch = false;
    this.hasDeliveredFirstLine = false;
    this.workerPath = '/stockfish/stockfish-19-lite-single.js';
    this.fallbackPath = '/stockfish/stockfish.js';
    this.usingFallback = false;
    this.status = 'paused';
    this.pendingNotification = null;
    this.throttleTimer = null;
  }

  // Subscribe to engine state updates
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Immediate notification for critical state transitions (bestmove, ready, paused, etc.)
  notify(data) {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
      this.pendingNotification = null;
    }
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('Stockfish notification error:', err);
      }
    }
  }

  // Throttled notification for high-frequency intermediate search info lines (~75ms window)
  // Prevents hundreds of React re-renders per second while maintaining 60fps responsiveness
  notifyThrottled(data) {
    this.pendingNotification = data;
    // Deliver first line immediately so candidate variations and eval appear without any artificial lag
    if (!this.hasDeliveredFirstLine) {
      this.hasDeliveredFirstLine = true;
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
        this.throttleTimer = null;
      }
      this.notify(data);
      return;
    }

    if (this.throttleTimer) return;

    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
      if (this.pendingNotification) {
        const payload = this.pendingNotification;
        this.pendingNotification = null;
        for (const listener of this.listeners) {
          try {
            listener(payload);
          } catch (err) {
            console.error('Stockfish notification error:', err);
          }
        }
      }
    }, 75);
  }

  init() {
    if (this.worker) return;

    try {
      this.initWorker(this.workerPath);
    } catch (err) {
      console.warn('Primary Stockfish 19 worker failed to init, trying fallback:', err);
      this.initFallbackWorker();
    }
  }

  initWorker(scriptUrl) {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
    }

    this.worker = new Worker(scriptUrl);
    this.isReady = false;
    this.status = 'initializing';
    this.notify({
      status: 'initializing',
      isSearching: false,
      engineOn: this.isEngineOn,
    });

    this.worker.onerror = (e) => {
      console.error('Stockfish worker error:', e);
      if (!this.usingFallback) {
        console.warn('Switching to fallback Stockfish engine...');
        this.initFallbackWorker();
      }
    };

    this.worker.onmessage = (event) => {
      const line = typeof event.data === 'string' ? event.data : '';
      this.parseUciMessage(line);
    };

    // Send UCI setup commands
    this.send('uci');
    this.send(`setoption name MultiPV value ${this.multiPv}`);
    this.send('setoption name Threads value 1');
    this.send('setoption name Hash value 32');
    this.send('isready');
  }

  initFallbackWorker() {
    this.usingFallback = true;
    this.initWorker(this.fallbackPath);
  }

  send(command) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  setMultiPv(count) {
    const val = Math.max(1, Math.min(4, count));
    this.multiPv = val;
    this.send(`setoption name MultiPV value ${val}`);
    if (this.isEngineOn && this.currentFen) {
      this.restartSearch();
    }
  }

  setEngineOn(enable) {
    this.isEngineOn = enable;
    if (enable) {
      this.status = this.isReady ? 'active' : 'initializing';
      if (!this.worker) {
        this.init();
      }
    } else {
      this.stop();
      this.pendingFen = null;
      this.pendingForce = false;
      this.status = 'paused';
      const preservedLines = Object.values(this.currentLines).sort((a, b) => a.pvIndex - b.pvIndex);
      const top = preservedLines[0];
      this.notify({
        status: 'paused',
        isSearching: false,
        engineOn: false,
        bestMove: top ? top.bestMove : null,
        lines: preservedLines,
        depth: top ? top.depth : 0,
        nps: 0,
        whiteScoreCp: top ? top.whiteScoreCp : 0,
        evalText: top ? top.evalText : '0.0',
        winChance: top ? top.winChance : 50,
      });
    }
  }

  startEvaluation(fen, force = false) {
    if (!fen) return;
    this.currentFen = fen;

    if (!this.worker) {
      this.init();
    }

    if (!this.isEngineOn && !force) return;

    // If the Web Worker has not finished loading WASM/readyok yet, queue this evaluation
    if (!this.isReady) {
      this.pendingFen = fen;
      this.pendingForce = force;
      this.status = 'initializing';
      this.notify({
        status: 'initializing',
        isSearching: true,
        engineOn: this.isEngineOn,
        fen,
        lines: [],
      });
      return;
    }

    this.stop();
    this.currentLines = {};
    this.hasDeliveredFirstLine = false;

    // 1. First, check if the position is already in Checkmate or Draw/Stalemate
    try {
      const testGame = new Chess(fen);
      if (testGame.isCheckmate()) {
        const turn = testGame.turn(); // 'w' or 'b'
        // The side whose turn it is has no legal moves and is in check!
        const isBlackMated = turn === 'b';
        this.status = 'ready';
        const mateData = {
          status: 'ready',
          isSearching: false,
          engineOn: this.isEngineOn,
          fen: fen,
          depth: 0,
          nps: 0,
          bestMove: null,
          whiteScoreCp: isBlackMated ? 100000 : -100000,
          evalText: isBlackMated ? '# 1-0' : '# 0-1',
          winChance: isBlackMated ? 100 : 0, // Never 50% on checkmate!
          lines: [
            {
              pvIndex: 1,
              depth: 0,
              nps: 0,
              whiteScoreCp: isBlackMated ? 100000 : -100000,
              evalText: isBlackMated ? '# 1-0 (White wins)' : '# 0-1 (Black wins)',
              winChance: isBlackMated ? 100 : 0,
              isMate: true,
              mateMoves: 0,
              bestMove: null,
              pvMoves: [],
              sanMoves: [{ san: isBlackMated ? '1-0 (Checkmate)' : '0-1 (Checkmate)', prefix: '' }],
            },
          ],
        };
        this.notify(mateData);
        return;
      }

      if (testGame.isDraw() || testGame.isStalemate()) {
        this.status = 'ready';
        const drawData = {
          status: 'ready',
          isSearching: false,
          engineOn: this.isEngineOn,
          fen: fen,
          depth: 0,
          nps: 0,
          bestMove: null,
          whiteScoreCp: 0,
          evalText: '½-½',
          winChance: 50,
          lines: [
            {
              pvIndex: 1,
              depth: 0,
              nps: 0,
              whiteScoreCp: 0,
              evalText: '½-½ (Draw)',
              winChance: 50,
              isMate: false,
              mateMoves: 0,
              bestMove: null,
              pvMoves: [],
              sanMoves: [{ san: '½-½ (Draw)', prefix: '' }],
            },
          ],
        };
        this.notify(drawData);
        return;
      }
    } catch {
      // If FEN is non-standard, continue to Stockfish
    }

    this.activeSearch = true;
    this.status = 'active';

    this.send('ucinewgame');
    this.send(`setoption name MultiPV value ${this.multiPv}`);
    this.send(`position fen ${fen}`);
    this.send(`go depth ${this.depth}`);

    this.notify({
      status: this.status,
      isSearching: true,
      engineOn: true,
      fen: fen,
      lines: [],
    });
  }

  restartSearch() {
    if (this.isEngineOn && this.currentFen) {
      this.startEvaluation(this.currentFen);
    }
  }

  stop() {
    this.activeSearch = false;
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
      this.pendingNotification = null;
    }
    this.send('stop');
  }

  parseUciMessage(line) {
    if (!line) return;

    if (line === 'readyok') {
      this.isReady = true;
      this.status = this.isEngineOn ? 'ready' : 'paused';
      this.notify({ status: this.status, isReady: true });
      if (this.pendingFen) {
        const pFen = this.pendingFen;
        const pForce = this.pendingForce;
        this.pendingFen = null;
        this.pendingForce = false;
        if (this.isEngineOn || pForce) {
          this.startEvaluation(pFen, pForce);
        }
      }
      return;
    }

    // Parse info depth lines:
    // "info depth 12 seldepth 16 multipv 1 score cp 142 ... pv e2e4 e7e5"
    // "info depth 14 score mate 1 pv e8e1"
    if (line.startsWith('info') && (line.includes('score cp') || line.includes('score mate'))) {
      const parsed = this.parseInfoLine(line);
      if (parsed) {
        this.currentLines[parsed.pvIndex] = parsed;
        const sortedLines = Object.values(this.currentLines).sort((a, b) => a.pvIndex - b.pvIndex);

        const top = sortedLines[0];
        if (top) {
          this.status = 'active';
          this.notifyThrottled({
            status: 'active',
            isSearching: this.activeSearch,
            engineOn: this.isEngineOn,
            fen: this.currentFen,
            depth: top.depth,
            nps: top.nps,
            bestMove: top.bestMove,
            whiteScoreCp: top.whiteScoreCp,
            evalText: top.evalText,
            winChance: top.winChance,
            lines: sortedLines,
          });
        }
      }
      return;
    }

    // Parse bestmove
    if (line.startsWith('bestmove')) {
      this.activeSearch = false;
      this.status = 'ready';
      const parts = line.split(' ');
      const bestMoveUci = parts[1];
      const ponderMove = parts[3];

      const sortedLines = Object.values(this.currentLines).sort((a, b) => a.pvIndex - b.pvIndex);
      const top = sortedLines[0];

      let whiteScoreCp = top ? top.whiteScoreCp : 0;
      let evalText = top ? top.evalText : '0.0';
      let winChance = top ? top.winChance : 50;

      // Handle terminal checkmate or stalemate when Stockfish emits bestmove (none) with 0 info lines
      if (!top && this.currentFen) {
        try {
          const testGame = new Chess(this.currentFen);
          if (testGame.isCheckmate()) {
            const isBlackMated = testGame.turn() === 'b';
            whiteScoreCp = isBlackMated ? 100000 : -100000;
            evalText = isBlackMated ? '# 1-0' : '# 0-1';
            winChance = isBlackMated ? 100 : 0;
          } else if (testGame.isDraw() || testGame.isStalemate()) {
            whiteScoreCp = 0;
            evalText = '½-½';
            winChance = 50;
          }
        } catch {
          // ignore
        }
      }

      this.notify({
        status: 'ready',
        isSearching: false,
        engineOn: this.isEngineOn,
        fen: this.currentFen,
        bestMove: bestMoveUci === '(none)' ? null : (bestMoveUci || (top ? top.bestMove : null)),
        ponder: ponderMove,
        depth: top ? top.depth : null,
        whiteScoreCp,
        evalText,
        winChance,
        lines: sortedLines,
      });
    }
  }

  parseInfoLine(line) {
    try {
      const depthMatch = line.match(/\bdepth\s+(\d+)/);
      const pvIdxMatch = line.match(/\bmultipv\s+(\d+)/);
      const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      const npsMatch = line.match(/\bnps\s+(\d+)/);
      const pvMatch = line.match(/\bpv\s+(.+)$/);

      if (!pvMatch) return null;

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 1;
      const pvIndex = pvIdxMatch ? parseInt(pvIdxMatch[1], 10) : 1;
      const nps = npsMatch ? parseInt(npsMatch[1], 10) : 0;
      const pvMoves = pvMatch[1].trim().split(/\s+/);

      // Determine side to move from current FEN
      let turn = 'w';
      if (this.currentFen) {
        const parts = this.currentFen.split(' ');
        if (parts[1]) turn = parts[1];
      }

      let evalText = '0.0';
      let whiteScoreCp = 0;
      let isMate = false;
      let mateMoves = 0;
      let winChance = 50;

      if (mateMatch) {
        isMate = true;
        const rawMate = parseInt(mateMatch[1], 10);

        if (rawMate === 0) {
          // Position is checkmated: the player whose turn it is has been mated!
          const isBlackMated = turn === 'b';
          whiteScoreCp = isBlackMated ? 100000 : -100000;
          evalText = isBlackMated ? '# 1-0' : '# 0-1';
          winChance = isBlackMated ? 100 : 0; // Absolute checkmate!
          mateMoves = 0;
        } else {
          // rawMate is relative to side to move:
          // positive = side to move delivers mate; negative = side to move gets mated
          const whiteMate = turn === 'w' ? rawMate : -rawMate;
          mateMoves = whiteMate;
          const absMoves = Math.abs(whiteMate);

          if (whiteMate > 0) {
            evalText = `+M${absMoves}`;
            whiteScoreCp = 100000 - absMoves * 10;
            winChance = 100; // Forced mate for White: 100% win chance!
          } else {
            evalText = `-M${absMoves}`;
            whiteScoreCp = -100000 + absMoves * 10;
            winChance = 0; // Forced mate for Black: 0% White win chance!
          }
        }
      } else if (cpMatch) {
        const rawCp = parseInt(cpMatch[1], 10);
        // rawCp is from perspective of side to move.
        // Convert to White's perspective for standard eval bar:
        whiteScoreCp = turn === 'w' ? rawCp : -rawCp;
        const pawnVal = (whiteScoreCp / 100).toFixed(1);
        evalText = whiteScoreCp > 0 ? `+${pawnVal}` : pawnVal;

        // Calculate win probability from whiteScoreCp using Lichess formula
        const clampedCp = Math.max(-1000, Math.min(1000, whiteScoreCp));
        winChance = Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1));
      }

      // Convert UCI moves (e.g. ['e2e4', 'e7e5']) to readable SAN notation with move numbers
      const sanMoves = this.convertUciToSan(this.currentFen, pvMoves);

      return {
        pvIndex,
        depth,
        nps,
        whiteScoreCp,
        evalText,
        winChance,
        isMate,
        mateMoves,
        bestMove: pvMoves[0] || null,
        pvMoves,
        sanMoves,
      };
    } catch (err) {
      console.warn('Error parsing Stockfish info line:', err);
      return null;
    }
  }

  convertUciToSan(fen, uciMoves) {
    if (!fen || !uciMoves || !uciMoves.length) return [];

    try {
      const chess = new Chess(fen);
      const result = [];
      const turn = chess.turn(); // 'w' or 'b'
      let moveNumber = chess.moveNumber();

      for (let i = 0; i < Math.min(uciMoves.length, 12); i++) {
        const uci = uciMoves[i];
        if (!uci || uci.length < 4) break;

        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;

        const moveObj = chess.move({ from, to, promotion });
        if (!moveObj) break;

        const isWhite = moveObj.color === 'w';
        const prefix = isWhite
          ? `${moveNumber}. `
          : i === 0 && turn === 'b'
          ? `${moveNumber}... `
          : '';

        result.push({
          san: moveObj.san,
          uci,
          prefix,
          color: moveObj.color,
          moveNumber,
        });

        if (!isWhite) {
          moveNumber++;
        }
      }

      return result;
    } catch {
      // If chess.js throws for an invalid position, return raw moves
      return uciMoves.slice(0, 8).map((uci) => ({ san: uci, uci, prefix: '' }));
    }
  }

  terminate() {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
      this.pendingNotification = null;
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
    this.isReady = false;
    this.isEngineOn = false;
    this.pendingFen = null;
    this.pendingForce = false;
    this.status = 'paused';
  }
}

export const stockfishService = new StockfishService();
