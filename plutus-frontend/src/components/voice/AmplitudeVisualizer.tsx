import React, { useEffect, useRef } from 'react';

interface AmplitudeVisualizerProps {
  amplitude: number;
  color?: string;
  height?: number;
  width?: number;
}

export default function AmplitudeVisualizer({ 
  amplitude, 
  color = '#0F62FE', 
  height = 40,
  width = 200 
}: AmplitudeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Update amplitude history
    historyRef.current.push(amplitude);
    if (historyRef.current.length > width / 2) {
      historyRef.current.shift();
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    if (historyRef.current.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = canvas.width / historyRef.current.length;
      historyRef.current.forEach((amp, index) => {
        const x = index * step;
        const y = canvas.height / 2 - (amp * canvas.height / 2);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw current amplitude as a bar on the right
    const currentY = canvas.height / 2 - (amplitude * canvas.height / 2);
    ctx.fillStyle = color;
    ctx.fillRect(canvas.width - 4, Math.min(currentY, canvas.height / 2), 4, Math.abs(canvas.height / 2 - currentY));

  }, [amplitude, color, height, width]);

  return (
    <canvas 
      ref={canvasRef}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        borderRadius: '4px',
        backgroundColor: 'rgba(240, 240, 240, 0.3)'
      }}
    />
  );
} 