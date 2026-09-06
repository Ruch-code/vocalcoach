import { useState, useEffect } from 'react';
import { usePitchDetection } from './hooks/usePitchDetection';
import { PitchDisplay } from './components/PitchDisplay';
import { ExerciseMode } from './components/ExerciseMode';
import { Recorder } from './components/Recorder';

function App() {
  const [activeTab, setActiveTab] = useState('tuner');
  const { pitch, clarity, isListening, error, start, stop } = usePitchDetection();

  const handleStart = async () => {
    await start();
  };

  const tabs = [
    { id: 'tuner', label: '🎵 Tuner', icon: '🎵' },
    { id: 'exercise', label: '📚 Exercise', icon: '📚' },
    { id: 'recorder', label: '🎤 Record', icon: '🎤' },
  ];

  // Check for reduced motion preference
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme system
  const [theme, setTheme] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');
    const listener = () => setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Simple mouse tracking for highlighting app area
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringApp, setIsHoveringApp] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      // Check if mouse is within app viewport
      const rect = document.querySelector('.app')?.getBoundingClientRect();
      if (rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setIsHoveringApp(true);
      } else {
        setIsHoveringApp(false);
      }
    };

    const handleMouseLeave = () => {
      setIsHoveringApp(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [reducedMotion]);

  return (
    <div className="app" style={styles.app} className={theme === 'dark' ? 'dark' : 'light'}>
      <header style={styles.header}>
        <h1 style={styles.logo}>VocalCoach</h1>
        <p style={styles.tagline}>Improve your singing with real-time feedback</p>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error} — <button onClick={handleStart} style={styles.errorButton}>Retry</button>
        </div>
      )}

      <nav style={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id && styles.tabActive),
            }}
          >
            {tab.label}
          </button>
        ))}
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ ...styles.tab, marginLeft: '16px', background: 'none', border: 'none' }}
          title="Toggle dark/light mode"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>

      <main style={styles.main}>
        {!isListening && activeTab !== 'tuner' && (
          <div style={styles.micPrompt}>
            <button onClick={handleStart} style={styles.micButton}>
              🎤 Enable Microphone
            </button>
            <p style={styles.micText}>Microphone access required for pitch detection</p>
          </div>
        )}

        {activeTab === 'tuner' && (
          <div style={styles.tabContent}>
            <PitchDisplay pitch={pitch} clarity={clarity} />
            <div style={styles.status}>
              {isListening ? (
                <span style={styles.listening}>● Listening</span>
              ) : (
                <button onClick={handleStart} style={styles.startButton}>
                  Start Listening
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'exercise' && (
          <ExerciseMode pitch={pitch} isListening={isListening} />
        )}

        {activeTab === 'recorder' && (
          <Recorder isListening={isListening} />
        )}
      </main>

      <footer style={styles.footer}>
        <p>Built with Web Audio API • Deployed on Netlify</p>
        <p style={styles.credit}>Made by Ruchi Kandpal</p>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    transition: 'background-color 0.3s, color 0.3s',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingTop: '20px',
  },
  logo: {
    margin: 0,
    fontSize: '48px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
  },
  tagline: {
    margin: '8px 0 0',
    color: '#9ca3af',
    fontSize: '18px',
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#fca5a5',
  },
  errorButton: {
    background: 'none',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginLeft: '8px',
  },
  nav: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '12px 24px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#9ca3af',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(167,139,250,0.2))',
    borderColor: '#60a5fa',
    color: '#60a5fa',
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  micPrompt: {
    textAlign: 'center',
    padding: '40px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  micButton: {
    padding: '16px 40px',
    fontSize: '18px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    color: 'white',
    fontWeight: 600,
  },
  micText: {
    margin: '12px 0 0',
    color: '#9ca3af',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  status: {
    textAlign: 'center',
    padding: '16px',
  },
  listening: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#10b981',
    fontWeight: 600,
    fontSize: '16px',
  },
  startButton: {
    padding: '14px 36px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    color: '#6b7280',
    fontSize: '14px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  credit: {
    marginTop: '8px',
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: 500,
  },
};

export default App;