import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel: number;
}

export const AudioWaveform = ({ isActive, audioLevel }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'hsl(195, 100%, 60%)');
      gradient.addColorStop(0.5, 'hsl(195, 100%, 70%)');
      gradient.addColorStop(1, 'hsl(195, 100%, 60%)');
      
      ctx.fillStyle = gradient;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      
      if (isActive) {
        // Draw animated waveform
        const bars = 50;
        const barWidth = width / bars;
        const time = Date.now() * 0.005;
        
        for (let i = 0; i < bars; i++) {
          const x = i * barWidth;
          const normalizedHeight = (Math.sin(time + i * 0.3) + 1) * 0.5;
          const baseHeight = 20 + (audioLevel * 100);
          const barHeight = Math.max(4, normalizedHeight * baseHeight);
          const y = (height - barHeight) / 2;
          
          ctx.fillRect(x, y, barWidth - 2, barHeight);
        }
        
        animationRef.current = requestAnimationFrame(draw);
      } else {
        // Draw static line
        const centerY = height / 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={120}
        className="w-full h-30 bg-muted/20 rounded-lg border border-border"
        style={{ maxWidth: '100%', height: '120px' }}
      />
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">
            Click "Start Call" to begin audio capture
          </div>
        </div>
      )}
    </div>
  );
};