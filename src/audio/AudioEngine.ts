/**
 * WavePulse Web Audio Engine
 * High-performance 10-band studio graphic equalizer, stereo delay, compressor limiter,
 * analyzer node for real-time wave rendering, and procedural/audio-element sources.
 */

export const FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export interface DelayConfig {
  enabled: boolean;
  time: number; // 0.01 to 1.0 seconds
  feedback: number; // 0.0 to 0.88
  mix: number; // 0.0 to 1.0 (wet/dry)
  pingPong: boolean;
}

export interface EqualizerProfile {
  id: string;
  name: string;
  description?: string;
  bands: number[]; // 10 values in dB (-12 to +12)
  preamp: number; // in dB (-12 to +12)
  delay: DelayConfig;
  isGameBooster?: boolean;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isInitializing = false;

  // Audio Nodes
  private sourceNode: AudioNode | null = null;
  private preampNode: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];
  
  // Delay Graph
  private delayInputNode: GainNode | null = null;
  private delayNodeL: DelayNode | null = null;
  private delayNodeR: DelayNode | null = null;
  private feedbackGainL: GainNode | null = null;
  private feedbackGainR: GainNode | null = null;
  private delayDampingFilter: BiquadFilterNode | null = null;
  private delayWetGain: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayOutputNode: GainNode | null = null;

  // Master output & Dynamics
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Active audio elements / stream
  private currentMediaElement: HTMLAudioElement | null = null;
  private micStream: MediaStream | null = null;
  private proceduralInterval: any = null;
  private isProceduralPlaying = false;

  // Engine state
  private bandGains: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private preampGainValue = 0;
  private delayConfig: DelayConfig = {
    enabled: true,
    time: 0.28,
    feedback: 0.35,
    mix: 0.3,
    pingPong: true,
  };
  private masterVolume = 0.85;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  public init() {
    if (this.isInitialized || this.isInitializing) {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    this.isInitializing = true;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // 1. Analyser Node for Real-time Waveform & Spectrum
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.82;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // 2. Master Gain & Dynamics Limiter (Compressor to prevent harsh clipping)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      // Route: Master -> Analyser -> Destination
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // 3. Preamp Node (Direct linear calculation, no recursive setPreamp call)
      this.preampNode = this.ctx.createGain();
      const preampLinear = Math.pow(10, this.preampGainValue / 20);
      this.preampNode.gain.setValueAtTime(preampLinear, this.ctx.currentTime);

      // 4. Build 10-Band Biquad Filter Chain
      this.filters = FREQUENCIES.map((freq, index) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.frequency.setValueAtTime(freq, this.ctx!.currentTime);

        if (index === 0) {
          filter.type = "lowshelf";
        } else if (index === FREQUENCIES.length - 1) {
          filter.type = "highshelf";
        } else {
          filter.type = "peaking";
          filter.Q.setValueAtTime(1.414, this.ctx!.currentTime);
        }

        filter.gain.setValueAtTime(this.bandGains[index] || 0, this.ctx!.currentTime);
        return filter;
      });

      // Chain filters: Preamp -> Filter[0] -> Filter[1] ... -> Filter[9]
      let prevNode: AudioNode = this.preampNode;
      this.filters.forEach((filter) => {
        prevNode.connect(filter);
        prevNode = filter;
      });

      // 5. Build Delay FX Module
      this.delayInputNode = this.ctx.createGain();
      prevNode.connect(this.delayInputNode);

      this.delayDryGain = this.ctx.createGain();
      this.delayWetGain = this.ctx.createGain();
      this.delayOutputNode = this.ctx.createGain();

      this.delayNodeL = this.ctx.createDelay(2.0);
      this.delayNodeR = this.ctx.createDelay(2.0);
      this.feedbackGainL = this.ctx.createGain();
      this.feedbackGainR = this.ctx.createGain();

      // Analog warm damping filter in feedback loop
      this.delayDampingFilter = this.ctx.createBiquadFilter();
      this.delayDampingFilter.type = "lowpass";
      this.delayDampingFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);

      // Setup Stereo / Ping-Pong feedback paths
      const splitter = this.ctx.createChannelSplitter(2);
      const merger = this.ctx.createChannelMerger(2);

      this.delayInputNode.connect(this.delayDryGain);
      this.delayDryGain.connect(this.delayOutputNode);

      this.delayInputNode.connect(splitter);

      // Left delay
      splitter.connect(this.delayNodeL, 0);
      this.delayNodeL.connect(this.feedbackGainL);
      this.feedbackGainL.connect(this.delayDampingFilter);
      this.delayDampingFilter.connect(this.delayNodeR); // Cross-feed for ping-pong
      this.delayNodeL.connect(merger, 0, 0);

      // Right delay
      splitter.connect(this.delayNodeR, 1);
      this.delayNodeR.connect(this.feedbackGainR);
      this.feedbackGainR.connect(this.delayDampingFilter);
      this.delayDampingFilter.connect(this.delayNodeL); // Cross-feed for ping-pong
      this.delayNodeR.connect(merger, 0, 1);

      merger.connect(this.delayWetGain);
      this.delayWetGain.connect(this.delayOutputNode);

      // Route Delay Output -> Compressor
      this.delayOutputNode.connect(this.compressor);

      this.applyDelayParams();
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  public ensureRunning() {
    if (!this.isInitialized && !this.isInitializing) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- Band & Gain Control ---
  public setBandGain(index: number, dbGain: number) {
    this.ensureRunning();
    const clampedGain = Math.max(-12, Math.min(12, dbGain));
    this.bandGains[index] = clampedGain;
    if (this.filters[index] && this.ctx) {
      this.filters[index].gain.setTargetAtTime(clampedGain, this.ctx.currentTime, 0.02);
    }
  }

  public setAllBands(bands: number[]) {
    this.ensureRunning();
    bands.forEach((gain, idx) => {
      if (idx < 10) {
        const clampedGain = Math.max(-12, Math.min(12, gain));
        this.bandGains[idx] = clampedGain;
        if (this.filters[idx] && this.ctx) {
          this.filters[idx].gain.setTargetAtTime(clampedGain, this.ctx.currentTime, 0.02);
        }
      }
    });
  }

  public getBandGains(): number[] {
    return [...this.bandGains];
  }

  public setPreamp(dbGain: number) {
    this.ensureRunning();
    this.preampGainValue = Math.max(-12, Math.min(12, dbGain));
    if (this.preampNode && this.ctx) {
      const linear = Math.pow(10, this.preampGainValue / 20);
      this.preampNode.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.02);
    }
  }

  public getPreamp(): number {
    return this.preampGainValue;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  // --- Delay Control ---
  public setDelay(config: Partial<DelayConfig>) {
    this.ensureRunning();
    this.delayConfig = { ...this.delayConfig, ...config };
    this.applyDelayParams();
  }

  public getDelayConfig(): DelayConfig {
    return { ...this.delayConfig };
  }

  private applyDelayParams() {
    if (!this.ctx || !this.delayNodeL || !this.delayNodeR || !this.feedbackGainL || !this.feedbackGainR) {
      return;
    }
    const { enabled, time, feedback, mix, pingPong } = this.delayConfig;
    const now = this.ctx.currentTime;

    const clampedTime = Math.max(0.01, Math.min(1.2, time));
    const clampedFeedback = Math.max(0, Math.min(0.88, feedback));
    const clampedMix = Math.max(0, Math.min(1, mix));

    // If delay is disabled, mix = 0
    const activeMix = enabled ? clampedMix : 0;

    this.delayNodeL.delayTime.setTargetAtTime(clampedTime, now, 0.03);
    // Slight offset for Ping-Pong stereo width
    const rightTime = pingPong ? Math.min(1.2, clampedTime * 1.33) : clampedTime;
    this.delayNodeR.delayTime.setTargetAtTime(rightTime, now, 0.03);

    const activeFeedback = enabled ? clampedFeedback : 0;
    this.feedbackGainL.gain.setTargetAtTime(activeFeedback, now, 0.03);
    this.feedbackGainR.gain.setTargetAtTime(activeFeedback * 0.95, now, 0.03);

    if (this.delayDryGain && this.delayWetGain) {
      this.delayDryGain.gain.setTargetAtTime(1 - activeMix * 0.35, now, 0.03);
      this.delayWetGain.gain.setTargetAtTime(activeMix, now, 0.03);
    }
  }

  // --- Audio Inputs ---

  // 1. HTML5 Audio Element (file uploads or demo tracks)
  public connectMediaElement(element: HTMLAudioElement) {
    this.ensureRunning();
    this.stopProcedural();
    this.stopMic();

    if (this.currentMediaElement && this.currentMediaElement !== element) {
      this.currentMediaElement.pause();
    }
    this.currentMediaElement = element;

    try {
      if (!this.sourceNode || (this.sourceNode as any).mediaElement !== element) {
        this.sourceNode = this.ctx!.createMediaElementSource(element);
        this.sourceNode.connect(this.preampNode!);
      }
    } catch (e) {
      // Element might already be connected
      console.warn("MediaElement already connected or error:", e);
    }
  }

  // 2. Microphone / System Audio Input
  public async enableMicInput(): Promise<boolean> {
    this.ensureRunning();
    this.stopProcedural();
    if (this.currentMediaElement) {
      this.currentMediaElement.pause();
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const micSource = this.ctx!.createMediaStreamSource(this.micStream);
      micSource.connect(this.preampNode!);
      this.sourceNode = micSource;
      return true;
    } catch (err) {
      console.error("Microphone capture failed:", err);
      return false;
    }
  }

  public stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  // 3. High-Quality Procedural Audio Synthesizer (Instant playback without CORS)
  public playProceduralTrack(trackType: "synthwave" | "lofi" | "bass" | "tactical_game") {
    this.ensureRunning();
    this.stopProcedural();
    this.stopMic();
    if (this.currentMediaElement) {
      this.currentMediaElement.pause();
    }

    if (!this.ctx || !this.preampNode) return;

    this.isProceduralPlaying = true;
    const ctx = this.ctx;
    const dest = this.preampNode;

    let step = 0;
    const bpm = trackType === "synthwave" ? 120 : trackType === "lofi" ? 78 : trackType === "bass" ? 135 : 110;
    const intervalMs = (60 / bpm / 2) * 1000; // 8th note

    // Sound generation helper
    const playKick = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.15);
      gain.gain.setValueAtTime(0.85, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.26);
    };

    const playSnare = (time: number) => {
      // Noise buffer for snare snap
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1200, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.15);
    };

    const playHihat = (time: number, pitch = 8000) => {
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(pitch, time);
      filter.Q.setValueAtTime(3, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.038);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.04);
    };

    const playBassNote = (time: number, freq: number, duration = 0.25) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = trackType === "synthwave" ? "sawtooth" : trackType === "bass" ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, time);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(trackType === "bass" ? 180 : 450, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + duration);

      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + duration);
    };

    const playLeadNote = (time: number, freq: number, duration = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, time);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, time);
      filter.Q.setValueAtTime(2.5, time);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + duration);
    };

    // Tactical game cues (footsteps, weapon click, radar ping)
    const playFootstep = (time: number) => {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2400, time); // 2.4kHz footsteps zone!
      filter.Q.setValueAtTime(2.0, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.08);
    };

    const playTacticalBeep = (time: number, f = 1760) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, time);
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.1);
    };

    // Notes mapping (Hz)
    const bassScale = [55, 65.4, 73.4, 82.4, 98, 110]; // A1, C2, D2, E2, G2, A2
    const leadScale = [440, 523.25, 587.33, 659.25, 783.99, 880];

    this.proceduralInterval = setInterval(() => {
      if (!this.isProceduralPlaying) return;
      const now = ctx.currentTime;
      const s = step % 16;

      if (trackType === "tactical_game") {
        // Tactical Game Audio simulation: footsteps, heartbeat sub-bass, radar pings
        if (s % 2 === 0) {
          playFootstep(now);
        }
        if (s === 0 || s === 8) {
          // Heartbeat pulse sub-bass
          playKick(now);
        }
        if (s === 12) {
          playTacticalBeep(now, 2640);
        }
        if (s % 4 === 2) {
          playHihat(now, 6000);
        }
      } else {
        // Musical rhythm
        if (s === 0 || s === 8 || (trackType === "synthwave" && (s === 6 || s === 14))) {
          playKick(now);
        }
        if (s === 4 || s === 12) {
          playSnare(now);
        }
        if (s % 2 === 0) {
          playHihat(now, 10000);
        } else if (trackType === "synthwave") {
          playHihat(now, 14000);
        }

        // Bassline
        const bassFreq = bassScale[Math.floor(s / 4) % bassScale.length];
        playBassNote(now, bassFreq, 0.22);

        // Lead / Melody
        if (s % 2 === 1 && (trackType === "synthwave" || trackType === "lofi")) {
          const leadFreq = leadScale[(s + Math.floor(step / 16)) % leadScale.length];
          playLeadNote(now, leadFreq, 0.15);
        }
      }

      step++;
    }, intervalMs);
  }

  public stopProcedural() {
    this.isProceduralPlaying = false;
    if (this.proceduralInterval) {
      clearInterval(this.proceduralInterval);
      this.proceduralInterval = null;
    }
  }

  public isTrackPlaying(): boolean {
    return (
      this.isProceduralPlaying ||
      (this.currentMediaElement !== null && !this.currentMediaElement.paused)
    );
  }

  // Play a quick sci-fi power-up sound when Game Booster activates!
  public triggerGameBoosterSonicPulse() {
    this.ensureRunning();
    if (!this.ctx || !this.preampNode) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

    osc2.frequency.setValueAtTime(60, now);
    osc2.frequency.exponentialRampToValueAtTime(420, now + 0.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.preampNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  }

  // --- Analyser Data for Visualizer ---
  public getWaveformData(array: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  public getFrequencyData(array: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
