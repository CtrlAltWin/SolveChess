# SolveChess • Neural Chess Diagram Scanner & Stockfish 19 NNUE Analysis

SolveChess is a high-performance web application designed to scan chess diagrams from books, screens, or photos using client-side ONNX neural piece recognition, and instantly analyze or solve them with Stockfish 19 NNUE.

---

## ✨ Features

- **Neural Diagram Scanning**: Fast, client-side chess diagram recognition powered by ONNX Runtime Web (`ort-wasm-simd-threaded.wasm`) and 4-corner perspective correction.
- **Stockfish 19 NNUE Engine**: In-browser chess engine running via WebAssembly with multi-PV candidate move calculations, evaluation bar, best move arrow, and threat analysis.
- **Solve Mode**: Clean puzzle-solving workspace with progressive hints, solution reveal, side-to-play validation, and move exploration.
- **Board Editor & FEN/PGN Tools**: Full custom position editor with castling rights, turn selection, standard PGN download/copy, and FEN import/export.
- **Themes & Responsive Layout**: Light and Dark theme modes, customizable board palettes (Neo Green, Classic Wood, Slate Blue, Neutral Dark), and touch-friendly controls.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```

### 4. Integrity Verification Suite
```bash
npm test
```

---

## 📂 Project Architecture

```
SolveChess/
├── public/               # Static models, WASM binaries, chess sounds, pieces, favicon
│   ├── models/           # ONNX neural chess tile classifier
│   ├── ort/              # ONNX Runtime SIMD threaded WASM runtime
│   ├── pieces/neo/       # High-definition chess piece assets
│   ├── sounds/           # Move, capture, check, and game-end audio
│   └── stockfish/        # Stockfish 19 NNUE engine and WASM binary
├── src/
│   ├── components/
│   │   ├── ChessBoard/   # Board rendering, move history, eval bar
│   │   ├── EnginePanel/  # Multi-PV Stockfish lines and engine controls
│   │   ├── Navigation/   # Header navbar, brand logo, modals
│   │   ├── PositionControls/ # Board editor and FEN/PGN controls
│   │   ├── PuzzleSolver/ # Dedicated puzzle solving interface
│   │   └── Scanner/      # Diagram scanner, perspective warp, camera
│   ├── services/         # Stockfish 19 & ONNX vision service workers
│   └── utils/            # Audio synthesis, PGN generation, geometry
├── scripts/              # Automated test and verification scripts
└── package.json
```
