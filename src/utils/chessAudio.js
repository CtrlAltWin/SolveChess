// Authentic Chess.com audio player with Web Audio fallback
class ChessAudio {
  constructor() {
    this.muted = false;
    this.audioPool = {};

    // Preload authentic Chess.com audio files
    const soundFiles = {
      move: '/sounds/move.mp3',
      capture: '/sounds/capture.mp3',
      castle: '/sounds/castle.mp3',
      check: '/sounds/check.mp3',
      promote: '/sounds/promote.mp3',
      gameEnd: '/sounds/game-end.mp3',
      illegal: '/sounds/illegal.mp3',
    };

    if (typeof window !== 'undefined') {
      Object.entries(soundFiles).forEach(([name, src]) => {
        try {
          const audio = new Audio(src);
          audio.preload = 'auto';
          this.audioPool[name] = audio;
        } catch {
          // ignore
        }
      });
    }
  }

  play(name) {
    if (this.muted) return;
    try {
      const original = this.audioPool[name];
      if (original) {
        // Clone node allows rapid overlapping sounds (e.g. fast moves)
        const soundClone = original.cloneNode();
        soundClone.volume = 0.9;
        soundClone.currentTime = 0;
        const playPromise = soundClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Fallback: try original if clone fails
            original.currentTime = 0;
            original.play().catch(() => {});
          });
        }
        return;
      }
    } catch {
      // ignore
    }
  }

  playMove() {
    this.play('move');
  }

  playCapture() {
    this.play('capture');
  }

  playCheck() {
    this.play('check');
  }

  playCastle() {
    this.play('castle');
  }

  playPromote() {
    this.play('promote');
  }

  playSuccess() {
    this.play('gameEnd');
  }

  playError() {
    this.play('illegal');
  }
}

export const chessAudio = new ChessAudio();
