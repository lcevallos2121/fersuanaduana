"use client";
import { useEffect, useRef } from "react";

export default function HudBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, raf = 0, t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const ring = (cx: number, cy: number, r: number, a0: number, a1: number, alpha: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.strokeStyle = `rgba(56, 225, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // grid sutil
      ctx.strokeStyle = "rgba(56,225,255,0.035)";
      ctx.lineWidth = 1;
      const step = 46;
      for (let x = (t * 0.2) % step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // anillos concéntricos tipo reactor, abajo-derecha y arriba-izquierda
      const spots = [ { x: w * 0.82, y: h * 0.78, s: 1 }, { x: w * 0.16, y: h * 0.24, s: 0.7 } ];
      spots.forEach((sp, i) => {
        const base = t * 0.0006 * (i ? -1 : 1);
        for (let k = 0; k < 4; k++) {
          const r = (70 + k * 42) * sp.s;
          const a = base + k * 0.6;
          ring(sp.x, sp.y, r, a, a + Math.PI * 1.1, 0.12 - k * 0.02);
          ring(sp.x, sp.y, r, a + Math.PI, a + Math.PI * 1.5, 0.08 - k * 0.015);
        }
        ring(sp.x, sp.y, 20 * sp.s, 0, Math.PI * 2, 0.22);
      });

      if (!reduce) { t += 1; raf = requestAnimationFrame(draw); }
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" aria-hidden />;
}
