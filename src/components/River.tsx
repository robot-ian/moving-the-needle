import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { loadRiverSeen, saveRiverSeen } from '../store';
import { usePrefersReducedMotion } from '../hooks';
import {
  buildScene,
  currentLines,
  PARALLAX,
  STEP,
  waterPath,
  type Feature,
  type Layer,
} from '../river';

const ADVANCE = 'transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)';

type Props = {
  projectId: string;
  /** Completed sessions for this project. The only input to boat position. */
  sessions: number;
  width?: number;
  height?: number;
};

export default function River({ projectId, sessions, width = 360, height = 90 }: Props) {
  const reduced = usePrefersReducedMotion();
  const scene = useMemo(() => buildScene(sessions, width, height), [sessions, width, height]);
  const water = useMemo(() => {
    const top = scene.waterY + 2;
    const band = (height - top) / 3;
    return [0, 1, 2].map((b) => waterPath(width, height, top + b * band, b * 2.1));
  }, [scene.waterY, width, height]);
  const currents = useMemo(
    () => currentLines(width, height, scene.waterY),
    [width, height, scene.waterY],
  );

  // The one advance: each parallax layer slides back by its own share, so the
  // boat reads as having moved up the river rather than the river having jumped.
  const [slide, setSlide] = useState<{ offset: number; snap: boolean }>({ offset: 0, snap: true });
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${projectId}:${sessions}`;
    if (doneRef.current === key) return;
    doneRef.current = key;

    const seen = loadRiverSeen(projectId);
    saveRiverSeen(projectId, sessions);
    if (reduced) return;

    const gained = sessions - Math.min(seen, sessions);
    if (gained <= 0) return;

    setSlide({ offset: gained * STEP, snap: true });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setSlide({ offset: 0, snap: false })),
    );
  }, [projectId, sessions, reduced]);

  const layer = (name: Layer) => ({
    transform: `translateX(${(slide.offset * PARALLAX[name]).toFixed(2)}px)`,
    transition: slide.snap ? 'none' : ADVANCE,
  });

  return (
    <svg
      className="river"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width={width} height={height} fill="var(--river-sky)" />

      <g style={layer('far')}>
        <path d={scene.ridgeFar} fill="var(--river-ridge-far)" />
      </g>
      <g style={layer('near')}>
        <path d={scene.ridgeNear} fill="var(--river-ridge-near)" />
      </g>
      <g style={layer('bank')}>
        <path d={scene.bank} fill="var(--river-bank)" />
        {scene.features.map((f) => (
          <FeatureShape key={f.id} feature={f} base={scene.waterY - 2} />
        ))}
      </g>

      {water.map((d, i) => (
        <g key={i} className="river-flow" style={{ animationDuration: `${9 - i * 2.4}s` }}>
          <path d={d} fill={`var(--river-water-${i + 1})`} />
        </g>
      ))}

      {currents.map((group, i) => (
        <g
          key={i}
          className="river-current"
          style={
            {
              animationDuration: `${17 - i * 4}s`,
              '--drift': `-${width + 80}px`,
            } as CSSProperties
          }
          stroke="var(--river-current)"
          strokeWidth="1"
          strokeLinecap="round"
        >
          {group.map((c, j) => (
            <g key={j}>
              <line x1={c.x} y1={c.y} x2={c.x + c.len} y2={c.y} />
              <line
                x1={c.x + width + 80}
                y1={c.y}
                x2={c.x + c.len + width + 80}
                y2={c.y}
              />
            </g>
          ))}
        </g>
      ))}

      {/* Where the boat sat before the most recent session. */}
      {scene.markerX !== null && (
        <g style={layer('bank')} opacity="0.3">
          <line
            x1={scene.markerX}
            y1={scene.boatY - 5}
            x2={scene.markerX}
            y2={scene.boatY + 1}
            stroke="var(--river-marker)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <ellipse
            cx={scene.markerX}
            cy={scene.boatY + 2}
            rx="3.4"
            ry="1.1"
            fill="none"
            stroke="var(--river-marker)"
            strokeWidth="0.9"
          />
        </g>
      )}

      <g transform={`translate(${scene.boatX} ${scene.boatY.toFixed(1)})`}>
        <g className="river-boat">
          <path d="M -1 -5 L -1 -17 L 8 -6 Z" fill="var(--river-sail)" />
          <line x1="-2.4" y1="-3" x2="-2.4" y2="-19" stroke="var(--river-sail)" strokeWidth="1.3" />
          <path d="M -11 -4.5 L 11 -4.5 L 7.5 2 L -7.5 2 Z" fill="var(--river-hull)" />
        </g>
      </g>
    </svg>
  );
}

function FeatureShape({ feature, base }: { feature: Feature; base: number }) {
  const { kind, x, j } = feature;

  if (kind === 'reed') {
    const blades = [0, 1, 2, 3].map((i) => {
      const h = 8 + j * 7 + i * 1.8;
      const dx = x + i * 2.6 - 3.5;
      return `M ${dx.toFixed(1)} ${base + 1} Q ${(dx + 1.5).toFixed(1)} ${(base - h * 0.6).toFixed(1)} ${(dx + 3.5 + j * 2).toFixed(1)} ${(base - h).toFixed(1)}`;
    });
    return (
      <path
        d={blades.join(' ')}
        fill="none"
        stroke="var(--river-veg)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    );
  }

  if (kind === 'rock') {
    const w = 8 + j * 9;
    const h = 4 + j * 5;
    return (
      <path
        d={`M ${(x - w / 2).toFixed(1)} ${base + 1} L ${(x - w * 0.26).toFixed(1)} ${(base - h).toFixed(1)} L ${(x + w * 0.14).toFixed(1)} ${(base - h * 0.78).toFixed(1)} L ${(x + w / 2).toFixed(1)} ${base + 1} Z`}
        fill="var(--river-stone)"
      />
    );
  }

  if (kind === 'tree') {
    const h = 14 + j * 10;
    return (
      <g>
        <line
          x1={x}
          y1={base + 1}
          x2={x}
          y2={base - h * 0.5}
          stroke="var(--river-veg)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <ellipse
          cx={x}
          cy={base - h * 0.78}
          rx={5 + j * 3}
          ry={4.4 + j * 2.6}
          fill="var(--river-veg)"
        />
      </g>
    );
  }

  const h = 17 + j * 12;
  const half = 4.5 + j * 2;
  return (
    <path
      d={`M ${x.toFixed(1)} ${(base - h).toFixed(1)} L ${(x + half).toFixed(1)} ${base + 1} L ${(x - half).toFixed(1)} ${base + 1} Z`}
      fill="var(--river-veg)"
    />
  );
}
