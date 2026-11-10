import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BishopLogo } from '../Navigation/BishopLogo';
import {
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Crop,
  X,
} from 'lucide-react';
import {
  estimateBoardCorners,
  warpPerspective,
  scanWithFenshot,
  gridToPlacement,
} from '../../services/imageChessService';
import { ChessPiece } from '../ChessBoard/ChessPiece';
import { generatePgn, downloadPgnFile, copyPgnToClipboard } from '../../utils/pgnExport';

export function ChessScanner({
  onLoadPosition, // (fen, caption) => void
  onClose,
  initialFile = null,
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'camera'
  const [sourceImage, setSourceImage] = useState(null); // HTMLImageElement
  const [imageSrc, setImageSrc] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  
  // 4 corners { tl, tr, br, bl }
  const [corners, setCorners] = useState(null);
  const [activeCornerDrag, setActiveCornerDrag] = useState(null);
  const [showCornerAdjuster, setShowCornerAdjuster] = useState(false);
  
  // Drag and drop state for file dropzone
  const [isDragOver, setIsDragOver] = useState(false);

  // Recognition results
  const [scannedBoardGrid, setScannedBoardGrid] = useState(null); // 8x8 array of piece chars
  const [scannedTurn, setScannedTurn] = useState('w');
  const [scannedCastling, setScannedCastling] = useState({ K: true, Q: true, k: true, q: true });
  const [scannedCaption] = useState('Chess Puzzle Book Diagram');
  const [confidenceStats, setConfidenceStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionError, setRecognitionError] = useState(null);
  const [selectedPiecePalette, setSelectedPiecePalette] = useState('P');
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(null);
  const [copiedPgn, setCopiedPgn] = useState(false);

  const videoRef = useRef(null);
  const imageContainerRef = useRef(null);
  const streamRef = useRef(null);

  // Generate perspective warped board preview
  const generateWarpedPreview = useCallback((img, corn) => {
    if (!img || !corn) return;
    try {
      const warpedCanvas = warpPerspective(img, corn, 512);
      setCroppedPreviewUrl(warpedCanvas.toDataURL('image/jpeg', 0.92));
    } catch (err) {
      console.warn('Warp preview error:', err);
    }
  }, []);

  // Run Fenshot recognition with fallback to manual corner alignment
  const runFenshotRecognition = useCallback(async (imgToScan, cornToUse) => {
    const img = imgToScan || sourceImage;
    const currentCorners = cornToUse || corners;
    if (!img) return;

    setIsProcessing(true);
    setRecognitionError(null);

    try {
      let scanResult = null;

      // Attempt 1: Direct Fenshot full-image scan (finds board automatically)
      try {
        scanResult = await scanWithFenshot(img, scannedTurn);
      } catch {
        // Auto-detect couldn't locate chessboard; fall back to warped canvas
      }

      // Attempt 2: If full scan failed, use the 4 corners to warp board and scan warped canvas
      if (!scanResult && currentCorners) {
        const warpedCanvas = warpPerspective(img, currentCorners, 512);
        scanResult = await scanWithFenshot(warpedCanvas, scannedTurn);
      }

      if (scanResult && scanResult.grid) {
        setScannedBoardGrid(scanResult.grid);
        if (scanResult.orientation === 'black') {
          setScannedTurn('b');
        }
        setConfidenceStats({
          mean: scanResult.meanConfidence,
          min: scanResult.minConfidence,
          reliable: scanResult.reliable,
        });

        // If Fenshot detected refined corners on the image, update them
        if (scanResult.corners && scanResult.corners.tl) {
          setCorners(scanResult.corners);
          generateWarpedPreview(img, scanResult.corners);
        } else if (currentCorners) {
          generateWarpedPreview(img, currentCorners);
        }

        setShowCornerAdjuster(false);
      } else {
        throw new Error('Could not detect chessboard. Please align the 4 corner pins.');
      }
    } catch (err) {
      console.warn('Fenshot scan failed:', err);
      setRecognitionError(
        'Could not automatically detect the board. Drag the 4 corner pins onto the chessboard corners and click "Scan Aligned Board".'
      );
      setShowCornerAdjuster(true);
    } finally {
      setIsProcessing(false);
    }
  }, [sourceImage, corners, scannedTurn, generateWarpedPreview]);

  // Helper: Load image from data URL or blob URL
  const loadImageFromUrl = useCallback((url, autoScan = true) => {
    setImageSrc(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setSourceImage(img);
      const estCorners = estimateBoardCorners(img.naturalWidth, img.naturalHeight);
      setCorners(estCorners);
      setRecognitionError(null);
      generateWarpedPreview(img, estCorners);

      if (autoScan) {
        runFenshotRecognition(img, estCorners);
      }
    };
    img.src = url;
  }, [generateWarpedPreview, runFenshotRecognition]);

  const loadFile = useCallback((file, autoScan = true) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      loadImageFromUrl(e.target.result, autoScan);
    };
    reader.readAsDataURL(file);
  }, [loadImageFromUrl]);

  // Load initial file if provided
  useEffect(() => {
    if (initialFile) {
      loadFile(initialFile, true);
    }
  }, [initialFile, loadFile]);

  // Global clipboard paste inside scanner
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            loadFile(file, true);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadFile]);

  // Camera start / stop
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (facing = cameraFacing) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraFacing(facing);
    } catch (err) {
      console.warn('Camera access failed:', err);
      setRecognitionError('Could not access camera. Please check permissions or use image upload.');
    }
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 0);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();
    loadImageFromUrl(dataUrl, true);
  };

  // Drag and drop handlers for upload area
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      loadFile(files[0], true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Corner dragging logic
  const handleCornerMouseDown = (e, cornerKey) => {
    e.stopPropagation();
    setActiveCornerDrag(cornerKey);
  };

  const handleCornerTouchStart = (e, cornerKey) => {
    e.stopPropagation();
    setActiveCornerDrag(cornerKey);
  };

  useEffect(() => {
    if (!activeCornerDrag || !imageContainerRef.current || !sourceImage) return;

    const handlePointerMove = (clientX, clientY) => {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const scaleX = sourceImage.naturalWidth / rect.width;
      const scaleY = sourceImage.naturalHeight / rect.height;

      const imgX = relX * scaleX;
      const imgY = relY * scaleY;

      setCorners((prev) => ({
        ...prev,
        [activeCornerDrag]: { x: imgX, y: imgY },
      }));
    };

    const onMouseMove = (e) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onPointerUp = () => {
      setActiveCornerDrag(null);
      if (sourceImage && corners) {
        generateWarpedPreview(sourceImage, corners);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [activeCornerDrag, sourceImage, corners, generateWarpedPreview]);

  const handleSquareClick = (r, c) => {
    if (!scannedBoardGrid) return;
    const newGrid = scannedBoardGrid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? selectedPiecePalette : val))
    );
    setScannedBoardGrid(newGrid);
  };

  // Assemble full valid FEN
  const getCurrentValidFen = () => {
    if (!scannedBoardGrid) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const placement = gridToPlacement(scannedBoardGrid);

    let castlingStr = '';
    if (scannedCastling.K) castlingStr += 'K';
    if (scannedCastling.Q) castlingStr += 'Q';
    if (scannedCastling.k) castlingStr += 'k';
    if (scannedCastling.q) castlingStr += 'q';
    if (!castlingStr) castlingStr = '-';

    return `${placement} ${scannedTurn} ${castlingStr} - 0 1`;
  };

  const handleApplyToAnalysis = () => {
    const fullFen = getCurrentValidFen();
    onLoadPosition(fullFen, scannedCaption || 'Scanned Chess Puzzle Diagram');
    onClose();
  };

  const handleDownloadPgn = () => {
    const fullFen = getCurrentValidFen();
    const pgnString = generatePgn({
      fen: fullFen,
      initialFen: fullFen,
      history: [],
      caption: scannedCaption || 'Puzzle Book Position',
      title: 'Scanned Chess Puzzle Diagram',
      event: 'Chess Puzzle Book Study',
      white: scannedTurn === 'w' ? 'White to Move' : 'White',
      black: scannedTurn === 'b' ? 'Black to Move' : 'Black',
      result: '*',
    });

    const fenPrefix = fullFen.split(' ')[0].replace(/\//g, '-').slice(0, 16);
    downloadPgnFile(pgnString, `puzzle-${fenPrefix}.pgn`);
  };

  const handleCopyPgn = async () => {
    const fullFen = getCurrentValidFen();
    const pgnString = generatePgn({
      fen: fullFen,
      initialFen: fullFen,
      caption: scannedCaption || 'Puzzle Book Position',
      title: 'Scanned Chess Puzzle Diagram',
    });
    const ok = await copyPgnToClipboard(pgnString);
    if (ok) {
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    }
  };

  const getCornerPercent = (cornerKey) => {
    if (!corners || !sourceImage || !corners[cornerKey]) return { x: 0, y: 0 };
    return {
      x: (corners[cornerKey].x / sourceImage.naturalWidth) * 100,
      y: (corners[cornerKey].y / sourceImage.naturalHeight) * 100,
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-chess-modal text-chess-primary border border-[#414B59] rounded-2xl shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden transition-colors">
        {/* Header: Persistent Dark Header with standard SolveChess logo style */}
        <div className="header-dark bg-[#272D37] border-b border-[#414B59] p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BishopLogo size="lg" />
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center tracking-tight flex-wrap">
                <span className="text-[var(--color-primary)] font-black">Solve</span>
                <span className="font-bold text-white">Chess</span>
                <span className="ml-1.5 font-bold text-white">Diagram Scanner</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#30435F] text-[#91B9F2] border border-[#4B8FE8]/30 font-semibold">
                  Neural Recognition
                </span>
              </h2>
              <p className="text-xs text-[#AAB3C0]">
                In-browser piece recognition • Standard PGN export
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-chess-secondary p-1.5 text-[#AAB3C0] hover:text-white"
            aria-label="Close"
            title="Close Scanner"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Input Navigation Tabs (when no image is loaded yet) */}
        {!sourceImage && (
          <div className="flex border-b border-chess bg-chess-surface p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'nav-pill-active'
                  : 'nav-pill-inactive'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload / Drop Image
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'nav-pill-active'
                  : 'nav-pill-inactive'
              }`}
            >
              <Camera className="w-4 h-4" />
              Live Camera
            </button>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* STEP 1: INITIAL UPLOAD / CAMERA */}
          {!sourceImage && (
            <div>
              {/* Drag and Drop Zone */}
              {activeTab === 'upload' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                      : 'border-chess bg-chess-surface/40 hover:border-[var(--color-primary)]'
                  }`}
                  onClick={() => document.getElementById('chess-file-input')?.click()}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-active-bg)] text-[var(--color-active-text)] flex items-center justify-center mb-3 border border-[var(--color-primary)]/30">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold mb-1">
                    Drag & Drop Chess Diagram Image Here
                  </h3>
                  <p className="text-xs text-chess-secondary max-w-md mb-4">
                    Drop a photo or screenshot from your chess puzzle book.
                    You can also paste directly with <kbd className="px-1.5 py-0.5 rounded bg-chess-surface border border-chess font-mono text-[10px]">Ctrl + V</kbd>!
                  </p>
                  <div className="btn-chess-primary px-4 py-2 text-xs shadow-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Browse Photos / Files
                  </div>
                  <input
                    id="chess-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0], true)}
                  />
                </div>
              )}

              {/* Camera Tab */}
              {activeTab === 'camera' && (
                <div className="relative rounded-2xl overflow-hidden bg-[#1E1C1A] flex flex-col items-center justify-center aspect-4/3 max-w-md mx-auto border border-chess">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-8 border-2 border-dashed border-[var(--color-primary)]/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-full h-full grid grid-cols-8 grid-rows-8 opacity-25 border border-[var(--color-primary)]">
                      {Array(64).fill(0).map((_, i) => (
                        <div key={i} className="border border-[var(--color-primary)]/30" />
                      ))}
                    </div>
                    <span className="absolute bottom-2 bg-black/80 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                      Align 8x8 diagram in box
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-4 z-20">
                    <button
                      onClick={() => startCamera(cameraFacing === 'environment' ? 'user' : 'environment')}
                      className="p-2.5 rounded-full bg-chess-card text-chess-primary border border-chess shadow-md cursor-pointer hover:bg-chess-surface"
                      title="Flip camera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="w-12 h-12 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white flex items-center justify-center shadow-lg ring-4 ring-[var(--color-primary)]/30 cursor-pointer"
                      title="Capture photo"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CORNER ADJUSTER (When manual perspective tuning is requested or required) */}
          {sourceImage && showCornerAdjuster && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm">
                    Drag the 4 Corner Pins onto the Chessboard
                  </h3>
                  <p className="text-xs text-chess-secondary">
                    Correct skewed or angled photo perspective from your chess book.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSourceImage(null);
                      setImageSrc(null);
                      setCorners(null);
                      setScannedBoardGrid(null);
                    }}
                    className="btn-chess-secondary px-3 py-1.5 text-xs"
                  >
                    Change Image
                  </button>
                  <button
                    onClick={() => {
                      const est = estimateBoardCorners(sourceImage.naturalWidth, sourceImage.naturalHeight);
                      setCorners(est);
                      generateWarpedPreview(sourceImage, est);
                    }}
                    className="btn-chess-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Box
                  </button>
                </div>
              </div>

              {/* Corner adjustment: Source photo on left, Straightened preview on right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Source Image with safe padding so pins are NEVER clipped */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-chess-secondary">
                    Photograph (Drag 4 pins onto board corners):
                  </span>
                  <div
                    ref={imageContainerRef}
                    className="relative select-none touch-none rounded-xl border border-chess bg-[#1E1C1A] flex items-center justify-center p-3 h-[290px]"
                  >
                    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
                      <img
                        src={imageSrc}
                        alt="Source chess book"
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />

                      {/* SVG quad polygon connecting 4 corner pins */}
                      {corners && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                          <polygon
                            points={`
                              ${getCornerPercent('tl').x}%,${getCornerPercent('tl').y}%
                              ${getCornerPercent('tr').x}%,${getCornerPercent('tr').y}%
                              ${getCornerPercent('br').x}%,${getCornerPercent('br').y}%
                              ${getCornerPercent('bl').x}%,${getCornerPercent('bl').y}%
                            `}
                            fill="rgba(57, 120, 212, 0.2)"
                            stroke="var(--color-primary)"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                          />
                        </svg>
                      )}

                      {/* 4 Corner Pins: Large, high contrast, never clipped */}
                      {corners &&
                        ['tl', 'tr', 'br', 'bl'].map((key) => {
                          const pos = getCornerPercent(key);
                          const label = key === 'tl' ? 'TL' : key === 'tr' ? 'TR' : key === 'br' ? 'BR' : 'BL';
                          return (
                            <div
                              key={key}
                              onMouseDown={(e) => handleCornerMouseDown(e, key)}
                              onTouchStart={(e) => handleCornerTouchStart(e, key)}
                              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--color-primary)] border-2 border-white shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center text-[10px] font-extrabold text-white uppercase hover:scale-115 z-30 transition-transform select-none"
                              title={`Corner ${label}: drag to board corner`}
                            >
                              {label}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Perspective Warped Board Preview & Scan Action */}
                <div className="flex flex-col gap-1.5 justify-between bg-chess-surface border border-chess rounded-xl p-3.5">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-chess-secondary">
                      Straightened Board Preview
                    </span>
                    {croppedPreviewUrl ? (
                      <img
                        src={croppedPreviewUrl}
                        alt="Straightened Board"
                        className="w-44 h-44 rounded-lg border-2 border-[var(--color-primary)]/70 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-44 h-44 rounded-lg border border-chess bg-chess-card flex items-center justify-center text-xs text-chess-secondary">
                        Adjust pins to preview
                      </div>
                    )}
                    <p className="text-[11px] text-center text-chess-secondary max-w-xs mt-1">
                      Check that the 8x8 squares are centered and upright inside the box.
                    </p>
                  </div>

                  <button
                    onClick={() => runFenshotRecognition(sourceImage, corners)}
                    disabled={isProcessing}
                    className="btn-chess-primary w-full py-2.5 text-xs font-bold shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {isProcessing ? 'Analyzing with Fenshot...' : 'Scan Aligned Board'}
                  </button>
                </div>
              </div>

              {/* Subtle error/warning box */}
              {recognitionError && (
                <div className="p-3 rounded-xl border border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{recognitionError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RECOGNITION RESULT & VERIFICATION */}
          {sourceImage && !showCornerAdjuster && scannedBoardGrid && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-chess gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                      <span>Diagram Recognized</span>
                      {confidenceStats && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          confidenceStats.reliable
                            ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border border-[var(--color-primary)]/30'
                            : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                        }`}>
                          Fenshot: {confidenceStats.mean}% confidence
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-chess-secondary">
                      Check pieces against your book. Click any square to change pieces if needed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDownloadPgn}
                    className="btn-chess-primary px-3 py-1.5 text-xs font-semibold shadow-xs"
                    title="Download recognized position as standard PGN file"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Download PGN</span>
                  </button>
                  <button
                    onClick={handleCopyPgn}
                    className="btn-chess-surface px-2.5 py-1.5 text-xs font-semibold"
                    title="Copy PGN to clipboard"
                  >
                    {copiedPgn ? <Check className="w-3.5 h-3.5 text-[var(--color-primary)] mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    <span>{copiedPgn ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setShowCornerAdjuster(true)}
                    className="btn-chess-surface px-2.5 py-1.5 text-xs"
                    title="Adjust corner alignment"
                  >
                    <Crop className="w-3.5 h-3.5 mr-1" />
                    <span>Adjust Corners</span>
                  </button>
                </div>
              </div>

              {/* Side-by-side comparison: Cropped Diagram vs Digital Board */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-items-center">
                {/* Book Diagram */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[240px]">
                  <span className="text-[11px] font-semibold text-chess-secondary">
                    Source Book Diagram:
                  </span>
                  {croppedPreviewUrl && (
                    <img
                      src={croppedPreviewUrl}
                      alt="Source diagram"
                      className="w-full aspect-square rounded-xl border-2 border-chess object-cover shadow-sm"
                    />
                  )}
                </div>

                {/* Digital Board */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[240px]">
                  <span className="text-[11px] font-semibold text-chess-secondary">
                    Detected Board (Tap square to edit):
                  </span>
                  <div className="w-full aspect-square grid grid-cols-8 grid-rows-8 border-2 border-chess rounded-xl overflow-hidden shadow-sm">
                    {scannedBoardGrid.map((row, r) =>
                      row.map((pieceChar, c) => {
                        const isLight = (r + c) % 2 === 0;
                        return (
                          <div
                            key={`${r}-${c}`}
                            onClick={() => handleSquareClick(r, c)}
                            className={`relative flex items-center justify-center cursor-pointer transition-colors hover:ring-2 hover:ring-[var(--color-primary)] hover:z-10 ${
                              isLight ? 'bg-[#EEEED2]' : 'bg-[#769656]'
                            }`}
                          >
                            {pieceChar && (
                              <div className="w-[85%] h-[85%]">
                                <ChessPiece piece={pieceChar} />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Piece Replacement Palette */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-chess bg-chess-surface">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-chess-primary">
                    Edit Pieces (Select piece below, then click square):
                  </span>
                  <button
                    onClick={() => setSelectedPiecePalette(null)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                      selectedPiecePalette === null
                        ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                        : 'btn-chess-surface text-chess-secondary'
                    }`}
                  >
                    Clear Square
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
                  {/* White pieces */}
                  <div className="flex gap-1">
                    {['K', 'Q', 'R', 'B', 'N', 'P'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPiecePalette(p)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-0.5 flex items-center justify-center border transition-all cursor-pointer ${
                          selectedPiecePalette === p
                            ? 'bg-[var(--color-active-bg)] border-2 border-[var(--color-primary)] scale-110 shadow-xs'
                            : 'bg-chess-card border-chess'
                        }`}
                      >
                        <ChessPiece piece={p} />
                      </button>
                    ))}
                  </div>

                  {/* Black pieces */}
                  <div className="flex gap-1">
                    {['k', 'q', 'r', 'b', 'n', 'p'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPiecePalette(p)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-0.5 flex items-center justify-center border transition-all cursor-pointer ${
                          selectedPiecePalette === p
                            ? 'bg-[var(--color-active-bg)] border-2 border-[var(--color-primary)] scale-110 shadow-xs'
                            : 'bg-chess-card border-chess'
                        }`}
                      >
                        <ChessPiece piece={p} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Side to Move & Castling Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl border border-chess bg-chess-surface">
                {/* Side to Move */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-chess-primary">
                    Who moves first?
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScannedTurn('w')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        scannedTurn === 'w'
                          ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border-[var(--color-primary)] shadow-xs ring-2 ring-[var(--color-primary)]/40 font-bold'
                          : 'btn-chess-surface text-chess-secondary'
                      }`}
                    >
                      White to Move
                    </button>
                    <button
                      type="button"
                      onClick={() => setScannedTurn('b')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        scannedTurn === 'b'
                          ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border-[var(--color-primary)] shadow-xs ring-2 ring-[var(--color-primary)]/40 font-bold'
                          : 'btn-chess-surface text-chess-secondary'
                      }`}
                    >
                      Black to Move
                    </button>
                  </div>
                </div>

                {/* Castling rights */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-chess-primary">
                    Castling Rights:
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {['K', 'Q', 'k', 'q'].map((cKey) => {
                      const active = scannedCastling[cKey];
                      const label = cKey === 'K' ? 'W O-O' : cKey === 'Q' ? 'W O-O-O' : cKey === 'k' ? 'B O-O' : 'B O-O-O';
                      return (
                        <button
                          key={cKey}
                          onClick={() => setScannedCastling((prev) => ({ ...prev, [cKey]: !prev[cKey] }))}
                          className={`py-1 rounded-md text-[10px] font-medium border text-center transition-all cursor-pointer ${
                            active
                              ? 'bg-[var(--color-active-bg)] text-[var(--color-active-text)] border-[var(--color-primary)] font-bold'
                              : 'btn-chess-surface text-chess-secondary'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FEN String Preview */}
              <div className="p-2 rounded-lg border border-chess bg-chess-surface text-[11px] font-mono truncate text-chess-secondary">
                FEN: <span className="font-semibold text-chess-primary">{getCurrentValidFen()}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-chess">
                <button
                  onClick={() => {
                    setSourceImage(null);
                    setImageSrc(null);
                    setScannedBoardGrid(null);
                  }}
                  className="btn-chess-surface px-3 py-1.5 text-xs font-semibold"
                >
                  Scan Another Image
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="btn-chess-surface px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyToAnalysis}
                    className="btn-chess-primary px-5 py-2 text-xs font-bold shadow-md"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Load into Analysis Board & Stockfish NNUE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
