import { useState, useEffect, useCallback, useRef } from 'react';
import { PitchDisplay } from './PitchDisplay';
import { SONGS, getSongById, playNote, getNoteFreq, playSongInstrumental } from '../utils/songLibrary';

export function ExerciseMode({ pitch, isListening, micGranted }) {
  const [song, setSong] = useState(() => getSongById('why') || { id: 'why', name: 'Avril Lavigne - Why', key: 'C4', notes: [], lyrics: [] });
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isActive, setIsActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentTargetNote, setCurrentTargetNote] = useState('C4');
  const [lyricIndex, setLyricIndex] = useState(0);
  const [isPlayingInstrumental, setIsPlayingInstrumental] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);

  const scaleNotes = getScaleNotes(song.key, 'major');
  const targetNoteInfo = scaleNotes.find(n => n.note === currentTargetNote) || { note: currentTargetNote, octave: 4, displayName: currentTargetNote };

  // Start audio context when component mounts - but only after user gesture
  useEffect(() => {
    // Audio context will be created on first user interaction
  }, []);

  const playCurrentTarget = useCallback(() => {
    const note = currentTargetNote;
    if (!audioContextRef.current) {
      // Create on demand when user interacts
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        // Audio context creation failed
        return;
      }
    }
    oscillatorRef.current = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.value = getNoteFreq(note) || 440;
    oscillatorRef.current.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    gainNode.gain.value = 0.3;
    oscillatorRef.current.start(ctx => { oscillatorRef.current.stop(ctx.currentTime + 1); });
  }, [currentTargetNote]);

  useEffect(() => {
    const note = song.notes[currentNoteIndex];
    if (note) {
      setCurrentTargetNote(note.note);
      setLyricIndex(0);
      playCurrentTarget();
    }
  }, [currentNoteIndex]);

  const checkPitch = useCallback(() => {
    if (!pitch || !currentTargetNote) return;
    const isMatch = pitch.note === currentTargetNote && Math.abs(pitch.cents) < 25;
    setScore(prev => ({
      correct: prev.correct + (isMatch ? 1 : 0),
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
    setLyricIndex(0);
    setCurrentTargetNote(song.notes[0]?.note || 'C4');
    setIsPlayingInstrumental(false);
  };

  const stopExercise = () => {
    setIsActive(false);
    setShowResults(true);
    setIsPlayingInstrumental(false);
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const progress = song.notes.length > 0 ? (currentNoteIndex / song.notes.length) * 100 : 0;

  // Get current lyric line based on progress
  const currentLyricLine = song.lyrics?.[lyricIndex];
  const isLastNote = currentNoteIndex >= song.notes.length - 1;

  return (
    <div className="exercise-mode" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{song.name}</h2>
        <select
          value={song.id}
          onChange={(e) => {
            setSong(getSongById(e.target.value) || { id: 'why', name: 'Avril Lavigne - Why', key: 'C4', notes: [], lyrics: [] });
            setIsActive(false);
            setCurrentNoteIndex(0);
            setDirection(1);
            setScore({ correct: 0, total: 0 });
            setLyricIndex(0);
            setCurrentTargetNote(song.notes[0]?.note || 'C4');
            setIsPlayingInstrumental(false);
          }}
          style={styles.select}
        >
          {SONGS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Karaoke Lyrics Section */}
      <div style={styles.lyricsContainer}>
        {song.lyrics?.map((line, lineIndex) => {
          // Determine if this line should be highlighted based on progress
          const isActiveLine = lineIndex === lyricIndex || (isLastNote && lineIndex <= lyricIndex);
          const highlightClass = isActiveLine ? ' lyric-active' : '';
          
          return (
            <div key={lineIndex} style={[
              styles.lyricLine,
              highlightClass && styles.lyricHighlight
            ]}>
              {typeof line === 'string' ? (
                <span>{line}</span>
              ) : (
                <span>
                  {line[0].split('').map((char, charIndex) => (
                    <span key={charIndex} style={[
                      styles.lyricChar,
                      charIndex === 0 && styles.lyricFirstChar,
                      isActiveLine && styles.lyricCharActive
                    ]}>{char}</span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
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
              {isListening ? 'Start Song' : micGranted === 'denied' ? 'Microphone Denied' : 'Enable Microphone First'}
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
  lyricsContainer: {
    margin: '20px 0',
    textAlign: 'center',
  },
  lyricLine: {
    margin: '8px 0',
    fontSize: '20px',
    fontWeight: 500,
    color: 'white',
    minHeight: '25px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  lyricHighlight: {
    textShadow: '0 0 20px #60a5fa, 0 0 30px #a78bfa',
  },
  lyricChar: {
    display: 'inline-block',
    margin: '0 2px',
    transition: 'color 0.1s',
  },
  lyricFirstChar: {
    color: '#60a5fa',
  },
  lyricCharActive: {
    color: '#ffd700',
    textShadow: '0 0 10px #ffd700',
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