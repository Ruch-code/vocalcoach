import { useState, useRef, useEffect, useCallback } from 'react';
import { frequencyToNote } from '../utils/pitchDetection';

export function Recorder({ isListening, micGranted }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const pitchDataRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsRecording(true);
      
      // Ensure audio context exists
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          setError('Could not create audio context');
          setIsRecording(false);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false, 
          noiseSuppression: false, 
          autoGainControl: false 
        } 
      });

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      pitchDataRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecording(url);
        analyzeRecording();
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);

      const detectPitch = () => {
        if (!isRecording) return;
        const buffer = new Float32Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getFloatTimeDomainData(buffer);
        
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        
        if (rms > 0.01) {
          let bestR = 0, bestLag = -1;
          for (let lag = Math.floor(44100 / 500); lag < Math.min(buffer.length, 44100 / 60); lag++) {
            let corr = 0;
            for (let i = 0; i < buffer.length - lag; i++) corr += buffer[i] * buffer[i + lag];
            corr /= (buffer.length - lag);
            if (corr > bestR) { bestR = corr; bestLag = lag; }
          }
          if (bestLag > 0 && bestR > 0.3) {
            const freq = 44100 / bestLag;
            const note = frequencyToNote(freq);
            if (note) pitchDataRef.current.push({ ...note, time: Date.now() });
          }
        }
        animationRef.current = requestAnimationFrame(detectPitch);
      };
      detectPitch();
    } catch (err) {
      setError(err.message);
      setIsRecording(false);
    }
  }, [isListening]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  }, [isRecording]);

  const analyzeRecording = useCallback(() => {
    const data = pitchDataRef.current;
    if (data.length === 0) {
      setAnalysis({ error: 'No pitch data captured' });
      return;
    }

    const notes = data.map(d => d.note);
    const noteCounts = notes.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});
    const mostCommonNote = Object.entries(noteCounts).sort((a, b) => b[1] - a[1])[0];

    const centsValues = data.map(d => d.cents).filter(c => Math.abs(c) < 100);
    const avgCents = centsValues.length ? centsValues.reduce((a, b) => a + b, 0) / centsValues.length : 0;
    const inTuneCount = centsValues.filter(c => Math.abs(c) < 25).length;
    const accuracy = centsValues.length ? Math.round((inTuneCount / centsValues.length) * 100) : 0;

    const range = data.length > 1 ? 
      `${data[0].displayName} - ${data[data.length - 1].displayName}` : 
      data[0].displayName;

    setAnalysis({
      duration: data.length * 100,
      totalSamples: data.length,
      mostCommonNote: mostCommonNote?.[0] || '—',
      avgCents: Math.round(avgCents),
      accuracy,
      range,
      pitchHistory: data.slice(-100),
    });
  }, []);

  const downloadRecording = useCallback(() => {
    if (!recording) return;
    const a = document.createElement('a');
    a.href = recording;
    a.download = `singing-recording-${Date.now()}.webm`;
    a.click();
  }, [recording]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return (
    <div className="recorder" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Recorder</h2>
        {error && <div style={styles.errorPanel}>{error}</div>}
      </div>

      <div style={styles.visualizer}>
        <canvas ref={canvasRef} style={styles.canvas} width={400} height={100} />
      </div>

      <PitchDisplay 
        pitch={pitchDataRef.current[pitchDataRef.current.length - 1] || null} 
        clarity={isRecording ? 0.8 : 0} 
      />

      <div style={styles.controls}>
        {isRecording ? (
          <button onClick={stopRecording} style={{ ...styles.button, ...styles.buttonStop }}>
            ⏹ Stop Recording
          </button>
        ) : (
          <button onClick={startRecording} style={styles.button} disabled={!isListening}>
            {micGranted === 'denied' ? 'Microphone Denied' : (isListening ? '🎤 Start Recording' : 'Enable Microphone First')}
          </button>
        )}
        {recording && (
          <button onClick={downloadRecording} style={styles.buttonSecondary}>
            ⬇ Download
          </button>
        )}
      </div>

      {analysis && (
        <div style={styles.analysis}>
          <h3>Analysis</h3>
          <div style={styles.analysisGrid}>
            <div><strong>Duration:</strong> {(analysis.duration / 1000).toFixed(1)}s</div>
            <div><strong>Most Common Note:</strong> {analysis.mostCommonNote}</div>
            <div><strong>Avg Pitch Offset:</strong> {analysis.avgCents > 0 ? '+' : ''}{analysis.avgCents}¢</div>
            <div><strong>Accuracy:</strong> {analysis.accuracy}%</div>
            <div><strong>Range:</strong> {analysis.range}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const canvasRef = { current: null };

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
  title: { margin: 0, fontSize: '20px' },
  errorPanel: {
    color: '#f87171', fontSize: '14px', margin: '8px 0',
  },
  visualizer: {
    height: '100px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    marginBottom: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: { width: '100%', height: '100%', display: 'block' },
  controls: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' },
  button: {
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    color: 'white',
  },
  buttonSecondary: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  analysis: {
    marginTop: '20px',
    padding: '16px',
    background: 'rgba(96,165,250,0.1)',
    borderRadius: '12px',
    border: '1px solid rgba(96,165,250,0.3)',
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginTop: '12px',
    fontSize: '14px',
  },
};