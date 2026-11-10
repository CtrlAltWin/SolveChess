import React from 'react';
import { ChessBishop } from 'lucide-react';

/**
 * SolveChess Brand Bishop Logo
 * Standardized across the application with an optimal dynamic angle (-12deg)
 * representing diagonal tactical vision and forward momentum.
 */
export function BishopLogo({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-4.5 h-4.5 sm:w-5 sm:h-5',
  };

  const boxSize = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;

  return (
    <div
      className={`${boxSize} bg-gradient-to-br from-[#4B8FE8] to-[#2865BD] text-white flex items-center justify-center shadow-xs shrink-0 select-none ${className}`}
      aria-label="SolveChess Logo"
    >
      <ChessBishop
        className={`${iconSize} -rotate-12 drop-shadow-xs transition-transform duration-200`}
        strokeWidth={2.3}
        fill="currentColor"
        fillOpacity={0.25}
      />
    </div>
  );
}

