import React, { useEffect, useState } from 'react';
import { generateSyntheticWaveform, generateStaticBars, type SyntheticPattern } from './syntheticWaveformUtils';

interface SyntheticWaveformControlProps {
  isActive: boolean;
  amplitude?: number; // 0-1 scale from Layercode
  barCount?: number;
  syntheticPattern?: SyntheticPattern;
  staticPattern?: 'flat' | 'noise' | 'wave' | 'center';
  barHeight?: string; // Responsive bar height (e.g., '3rem', '2rem')
  barWidth?: string; // Responsive bar width (e.g., '0.8rem', '0.7rem')
  animationSpeed?: number; // For animated-wave pattern (milliseconds)
}

/**
 * SyntheticWaveformControl - Enhanced waveform that works with amplitude data
 * 
 * This component wraps the visual logic from WaveformControl but accepts
 * synthetic amplitude data instead of requiring a MediaStream.
 * Perfect for Layercode integration where we only get processed amplitude values.
 */
export default function SyntheticWaveformControl({ 
  isActive, 
  amplitude = 0,
  barCount = 10,
  syntheticPattern = 'frequency-distributed', // Default pattern
  staticPattern = 'flat',
  barHeight = '3rem',
  barWidth = '0.8rem',
  animationSpeed = 50
}: SyntheticWaveformControlProps) {
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(barCount).fill(0));
  const [animationTime, setAnimationTime] = useState(0);

  // Generate synthetic waveform based on amplitude and pattern
  useEffect(() => {
    if (isActive && amplitude > 0) {
      // Patterns that need continuous time-based updates
      if (syntheticPattern === 'animated-wave' || syntheticPattern === 'frequency-distributed') {
        const interval = setInterval(() => {
          setAnimationTime(prev => {
            const newTime = prev + 1;
            const newLevels = generateSyntheticWaveform(
              amplitude, 
              barCount, 
              syntheticPattern, 
              newTime
            );
            setAudioLevels(newLevels);
            return newTime;
          });
        }, animationSpeed);
        
        return () => clearInterval(interval);
      } else {
        // For truly static patterns (center-focused), update only when amplitude changes
        const newLevels = generateSyntheticWaveform(amplitude, barCount, syntheticPattern);
        setAudioLevels(newLevels);
      }
    } else {
      // Use static bars when inactive or no amplitude
      const staticLevels = generateStaticBars(barCount, staticPattern);
      setAudioLevels(staticLevels);
    }
  }, [isActive, amplitude, barCount, syntheticPattern, staticPattern, animationSpeed]);

  // Initialize with static bars on mount
  useEffect(() => {
    const staticLevels = generateStaticBars(barCount, staticPattern);
    setAudioLevels(staticLevels);
  }, []); // Only run on mount

  // Calculate responsive minimum height (10% of bar height)
  const getMinHeight = () => {
    if (barHeight.includes('rem')) {
      const remValue = parseFloat(barHeight);
      return `${remValue * 0.1}rem`;
    }
    return '0.2rem'; // Fallback
  };

  // Calculate responsive gap (25% of bar width)
  const getGap = () => {
    if (barWidth.includes('rem')) {
      const remValue = parseFloat(barWidth);
      return `${remValue * 0.25}rem`;
    }
    return '0.125rem'; // Fallback
  };

  return (
    <div style={{ 
      height: barHeight,
      display: 'flex',
      alignItems: 'end',
      justifyContent: 'center',
      gap: getGap(),
      padding: '0 0.625rem', // Responsive padding
      backgroundColor: 'transparent',
      borderRadius: '0.5rem',
      minWidth: `${barCount * (parseFloat(barWidth) + 0.25)}rem` // Responsive width calculation
    }}>
      {audioLevels.map((level, index) => (
        <div
          key={index}
          style={{
            width: barWidth,
            height: level > 0 
              ? `${Math.max(parseFloat(getMinHeight()), level * parseFloat(barHeight) / 100)}rem`
              : getMinHeight(),
            backgroundColor: isActive && amplitude > 0.005
              ? (level > 10 ? '#198038' : '#e0e0e0') // Green when active and meaningful signal
              : '#8D8D8D', // Grey when muted or low signal
            borderRadius: '0.125rem',
            transition: isActive && syntheticPattern !== 'animated-wave' 
              ? 'height 0.1s ease' 
              : 'none', // Smooth animation for non-animated patterns
            opacity: isActive && amplitude > 0.005
              ? (level > 5 ? 1 : 0.5) // Variable opacity when active and meaningful signal
              : 0.7 // Fixed opacity when muted or low signal
          }}
        />
      ))}
    </div>
  );
} 