import React, { useEffect, useState, useRef } from 'react';

interface WaveformControlProps {
  isActive: boolean; // true = listening (real-time), false = muted (static)
  audioStream?: MediaStream;
  barCount?: number;
  staticPattern?: 'flat' | 'noise' | 'wave' | 'center'; // New prop for static pattern style
}

export default function WaveformControl({ 
  isActive, 
  audioStream,
  barCount = 20,
  staticPattern = 'wave' // Changed default to wave pattern
}: WaveformControlProps) {
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(barCount).fill(0));
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>();

  // Generate different static patterns for muted state
  const generateStaticBars = () => {
    const staticLevels: number[] = [];
    
    switch (staticPattern) {
      case 'flat':
        // Uniform low bars - clean and minimal
        for (let i = 0; i < barCount; i++) {
          staticLevels.push(18); // Consistent 18% height
        }
        break;
        
      case 'noise':
        // Random noise pattern - like background audio
        for (let i = 0; i < barCount; i++) {
          const randomHeight = 8 + Math.random() * 15; // 8% to 23% random
          staticLevels.push(randomHeight);
        }
        break;
        
      case 'wave':
        // Gentle sine wave pattern - smooth and organic
        for (let i = 0; i < barCount; i++) {
          const wavePosition = (i / (barCount - 1)) * Math.PI * 2; // Full wave cycle
          const waveHeight = 15 + Math.sin(wavePosition) * 8; // 7% to 23% sine wave
          staticLevels.push(waveHeight);
        }
        break;
        
      case 'center':
        // Center-focused pattern - higher in middle, lower at edges
        for (let i = 0; i < barCount; i++) {
          const centerDistance = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const height = 25 - (centerDistance * 15); // 10% to 25% center focus
          staticLevels.push(height);
        }
        break;
        
      default:
        // Fallback to flat pattern
        for (let i = 0; i < barCount; i++) {
          staticLevels.push(18);
        }
    }
    
    return staticLevels;
  };

  // Real-time audio analysis for listening state
  const analyzeAudio = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateWaveform = () => {
      if (!analyserRef.current || !isActive) return;
      
      // Get frequency data for waveform
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Convert to waveform bars
      const barSize = Math.floor(bufferLength / barCount);
      const newLevels: number[] = [];
      
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * barSize;
        const end = start + barSize;
        
        for (let j = start; j < end && j < bufferLength; j++) {
          sum += dataArray[j];
        }
        
        // Normalize to 0-100 and add some responsiveness
        const average = sum / barSize;
        const normalized = Math.min(100, (average / 255) * 100);
        newLevels.push(normalized);
      }
      
      setAudioLevels(newLevels);
      animationRef.current = requestAnimationFrame(updateWaveform);
    };
    
    updateWaveform();
  };

  // Setup audio context when active and audio stream is available
  useEffect(() => {
    if (isActive && audioStream) {
      // Create audio context and analyser
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyser for waveform data
      analyserRef.current.fftSize = 64; // Small for responsive waveform
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Connect microphone to analyser
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
      microphoneRef.current.connect(analyserRef.current);
      
      // Start real-time audio analysis
      analyzeAudio();
    } else {
      // Stop animation and clean up audio context
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      analyserRef.current = null;
      microphoneRef.current = null;
      
      // Set static bars for muted state
      if (!isActive) {
        setAudioLevels(generateStaticBars());
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioStream, barCount]);

  // Initialize with static bars
  useEffect(() => {
    if (!isActive) {
      setAudioLevels(generateStaticBars());
    }
  }, [isActive, barCount]);

  return (
    <div style={{ 
      height: '60px',
      display: 'flex',
      alignItems: 'end',
      justifyContent: 'center',
      gap: '2px',
      padding: '0 10px',
      backgroundColor: 'transparent',
      borderRadius: '8px',
      minWidth: `${barCount * 10}px` // Ensure consistent width
    }}>
      {audioLevels.map((level, index) => (
        <div
          key={index}
          style={{
            width: '8px',
            height: `${Math.max(4, level * 0.6)}px`, // Min height 4px, max 60px
            backgroundColor: isActive 
              ? (level > 10 ? '#198038' : '#e0e0e0') // Green when active and has signal
              : '#8D8D8D', // Grey when muted
            borderRadius: '2px',
            transition: isActive ? 'height 0.1s ease' : 'none', // Smooth animation only when active
            opacity: isActive 
              ? (level > 5 ? 1 : 0.5) // Variable opacity when active
              : 0.7 // Fixed opacity when muted
          }}
        />
      ))}
    </div>
  );
} 