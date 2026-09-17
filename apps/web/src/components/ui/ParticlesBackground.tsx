import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
  pulseVal: number;
}

export interface ParticlesBackgroundProps {
  connectDistance?: number;
  mouseRadius?: number;
  className?: string;
}

export const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({
  connectDistance = 120,
  mouseRadius = 140,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useUIStore((state) => state.theme);
  const particlesEnabled = useUIStore((state) => state.particlesEnabled);
  const particlesDensity = useUIStore((state) => state.particlesDensity);

  useEffect(() => {
    if (!particlesEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isDark = theme === 'dark';

    // Theme-based palette
    const colors = isDark
      ? ['rgba(52, 211, 153, ', 'rgba(56, 189, 248, ', 'rgba(167, 139, 250, ', 'rgba(251, 191, 36, ']
      : ['rgba(35, 141, 91, ', 'rgba(77, 191, 157, ', 'rgba(124, 207, 132, ', 'rgba(239, 189, 104, '];

    const densityBase = particlesDensity === 'low' ? 30 : particlesDensity === 'high' ? 95 : 60;
    const count = window.innerWidth < 768 ? Math.floor(densityBase * 0.5) : densityBase;

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const colorPrefix = colors[Math.floor(Math.random() * colors.length)];
      const baseAlpha = Math.random() * 0.35 + (isDark ? 0.25 : 0.2);
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        size: Math.random() * 2.8 + 1.2,
        baseAlpha,
        alpha: baseAlpha,
        color: colorPrefix,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        pulseVal: Math.random() * Math.PI * 2,
      });
    }

    const mouse = { x: -9999, y: -9999, isHovered: false };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.isHovered = false;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance) {
            const lineAlpha = (1 - dist / connectDistance) * (isDark ? 0.16 : 0.12);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isDark
              ? `rgba(52, 211, 153, ${lineAlpha})`
              : `rgba(35, 141, 91, ${lineAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
        } else if (p.x > width) {
          p.x = width;
          p.vx *= -1;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
        } else if (p.y > height) {
          p.y = height;
          p.vy *= -1;
        }

        if (mouse.isHovered) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mDist < mouseRadius) {
            const force = (1 - mDist / mouseRadius) * 0.8;
            p.x += (mdx / mDist) * force * 3;
            p.y += (mdy / mDist) * force * 3;
            p.alpha = Math.min(1, p.baseAlpha + (1 - mDist / mouseRadius) * 0.5);
          } else {
            p.pulseVal += p.pulseSpeed;
            p.alpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.12;
          }
        } else {
          p.pulseVal += p.pulseSpeed;
          p.alpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.12;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.alpha))})`;
        ctx.shadowBlur = isDark ? 10 : 6;
        ctx.shadowColor = `${p.color}${p.alpha})`;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, particlesEnabled, particlesDensity, connectDistance, mouseRadius]);

  if (!particlesEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`particles-bg-canvas ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
