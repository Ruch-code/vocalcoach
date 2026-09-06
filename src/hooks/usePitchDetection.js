import { useState, useEffect, useCallback, useRef } from 'react';
import { PitchDetector } from '../utils/pitchDetection';

export function usePitchDetection(options = {}) {
  const [pitch, setPitch] = useState(null);
  const [clarity, setClarity] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [micGranted, setMicGranted] = useState(null);
  const detectorRef = useRef(null);

  const start = useCallback(async () => {
    if (detectorRef.current) return;
    
    setError(null);
    setMicGranted(null);
    detectorRef.current = new PitchDetector({
      onPitchDetected: (note, clr) => {
        setPitch(note);
        setClarity(clr);
      },
      onError: (err) => {
        setError(err.message);
        setIsListening(false);
        setMicGranted('error');
        detectorRef.current = null;
      },
      ...options,
    });

    try {
      await detectorRef.current.start();
      setIsListening(true);
      setMicGranted('granted');
    } catch (err) {
      setError(err.message);
      setMicGranted('denied');
      detectorRef.current = null;
    }
  }, [options]);

  const stop = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      detectorRef.current = null;
      setIsListening(false);
      setPitch(null);
      setClarity(0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
    };
  }, []);

  return { pitch, clarity, isListening, error, start, stop, micGranted };
}