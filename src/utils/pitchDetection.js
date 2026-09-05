const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQ = 440;
const A4_MIDI = 69;

export function frequencyToNote(freq) {
  if (!freq || freq <= 0) return null;
  const midi = Math.round(12 * Math.log2(freq / A4_FREQ) + A4_MIDI);
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const cents = Math.round(1200 * Math.log2(freq / (A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12))));
  return {
    midi,
    note: NOTE_NAMES[noteIndex],
    octave,
    freq,
    cents,
    displayName: `${NOTE_NAMES[noteIndex]}${octave}`,
  };
}

export function autocorrelation(buffer, sampleRate) {
  const size = buffer.length;
  const maxLag = Math.min(size, sampleRate / 60);
  let bestR = 0;
  let bestLag = -1;

  for (let lag = Math.floor(sampleRate / 500); lag < maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    const r = sum / (size - lag);
    if (r > bestR) {
      bestR = r;
      bestLag = lag;
    }
  }

  if (bestLag === -1) return null;
  return sampleRate / bestLag;
}

export function getClarity(buffer) {
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i];
    sumSq += buffer[i] * buffer[i];
  }
  const mean = sum / buffer.length;
  const variance = sumSq / buffer.length - mean * mean;
  return Math.sqrt(variance);
}

export class PitchDetector {
  constructor(options = {}) {
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.animationId = null;
    this.onPitchDetected = options.onPitchDetected || (() => {});
    this.onError = options.onError || (() => {});
    this.bufferSize = options.bufferSize || 2048;
    this.sampleRate = options.sampleRate || 44100;
    this.minConfidence = options.minConfidence || 0.3;
    this.smoothing = options.smoothing || 0.8;
    this.lastFreq = 0;
  }

  async start() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false 
        } 
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = this.smoothing;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      this.detectPitch();
    } catch (err) {
      this.onError(err);
    }
  }

  detectPitch() {
    const buffer = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(buffer);

    const freq = autocorrelation(buffer, this.audioContext.sampleRate);
    const clarity = getClarity(buffer);

    if (freq && clarity > this.minConfidence) {
      const smoothedFreq = this.lastFreq 
        ? this.lastFreq * 0.3 + freq * 0.7 
        : freq;
      this.lastFreq = smoothedFreq;
      const note = frequencyToNote(smoothedFreq);
      if (note) {
        this.onPitchDetected(note, clarity);
      }
    } else {
      this.onPitchDetected(null, clarity);
    }

    this.animationId = requestAnimationFrame(() => this.detectPitch());
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.lastFreq = 0;
  }
}

export function getScaleNotes(rootNote, scaleType = 'major') {
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
    pentatonic: [0, 2, 4, 7, 9, 12],
    blues: [0, 3, 5, 6, 7, 10, 12],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  };
  
  const intervals = scales[scaleType] || scales.major;
  const rootMidi = NOTE_NAMES.indexOf(rootNote.replace(/[0-9]/, '')) + 12 * (parseInt(rootNote.slice(-1)) + 1);
  
  return intervals.map(interval => {
    const midi = rootMidi + interval;
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    return {
      midi,
      note: NOTE_NAMES[noteIndex],
      octave,
      displayName: `${NOTE_NAMES[noteIndex]}${octave}`,
    };
  });
}