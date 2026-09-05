import { useState, useEffect, useCallback, useRef } from 'react';
import { getScaleNotes, frequencyToNote } from '../utils/pitchDetection';
import { PitchDisplay } from './PitchDisplay';
import { SONGS, getSongById, playNote, getNoteFreq } from '../utils/songLibrary';

const DEFAULT_SONG = {
  id: 'twinkle-twinkle',
  name: 'Twinkle Twinkle Little Star',
  key: 'C4',
  notes: [
    { note: 'C4', duration: 1 },
    { note: 'C4', duration: 1 },
    { note: 'G4', duration: 1 },
    { note: 'G4', duration: 1 },
    { note: 'A4', duration: 1 },
    { note: 'A4', duration: 1 },
    { note: 'G4', duration: 2 },
    { note: 'F4', duration: 1 },
    { note: 'F4', duration: 1 },
    { note: 'E4', duration: 1 },
    { note: 'E4', duration: 1 },
    { note: 'D4', duration: 1 },
    { note: 'D4', duration: 1 },
    { note: 'C4', duration: 2 },
  ],
};

export function ExerciseMode({ pitch, isListening }) {
  const [song, setSong] = useState(() => getSongById(DEFAULT_SONG.id) || DEFAULT_SONG);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isActive, setIsActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isPlayingNote, setIsPlayingNote] = useState(false);
  const [currentTargetNote, setCurrentTargetNote] = useState(song.notes[0]?.note || 'C4');

  const scaleNotes = getScaleNotes(song.key, 'major');
  const targetNoteInfo = scaleNotes.find(n => n.note === currentTargetNote) || { note: currentTargetNote, octave: 4, displayName: currentTargetName };

  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);

  const playCurrentTarget = useCallback(() => {
    const note = currentTargetNote;
    setIsPlayingNote(true);
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    oscillatorRef.current = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.value = getNoteFreq(note) || 440;
    oscillatorRef.current.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    gainNode.gain.value = 0.3;
    oscillatorRef.current.start();
    oscillatorRef.current.stop(audioContextRef.current.currentTime + (song.duration || 1));
  }, [currentTargetNote, song.duration]);

  useEffect(() => {
    const note = song.notes[currentNoteIndex];
    if (note && note.note !== currentTargetNote) {
      setCurrentTargetNote(note.note);
      playCurrentTarget();
    }
  }, [currentNoteIndex, song]);

  const checkPitch = useCallback(() => {
    if (!pitch || !currentTargetNote) return;
    const isMatch = pitch.midi === null ? false : {
      // Compare note name, not exact midi since pitch detection is approximate
      noteNameMatch: pitch.note === currentTargetNote,
      centsWithinTune: Math.abs(pitch.cents) < 25,
    };
    setScore(prev => ({
      correct: prev.correct + (isMatch.noteNameMatch && isMatch.centsWithinTune ? 1 : 0),
      total: prev.total + 1,
    }));
  }, [pitch, currentTargetNote]);

  useEffect(() => {
    if (!isActive || !isListening) return;
    const interval = setInterval(() => {
      checkPitch();
      setCurrentNoteIndex(prev => {
        const next = prev + direction;
        if (next >= song.notes.length - 1) {
          setDirection(-1);
          return song.notes.length - 2;
        }
        if (next <= 0) {
          setDirection(1);
          return 1;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isActive, isListening, direction, song.notes.length, checkPitch]);

  const startExercise = () => {
    setCurrentNoteIndex(0);
    setDirection(1);
    setScore({ correct: 0, total: 0 });
    setIsActive(true);
    setShowResults(false);
    setCurrentTargetNote(song.notes[0]?.note || 'C4');
  };

  const stopExercise = () => {
    setIsActive(false);
    setShowResults(true);
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const progress = song.notes.length > 0 ? (currentNoteIndex / song.notes.length) * 100 : 0;

  return (
    <div className="exercise-mode" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{song.name}</h2>
        <select
          value={song.id}
          onChange={(e) => {
            setSong(getSongById(e.target.value) || DEFAULT_SONG);
            setIsActive(false);
            setCurrentNoteIndex(0);
            setDirection(1);
            setScore({ correct: 0, total: 0 });
            setCurrentTargetNote(song.notes[0]?.note || 'C4');
          }}
          style={styles.select}
        >
          {SONGS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div style={styles.scaleVisual}>
        {scaleNotes.map((note, i) => (
          <div
            key={note.midi}
            style={{
              ...styles.scaleNote,
              ...(i === scaleNotes.findIndex(n => n.note === currentTargetNote) && styles.scaleNoteActive),
              ...(isActive && pitch && pitch.note === note.note && styles.scaleNoteHit),
            }}
          >
            {note.displayName}
          </div>
        ))}
      </div>

      <PitchDisplay pitch={pitch} targetNote={{ note: currentTargetNote, ...targetNoteInfo }} />

      <div style={styles.progressContainer}>
        <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        <div style={styles.progressText}>{Math.round(progress)}%</div>
      </div>

      <div style={styles.controls}>
        <div style={styles.controlButtons}>
          {isActive ? (
            <>
              <button onClick={stopExercise} style={{ ...styles.button, ...styles.buttonStop }}>
                ⏹ Stop
              </button>
              <button onClick={playCurrentTarget} style={{ ...styles.button, background: 'linear-gradient(135deg, #f6ad56, #ff7849)', marginLeft: '8px' }}>
                🔊
              </button>
            </>
          ) : (
            <button onClick={startExercise} style={styles.button} disabled={!isListening}>
              {isListening ? 'Start Song' : 'Enable Microphone First'}
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div style={styles.results}>
          <h3>Song Complete</h3>
          <p>Accuracy: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</p>
          <p>Correct notes: {score.correct} / {score.total}</p>
          <p>Notes sung: {song.notes.length}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: '14px',
  },
  scaleVisual: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  scaleNote: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ca3af',
    transition: 'all 0.2s',
  },
  scaleNoteActive: {
    background: 'rgba(96,165,250,0.2)',
    borderColor: '#60a5fa',
    color: '#60a5fa',
    transform: 'scale(1.1)',
  },
  scaleNoteHit: {
    background: '#10b981',
    borderColor: '#10b981',
    color: 'white',
  },
  progressContainer: {
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    marginBottom: '20px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    marginLeft: '8px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#60a5fa',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '16px',
  },
  controlButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    color: 'white',
    transition: 'transform 0.1s, opacity 0.2s',
  },
  buttonStop: {
    background: 'linear-gradient(135deg, #ef4444, #f97316)',
  },
  results: {
    marginTop: '20px',
    padding: '16px',
    background: 'rgba(16,185,129,0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(16,185,129,0.3)',
    textAlign: 'center',
  },
};