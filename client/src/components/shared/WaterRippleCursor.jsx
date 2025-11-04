import React, { useEffect, useRef } from 'react';
import bgWater from '../../assests/images/surface-fresh-water-with-splashes.jpg';

export default function WaterRippleCursor({ className = '', intensity = 1, backgroundSrc = bgWater }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      // spawn a handful of bubbles each move
      const count = Math.floor(2 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.4 + Math.random() * 0.9;
        particlesRef.current.push({
          x: e.clientX + Math.cos(angle) * 2,
          y: e.clientY + Math.sin(angle) * 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3,
          r: 2 + Math.random() * 6,
          life: 1,
        });
      }
    };

    window.addEventListener('mousemove', onMove);

    const step = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // subtle water tint overlay to blend with background
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#5ec9ff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // update and draw particles (bubbles/ripples)
      const next = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.06 * (1 + intensity * 0.3); // slight expansion
        p.life -= 0.02 * (1 + intensity * 0.2);
        if (p.life > 0 && p.r > 0.5) {
          // bubble
          ctx.beginPath();
          const alpha = Math.max(0, p.life) * 0.9;
          const gradient = ctx.createRadialGradient(p.x, p.y, p.r * 0.2, p.x, p.y, p.r);
          gradient.addColorStop(0, `rgba(255,255,255,${0.35 * alpha})`);
          gradient.addColorStop(0.6, `rgba(255,255,255,${0.12 * alpha})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          // specular highlight
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${0.18 * alpha})`;
          ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.4, Math.max(0.8, p.r * 0.18), 0, Math.PI * 2);
          ctx.fill();

          next.push(p);
        }
      }
      particlesRef.current = next;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return (
    <div className={`fixed inset-0 -z-10 ${className}`} aria-hidden>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundSrc})`, filter: 'saturate(1.05) brightness(0.9)' }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* dark vignette for depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)'
      }} />
    </div>
  );
}


