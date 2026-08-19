import { useEffect, useRef } from 'react';
import { loadRiverSeen, saveRiverSeen } from '../store';
import { usePrefersReducedMotion } from '../hooks';
import { drawScene, paletteFor, STEP } from '../river';

const ADVANCE_MS = 1500;

export default function River({ sessions }: { sessions: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
    });
    ro.observe(wrap);

    // The boat advances once, from where it was last seen to where it is now.
    // Both numbers are session counts; neither can fall on its own.
    const seen = loadRiverSeen();
    const from = Math.min(seen, sessions);
    const advancing = !reduced && sessions > from;
    const startedAt = performance.now();
    saveRiverSeen(sessions);

    const palette = paletteFor(new Date().getHours());
    let frame = 0;

    function draw(now: number) {
      const elapsed = now - startedAt;
      let displayed = sessions;
      let ripple = 0;
      if (advancing && elapsed < ADVANCE_MS) {
        const k = elapsed / ADVANCE_MS;
        displayed = from + (sessions - from) * (1 - Math.pow(1 - k, 3));
        ripple = Math.sin(k * Math.PI);
      }

      drawScene(ctx!, {
        width,
        height,
        worldX: displayed * STEP,
        time: reduced ? 6 : elapsed / 1000,
        ripple,
        still: reduced,
        palette,
      });

      if (!reduced) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    // Nothing runs while the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
    };
  }, [sessions, reduced]);

  return (
    <div className="river" ref={wrapRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
