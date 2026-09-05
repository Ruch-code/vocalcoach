import { frequencyToNote, getScaleNotes } from './pitchDetection';

const NOTE_FREQS = {
  'C-2': 65.41, 'C#-2': 69.30, 'D-2': 73.42, 'D#-2': 77.78, 'E-2': 82.41, 'F-2': 87.31, 'F#-2': 92.50, 'G-2': 98.00, 'G#-2': 103.83, 'A-2': 110.00, 'A#-2': 116.54, 'B-2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
};

export const SONGS = [
  {
    id: 'why',
    name: 'Avril Lavigne - Why',
    key: 'C4',
    lyrics: [
      ['Why', 0.0],
      ['Looking at me', 1.5],
      ['You do re doing to me', 4.5],
      ['Is it the things that I say', 6.0],
    ],
    notes: [
      { note: 'C4', duration: 1 },
      { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 },
      { note: 'G4', duration: 1 },
      { note: 'F4', duration: 1 },
      { note: 'E4', duration: 1 },
      { note: 'D4', duration: 2 },
    ],
  },
  {
    id: 'slipped-away',
    name: 'Avril Lavigne - Slipped Away',
    key: 'A3',
    lyrics: [
      ['Slipped away', 0.0],
      ['Had you forever', 1.0],
      ['Everything that I had told myself I', 5.0],
      ['I I I I', 7.0],
    ],
    notes: [
      { note: 'A3', duration: 2 },
      { note: 'G3', duration: 2 },
      { note: 'F#3', duration: 2 },
      { note: 'E3', duration: 2 },
      { note: 'D3', duration: 2 },
      { note: 'C3', duration: 2 },
      { note: 'B2', duration: 4 },
    ],
  },
  {
    id: 'fall-to-pieces',
    name: 'Avril Lavigne - Fall to Pieces',
    key: 'C4',
    lyrics: [
      ['Fall to pieces', 0.0],
      ['Every day I am a sinner', 1.5],
      ['And I', 3.0],
      ['And I', 4.0],
    ],
    notes: [
      { note: 'C4', duration: 1 },
      { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 },
      { note: 'G4', duration: 1 },
      { note: 'F4', duration: 1 },
      { note: 'E4', duration: 2 },
    ],
  },
  {
    id: 'titanium',
    name: 'Sia - Titanium',
    key: 'C4',
    lyrics: [
      ['You shoot me down', 0.0],
      ['but I wont fall', 1.5],
      ['I am titanium', 3.0],
      ['You shoot me down', 4.5],
      ['but I wont fall', 6.0],
      ['I am titanium', 7.5],
    ],
    notes: [
      { note: 'C4', duration: 1 },
      { note: 'E4', duration: 1 },
      { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 },
      { note: 'G4', duration: 1 },
      { note: 'F4', duration: 1 },
      { note: 'E4', duration: 2 },
    ],
  },
];

export function getSongById(id) {
  return SONGS.find(song => song.id === id);
}

export function getNoteFreq(noteName) {
  return NOTE_FREQS[noteName] || null;
}

export function playNote(noteName, duration = 1) {
  const freq = getNoteFreq(noteName);
  if (!freq) return;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = freq;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.value = 0.3;

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playSongInstrumental(songId, startTime = 0) {
  const song = getSongById(songId);
  if (!song) return;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.1;
  gainNode.connect(ctx.destination);

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.connect(gainNode);

  song.notes.forEach((noteObj, idx) => {
    setTimeout(() => {
      const noteFreq = getNoteFreq(noteObj.note);
      if (noteFreq && ctx.state === 'running') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = noteFreq;
        osc.connect(gainNode);
        osc.start(ctx.currentTime + startTime + idx * 0.5);
        osc.stop(ctx.currentTime + startTime + (idx + 1) * 0.5);
      }
    }, idx * 100);
  });
}
