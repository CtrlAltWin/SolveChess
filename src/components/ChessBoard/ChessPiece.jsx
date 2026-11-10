import React, { useState, memo } from 'react';

// Authentic Chess.com Neo pieces with vector SVG fallback
function ChessPieceComponent({ piece, size = '100%', className = '' }) {
  const [imgError, setImgError] = useState(false);

  if (!piece) return null;

  let type = '';
  let color = '';

  if (typeof piece === 'string') {
    type = piece.toLowerCase();
    color = piece === piece.toUpperCase() ? 'w' : 'b';
  } else if (piece && piece.type) {
    type = piece.type.toLowerCase();
    color = piece.color;
  }

  const pieceCode = `${color}${type}`; // e.g. "wn", "bp", "wk"
  const imageSrc = `/pieces/neo/${pieceCode}.png`;

  // If image fails, fallback to clean vector SVG
  if (imgError) {
    const isWhite = color === 'w';
    return (
      <svg
        viewBox="0 0 45 45"
        width={size}
        height={size}
        className={`select-none pointer-events-none drop-shadow-sm ${className}`}
      >
        <circle cx="22.5" cy="22.5" r="18" fill={isWhite ? '#f8fafc' : '#1e293b'} stroke="#475569" strokeWidth="2" />
        <text
          x="22.5"
          y="28"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill={isWhite ? '#0f172a' : '#f8fafc'}
        >
          {type.toUpperCase()}
        </text>
      </svg>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={`${color === 'w' ? 'White' : 'Black'} ${type}`}
      width={size}
      height={size}
      onError={() => setImgError(true)}
      draggable={false}
      className={`select-none pointer-events-none object-contain w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)] transition-transform ${className}`}
    />
  );
}

export const ChessPiece = memo(ChessPieceComponent);
