import React, { useMemo } from 'react';
import { Cpu, Play, CheckCircle2 } from 'lucide-react';

export function EngineLines({
  isEngineOn = true,
  onToggleEngine,
  lines = [],
  depth = 0,
  nps = 0,
  bestMove = null,
  evalText = '0.0',
  whiteScoreCp = 0,
  multiPv = 2,
  onChangeMultiPv,
  onPlayMove,
}) {
  const formatNps = (val) => {
    if (!val) return '0';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return `${val}`;
  };

  const topMove = useMemo(() => {
    if (lines.length > 0 && lines[0].sanMoves && lines[0].sanMoves.length > 0) {
      return {
        san: lines[0].sanMoves[0].san,
        uci: lines[0].bestMove || bestMove,
      };
    }
    if (bestMove) {
      return {
        san: bestMove,
        uci: bestMove,
      };
    }
    return null;
  }, [lines, bestMove]);

  return (
    <div className="bg-chess-card border border-chess text-chess-primary rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col gap-2.5 transition-colors">
      {/* SECTION A: ENGINE HEADER & TOGGLE SWITCH */}
      <div className="flex items-center justify-between pb-2 border-b border-chess">
        <div className="flex items-center gap-2.5">
          {/* Engine Core Icon with Blinking / Pulsing Animation ALWAYS Active When Engine is ON */}
          <div className="relative flex items-center justify-center">
            {isEngineOn && (
              <span className="absolute w-8 h-8 rounded-xl bg-[var(--color-primary)]/30 animate-energy-ring pointer-events-none" />
            )}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all ${
                isEngineOn
                  ? 'bg-[var(--color-primary)] text-white shadow-md animate-core-glow'
                  : 'bg-chess-surface text-chess-secondary border border-chess'
              }`}
            >
              <Cpu className={`w-4 h-4 ${isEngineOn ? 'animate-pulse' : ''}`} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-chess-primary">
                Stockfish 19 NNUE
              </span>

              {/* Status Badge with Active Blinking Pulse */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-chess-surface border border-chess text-[10px] font-medium text-chess-secondary">
                {isEngineOn ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-engine-pulse" />
                    <span className="text-chess-primary font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary-text)]" />
                    <span>Engine paused</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-[10px] text-chess-secondary mt-0.5">
              16-block neural network • SIMD WebAssembly
            </p>
          </div>
        </div>

        {/* MultiPV Selector + Single Toggle Switch */}
        <div className="flex items-center gap-2">
          {isEngineOn && onChangeMultiPv && (
            <div className="flex items-center rounded-lg p-0.5 border border-chess bg-chess-surface text-xs">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChangeMultiPv(num)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    multiPv === num
                      ? 'nav-pill-active'
                      : 'text-chess-secondary hover:text-chess-primary'
                  }`}
                  title={`${num} calculated variation${num > 1 ? 's' : ''}`}
                >
                  {num}L
                </button>
              ))}
            </div>
          )}

          {/* Single Smooth Activation Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isEngineOn}
            onClick={() => onToggleEngine(!isEngineOn)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden cursor-pointer ${
              isEngineOn
                ? 'bg-[var(--color-primary)]'
                : 'bg-chess-surface border border-chess'
            }`}
            title={isEngineOn ? 'Pause Stockfish engine' : 'Activate Stockfish 19 NNUE'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                isEngineOn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ACTIVE ANALYSIS CONTENT */}
      {isEngineOn ? (
        <div className="flex flex-col gap-2.5">
          {/* SECTION B: EVALUATION SUMMARY (Live Eval, Depth, Speed) */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-chess-surface border border-chess text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-chess-secondary">Evaluation:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                  whiteScoreCp > 40
                    ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border-[var(--color-primary)]/35'
                    : whiteScoreCp < -40
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                    : 'bg-chess-card text-chess-primary border-chess'
                }`}
              >
                {evalText}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-chess-secondary font-mono">
              <span>
                Depth: <strong className="text-chess-primary font-semibold">{depth}</strong>
              </span>
              <span>•</span>
              <span>
                Speed: <strong className="text-chess-primary font-semibold">{formatNps(nps)}</strong> nps
              </span>
            </div>
          </div>

          {/* SECTION C: BEST MOVE RECOMMENDED */}
          {topMove && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[var(--color-primary)]/35 bg-[var(--color-active-bg)]/40 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="text-chess-secondary text-[11px]">Recommended:</span>
                <strong className="font-mono font-bold text-chess-primary text-xs tracking-wide">
                  {topMove.san}
                </strong>
              </div>

              {onPlayMove && topMove.uci && (
                <button
                  type="button"
                  onClick={() => onPlayMove(topMove.uci)}
                  className="btn-chess-secondary px-2 py-0.5 text-[11px] font-semibold"
                  title={`Execute move ${topMove.san} on board`}
                >
                  <Play className="w-2.5 h-2.5 mr-0.5 fill-current" />
                  <span>Play Move</span>
                </button>
              )}
            </div>
          )}

          {/* SECTION D: PRINCIPAL VARIATIONS (Shows exact selected number of lines from start) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-chess-secondary px-0.5">
              <span className="font-medium uppercase tracking-wider text-[10px]">
                Calculated Lines (PV)
              </span>
              <span className="text-[10px]">Top {multiPv} Variations</span>
            </div>

            {lines.length === 0 ? (
              <div className="py-4 text-center text-xs text-chess-secondary flex flex-col items-center justify-center gap-1.5">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
                <span className="text-[11px]">Searching candidate moves ({multiPv} lines)...</span>
              </div>
            ) : (
              lines.slice(0, multiPv).map((line, idx) => {
                const isBest = idx === 0;
                const evalBadgeClass =
                  line.whiteScoreCp > 40
                    ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border-[var(--color-primary)]/30'
                    : line.whiteScoreCp < -40
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                    : 'bg-chess-card text-chess-secondary border-chess';

                return (
                  <div
                    key={line.pvIndex || idx}
                    className={`p-2 rounded-lg border transition-all animate-line-fade-in ${
                      isBest
                        ? 'bg-chess-surface border-[var(--color-primary)]/35'
                        : 'bg-chess-surface/60 border-chess'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-chess-card border border-chess text-chess-secondary">
                          {line.pvIndex || idx + 1}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-bold border ${evalBadgeClass}`}>
                          {line.evalText}
                        </span>
                        <span className="text-[10px] text-chess-secondary font-mono">
                          d={line.depth}
                        </span>
                      </div>

                      {line.bestMove && onPlayMove && (
                        <button
                          type="button"
                          onClick={() => onPlayMove(line.bestMove)}
                          className="hover:text-[var(--color-primary)] flex items-center gap-1 text-[10px] font-medium text-chess-secondary hover:underline cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5" />
                          <span>Play Line</span>
                        </button>
                      )}
                    </div>

                    <div className="font-mono text-xs text-chess-primary tracking-wide leading-relaxed break-words">
                      {line.sanMoves && line.sanMoves.length > 0 ? (
                        line.sanMoves.map((m, mIdx) => (
                          <span key={mIdx} className="mr-1">
                            {m.prefix && <span className="text-chess-secondary opacity-70">{m.prefix}</span>}
                            <span className="font-semibold">{m.san}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-chess-secondary">{line.pvMoves ? line.pvMoves.join(' ') : '—'}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* CLEAN PAUSED EMPTY STATE */
        <div className="py-8 sm:py-10 flex flex-col items-center justify-center text-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-chess-surface border border-chess flex items-center justify-center text-chess-secondary">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="max-w-xs">
            <h4 className="text-xs sm:text-sm font-semibold text-chess-primary mb-1">
              Stockfish 19 NNUE is paused
            </h4>
            <p className="text-[11px] text-chess-secondary leading-relaxed">
              Use the toggle switch above to activate engine evaluation, real-time depth calculation, and winning move recommendations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
