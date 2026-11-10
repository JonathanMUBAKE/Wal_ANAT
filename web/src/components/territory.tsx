import { useMemo } from "react";
import { cn } from "./ui";

/* Motifs de l'identité ANAT : le territoire comme fil visuel.
   Courbes de niveau dessinées à l'ouverture (désactivé si le poste réduit les animations). */

type Peak = { x: number; y: number; rings: number; r0?: number; step?: number; seed: number };

const fmt = (n: number) => Math.round(n * 10) / 10;

function contour(cx: number, cy: number, r: number, seed: number, n = 56) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble =
      Math.sin(3 * a + seed) * 0.55 + Math.sin(5 * a + seed * 1.7) * 0.25 + Math.sin(2 * a + seed * 0.4) * 0.45;
    const d = r * (1 + 0.13 * wobble);
    pts.push([cx + d * Math.cos(a), cy + d * Math.sin(a) * 0.78]);
  }
  // Catmull-Rom fermée, convertie en courbes de Bézier pour un tracé souple
  let path = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    path += `C${fmt(p1[0] + (p2[0] - p0[0]) / 6)} ${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)} ${fmt(p2[1] - (p3[1] - p1[1]) / 6)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return `${path}Z`;
}

export function Topo({
  peaks,
  width = 800,
  height = 400,
  className,
  draw = true,
}: {
  peaks: Peak[];
  width?: number;
  height?: number;
  className?: string;
  draw?: boolean;
}) {
  const paths = useMemo(
    () =>
      peaks.flatMap((p) =>
        Array.from({ length: p.rings }, (_, i) => ({
          d: contour(p.x, p.y, (p.r0 ?? 14) + i * (p.step ?? 22), p.seed + i * 0.35),
          major: i % 4 === 3,
          i,
        })),
      ),
    [peaks],
  );
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", className)}
      fill="none"
      stroke="currentColor"
    >
      {paths.map((p, k) => (
        <path
          key={k}
          d={p.d}
          pathLength={1}
          strokeWidth={p.major ? 1.1 : 0.6}
          vectorEffect="non-scaling-stroke"
          className={draw ? "topo-draw" : undefined}
          style={draw ? { animationDelay: `${p.i * 70}ms` } : undefined}
          opacity={p.major ? 1 : 0.7}
        />
      ))}
    </svg>
  );
}

/** Relief commun aux bandeaux : deux sommets décalés vers la droite. */
export const HERO_PEAKS: Peak[] = [
  { x: 640, y: 120, rings: 12, seed: 1.3 },
  { x: 260, y: 470, rings: 9, seed: 4.1, r0: 30 },
];

/** Jauge circulaire segmentée : une part par état, séparées d'un fin espace. */
export function HealthRing({
  parts,
  size = 148,
  center,
  caption,
  track = "rgba(255,255,255,0.1)",
}: {
  parts: { key: string; value: number; color: string; label: string }[];
  size?: number;
  center: React.ReactNode;
  caption: string;
  track?: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const visible = parts.filter((p) => p.value > 0);
  const gap = visible.length > 1 ? 1.4 : 0;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" className="ring-in size-full -rotate-90" role="img" aria-label={caption}>
        <circle cx="21" cy="21" r="17" fill="none" stroke={track} strokeWidth="3" />
        {total > 0 &&
          visible.map((p) => {
            const len = (p.value / total) * 100;
            const seg = (
              <circle
                key={p.key}
                cx="21"
                cy="21"
                r="17"
                fill="none"
                stroke={p.color}
                strokeWidth="3"
                pathLength={100}
                strokeDasharray={`${Math.max(len - gap, 0.1)} ${100 - Math.max(len - gap, 0.1)}`}
                strokeDashoffset={-(acc + gap / 2)}
              >
                <title>{`${p.label} : ${p.value}`}</title>
              </circle>
            );
            acc += len;
            return seg;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>
    </div>
  );
}
