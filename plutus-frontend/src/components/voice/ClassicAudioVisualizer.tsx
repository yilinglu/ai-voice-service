import React, { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
}

interface Note {
  id: string;
  frequency: number;
  midiNote: number;
  startTime: number;
  duration: number;
  source: 'user' | 'ai';
}

export default function ClassicAudioVisualizer({ isActive }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Convert frequency to MIDI note number
  const frequencyToMidi = (frequency: number): number => {
    return Math.round(69 + 12 * Math.log2(frequency / 440));
  };

  // Generate simulated notes for demonstration
  useEffect(() => {
    if (!isActive) {
      setNotes([]);
      setCurrentTime(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 0.1);
      
      // Simulate note detection
      if (Math.random() > 0.7) {
        const frequency = 200 + Math.random() * 600; // Random frequency between 200-800 Hz
        const newNote: Note = {
          id: `note-${Date.now()}-${Math.random()}`,
          frequency,
          midiNote: frequencyToMidi(frequency),
          startTime: currentTime,
          duration: 0.5 + Math.random() * 1, // Duration between 0.5-1.5 seconds
          source: Math.random() > 0.5 ? 'user' : 'ai'
        };
        
        setNotes(prev => [...prev.slice(-20), newNote]); // Keep last 20 notes
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, currentTime]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw piano roll grid
    const noteHeight = 12;
    const timeScale = 50; // pixels per second
    const midiRange = { min: 40, max: 80 }; // MIDI notes to display
    
    // Draw horizontal grid lines (notes)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let midi = midiRange.min; midi <= midiRange.max; midi++) {
      const y = canvas.height - (midi - midiRange.min) * noteHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();

      // Highlight C notes
      if (midi % 12 === 0) {
        ctx.fillStyle = '#262626';
        ctx.font = '10px monospace';
        ctx.fillText(`C${Math.floor(midi / 12) - 1}`, 5, y - 2);
      }
    }

    // Draw vertical grid lines (time)
    ctx.strokeStyle = '#e0e0e0';
    for (let t = 0; t < canvas.width / timeScale; t += 0.5) {
      const x = (currentTime - t) * timeScale;
      if (x > 0 && x < canvas.width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
    }

    // Draw notes
    notes.forEach(note => {
      if (note.midiNote >= midiRange.min && note.midiNote <= midiRange.max) {
        const x = (currentTime - note.startTime) * timeScale;
        const width = note.duration * timeScale;
        const y = canvas.height - (note.midiNote - midiRange.min + 1) * noteHeight;
        
        // Only draw if note is visible
        if (x + width > 0 && x < canvas.width) {
          // Note color based on source
          ctx.fillStyle = note.source === 'user' 
            ? 'rgba(25, 128, 56, 0.8)'  // Green for user
            : 'rgba(15, 98, 254, 0.8)'; // Blue for AI
          
          ctx.fillRect(Math.max(0, x), y, Math.min(width, canvas.width - x), noteHeight - 2);
          
          // Note border
          ctx.strokeStyle = note.source === 'user' ? '#198038' : '#0F62FE';
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.max(0, x), y, Math.min(width, canvas.width - x), noteHeight - 2);
        }
      }
    });

    // Draw current time indicator
    ctx.strokeStyle = '#da1e28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 2, 0);
    ctx.lineTo(canvas.width - 2, canvas.height);
    ctx.stroke();

  }, [notes, currentTime, isActive]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '350px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px'
        }}
      />
      
      {/* Legend */}
      <div style={{ 
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: '#198038', 
            marginRight: '6px',
            borderRadius: '2px'
          }} />
          User Voice
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: '#0F62FE', 
            marginRight: '6px',
            borderRadius: '2px'
          }} />
          AI Voice
        </div>
      </div>

      {/* Status overlay */}
      {!isActive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#6f6f6f'
        }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
            🎹 MIDI Piano Roll Visualizer
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Start recording to see voice patterns
          </p>
        </div>
      )}
    </div>
  );
} 