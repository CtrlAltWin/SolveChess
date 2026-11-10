import React, { useState } from 'react';
import { BishopLogo } from './BishopLogo';
import {
  Camera,
  Volume2,
  VolumeX,
  Palette,
  Edit3,
  HelpCircle,
  Trophy,
  Activity,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';

export function Navbar({
  onOpenScanner,
  onOpenEditor,
  onOpenHelp,
  activeMode = 'analysis', // 'analysis' | 'solver'
  onToggleMode,
  theme = 'emerald',
  onChangeTheme,
  isMuted = false,
  onToggleMute,
  themeMode = 'dark',
  onToggleThemeMode,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const themes = [
    { id: 'emerald', label: 'Neo Green' },
    { id: 'wood', label: 'Classic Wood' },
    { id: 'blue', label: 'Slate Blue' },
    { id: 'modern', label: 'Neutral Dark' },
  ];

  const isDark = themeMode === 'dark';

  return (
    <header className="header-dark sticky top-0 z-40 border-b border-chess text-chess-primary px-3 sm:px-4 py-2 transition-colors duration-200 shadow-xs">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand logo & title: SolveChess with two colors */}
        <div className="flex items-center gap-2 shrink-0">
          <BishopLogo size="md" />
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-base sm:text-lg tracking-tight flex items-center">
                <span className="text-[var(--color-primary)] font-black">Solve</span>
                <span className="font-bold text-white">Chess</span>
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-[#30435F] text-[#91B9F2] border border-[#4B8FE8]/30 hidden xs:inline-block">
                v2.0
              </span>
            </div>
            <p className="text-[10px] hidden sm:block text-[#AAB3C0]">
              Book Diagram Recognition • Stockfish 19 NNUE
            </p>
          </div>
        </div>

        {/* Desktop Navigation & Actions (>= 768px) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Main Scan Button */}
          <button
            onClick={onOpenScanner}
            className="btn-chess-primary"
            title="Scan chess diagram with camera or file upload"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Diagram</span>
          </button>

          {/* Mode switch: Analysis vs Solve */}
          <div className="flex items-center rounded-lg p-0.5 border border-[#414B59] bg-[#20242C] text-xs">
            <button
              type="button"
              onClick={() => onToggleMode('analysis')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeMode === 'analysis'
                  ? 'nav-pill-active'
                  : 'nav-pill-inactive hover:bg-[#303744] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Analysis</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMode('solver')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                activeMode === 'solver'
                  ? 'nav-pill-active'
                  : 'nav-pill-inactive hover:bg-[#303744] hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Solve</span>
            </button>
          </div>

          {/* Board Editor button */}
          <button
            onClick={onOpenEditor}
            className="btn-chess-secondary"
            title="Edit board position directly"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>

          {/* Board Theme picker */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#414B59] bg-[#353D49] text-xs">
            <Palette className="w-3.5 h-3.5 text-[#AAB3C0]" />
            <select
              value={theme}
              onChange={(e) => onChangeTheme(e.target.value)}
              className="bg-transparent font-medium text-[#F3F5F8] focus:outline-hidden cursor-pointer text-xs"
              aria-label="Select board theme"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#272D37] text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleThemeMode}
            className="btn-chess-secondary p-1.5"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#AAB3C0]" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="btn-chess-secondary p-1.5"
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            aria-label="Toggle sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-[#AAB3C0]" />}
          </button>

          {/* Help button */}
          <button
            onClick={onOpenHelp}
            className="btn-chess-secondary p-1.5"
            title="How to scan chess book diagrams"
            aria-label="Help and instructions"
          >
            <HelpCircle className="w-4 h-4 text-[#AAB3C0]" />
          </button>
        </div>

        {/* Mobile Navigation Header (< 768px): Strictly 1 Row, Zero Wrapping */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Compact Scan Button */}
          <button
            onClick={onOpenScanner}
            className="btn-chess-primary px-2.5 py-1 text-xs"
            title="Scan chess diagram"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[11px]">Scan</span>
          </button>

          {/* Compact Mode Pill (Analysis / Solve) */}
          <div className="flex items-center rounded-lg p-0.5 border border-[#414B59] bg-[#20242C] text-xs">
            <button
              type="button"
              onClick={() => onToggleMode('analysis')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                activeMode === 'analysis' ? 'nav-pill-active' : 'nav-pill-inactive hover:bg-[#303744] hover:text-white'
              }`}
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => onToggleMode('solver')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                activeMode === 'solver' ? 'nav-pill-active' : 'nav-pill-inactive hover:bg-[#303744] hover:text-white'
              }`}
            >
              Solve
            </button>
          </div>

          {/* Mobile Collapsible Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="btn-chess-secondary p-1.5"
            aria-label="Toggle mobile menu"
            title="More tools"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 pt-2 border-t border-chess flex flex-col gap-2 pb-1 animate-line-fade-in">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenEditor();
              }}
              className="btn-chess-secondary py-2 justify-start px-3"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Board Editor</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenHelp();
              }}
              className="btn-chess-secondary py-2 justify-start px-3"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Help & Guide</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#20242C] border border-[#414B59] text-xs">
            {/* Theme Select */}
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#AAB3C0]" />
              <select
                value={theme}
                onChange={(e) => onChangeTheme(e.target.value)}
                className="bg-transparent font-medium text-white text-xs focus:outline-hidden"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#272D37] text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound Toggle */}
              <button
                onClick={onToggleMute}
                className="btn-chess-secondary p-1.5"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-[#AAB3C0]" />}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={onToggleThemeMode}
                className="btn-chess-secondary p-1.5"
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-[#AAB3C0]" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
