import { useMemo } from 'react';

const CENTS_RANGE = 50;

export function PitchDisplay({ pitch, clarity, targetNote = null }) {
  const cents = useMemo(() => pitch?.cents ?? 0, [pitch]);
  const isInTune = useMemo(() => Math.abs(cents) < 10, [cents]);
  const isClose = useMemo(() => Math.abs(cents) < 25, [cents]);

  const needleStyle = useMemo(() => {
    const clampedCents = Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents));
    const percent = ((clampedCents + CENTS_RANGE) / (2 * CENTS_RANGE)) * 100;
    return { left: `${percent}%`, transform: 'translateX(-50%)' };
  }, [cents]);

  const barColor = isInTune ? '#10b981' : isClose ? '#f59e0b' : '#ef4444';

  return (
    <div className="pitch-display" style={styles.container}>
      <div style={styles.noteInfo}>
        <div style={styles.noteName}>{pitch?.displayName || '—'}</div>
        <div style={styles.frequency}>
          {pitch ? `${pitch.freq.toFixed(1)} Hz` : 'No signal'}
        </div>
      </div>

      <div style={styles.centsContainer}>
        <div style={styles.centsLabel}>
          <span style={{ color: '#6b7280' }}>−50¢</span>
          <span style={{ color: '#6b7280', marginLeft: 'auto' }}>+50¢</span>
        </div>
        <div style={styles.centsBar}>
          <div style={{ ...styles.centerLine }} />
          <div style={{ ...styles.needle, ...needleStyle, backgroundColor: barColor }} />
        </div>
        <div style={styles.centsValue} style={{ color: barColor }}>
          {pitch ? `${cents > 0 ? '+' : ''}${cents}¢` : '—'}
        </div>
      </div>

      <div style={styles.clarity}>
        Clarity: <span style={{ fontWeight: 600 }}>{(clarity * 100).toFixed(0)}%</span>
      </div>

      {targetNote && pitch && (
        <div style={styles.targetHint}>
          Target: <strong>{targetNote.displayName}</strong>
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
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  noteInfo: {
    marginBottom: '16px',
  },
  noteName: {
    fontSize: '48px',
    fontWeight: 700,
    fontFamily: 'system-ui, sans-serif',
    letterSpacing: '2px',
  },
  frequency: {
    fontSize: '14px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  centsContainer: {
    marginBottom: '16px',
  },
  centsLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginBottom: '8px',
  },
  centsBar: {
    position: 'relative',
    height: '12px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '2px',
    background: 'rgba(255,255,255,0.3)',
    transform: 'translateX(-50%)',
  },
  needle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '3px',
    borderRadius: '2px',
    boxShadow: '0 0 8px currentColor',
    transition: 'left 0.1s ease-out',
  },
  centsValue: {
    marginTop: '8px',
    fontSize: '18px',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  clarity: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  targetHint: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#60a5fa',
  },
};