// High-precision Fenshot Neural Engine for Chess Diagram Recognition
import { createRecognizer, resolveOrientation, placementToFen } from '@scoriiu/fenshot';

let fenshotRecognizer = null;

/**
 * Returns the singleton Fenshot recognizer instance
 */
export function getFenshotRecognizer() {
  if (!fenshotRecognizer) {
    fenshotRecognizer = createRecognizer({
      modelUrl: '/models/chess-tiles-v2.onnx',
      wasmPaths: '/ort/',
    });
    // Eagerly pre-warm runtime
    try {
      fenshotRecognizer.warmUp();
    } catch {
      // ignore
    }
  }
  return fenshotRecognizer;
}

/**
 * Recognize a chessboard diagram from an Image, Canvas, File, or Blob using Fenshot
 */
export async function scanWithFenshot(source, preferredTurn = 'w') {
  const recognizer = getFenshotRecognizer();

  const scanResult = await recognizer.recognize(source);

  if (!scanResult) {
    throw new Error('Fenshot could not detect a chessboard in the image. Please use the corner crop tool to align the board.');
  }

  // Resolve board perspective (White or Black at the bottom)
  const { placement, orientation } = resolveOrientation(scanResult.placement);
  const turn = preferredTurn || (orientation === 'black' ? 'b' : 'w');
  const validFen = placementToFen(placement, turn);

  const grid = placementToGrid(placement);

  return {
    fen: validFen,
    placement,
    orientation,
    meanConfidence: Math.round(scanResult.meanConfidence * 100),
    minConfidence: Math.round(scanResult.minConfidence * 100),
    reliable: scanResult.reliable,
    corners: scanResult.corners || null,
    grid,
  };
}

/**
 * Convert FEN placement string into 8x8 array of piece characters
 */
export function placementToGrid(placementStr) {
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

/**
 * Convert 8x8 grid back into FEN placement string
 */
export function gridToPlacement(grid) {
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

/**
 * Warp a 4-point perspective quad from a source image onto a square canvas
 */
export function warpPerspective(sourceImage, corners, outputSize = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const { tl, tr, br, bl } = corners;
  const steps = 8;
  const tileOut = outputSize / steps;

  for (let r = 0; r < steps; r++) {
    for (let c = 0; c < steps; c++) {
      const u0 = c / steps;
      const u1 = (c + 1) / steps;
      const v0 = r / steps;
      const v1 = (r + 1) / steps;

      const p00 = bilinear(tl, tr, br, bl, u0, v0);
      const p10 = bilinear(tl, tr, br, bl, u1, v0);
      const p11 = bilinear(tl, tr, br, bl, u1, v1);
      const p01 = bilinear(tl, tr, br, bl, u0, v1);

      const minX = Math.min(p00.x, p10.x, p11.x, p01.x);
      const maxX = Math.max(p00.x, p10.x, p11.x, p01.x);
      const minY = Math.min(p00.y, p10.y, p11.y, p01.y);
      const maxY = Math.max(p00.y, p10.y, p11.y, p01.y);

      const srcW = Math.max(1, maxX - minX);
      const srcH = Math.max(1, maxY - minY);

      ctx.drawImage(
        sourceImage,
        minX,
        minY,
        srcW,
        srcH,
        c * tileOut,
        r * tileOut,
        tileOut,
        tileOut
      );
    }
  }

  return canvas;
}

function bilinear(tl, tr, br, bl, u, v) {
  const x = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x;
  const y = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y;
  return { x, y };
}

/**
 * Propose initial square board corners centered with 8% margin
 */
export function estimateBoardCorners(imgWidth, imgHeight) {
  const size = Math.min(imgWidth, imgHeight) * 0.86;
  const cx = imgWidth / 2;
  const cy = imgHeight / 2;
  const half = size / 2;

  return {
    tl: { x: Math.max(0, cx - half), y: Math.max(0, cy - half) },
    tr: { x: Math.min(imgWidth, cx + half), y: Math.max(0, cy - half) },
    br: { x: Math.min(imgWidth, cx + half), y: Math.min(imgHeight, cy + half) },
    bl: { x: Math.max(0, cx - half), y: Math.min(imgHeight, cy + half) },
  };
}
