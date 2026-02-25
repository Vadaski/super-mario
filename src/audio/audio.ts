// Super Mario Bros Audio Engine
// All sounds synthesized via Web Audio API - no external files needed.
// Uses square/triangle/sawtooth oscillators and noise buffers to approximate
// the original NES APU sound.

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

type OscType = OscillatorType;

interface NoteEntry {
  freq: number; // Hz, 0 = rest
  dur: number;  // seconds
}

// ---------------------------------------------------------------------------
// AudioEngine
// ---------------------------------------------------------------------------

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicPlaying = false;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private musicVolume = 0.35;
  private sfxVolume = 0.5;
  private muted = false;
  private activeMusicOscillators: OscillatorNode[] = [];
  private activeMusicGains: GainNode[] = [];
  private musicTimeouts: number[] = [];
  private loopHandle: number | null = null;

  // -----------------------------------------------------------------------
  // Initialisation
  // -----------------------------------------------------------------------

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.init();
    if (this.ctx!.state === 'suspended') this.ctx!.resume();
    return this.ctx!;
  }

  // -----------------------------------------------------------------------
  // Low-level helpers
  // -----------------------------------------------------------------------

  /** Create an oscillator routed through a gain envelope and connect to dest. */
  private tone(
    freq: number,
    type: OscType,
    startTime: number,
    duration: number,
    dest: GainNode,
    volume = 0.3,
    freqEnd?: number,
  ): { osc: OscillatorNode; gain: GainNode } {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, startTime);
    // Quick release to avoid clicks
    g.gain.setValueAtTime(volume, startTime + duration - 0.005);
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(g);
    g.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration);
    return { osc, gain: g };
  }

  /** Play a sequence of NoteEntry objects through a square wave, returning total duration. */
  private playSequence(
    notes: NoteEntry[],
    startTime: number,
    dest: GainNode,
    type: OscType = 'square',
    volume = 0.25,
  ): number {
    const ctx = this.ensureCtx();
    let t = startTime;
    for (const n of notes) {
      if (n.freq > 0) {
        this.tone(n.freq, type, t, n.dur - 0.005, dest, volume);
      }
      t += n.dur;
    }
    return t - startTime;
  }

  /** Create a short burst of white noise for percussive sounds. */
  private noise(
    startTime: number,
    duration: number,
    dest: GainNode,
    volume = 0.15,
  ): void {
    const ctx = this.ensureCtx();
    const bufSize = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, startTime);
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    src.connect(g);
    g.connect(dest);
    src.start(startTime);
    src.stop(startTime + duration);
  }

  // -----------------------------------------------------------------------
  // Note frequency helpers
  // -----------------------------------------------------------------------

  private static noteFreqs: Record<string, number> = (() => {
    const base: Record<string, number> = {
      C: 16.35, 'C#': 17.32, D: 18.35, 'D#': 19.45, E: 20.6,
      F: 21.83, 'F#': 23.12, G: 24.5, 'G#': 25.96, A: 27.5,
      'A#': 29.14, B: 30.87,
    };
    const map: Record<string, number> = {};
    for (let oct = 0; oct <= 8; oct++) {
      for (const [name, f] of Object.entries(base)) {
        map[`${name}${oct}`] = f * Math.pow(2, oct);
      }
    }
    return map;
  })();

  private f(note: string): number {
    return AudioEngine.noteFreqs[note] ?? 440;
  }

  // -----------------------------------------------------------------------
  // Sound effects
  // -----------------------------------------------------------------------

  jump(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(200, 'square', t, 0.15, this.sfxGain!, 0.25, 600);
  }

  jumpBig(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(150, 'square', t, 0.18, this.sfxGain!, 0.25, 500);
    this.tone(500, 'square', t + 0.05, 0.13, this.sfxGain!, 0.12, 700);
  }

  stomp(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.noise(t, 0.06, this.sfxGain!, 0.2);
    this.tone(120, 'square', t, 0.08, this.sfxGain!, 0.25, 60);
  }

  bump(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(260, 'square', t, 0.07, this.sfxGain!, 0.25, 160);
    this.noise(t, 0.04, this.sfxGain!, 0.1);
  }

  coin(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // B5 then E6 -- the classic ding-ding
    this.tone(this.f('B5'), 'square', t, 0.08, this.sfxGain!, 0.25);
    this.tone(this.f('E6'), 'square', t + 0.08, 0.32, this.sfxGain!, 0.25);
  }

  powerUp(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // Ascending arpeggio through major chord tones over ~1 second
    const notes: [number, number][] = [
      [this.f('C4'), 0.08], [this.f('E4'), 0.08], [this.f('G4'), 0.08],
      [this.f('C5'), 0.08], [this.f('E5'), 0.08], [this.f('G5'), 0.08],
      [this.f('C6'), 0.08], [this.f('E6'), 0.08], [this.f('G6'), 0.08],
      [this.f('C7'), 0.16],
    ];
    let offset = 0;
    for (const [freq, dur] of notes) {
      this.tone(freq, 'square', t + offset, dur - 0.005, this.sfxGain!, 0.2);
      offset += dur;
    }
  }

  powerDown(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(600, 'square', t, 0.3, this.sfxGain!, 0.25, 150);
  }

  oneUp(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const notes: [number, number][] = [
      [this.f('E5'), 0.1], [this.f('G5'), 0.1], [this.f('E6'), 0.1],
      [this.f('C6'), 0.1], [this.f('D6'), 0.1], [this.f('G6'), 0.2],
    ];
    let offset = 0;
    for (const [freq, dur] of notes) {
      this.tone(freq, 'square', t + offset, dur - 0.005, this.sfxGain!, 0.2);
      offset += dur;
    }
  }

  fireball(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(900, 'square', t, 0.07, this.sfxGain!, 0.2, 200);
    this.noise(t, 0.04, this.sfxGain!, 0.06);
  }

  kick(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.noise(t, 0.06, this.sfxGain!, 0.18);
    this.tone(300, 'square', t, 0.06, this.sfxGain!, 0.2, 100);
  }

  breakBlock(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.noise(t, 0.12, this.sfxGain!, 0.22);
    this.tone(400, 'square', t, 0.1, this.sfxGain!, 0.15, 100);
    this.tone(350, 'square', t + 0.03, 0.08, this.sfxGain!, 0.1, 80);
  }

  flagpole(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // Sliding whistle-like descending tone
    let offset = 0;
    for (let i = 0; i < 12; i++) {
      const freq = 800 - i * 50;
      this.tone(freq, 'square', t + offset, 0.06, this.sfxGain!, 0.18);
      offset += 0.06;
    }
  }

  die(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // Descending melancholy jingle
    const notes: [number, number][] = [
      [this.f('B4'), 0.18],
      [this.f('F5'), 0.18],
      [this.f('F5'), 0.06],
      [this.f('F5'), 0.18],
      [this.f('E5'), 0.18],
      [this.f('D5'), 0.18],
      [this.f('C5'), 0.24],
      [this.f('E4'), 0.12],
      [this.f('E4'), 0.06],
      [this.f('C4'), 0.4],
    ];
    let offset = 0;
    for (const [freq, dur] of notes) {
      this.tone(freq, 'square', t + offset, dur - 0.01, this.sfxGain!, 0.22);
      offset += dur;
    }
  }

  gameOver(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // Slower, sadder jingle
    const notes: [number, number][] = [
      [this.f('C5'), 0.25], [this.f('G4'), 0.25], [this.f('E4'), 0.35],
      [this.f('A4'), 0.2], [this.f('B4'), 0.2], [this.f('A4'), 0.2],
      [this.f('G#4'), 0.2], [this.f('A#4'), 0.2], [this.f('G#4'), 0.2],
      [this.f('G4'), 0.18], [this.f('F4'), 0.18], [this.f('G4'), 0.5],
    ];
    let offset = 0;
    for (const [freq, dur] of notes) {
      this.tone(freq, 'square', t + offset, dur - 0.01, this.sfxGain!, 0.2);
      offset += dur;
    }
  }

  stageClear(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // Triumphant fanfare
    const notes: [number, number][] = [
      [this.f('G4'), 0.12], [this.f('C5'), 0.12], [this.f('E5'), 0.12],
      [this.f('G5'), 0.18], [this.f('E5'), 0.12], [this.f('G5'), 0.5],
      // second phrase
      [0, 0.1],
      [this.f('C5'), 0.12], [this.f('E5'), 0.12], [this.f('G5'), 0.12],
      [this.f('A5'), 0.12], [this.f('B5'), 0.12], [this.f('C6'), 0.6],
    ];
    let offset = 0;
    for (const [freq, dur] of notes) {
      if (freq > 0) {
        this.tone(freq, 'square', t + offset, dur - 0.01, this.sfxGain!, 0.22);
      }
      offset += dur;
    }
  }

  warning(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    // Rapid beeping
    for (let i = 0; i < 4; i++) {
      this.tone(this.f('A5'), 'square', t + i * 0.16, 0.08, this.sfxGain!, 0.25);
    }
  }

  pause(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(this.f('E5'), 'square', t, 0.06, this.sfxGain!, 0.25);
  }

  pipe(): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    this.tone(110, 'square', t, 0.4, this.sfxGain!, 0.2, 80);
    this.tone(88, 'square', t + 0.1, 0.3, this.sfxGain!, 0.15, 60);
  }

  // -----------------------------------------------------------------------
  // Music - note/scheduling helpers
  // -----------------------------------------------------------------------

  /** Convert BPM + beat fraction to seconds. */
  private beatToSec(beat: number, bpm: number): number {
    return (60 / bpm) * beat;
  }

  /** Schedule a melody expressed as [noteName, beats] pairs. Returns total duration. */
  private scheduleMelody(
    notes: [string, number][],
    bpm: number,
    startTime: number,
    dest: GainNode,
    type: OscType = 'square',
    volume = 0.2,
  ): { totalDuration: number; oscillators: OscillatorNode[] } {
    const ctx = this.ensureCtx();
    const oscs: OscillatorNode[] = [];
    let t = startTime;
    for (const [note, beats] of notes) {
      const dur = this.beatToSec(beats, bpm);
      if (note !== '_') {
        const freq = this.f(note);
        const { osc } = this.tone(freq, type, t, dur - 0.01, dest, volume);
        oscs.push(osc);
      }
      t += dur;
    }
    return { totalDuration: t - startTime, oscillators: oscs };
  }

  private stopAllMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const osc of this.activeMusicOscillators) {
      try { osc.stop(now); } catch { /* already stopped */ }
    }
    for (const g of this.activeMusicGains) {
      try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(0, now); } catch { /* ok */ }
    }
    for (const id of this.musicTimeouts) {
      clearTimeout(id);
    }
    if (this.loopHandle !== null) {
      clearTimeout(this.loopHandle);
      this.loopHandle = null;
    }
    this.activeMusicOscillators = [];
    this.activeMusicGains = [];
    this.musicTimeouts = [];
    this.musicPlaying = false;
  }

  // -----------------------------------------------------------------------
  // Overworld Theme (main theme)
  // -----------------------------------------------------------------------
  // Melody transcription in the key of C, ~200 BPM.
  // Each entry is [noteName, durationInBeats].  '_' = rest.
  // Accurate to the first ~8 bars of the original NES SMB theme.

  private static readonly overworldMelody: [string, number][] = [
    // Bar 1
    ['E5', 0.5], ['E5', 0.5], ['_', 0.5], ['E5', 0.5],
    ['_', 0.5], ['C5', 0.5], ['E5', 0.5], ['_', 0.5],
    // Bar 2
    ['G5', 0.5], ['_', 0.5], ['_', 1], ['G4', 0.5], ['_', 0.5], ['_', 1],
    // Bar 3
    ['C5', 0.75], ['_', 0.25], ['_', 0.5], ['G4', 0.75], ['_', 0.25], ['_', 0.5],
    ['E4', 0.75], ['_', 0.25],
    // Bar 4
    ['_', 0.5], ['A4', 0.5], ['_', 0.5], ['B4', 0.5],
    ['_', 0.25], ['A#4', 0.5], ['A4', 0.5], ['_', 0.25],
    // Bar 5
    ['G4', 0.667], ['E5', 0.667], ['G5', 0.667],
    ['A5', 0.5], ['_', 0.5], ['F5', 0.5], ['G5', 0.5],
    // Bar 6
    ['_', 0.5], ['E5', 0.5], ['_', 0.5], ['C5', 0.5],
    ['D5', 0.5], ['B4', 0.5], ['_', 1],
    // Bar 7
    ['C5', 0.75], ['_', 0.25], ['_', 0.5], ['G4', 0.75], ['_', 0.25], ['_', 0.5],
    ['E4', 0.75], ['_', 0.25],
    // Bar 8
    ['_', 0.5], ['A4', 0.5], ['_', 0.5], ['B4', 0.5],
    ['_', 0.25], ['A#4', 0.5], ['A4', 0.5], ['_', 0.25],
    // Bar 9
    ['G4', 0.667], ['E5', 0.667], ['G5', 0.667],
    ['A5', 0.5], ['_', 0.5], ['F5', 0.5], ['G5', 0.5],
    // Bar 10
    ['_', 0.5], ['E5', 0.5], ['_', 0.5], ['C5', 0.5],
    ['D5', 0.5], ['B4', 0.5], ['_', 1],
    // Bar 11 - second section
    ['_', 0.5], ['_', 0.5], ['G5', 0.5], ['F#5', 0.5],
    ['F5', 0.5], ['D#5', 0.5], ['_', 0.5], ['E5', 0.5],
    // Bar 12
    ['_', 0.5], ['G#4', 0.5], ['A4', 0.5], ['C5', 0.5],
    ['_', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5],
    // Bar 13
    ['_', 0.5], ['_', 0.5], ['G5', 0.5], ['F#5', 0.5],
    ['F5', 0.5], ['D#5', 0.5], ['_', 0.5], ['E5', 0.5],
    // Bar 14
    ['_', 0.5], ['C6', 0.5], ['_', 0.5], ['C6', 0.5],
    ['C6', 0.5], ['_', 0.5], ['_', 1],
    // Bar 15
    ['_', 0.5], ['_', 0.5], ['G5', 0.5], ['F#5', 0.5],
    ['F5', 0.5], ['D#5', 0.5], ['_', 0.5], ['E5', 0.5],
    // Bar 16
    ['_', 0.5], ['G#4', 0.5], ['A4', 0.5], ['C5', 0.5],
    ['_', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 0.5],
    // Bar 17
    ['_', 0.5], ['_', 0.5], ['D#5', 0.75], ['_', 0.25],
    ['_', 0.5], ['D5', 0.75], ['_', 0.25],
    // Bar 18
    ['C5', 0.5], ['_', 0.5], ['_', 1], ['_', 1],
  ];

  private static readonly overworldBass: [string, number][] = [
    // Bar 1
    ['D3', 0.5], ['D3', 0.5], ['_', 0.5], ['D3', 0.5],
    ['_', 0.5], ['D3', 0.5], ['D3', 0.5], ['_', 0.5],
    // Bar 2
    ['G3', 0.5], ['_', 0.5], ['_', 1], ['G2', 0.5], ['_', 0.5], ['_', 1],
    // Bar 3
    ['G3', 0.75], ['_', 0.25], ['_', 0.5], ['E3', 0.75], ['_', 0.25], ['_', 0.5],
    ['C3', 0.75], ['_', 0.25],
    // Bar 4
    ['_', 0.5], ['F3', 0.5], ['_', 0.5], ['G3', 0.5],
    ['_', 0.25], ['F#3', 0.5], ['F3', 0.5], ['_', 0.25],
    // Bar 5
    ['E3', 0.667], ['C4', 0.667], ['E4', 0.667],
    ['F4', 0.5], ['_', 0.5], ['D4', 0.5], ['E4', 0.5],
    // Bar 6
    ['_', 0.5], ['C4', 0.5], ['_', 0.5], ['A3', 0.5],
    ['B3', 0.5], ['G3', 0.5], ['_', 1],
    // Bars 7-10: repeat 3-6
    ['G3', 0.75], ['_', 0.25], ['_', 0.5], ['E3', 0.75], ['_', 0.25], ['_', 0.5],
    ['C3', 0.75], ['_', 0.25],
    ['_', 0.5], ['F3', 0.5], ['_', 0.5], ['G3', 0.5],
    ['_', 0.25], ['F#3', 0.5], ['F3', 0.5], ['_', 0.25],
    ['E3', 0.667], ['C4', 0.667], ['E4', 0.667],
    ['F4', 0.5], ['_', 0.5], ['D4', 0.5], ['E4', 0.5],
    ['_', 0.5], ['C4', 0.5], ['_', 0.5], ['A3', 0.5],
    ['B3', 0.5], ['G3', 0.5], ['_', 1],
    // Bars 11-18 bass: simplified walking bass
    ['C3', 0.5], ['_', 0.5], ['G3', 0.5], ['_', 0.5],
    ['C3', 0.5], ['_', 0.5], ['G3', 0.5], ['_', 0.5],
    ['C3', 0.5], ['F3', 0.5], ['_', 0.5], ['F3', 0.5],
    ['_', 0.5], ['F3', 0.5], ['F3', 0.5], ['_', 0.5],
    ['C3', 0.5], ['_', 0.5], ['G3', 0.5], ['_', 0.5],
    ['C3', 0.5], ['_', 0.5], ['G3', 0.5], ['_', 0.5],
    ['G3', 1], ['_', 0.5], ['G3', 0.5],
    ['C3', 1], ['_', 1],
    ['C3', 0.5], ['_', 0.5], ['G3', 0.5], ['_', 0.5],
    ['C3', 0.5], ['_', 0.5], ['G3', 0.5], ['_', 0.5],
    ['C3', 0.5], ['F3', 0.5], ['_', 0.5], ['F3', 0.5],
    ['_', 0.5], ['F3', 0.5], ['F3', 0.5], ['_', 0.5],
    ['G3', 0.5], ['_', 0.5], ['_', 0.5], ['G3', 0.5],
    ['_', 0.5], ['G3', 0.5], ['_', 1],
    ['C3', 0.5], ['_', 0.5], ['_', 1], ['_', 1],
  ];

  playOverworldTheme(): void {
    this.stopAllMusic();
    this.musicPlaying = true;

    const play = () => {
      if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.05;
      const bpm = 200;

      const melResult = this.scheduleMelody(
        AudioEngine.overworldMelody, bpm, t, this.musicGain, 'square', 0.18,
      );
      this.activeMusicOscillators.push(...melResult.oscillators);

      const bassResult = this.scheduleMelody(
        AudioEngine.overworldBass, bpm, t, this.musicGain, 'triangle', 0.14,
      );
      this.activeMusicOscillators.push(...bassResult.oscillators);

      // Loop after melody finishes
      const loopDuration = Math.max(melResult.totalDuration, bassResult.totalDuration);
      this.loopHandle = window.setTimeout(() => {
        if (this.musicPlaying) play();
      }, loopDuration * 1000) as unknown as number;
      this.musicTimeouts.push(this.loopHandle!);
    };

    play();
  }

  // -----------------------------------------------------------------------
  // Star Theme (invincibility)
  // -----------------------------------------------------------------------

  private static readonly starMelody: [string, number][] = [
    // Fast, energetic, triumphant feel - simplified star theme
    ['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.25],
    ['E6', 0.25], ['G5', 0.25], ['C6', 0.25], ['E6', 0.25],
    // phrase 2
    ['D5', 0.25], ['F5', 0.25], ['A5', 0.25], ['D6', 0.25],
    ['F6', 0.25], ['A5', 0.25], ['D6', 0.25], ['F6', 0.25],
    // phrase 3
    ['E5', 0.25], ['G5', 0.25], ['B5', 0.25], ['E6', 0.25],
    ['G5', 0.25], ['B5', 0.25], ['E6', 0.25], ['G6', 0.25],
    // phrase 4
    ['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.25],
    ['G5', 0.25], ['E5', 0.25], ['C5', 0.25], ['G4', 0.25],
    // phrase 5 - variation
    ['A4', 0.25], ['C5', 0.25], ['E5', 0.25], ['A5', 0.25],
    ['C6', 0.25], ['E5', 0.25], ['A5', 0.25], ['C6', 0.25],
    // phrase 6
    ['B4', 0.25], ['D5', 0.25], ['F#5', 0.25], ['B5', 0.25],
    ['D6', 0.25], ['F#5', 0.25], ['B5', 0.25], ['D6', 0.25],
    // phrase 7
    ['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.5],
    ['G5', 0.25], ['E5', 0.25], ['C5', 0.5],
    // phrase 8
    ['D5', 0.25], ['G5', 0.25], ['B5', 0.25], ['D6', 0.5],
    ['B5', 0.25], ['G5', 0.5], ['_', 0.25],
  ];

  private static readonly starBass: [string, number][] = [
    ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
    ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
    ['D3', 0.5], ['A3', 0.5], ['D3', 0.5], ['A3', 0.5],
    ['D3', 0.5], ['A3', 0.5], ['D3', 0.5], ['A3', 0.5],
    ['E3', 0.5], ['B3', 0.5], ['E3', 0.5], ['B3', 0.5],
    ['E3', 0.5], ['B3', 0.5], ['E3', 0.5], ['B3', 0.5],
    ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
    ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
    ['A2', 0.5], ['E3', 0.5], ['A2', 0.5], ['E3', 0.5],
    ['A2', 0.5], ['E3', 0.5], ['A2', 0.5], ['E3', 0.5],
    ['B2', 0.5], ['F#3', 0.5], ['B2', 0.5], ['F#3', 0.5],
    ['B2', 0.5], ['F#3', 0.5], ['B2', 0.5], ['F#3', 0.5],
    ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
    ['C3', 0.5], ['G3', 0.5], ['C3', 1],
    ['G2', 0.5], ['D3', 0.5], ['G2', 0.5], ['D3', 0.5],
    ['G2', 0.5], ['D3', 0.5], ['G2', 0.75], ['_', 0.25],
  ];

  playStarTheme(): void {
    this.stopAllMusic();
    this.musicPlaying = true;

    const play = () => {
      if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.05;
      const bpm = 280; // Faster tempo for star power

      const melResult = this.scheduleMelody(
        AudioEngine.starMelody, bpm, t, this.musicGain, 'square', 0.16,
      );
      this.activeMusicOscillators.push(...melResult.oscillators);

      const bassResult = this.scheduleMelody(
        AudioEngine.starBass, bpm, t, this.musicGain, 'triangle', 0.12,
      );
      this.activeMusicOscillators.push(...bassResult.oscillators);

      const loopDuration = Math.max(melResult.totalDuration, bassResult.totalDuration);
      this.loopHandle = window.setTimeout(() => {
        if (this.musicPlaying) play();
      }, loopDuration * 1000) as unknown as number;
      this.musicTimeouts.push(this.loopHandle!);
    };

    play();
  }

  // -----------------------------------------------------------------------
  // Underground Theme
  // -----------------------------------------------------------------------

  private static readonly undergroundMelody: [string, number][] = [
    // Dark, staccato, ominous feel
    ['C4', 0.25], ['C4', 0.25], ['_', 0.5],
    ['C4', 0.25], ['C4', 0.25], ['_', 0.25], ['D4', 0.25],
    ['_', 0.5], ['C4', 0.25], ['_', 0.25],
    ['C4', 0.25], ['_', 0.25], ['G3', 0.5],
    // phrase 2
    ['C4', 0.25], ['C4', 0.25], ['_', 0.5],
    ['C4', 0.25], ['C4', 0.25], ['_', 0.25], ['D4', 0.25],
    ['_', 0.5], ['C4', 0.25], ['_', 0.25],
    ['C4', 0.25], ['_', 0.25], ['G3', 0.5],
    // phrase 3 (higher)
    ['A#3', 0.25], ['A#3', 0.25], ['_', 0.5],
    ['A#3', 0.25], ['A#3', 0.25], ['_', 0.25], ['C4', 0.25],
    ['_', 0.5], ['A#3', 0.25], ['_', 0.25],
    ['A#3', 0.25], ['_', 0.25], ['F3', 0.5],
    // phrase 4
    ['G#3', 0.25], ['G#3', 0.25], ['_', 0.5],
    ['G#3', 0.25], ['G#3', 0.25], ['_', 0.25], ['A#3', 0.25],
    ['_', 0.5], ['G#3', 0.25], ['_', 0.25],
    ['G#3', 0.25], ['_', 0.25], ['D#3', 0.5],
  ];

  private static readonly undergroundBass: [string, number][] = [
    ['C2', 0.5], ['C3', 0.5], ['C2', 0.5], ['C3', 0.5],
    ['C2', 0.5], ['C3', 0.5], ['C2', 0.5], ['C3', 0.5],
    ['C2', 0.5], ['C3', 0.5], ['C2', 0.5], ['C3', 0.5],
    ['C2', 0.5], ['C3', 0.5], ['C2', 0.5], ['C3', 0.5],
    ['A#1', 0.5], ['A#2', 0.5], ['A#1', 0.5], ['A#2', 0.5],
    ['A#1', 0.5], ['A#2', 0.5], ['A#1', 0.5], ['A#2', 0.5],
    ['G#1', 0.5], ['G#2', 0.5], ['G#1', 0.5], ['G#2', 0.5],
    ['G#1', 0.5], ['G#2', 0.5], ['G#1', 0.5], ['G#2', 0.5],
  ];

  playUndergroundTheme(): void {
    this.stopAllMusic();
    this.musicPlaying = true;

    const play = () => {
      if (!this.musicPlaying || !this.ctx || !this.musicGain) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.05;
      const bpm = 160;

      const melResult = this.scheduleMelody(
        AudioEngine.undergroundMelody, bpm, t, this.musicGain, 'square', 0.15,
      );
      this.activeMusicOscillators.push(...melResult.oscillators);

      const bassResult = this.scheduleMelody(
        AudioEngine.undergroundBass, bpm, t, this.musicGain, 'triangle', 0.14,
      );
      this.activeMusicOscillators.push(...bassResult.oscillators);

      const loopDuration = Math.max(melResult.totalDuration, bassResult.totalDuration);
      this.loopHandle = window.setTimeout(() => {
        if (this.musicPlaying) play();
      }, loopDuration * 1000) as unknown as number;
      this.musicTimeouts.push(this.loopHandle!);
    };

    play();
  }

  // -----------------------------------------------------------------------
  // Music control
  // -----------------------------------------------------------------------

  stopMusic(): void {
    this.stopAllMusic();
  }

  // -----------------------------------------------------------------------
  // Volume control
  // -----------------------------------------------------------------------

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx!.currentTime);
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx!.currentTime);
    }
  }

  mute(): void {
    this.muted = true;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.ctx!.currentTime);
    }
  }

  unmute(): void {
    this.muted = false;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(1, this.ctx!.currentTime);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const audio = new AudioEngine();
