import React, { memo } from 'react';

function EvalBarComponent({
  whiteScoreCp = 0,
  evalText = '0.0',
  winChance = 50,
  orientation = 'white',
  isSearching = false,
  className = '',
}) {
  // Convert winChance (0 to 100% White advantage) into height percentage
  let whitePercent;
  if (winChance >= 100) {
    whitePercent = 100;
  } else if (winChance <= 0) {
    whitePercent = 0;
  } else {
    // Normal range bounded between 4% and 96%
    whitePercent = Math.max(4, Math.min(96, winChance));
  }

  const displayedPercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  // Determine dominant side
  const isWhiteAdvantage =
    winChance >= 99 ||
    whiteScoreCp > 25 ||
    evalText.includes('1-0') ||
    evalText.startsWith('+') ||
    (evalText.startsWith('M') && !evalText.includes('-'));

  const isBlackAdvantage =
    winChance <= 1 ||
    whiteScoreCp < -25 ||
    evalText.includes('0-1') ||
    evalText.startsWith('-') ||
    evalText.includes('-M');

  const isCheckmate = evalText.includes('#') || evalText.includes('1-0') || evalText.includes('0-1') || evalText.includes('M0');

  return (
    <div
      className={`relative flex flex-col justify-between items-center w-8 md:w-9 rounded-lg overflow-hidden border border-chess shadow-sm select-none ${className}`}
      style={{ backgroundColor: 'var(--color-card-bg)' }}
      title={`Evaluation: ${evalText} (White win chance: ${winChance}%)`}
    >
      {/* Black's portion (top if white orientation) */}
      <div
        className="w-full transition-all duration-300 ease-out flex flex-col items-center justify-start pt-1.5"
        style={{
          height: `${100 - displayedPercent}%`,
          backgroundColor: '#302E2B',
        }}
      >
        {/* If Black is ahead, show score text in the black section */}
        {((orientation === 'white' && isBlackAdvantage) || (orientation === 'black' && isWhiteAdvantage)) && (
          <span
            className={`text-[11px] font-bold tracking-tight text-[#FFFFFF] font-mono px-0.5 text-center leading-tight ${
              isCheckmate ? 'text-[var(--color-primary)] font-extrabold scale-110 mt-1' : ''
            }`}
          >
            {evalText}
          </span>
        )}
      </div>

      {/* Center divider line */}
      {displayedPercent > 0 && displayedPercent < 100 && (
        <div
          className="absolute top-1/2 left-0 right-0 h-[1px] pointer-events-none z-10 opacity-30"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
      )}

      {/* White's portion (bottom if white orientation) */}
      <div
        className="w-full transition-all duration-300 ease-out flex flex-col items-center justify-end pb-1.5 shadow-sm"
        style={{
          height: `${displayedPercent}%`,
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* If White is ahead, show score text in white section */}
        {((orientation === 'white' && isWhiteAdvantage) || (orientation === 'black' && isBlackAdvantage)) && (
          <span
            className={`text-[11px] font-bold tracking-tight text-[#262421] font-mono px-0.5 text-center leading-tight ${
              isCheckmate ? 'text-[var(--color-primary-hover)] font-extrabold scale-110 mb-1' : ''
            }`}
          >
            {evalText}
          </span>
        )}
      </div>

      {/* Searching pulse dot */}
      {isSearching && (
        <div
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-ping z-20 pointer-events-none"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      )}
    </div>
  );
}

export const EvalBar = memo(EvalBarComponent);
