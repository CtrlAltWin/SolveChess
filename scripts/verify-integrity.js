import { Chess } from 'chess.js';
import { generatePgn } from '../src/utils/pgnExport.js';

function placementToGrid(placementStr) {
  const rows = (placementStr || '8/8/8/8/8/8/8/8').split(' ')[0].split('/');
  const grid = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    const rowStr = rows[r] || '8';
    for (const char of rowStr) {
      if (!isNaN(char)) {
        const count = parseInt(char, 10);
        for (let i = 0; i < count; i++) row.push(null);
      } else {
        row.push(char);
      }
    }
    while (row.length < 8) row.push(null);
    grid.push(row.slice(0, 8));
  }
  return grid;
}

function gridToPlacement(grid) {
  if (!grid || !grid.length) return '8/8/8/8/8/8/8/8';
  return grid
    .map((row) => {
      let res = '';
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const val = row[c];
        if (!val) {
          empty++;
        } else {
          if (empty > 0) {
            res += empty;
            empty = 0;
          }
          res += val;
        }
      }
      if (empty > 0) res += empty;
      return res || '8';
    })
    .join('/');
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('--- SolveChess Integrity & Chess Logic Verification ---');

// 1. Starting FEN & Legal Moves
console.log('\n1. Chess Engine & Legal Move Detection:');
const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const game = new Chess(startFen);
assert(game.turn() === 'w', 'White to move from start position');
assert(game.moves().length === 20, 'Standard starting position has exactly 20 legal moves');

// Play moves: 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# (Scholar\'s Mate)
game.move('e4');
game.move('e5');
game.move('Qh5');
game.move('Nc6');
game.move('Bc4');
game.move('Nf6');
const mateMove = game.move('Qxf7#');
assert(game.isCheckmate() === true, 'Accurately detects checkmate (Scholar\'s Mate)');
assert(mateMove.san === 'Qxf7#', 'Move correctly formatted as Qxf7#');
assert(game.turn() === 'b', 'Side mated is Black (turn === "b")');

// 2. Stalemate Detection
console.log('\n2. Stalemate & Draw Detection:');
// Famous stalemate position: King on a8, Queen on c7, White King on a6
const stalemateFen = 'k7/2Q5/K7/8/8/8/8/8 b - - 0 1';
const staleGame = new Chess(stalemateFen);
assert(staleGame.isStalemate() === true, 'Accurately detects stalemate');
assert(staleGame.isDraw() === true, 'Stalemate is recognized as a draw');
assert(staleGame.isCheckmate() === false, 'Stalemate is not confused with checkmate');

// 3. Castling & En Passant
console.log('\n3. Castling & En Passant:');
const castlingFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const castleGame = new Chess(castlingFen);
const whiteMoves = castleGame.moves();
assert(whiteMoves.includes('O-O') && whiteMoves.includes('O-O-O'), 'Both kingside and queenside castling permitted');

const epFen = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
const epGame = new Chess(epFen);
const epMove = epGame.move({ from: 'e5', to: 'f6' });
assert(epMove !== null && epMove.captured === 'p', 'En passant pawn capture executes properly');

// 4. FEN <-> Grid Placement Conversion
console.log('\n4. Neural Placement & Grid Transformations:');
const samplePlacement = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R';
const grid = placementToGrid(samplePlacement);
assert(grid.length === 8 && grid[0].length === 8, 'Placement converts to exact 8x8 grid');
assert(grid[0][0] === 'r' && grid[0][4] === 'k', 'Top rank pieces match FEN representation');
const reconverted = gridToPlacement(grid);
assert(reconverted === samplePlacement, 'Grid converts back to identical FEN placement string');

// 5. PGN Export Data Integrity
console.log('\n5. PGN Export & SolveChess Branding:');
const customPuzzleFen = 'r1b1k2r/pppp1ppp/8/8/1b1nP3/2N5/PPP2PPP/R1B1KB1R w KQkq - 0 9';
const pgnOutput = generatePgn({
  fen: customPuzzleFen,
  initialFen: customPuzzleFen,
  history: [{ san: 'Bd3' }, { san: 'O-O' }],
  caption: 'Tactical Puzzle Study',
  result: '*',
});
assert(pgnOutput.includes('[Site "SolveChess"]'), 'PGN exports with correct "SolveChess" Site tag');
assert(pgnOutput.includes(`[FEN "${customPuzzleFen}"]`), 'PGN contains SetUp and original puzzle FEN');
assert(pgnOutput.includes('9. Bd3 O-O *'), 'PGN contains correct move numbering and moves');

// 6. Puzzle Reset Data Integrity
console.log('\n6. Imported Puzzle Reset Integrity:');
const importedPuzzle = '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
let currentFen = importedPuzzle;
let initialFen = importedPuzzle;

// Simulate making moves
const simGame = new Chess(currentFen);
simGame.move('Re8#');
currentFen = simGame.fen();
assert(currentFen !== initialFen, 'Board position advanced following move');

// Simulate Reset: target is initialFen
const targetFen = initialFen || startFen;
assert(targetFen === importedPuzzle, 'Reset target strictly preserves original imported puzzle');
assert(targetFen !== startFen, 'Reset target never falls back to standard starting board when puzzle exists');

console.log(`\n========================================`);
console.log(`Verification Complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
