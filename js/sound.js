/**
 * Sound synthesizer using Web Audio API for The 0-to-1 Founder Benchmark
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof (window.AudioContext || window.webkitAudioContext) !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(freq, type = "sine", duration = 0.1, gainVal = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback silent
    }
  }

  click() {
    this.playTone(800, "sine", 0.05, 0.04);
  }

  select() {
    this.playTone(520, "triangle", 0.08, 0.06);
    setTimeout(() => this.playTone(780, "sine", 0.08, 0.05), 40);
  }

  flag() {
    this.playTone(660, "sine", 0.1, 0.05);
  }

  navigate() {
    this.playTone(440, "sine", 0.05, 0.03);
  }

  warning() {
    if (!this.enabled) return;
    this.playTone(400, "sawtooth", 0.2, 0.05);
    setTimeout(() => this.playTone(350, "sawtooth", 0.25, 0.05), 180);
  }

  pass() {
    if (!this.enabled) return;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C major arpeggio
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, "triangle", 0.35, 0.09);
      }, idx * 110);
    });
    setTimeout(() => {
      // High triumph note
      this.playTone(1318.51, "sine", 0.6, 0.08);
    }, 480);
  }

  fail() {
    if (!this.enabled) return;
    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, "sawtooth", 0.25, 0.05);
      }, idx * 130);
    });
  }
}

window.soundEngine = new SoundEngine();
