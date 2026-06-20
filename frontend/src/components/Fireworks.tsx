'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
  gravity: number;
  decay: number;
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
}

const COLORS = [
  '#ffd700', '#ff6b35', '#00d4ff', '#ff3c96',
  '#7fff00', '#ff8c00', '#da70d6', '#00fa9a',
  '#fff', '#ff4444',
];

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const explode = (x: number, y: number, color: string) => {
      const count = 80 + Math.random() * 60;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 1.5 + Math.random() * 3.5;
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          radius: 1.5 + Math.random() * 2,
          gravity: 0.04,
          decay: 0.012 + Math.random() * 0.01,
        });
      }
    };

    const launchRocket = () => {
      const x = canvas.width * (0.2 + Math.random() * 0.6);
      const targetY = canvas.height * (0.1 + Math.random() * 0.35);
      rocketsRef.current.push({
        x, y: canvas.height,
        vy: -(canvas.height - targetY) / 55,
        targetY,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        trail: [],
      });
    };

    // Launch rockets periodically
    const launchInterval = setInterval(() => {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        setTimeout(launchRocket, i * 300);
      }
    }, 2800);

    // Initial burst
    setTimeout(launchRocket, 400);
    setTimeout(launchRocket, 900);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update & draw rockets
      rocketsRef.current = rocketsRef.current.filter((r) => {
        r.trail.push({ x: r.x, y: r.y, alpha: 0.6 });
        if (r.trail.length > 12) r.trail.shift();
        r.y += r.vy;

        // Draw trail
        r.trail.forEach((t, i) => {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.globalAlpha = (i / r.trail.length) * 0.5;
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Explode when reached target
        if (r.y <= r.targetY) {
          explode(r.x, r.y, r.color);
          // Second smaller burst
          setTimeout(() => explode(r.x + (Math.random() - 0.5) * 20, r.y + (Math.random() - 0.5) * 20,
            COLORS[Math.floor(Math.random() * COLORS.length)]), 80);
          return false;
        }
        return true;
      });

      // Update & draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      clearInterval(launchInterval);
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
