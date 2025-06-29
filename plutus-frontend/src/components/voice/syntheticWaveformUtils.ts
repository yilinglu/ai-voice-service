// Synthetic Waveform Generation Utilities
// Converts single amplitude values (0-1) into realistic waveform bar arrays

export type SyntheticPattern = 'frequency-distributed' | 'center-focused' | 'animated-wave';

/**
 * Option 1: Frequency-Distributed Pattern (DEFAULT)
 * Simulates real audio frequency analysis with exponential decay
 * Higher frequencies (right side) have lower amplitudes
 */
export const createFrequencyDistributedWaveform = (
  amplitude: number, 
  barCount: number,
  time: number = Date.now()
): number[] => {
  // Smart scaling: amplification + guaranteed minimum floor
  const amplifiedAmplitude = amplitude < 0.02 
    ? Math.max(amplitude * 4, 0.015)  // 4x amplification + 1.5% minimum floor
    : amplitude;                      // Normal scaling for higher signals
  
  const baseLevel = (amplifiedAmplitude * 100) * 3.5; // Convert 0-1 to 0-100 scale + 350% boost
  const bars: number[] = [];
  
  for (let i = 0; i < barCount; i++) {
    // Simulate frequency distribution (higher frequencies = lower amplitude)
    const frequencyFactor = Math.exp(-i / (barCount * 0.6)); // Gentler exponential decay
    
    // Add time-based variation for more dynamic feel
    const timeVariation = Math.sin((time * 0.003) + (i * 0.5)) * 0.15; // Subtle time-based wave
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±10% random variation
    
    const totalVariation = (1 + timeVariation + randomVariation);
    const barHeight = Math.max(5, baseLevel * frequencyFactor * totalVariation);
    bars.push(Math.min(100, barHeight));
  }
  
  return bars;
};

/**
 * Option 2: Center-Focused Pattern
 * Creates a bell curve with highest bars in the center
 * Good for vocal emphasis visualization
 */
export const createCenterFocusedWaveform = (
  amplitude: number, 
  barCount: number
): number[] => {
  // Smart scaling: amplification + guaranteed minimum floor
  const amplifiedAmplitude = amplitude < 0.02 
    ? Math.max(amplitude * 4, 0.015)  // 4x amplification + 1.5% minimum floor
    : amplitude;                      // Normal scaling for higher signals
  
  const baseLevel = (amplifiedAmplitude * 100) * 3.5; // Convert 0-1 to 0-100 scale + 350% boost
  const center = (barCount - 1) / 2;
  
  return Array.from({ length: barCount }, (_, i) => {
    const distanceFromCenter = Math.abs(i - center) / center;
    const centerBoost = 1 - (distanceFromCenter * 0.6); // 40-100% of center height
    const variation = 0.8 + (Math.random() * 0.4); // 80-120% variation
    const barHeight = baseLevel * centerBoost * variation;
    return Math.max(5, Math.min(100, barHeight));
  });
};

/**
 * Option 3: Animated Wave Pattern
 * Creates flowing sine waves that change over time
 * Most dynamic and organic-looking option
 */
export const createAnimatedWaveform = (
  amplitude: number, 
  barCount: number, 
  time: number = 0
): number[] => {
  // Smart scaling: amplification + guaranteed minimum floor
  const amplifiedAmplitude = amplitude < 0.02 
    ? Math.max(amplitude * 4, 0.015)  // 4x amplification + 1.5% minimum floor
    : amplitude;                      // Normal scaling for higher signals
  
  const baseLevel = (amplifiedAmplitude * 100) * 3.5; // Convert 0-1 to 0-100 scale + 350% boost
  
  return Array.from({ length: barCount }, (_, i) => {
    // Multiple sine waves for complexity and organic feel
    const wave1 = Math.sin((i * 0.5) + (time * 0.02)) * 0.3;      // Primary wave
    const wave2 = Math.sin((i * 0.2) + (time * 0.01)) * 0.2;      // Secondary wave
    const wave3 = Math.sin((i * 0.8) + (time * 0.03)) * 0.1;      // Tertiary wave
    
    const waveSum = (wave1 + wave2 + wave3) + 1; // Normalize to 0.4-1.6 range
    const randomVariation = 0.6 + (Math.random() * 0.4); // 60-100% variation
    const barHeight = baseLevel * waveSum * randomVariation;
    
    return Math.max(5, Math.min(100, barHeight));
  });
};

/**
 * Main factory function for generating synthetic waveforms
 * Handles pattern selection and fallback logic
 */
export const generateSyntheticWaveform = (
  amplitude: number,
  barCount: number,
  pattern: SyntheticPattern = 'frequency-distributed',
  time?: number
): number[] => {
  // Handle very low amplitude - use static pattern
  if (amplitude < 0.01) {
    return generateStaticBars(barCount, 'wave');
  }

  switch (pattern) {
    case 'frequency-distributed':
      return createFrequencyDistributedWaveform(amplitude, barCount, time || Date.now());
    
    case 'center-focused':
      return createCenterFocusedWaveform(amplitude, barCount);
    
    case 'animated-wave':
      return createAnimatedWaveform(amplitude, barCount, time || 0);
    
    default:
      // Fallback to frequency-distributed
      return createFrequencyDistributedWaveform(amplitude, barCount, time || Date.now());
  }
};

/**
 * Generate static patterns for muted/inactive states
 * Replicates the logic from WaveformControl for consistency
 */
export const generateStaticBars = (
  barCount: number,
  staticPattern: 'flat' | 'noise' | 'wave' | 'center' = 'wave'
): number[] => {
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
      // Fallback to wave pattern
      for (let i = 0; i < barCount; i++) {
        const wavePosition = (i / (barCount - 1)) * Math.PI * 2;
        const waveHeight = 15 + Math.sin(wavePosition) * 8;
        staticLevels.push(waveHeight);
      }
  }
  
  return staticLevels;
}; 