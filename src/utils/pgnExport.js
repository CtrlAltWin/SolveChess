// Utility to generate, format, and download clean PGN (Portable Game Notation) files

/**
 * Format a clean standard PGN string for a chess position and move history
 */
export function generatePgn({
  fen,
  initialFen,
  history = [], // array of { san, from, to }
  caption = '',
  title = '',
  event = 'Chess Puzzle Book Study',
  site = 'SolveChess',
  date = new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
  round = '1',
  white = 'White',
  black = 'Black',
  result = '*',
  engineLines = [],
}) {
  const effectiveFen = initialFen || fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const isCustomStart = effectiveFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Build standard 7-tag roster
  const tags = [
    `[Event "${(title || caption || event).replace(/"/g, "'")}"]`,
    `[Site "${site}"]`,
    `[Date "${date}"]`,
    `[Round "${round}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
  ];

  // SetUp and FEN tags if not standard starting position
  if (isCustomStart) {
    tags.push('[SetUp "1"]');
    tags.push(`[FEN "${effectiveFen}"]`);
  }

  // Determine starting move number and side to move from FEN
  const fenParts = effectiveFen.split(' ');
  const turn = fenParts[1] || 'w';
  let moveNum = parseInt(fenParts[5] || '1', 10);
  if (isNaN(moveNum) || moveNum < 1) moveNum = 1;

  // Build move text
  const moveTokens = [];

  if (history.length > 0) {
    let currentTurn = turn;
    let currentMoveNum = moveNum;

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const san = typeof move === 'string' ? move : move.san || '';

      if (currentTurn === 'w') {
        moveTokens.push(`${currentMoveNum}. ${san}`);
        currentTurn = 'b';
      } else {
        if (i === 0 && turn === 'b') {
          // Black started the sequence
          moveTokens.push(`${currentMoveNum}... ${san}`);
        } else {
          moveTokens.push(san);
        }
        currentTurn = 'w';
        currentMoveNum++;
      }
    }
  }

  // Include Stockfish evaluation or best line as annotation comment if requested
  if (engineLines && engineLines.length > 0 && engineLines[0].sanMoves?.length > 0) {
    const top = engineLines[0];
    const pvStr = top.sanMoves.map((m) => `${m.prefix}${m.san}`).join(' ');
    moveTokens.push(`{ [%eval ${top.evalText}] Stockfish 19 NNUE: ${pvStr} }`);
  }

  // Append result at end
  moveTokens.push(result);

  // Group move text into lines of ~75 chars according to PGN spec
  const lines = [tags.join('\n'), ''];
  let currentLine = '';

  for (const token of moveTokens) {
    if ((currentLine + ' ' + token).trim().length > 78) {
      lines.push(currentLine.trim());
      currentLine = token;
    } else {
      currentLine = currentLine ? `${currentLine} ${token}` : token;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Trigger direct download of a PGN file in the browser
 */
export function downloadPgnFile(pgnContent, filename = 'chess-position.pgn') {
  if (!pgnContent) return;

  // Ensure filename has .pgn extension and clean safe characters
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const finalName = safeName.endsWith('.pgn') ? safeName : `${safeName || 'chess-puzzle'}.pgn`;

  const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy PGN text to clipboard
 */
export async function copyPgnToClipboard(pgnContent) {
  if (!pgnContent) return false;
  try {
    await navigator.clipboard.writeText(pgnContent);
    return true;
  } catch (err) {
    console.warn('Clipboard write failed:', err);
    return false;
  }
}
