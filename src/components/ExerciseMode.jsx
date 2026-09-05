import { useState, useEffect, useCallback } from 'react';
import { getScaleNotes } from '../utils/pitchDetection';
import { PitchDisplay } from './PitchDisplay';

const EXERCISES = [
  { id: 'major', name: 'Major Scale', scale: 'major', root: 'C3', bpm: 80 },
  { id: 'minor', name: 'Natural Minor', scale: 'minor', root: 'A3', bpm: 80 },
  { id: 'pentatonic', name: 'Major Pentatonic', scale: 'pentatonic', root: 'G3', bpm: 80 },
  { id: 'blues', name: 'Blues Scale', scale: 'blues', root: 'E3', bpm: 70 },
];

export function ExerciseMode({ pitch, isListening }) {
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isActive, setIsActive] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const scaleNotes = getScaleNotes(selectedExercise.root, selectedExercise.scale);
  const targetNote = scaleNotes[currentNoteIndex];
  const noteDuration = (60 / selectedExercise.bpm) * 1000 * 2;

  const checkPitch = useCallback(() => {
    if (!pitch || !targetNote) return;
    const isMatch = pitch.midi === targetNote.midi;
    setScore(prev => ({
      correct: prev.correct + (isMatch ? 1 : 0),
      total: prev.total + 1,
    }));
  }, [pitch, targetNote]);

  useEffect(() => {
    if (!isActive || !isListening) return;
    const interval = setInterval(() => {
      checkPitch();
      setCurrentNoteIndex(prev => {
        const next = prev + direction;
        if (next >= scaleNotes.length - 1) {
          setDirection(-1);
          return scaleNotes.length - 2;
        }
        if (next <= 0) {
          setDirection(1);
          return 1;
        }
        return next;
      });
    }, noteDuration);
    return () => clearInterval(interval);
  }, [isActive, isListening, direction, scaleNotes.length, noteDuration, checkPitch]);

  const startExercise = () => {
    setCurrentNoteIndex(0);
    setDirection(1);
    setScore({ correct: 0, total: 0 });
    setIsActive(true);
    setShowResults(false);
  };

  const stopExercise = () => {
    setIsActive(false);
    setShowResults(true);
  };

  const progress = scaleNotes.length > 1 ? (currentNoteIndex / (scaleNotes.length - 1)) * 100 : 0;

  return (
    <div className="exercise-mode" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{selectedExercise.name}</h2>
        <select
          value={selectedExercise.id}
          onChange={(e) => {
            const ex = EXERCISES.find(x => x.id === e.target.value);
            setSelectedExercise(ex);
            setIsActive(false);
          }}
          style={styles.select}
        >
          {EXERCISES.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      <div style={styles.scaleVisual}>
        {scaleNotes.map((note, i) => (
          <div
            key={note.midi}
            style={{
              ...styles.scaleNote,
              ...(i === currentNoteIndex && styles.scaleNoteActive),
              ...(isActive && pitch && pitch.midi === note.midi && styles.scaleNoteHit),
            }}
          >
            {note.displayName}
          </div>
        ))}
      </div>

      <PitchDisplay pitch={pitch} targetNote={targetNote} />

      <div style={styles.progressContainer}>
        <div style={{ ...styles.progressBar, width: `${progress}%` }} />
      </div>

      <div style={styles.controls}>
        {isActive ? (
          <button onClick={stopExercise} style={{ ...styles.button, ...styles.buttonStop }}>
            Stop Exercise
          </button>
        ) : (
          <button onClick={startExercise} style={styles.button} disabled={!isListening}>
            {isListening ? 'Start Exercise' : 'Enable Microphone First'}
          </button>
        )}
      </div>

      {showResults && (
        <div style={styles.results}>
          <h3>Exercise Complete</h3>
          <p>Accuracy: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</p>
          <p>Correct notes: {score.correct} / {score.total}</p>
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
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
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
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
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