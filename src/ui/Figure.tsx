// Exam-style figures for reasoning questions. Everything is plain SVG or HTML, drawn from the
// question's data. Angle diagrams, L-shapes and cuboids use fixed, tidy proportions and
// rectangles follow their labels; the shapes say "Not drawn to scale" (angle questions say it
// in their text). Scales, number lines, grids, cubes, regular polygons and the angles to sort
// by type are drawn exactly, because the question is about reading them.
import type { Block } from '../gen/types';
import { formatNumber } from '../gen/format';
import './figures.css';

type FigureBlock = Exclude<Block, { b: 'text' | 'speak' | 'passage' }>;

const PI = Math.PI;
const polar = (cx: number, cy: number, r: number, turn: number) => {
  // turn 0 = 12 o'clock, clockwise
  const a = turn * 2 * PI - PI / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

function Table({ b }: { b: Extract<Block, { b: 'table' }> }) {
  return (
    <div className="fig-table-wrap">
      <table className="fig-table">
        <thead>
          <tr>
            {b.head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarChart({ b }: { b: Extract<Block, { b: 'bar' }> }) {
  const W = 560;
  const H = 320;
  const pad = { l: 64, r: 16, t: 34, b: 44 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const band = plotW / b.labels.length;
  const barW = Math.min(46, band * 0.55);
  const y = (v: number) => pad.t + plotH * (1 - v / b.max);
  const ticks = Array.from({ length: b.max / b.step + 1 }, (_, i) => i * b.step);
  return (
    <svg className="fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bar chart: ${b.title}`}>
      <text x={W / 2} y={18} className="fig-title" textAnchor="middle">
        {b.title}
      </text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'fig-axis' : 'fig-grid'} />
          <text x={pad.l - 8} y={y(t)} className="fig-tick" textAnchor="end" dominantBaseline="middle">
            {formatNumber(String(t))}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={y(0)} className="fig-axis" />
      <text className="fig-tick" textAnchor="middle" transform={`translate(16 ${pad.t + plotH / 2}) rotate(-90)`}>
        {b.axis}
      </text>
      {b.labels.map((label, i) => {
        const x = pad.l + band * i + (band - barW) / 2;
        return (
          <g key={label}>
            <rect x={x} y={y(b.values[i])} width={barW} height={y(0) - y(b.values[i])} className="fig-bar" />
            <text x={x + barW / 2} y={H - pad.b + 20} className="fig-label" textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineGraph({ b }: { b: Extract<Block, { b: 'line' }> }) {
  const W = 560;
  const H = b.xAxis ? 364 : 340;
  const pad = { l: 64, r: 24, t: 34, b: b.xAxis ? 68 : 44 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (plotW * i) / (b.labels.length - 1);
  const y = (v: number) => pad.t + plotH * (1 - (v - b.min) / (b.max - b.min));
  const ticks = Array.from({ length: (b.max - b.min) / b.step + 1 }, (_, i) => b.min + i * b.step);
  const points = b.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg className="fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line graph: ${b.title}`}>
      <text x={W / 2} y={18} className="fig-title" textAnchor="middle">
        {b.title}
      </text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === b.min ? 'fig-axis' : 'fig-grid'} />
          <text x={pad.l - 8} y={y(t)} className="fig-tick" textAnchor="end" dominantBaseline="middle">
            {t}
          </text>
        </g>
      ))}
      {b.labels.map((label, i) => (
        <g key={label}>
          <line x1={x(i)} x2={x(i)} y1={pad.t} y2={y(b.min)} className="fig-grid" />
          <text x={x(i)} y={H - pad.b + 20} className="fig-label" textAnchor="middle">
            {label}
          </text>
        </g>
      ))}
      <text className="fig-tick" textAnchor="middle" transform={`translate(16 ${pad.t + plotH / 2}) rotate(-90)`}>
        {b.axis}
      </text>
      {b.xAxis && (
        <text x={pad.l + plotW / 2} y={H - 12} className="fig-tick" textAnchor="middle">
          {b.xAxis}
        </text>
      )}
      <polyline points={points} className="fig-line" />
      {b.dots !== false && b.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={5} className="fig-dot" />)}
    </svg>
  );
}

const PIE_FILLS = ['#cde2fb', '#86b6ef', '#e1e0d9', '#b7d3f6', '#f3f2ee'];

function PieChart({ b }: { b: Extract<Block, { b: 'pie' }> }) {
  const S = 340;
  const c = S / 2;
  const R = 130;
  const starts = b.slices.map((_, i) => b.slices.slice(0, i).reduce((sum, x) => sum + x.turn, 0));
  const sectors = b.slices.map((s, i) => {
    const start = starts[i];
    const end = start + s.turn;
    const mid = (start + end) / 2;
    const outside = s.turn < 0.1;
    // "Swimming 135°" goes on two lines inside a sector, so it fits a narrow one.
    const angle = / \d+°$/.exec(s.label);
    const lines = angle && !outside ? [s.label.slice(0, angle.index), angle[0].trim()] : [s.label];
    return { s, i, start, end, mid, label: polar(c, c, outside ? R + 22 : R * 0.58, mid), lines };
  });
  // Sectors first, then right-angle marks, then every label, so no sector paints over a label
  // that spills out of a narrow neighbour.
  return (
    <svg className="fig-svg fig-pie" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`Pie chart: ${b.title}`}>
      {sectors.map(({ s, i, start, end }) => {
        const p0 = polar(c, c, R, start);
        const p1 = polar(c, c, R, end);
        const large = s.turn > 0.5 ? 1 : 0;
        return (
          <path key={s.label} d={`M${c},${c} L${p0.x},${p0.y} A${R},${R} 0 ${large} 1 ${p1.x},${p1.y} Z`} fill={PIE_FILLS[i % PIE_FILLS.length]} className="fig-slice" />
        );
      })}
      {sectors.map(({ s, start, end, mid }) => {
        if (Math.abs(s.turn - 0.25) >= 1e-9) return null;
        const m0 = polar(c, c, 16, start);
        const m1 = polar(c, c, 16 * Math.SQRT2, mid);
        const m2 = polar(c, c, 16, end);
        return <path key={s.label} d={`M${m0.x},${m0.y} L${m1.x},${m1.y} L${m2.x},${m2.y}`} className="fig-right" />;
      })}
      {sectors.map(({ s, label, lines }) => (
        <text key={s.label} x={label.x} y={label.y} className="fig-label" textAnchor="middle" dominantBaseline="middle">
          {lines.length === 1
            ? lines[0]
            : lines.map((line, k) => (
                <tspan key={k} x={label.x} dy={k === 0 ? '-0.6em' : '1.2em'}>
                  {line}
                </tspan>
              ))}
        </text>
      ))}
    </svg>
  );
}

function CoordGrid({ b }: { b: Extract<Block, { b: 'coords' }> }) {
  const S = 380;
  const pad = 30;
  const n = b.max - b.min;
  const unit = (S - 2 * pad) / n;
  const x = (v: number) => pad + (v - b.min) * unit;
  const y = (v: number) => S - pad - (v - b.min) * unit;
  const vals = Array.from({ length: n + 1 }, (_, i) => b.min + i);
  const hasAxes = b.min < 0;
  return (
    <svg className="fig-svg fig-coords" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Coordinate grid">
      {vals.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={y(b.min)} y2={y(b.max)} className={v === 0 ? 'fig-axis' : 'fig-grid'} />
          <line x1={x(b.min)} x2={x(b.max)} y1={y(v)} y2={y(v)} className={v === 0 ? 'fig-axis' : 'fig-grid'} />
          {(v !== 0 || !hasAxes) && (
            <>
              <text x={x(v)} y={(hasAxes ? y(0) : y(b.min)) + 14} className="fig-tick-small" textAnchor="middle">
                {v < 0 ? `−${-v}` : v}
              </text>
              <text x={(hasAxes ? x(0) : x(b.min)) - 6} y={y(v)} className="fig-tick-small" textAnchor="end" dominantBaseline="middle">
                {v < 0 ? `−${-v}` : v === 0 ? '' : v}
              </text>
            </>
          )}
        </g>
      ))}
      <text x={x(b.max) + 4} y={(hasAxes ? y(0) : y(b.min)) - 6} className="fig-tick">
        x
      </text>
      <text x={(hasAxes ? x(0) : x(b.min)) + 6} y={y(b.max) - 4} className="fig-tick">
        y
      </text>
      {b.join && (
        <polyline points={b.points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')} className="fig-shape" />
      )}
      {b.points.map((p) => (
        <g key={p.label}>
          <path d={`M${x(p.x) - 5},${y(p.y) - 5} L${x(p.x) + 5},${y(p.y) + 5} M${x(p.x) - 5},${y(p.y) + 5} L${x(p.x) + 5},${y(p.y) - 5}`} className="fig-cross" />
          <text x={x(p.x) + 8} y={y(p.y) - 8} className="fig-point">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const degrees = (label: string) => (/^\d+°$/.test(label) ? Number(label.slice(0, -1)) : null);

/** Proportional angles for rays; unknowns share what is left. */
function spread(labels: string[], total: number): number[] {
  const known = labels.map(degrees);
  const sumKnown = known.reduce<number>((s, v) => s + (v ?? 0), 0);
  const unknown = known.filter((v) => v === null).length;
  const share = unknown ? Math.max((total - sumKnown) / unknown, 15) : 0;
  return known.map((v) => v ?? share);
}

/**
 * Sizes of the angles where straight lines cross, clockwise from the top: a labelled angle, the
 * angle vertically opposite it, then what makes a straight line (180°) with the others. Angles the
 * labels do not fix share what is left, so a drawing can always be made.
 */
function crossSizes(labels: string[]): number[] {
  const n = labels.length;
  const half = n / 2;
  const v = labels.map(degrees);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) if (v[i] === null) v[i] = v[(i + half) % n];
    for (let i = 0; i < n; i++) {
      if (v[i] !== null) continue;
      const rest = Array.from({ length: half - 1 }, (_, k) => v[(i + 1 + k) % n]);
      if (rest.every((x) => x !== null)) v[i] = 180 - rest.reduce<number>((s, x) => s + (x ?? 0), 0);
    }
  }
  const side = v.slice(0, half);
  const unknown = side.filter((x) => x === null).length;
  const share = unknown ? Math.max((180 - side.reduce<number>((s, x) => s + (x ?? 0), 0)) / unknown, 20) : 0;
  return v.map((x) => x ?? share);
}

function CrossingLines({ b, W, H }: { b: Extract<Block, { b: 'angles' }>; W: number; H: number }) {
  const sizes = crossSizes(b.labels);
  const cx = W / 2;
  const cy = H / 2;
  const L = 118;
  // Angles measured anticlockwise from the positive x direction; the first angle is centred at the top.
  const dir = (deg: number, r: number) => ({ x: cx + r * Math.cos((deg * PI) / 180), y: cy - r * Math.sin((deg * PI) / 180) });
  let at = 90 + sizes[0] / 2;
  const starts: number[] = [];
  const mids: number[] = [];
  for (const s of sizes) {
    starts.push(at);
    mids.push(at - s / 2);
    at -= s;
  }
  return (
    <svg className="fig-svg fig-angles" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Straight lines crossing at a point, not to scale">
      {starts.slice(0, sizes.length / 2).map((deg, i) => {
        const p = dir(deg, L);
        const q = dir(deg + 180, L);
        return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="fig-shape" />;
      })}
      {mids.map((deg, i) => {
        const label = b.labels[i];
        if (!label) return null;
        const p = dir(deg, sizes[i] < 50 ? 82 : 60);
        return (
          <text key={i} x={p.x} y={p.y} className={/^[a-z]$/.test(label) ? 'fig-unknown' : 'fig-label'} textAnchor="middle" dominantBaseline="middle">
            {label}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r={3} className="fig-dot" />
    </svg>
  );
}

function AngleFigure({ b }: { b: Extract<Block, { b: 'angles' }> }) {
  const W = 420;
  const H = 260;
  if (b.shape === 'cross') return <CrossingLines b={b} W={W} H={H} />;
  if (b.shape === 'triangle' || b.shape === 'quad') {
    const right = b.shape === 'triangle' && b.labels[0] === '90°';
    const pts =
      b.shape === 'quad'
        ? [
            { x: 70, y: 210 },
            { x: 330, y: 220 },
            { x: 360, y: 60 },
            { x: 130, y: 40 },
          ]
        : right
          ? [
              { x: 90, y: 215 },
              { x: 350, y: 215 },
              { x: 90, y: 45 },
            ]
          : [
              { x: 60, y: 215 },
              { x: 360, y: 215 },
              { x: 210, y: 40 },
            ];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return (
      <svg className="fig-svg fig-angles" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Angle diagram, not to scale">
        <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="fig-shape" />
        {right && <path d={`M${pts[0].x},${pts[0].y - 22} L${pts[0].x + 22},${pts[0].y - 22} L${pts[0].x + 22},${pts[0].y}`} className="fig-right" />}
        {pts.map((p, i) => {
          const label = b.labels[i];
          if (!label || (right && i === 0)) return null;
          const k = 0.26;
          return (
            <text key={i} x={p.x + (cx - p.x) * k} y={p.y + (cy - p.y) * k} className={label === 'a' || label === 'b' || label === '?' ? 'fig-unknown' : 'fig-label'} textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          );
        })}
      </svg>
    );
  }
  // Rays from one point: a straight line (half turn) or a full turn.
  const total = b.shape === 'line' ? 180 : 360;
  const sizes = spread(b.labels, total);
  const cx = W / 2;
  const cy = b.shape === 'line' ? 200 : H / 2;
  const L = b.shape === 'line' ? 170 : 110;
  const scale = total / sizes.reduce((s, v) => s + v, 0);
  // Angles measured anticlockwise from the positive x direction; the line case starts at 180°.
  let at = b.shape === 'line' ? 180 : 90;
  const rays: number[] = [];
  const mids: number[] = [];
  sizes.forEach((s) => {
    const size = s * scale;
    rays.push(at);
    mids.push(at - size / 2);
    at -= size;
  });
  const dir = (deg: number, r: number) => ({ x: cx + r * Math.cos((deg * PI) / 180), y: cy - r * Math.sin((deg * PI) / 180) });
  return (
    <svg className="fig-svg fig-angles" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Angle diagram, not to scale">
      {b.shape === 'line' && <line x1={cx - L - 20} x2={cx + L + 20} y1={cy} y2={cy} className="fig-shape" />}
      {rays.map((deg, i) => {
        if (b.shape === 'line' && i === 0) return null;
        const end = dir(deg, L);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} className="fig-shape" />;
      })}
      {mids.map((deg, i) => {
        const p = dir(deg, b.shape === 'line' ? 62 : 58);
        const label = b.labels[i];
        return (
          <text key={i} x={p.x} y={p.y} className={label === 'a' ? 'fig-unknown' : 'fig-label'} textAnchor="middle" dominantBaseline="middle">
            {label}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r={3} className="fig-dot" />
    </svg>
  );
}

/** "Not drawn to scale", small, in the bottom right corner of a W × H figure. */
function NotToScale({ W, H }: { W: number; H: number }) {
  return (
    <text x={W - 8} y={H - 8} className="fig-note" textAnchor="end">
      Not drawn to scale
    </text>
  );
}

/** The longer side of a rectangle is drawn at most this many times the shorter one. */
const MAX_ASPECT = 2.5;

function Rect({ b }: { b: Extract<Block, { b: 'rect' }> }) {
  // In proportion to the labels, so the longer label is on the longer side and a square looks
  // square; the proportion is capped so a 15 cm by 2 cm rectangle still has room for its labels.
  const [W, H] = [360, 220];
  const [lw, lh] = b.labels.map((l) => parseFloat(l.replace(/,/g, '')));
  const known = lw > 0 && lh > 0;
  const aspect = b.square || (known && lw === lh) ? 1 : known ? Math.min(Math.max(lw / lh, 1 / MAX_ASPECT), MAX_ASPECT) : 1.6;
  const area = { x: 40, y: 20, w: 240, h: 150 };
  const w = Math.min(area.w, area.h * aspect);
  const h = w / aspect;
  const x = area.x + (area.w - w) / 2;
  const y = area.y + (area.h - h) / 2;
  return (
    <svg className="fig-svg fig-small" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${aspect === 1 ? 'Square' : 'Rectangle'} ${b.labels[0]} by ${b.labels[1]}, not to scale`}>
      <rect x={x} y={y} width={w} height={h} className="fig-shape" />
      <text x={x + w / 2} y={y + h + 24} className="fig-label" textAnchor="middle">
        {b.labels[0]}
      </text>
      <text x={x + w + 12} y={y + h / 2} className="fig-label" dominantBaseline="middle">
        {b.labels[1]}
      </text>
      <NotToScale W={W} H={H} />
    </svg>
  );
}

function LShape({ b }: { b: Extract<Block, { b: 'lshape' }> }) {
  // A 260 × 180 rectangle with a 100 × 80 corner cut from the top right; sides clockwise from the
  // top. Centred, so the labels of the left and right sides both have room.
  const [VW, VH] = [400, 240];
  const [x0, y0, W, H, w, h] = [66, 30, 260, 180, 100, 80];
  const pts = [
    { x: x0, y: y0 },
    { x: x0 + W - w, y: y0 },
    { x: x0 + W - w, y: y0 + h },
    { x: x0 + W, y: y0 + h },
    { x: x0 + W, y: y0 + H },
    { x: x0, y: y0 + H },
  ];
  const labelAt: { x: number; y: number; a: 'start' | 'middle' | 'end' }[] = [
    { x: x0 + (W - w) / 2, y: y0 - 10, a: 'middle' },
    { x: x0 + W - w - 10, y: y0 + h / 2, a: 'end' },
    { x: x0 + W - w / 2, y: y0 + h - 10, a: 'middle' },
    { x: x0 + W + 10, y: y0 + h + (H - h) / 2, a: 'start' },
    { x: x0 + W / 2, y: y0 + H + 22, a: 'middle' },
    { x: x0 - 10, y: y0 + H / 2, a: 'end' },
  ];
  return (
    <svg className="fig-svg fig-small" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="Shape made of rectangles, not to scale">
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="fig-shape" />
      {b.labels.map((l, i) =>
        l ? (
          <text key={i} x={labelAt[i].x} y={labelAt[i].y} className="fig-label" textAnchor={labelAt[i].a} dominantBaseline="middle">
            {l}
          </text>
        ) : null,
      )}
      <NotToScale W={VW} H={VH} />
    </svg>
  );
}

function Cuboid({ b }: { b: Extract<Block, { b: 'cuboid' }> }) {
  const [VW, VH] = [400, 240];
  const [x, y, w, h, dx, dy] = [60, 80, 220, 120, 70, -50];
  const front = `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
  const top = `${x},${y} ${x + dx},${y + dy} ${x + w + dx},${y + dy} ${x + w},${y}`;
  const side = `${x + w},${y} ${x + w + dx},${y + dy} ${x + w + dx},${y + h + dy} ${x + w},${y + h}`;
  return (
    <svg className="fig-svg fig-small" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={`Cuboid ${b.labels.join(' by ')}, not to scale`}>
      <polygon points={top} className="fig-face-top" />
      <polygon points={side} className="fig-face-side" />
      <polygon points={front} className="fig-face" />
      <text x={x + w / 2} y={y + h + 22} className="fig-label" textAnchor="middle">
        {b.labels[0]}
      </text>
      <text x={x + w + dx / 2 + 14} y={y + h + dy / 2 + 12} className="fig-label">
        {b.labels[1]}
      </text>
      <text x={x - 10} y={y + h / 2} className="fig-label" textAnchor="end" dominantBaseline="middle">
        {b.labels[2]}
      </text>
      <NotToScale W={VW} H={VH} />
    </svg>
  );
}

function ShadedGrid({ b }: { b: Extract<Block, { b: 'grid' }> }) {
  const cell = Math.min(52, 360 / b.cols);
  const W = cell * b.cols + 2;
  const H = cell * b.rows + 2;
  const shaded = new Set(b.shaded);
  return (
    <svg
      className="fig-svg fig-grid-shape"
      viewBox={`0 0 ${W} ${H}`}
      style={{ maxWidth: W * 1.2 }}
      role="img"
      aria-label={b.shape ? `Shaded shape on a grid of ${b.cols} by ${b.rows} squares` : `Grid of ${b.cols * b.rows} squares, ${b.shaded.length} shaded`}
    >
      {Array.from({ length: b.cols * b.rows }, (_, i) => (
        <rect key={i} x={1 + (i % b.cols) * cell} y={1 + Math.floor(i / b.cols) * cell} width={cell} height={cell} className={shaded.has(i) ? 'fig-cell on' : 'fig-cell'} />
      ))}
      {b.shape && <polygon points={b.shape.map(([x, y]) => `${1 + x * cell},${1 + y * cell}`).join(' ')} className="fig-area" />}
    </svg>
  );
}

function NumberLine({ b }: { b: Extract<Block, { b: 'numberline' }> }) {
  const [W, H] = [560, 124];
  const [x0, x1, y] = [50, W - 50, 74];
  const x = (at: number) => x0 + ((x1 - x0) * at) / b.ticks;
  const labelled = new Set(b.labels.map((l) => l.at));
  const ax = x(b.arrow);
  return (
    <svg className="fig-svg fig-numberline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Number line with an arrow">
      <line x1={x0} x2={x1} y1={y} y2={y} className="fig-mark" />
      {Array.from({ length: b.ticks + 1 }, (_, i) => {
        const h = labelled.has(i) ? 12 : 8;
        return <line key={i} x1={x(i)} x2={x(i)} y1={y - h} y2={y + h} className="fig-mark" />;
      })}
      {b.labels.map((l) => (
        <text key={l.at} x={x(l.at)} y={y + 36} className="fig-label" textAnchor="middle">
          {l.text}
        </text>
      ))}
      <line x1={ax} x2={ax} y1={y - 60} y2={y - 26} className="fig-arrow" />
      <path d={`M${ax - 8},${y - 28} L${ax + 8},${y - 28} L${ax},${y - 13} Z`} className="fig-arrow-head" />
    </svg>
  );
}

/** A measuring jug or a thermometer, filled to its level; tick 0 is the bottom mark. */
function Scale({ b }: { b: Extract<Block, { b: 'scale' }> }) {
  const jug = b.kind === 'jug';
  const [W, H] = jug ? [300, 420] : [260, 410];
  const [bottom, top] = jug ? [390, 90] : [320, 70];
  const y = (at: number) => bottom - ((bottom - top) * at) / b.ticks;
  const labelled = new Set(b.labels.map((l) => l.at));
  const level = y(b.level);
  if (jug) {
    const [l, r, rim] = [100, 220, top - 40];
    const body = `M${l},${rim} L${l},${bottom - 12} Q${l},${bottom} ${l + 12},${bottom} L${r - 12},${bottom} Q${r},${bottom} ${r},${bottom - 12} L${r},${rim}`;
    return (
      <svg className="fig-svg fig-scale" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Measuring jug marked in ${b.unit}`}>
        <path d={`${body} Z`} className="fig-glass-fill" />
        <path d={`M${l + 1.5},${level} L${l + 1.5},${bottom - 12} Q${l + 1.5},${bottom - 1.5} ${l + 12},${bottom - 1.5} L${r - 12},${bottom - 1.5} Q${r - 1.5},${bottom - 1.5} ${r - 1.5},${bottom - 12} L${r - 1.5},${level} Z`} className="fig-water" />
        <line x1={l + 1.5} x2={r - 1.5} y1={level} y2={level} className="fig-water-top" />
        {Array.from({ length: b.ticks + 1 }, (_, i) =>
          i === 0 ? null : <line key={i} x1={l} x2={l + (labelled.has(i) ? 30 : 16)} y1={y(i)} y2={y(i)} className="fig-mark" />,
        )}
        {b.labels.map((t) => (
          <text key={t.at} x={l - 8} y={y(t.at)} className="fig-label" textAnchor="end" dominantBaseline="middle">
            {t.text}
          </text>
        ))}
        <text x={l - 8} y={rim + 4} className="fig-label" textAnchor="end" dominantBaseline="middle">
          {b.unit}
        </text>
        <path d={body} className="fig-handle" />
        <path d={`M${r},${rim + 40} Q${r + 56},${rim + 40} ${r + 50},${rim + 130} Q${r + 44},${rim + 220} ${r},${rim + 220}`} className="fig-handle" />
        <path d={`M${l},${rim} L${l - 18},${rim - 14}`} className="fig-handle" />
      </svg>
    );
  }
  const cx = 110;
  const [tl, tr] = [cx - 11, cx + 11];
  const bulb = { y: bottom + 42, r: 22 };
  return (
    <svg className="fig-svg fig-scale" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Thermometer marked in ${b.unit}`}>
      <path d={`M${tl},${bulb.y - 19} L${tl},${top - 30} A11,11 0 0 1 ${tr},${top - 30} L${tr},${bulb.y - 19} A${bulb.r},${bulb.r} 0 1 1 ${tl},${bulb.y - 19} Z`} className="fig-glass" />
      <rect x={cx - 5} y={level} width={10} height={bulb.y - level} className="fig-red" />
      <circle cx={cx} cy={bulb.y} r={bulb.r - 5} className="fig-red" />
      {Array.from({ length: b.ticks + 1 }, (_, i) => (
        <line key={i} x1={tr} x2={tr + (labelled.has(i) ? 24 : 13)} y1={y(i)} y2={y(i)} className="fig-mark" />
      ))}
      {b.labels.map((t) => (
        <text key={t.at} x={tr + 32} y={y(t.at)} className="fig-label" dominantBaseline="middle">
          {t.text}
        </text>
      ))}
      <text x={tr + 32} y={top - 34} className="fig-label" dominantBaseline="middle">
        {b.unit}
      </text>
    </svg>
  );
}

/** A column calculation, digits lined up by place value; each capital letter is a lettered box. */
function Column({ b }: { b: Extract<Block, { b: 'column' }> }) {
  const cell = 44;
  const places = Math.max(...[...b.rows, b.total].map((s) => s.length));
  const W = (places + 1) * cell + 40;
  const rowY = (i: number) => 40 + i * 56;
  const totalY = rowY(b.rows.length) + 18;
  const H = totalY + 48;
  const x = (place: number) => W - 20 - cell / 2 - place * cell; // place 0: the ones
  const glyph = (ch: string, place: number, y: number, key: string) =>
    /[A-Z]/.test(ch) ? (
      <g key={key}>
        <rect x={x(place) - 17} y={y - 22} width={34} height={44} rx={5} className="fig-digit-box" />
        <text x={x(place)} y={y} className="fig-box-letter" textAnchor="middle" dominantBaseline="middle">
          {ch}
        </text>
      </g>
    ) : (
      <text key={key} x={x(place)} y={y} className="fig-digit" textAnchor="middle" dominantBaseline="middle">
        {ch}
      </text>
    );
  const line = (yy: number) => <line x1={x(places) - cell / 2} x2={W - 20} y1={yy} y2={yy} className="fig-rule" />;
  return (
    <svg className="fig-svg fig-column" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Written calculation with missing digits in lettered boxes">
      {b.rows.map((row, i) => [...row].reverse().map((ch, place) => glyph(ch, place, rowY(i), `r${i}-${place}`)))}
      <text x={x(places)} y={rowY(b.rows.length - 1)} className="fig-digit" textAnchor="middle" dominantBaseline="middle">
        {b.op}
      </text>
      {line(totalY - 31)}
      {[...b.total].reverse().map((ch, place) => glyph(ch, place, totalY, `t-${place}`))}
      {line(totalY + 31)}
    </svg>
  );
}

/** Cubes stacked on a table, drawn in 3D from the front right; nearer faces are drawn last. */
function Cubes({ b }: { b: Extract<Block, { b: 'cubes' }> }) {
  const s = 34;
  const dx = s * Math.cos(PI / 6);
  const dy = s / 2;
  const at = (r: number, c: number, z: number) => ({ x: (c - r) * dx, y: (c + r) * dy - z * s });
  const has = (r: number, c: number, z: number) => r >= 0 && r < b.heights.length && c >= 0 && z >= 0 && z < (b.heights[r][c] ?? 0);
  const cubes = b.heights.flatMap((row, r) => row.flatMap((h, c) => Array.from({ length: h }, (_, z) => ({ r, c, z }))));
  cubes.sort((p, q) => p.r + p.c + p.z - (q.r + q.c + q.z) || p.z - q.z);
  const faces: { cls: string; pts: { x: number; y: number }[] }[] = [];
  for (const { r, c, z } of cubes) {
    if (!has(r, c, z + 1)) faces.push({ cls: 'fig-cube-top', pts: [at(r, c, z + 1), at(r, c + 1, z + 1), at(r + 1, c + 1, z + 1), at(r + 1, c, z + 1)] });
    if (!has(r + 1, c, z)) faces.push({ cls: 'fig-cube-left', pts: [at(r + 1, c, z), at(r + 1, c + 1, z), at(r + 1, c + 1, z + 1), at(r + 1, c, z + 1)] });
    if (!has(r, c + 1, z)) faces.push({ cls: 'fig-cube-right', pts: [at(r, c + 1, z), at(r + 1, c + 1, z), at(r + 1, c + 1, z + 1), at(r, c + 1, z + 1)] });
  }
  const all = faces.flatMap((f) => f.pts);
  const pad = 12;
  const minX = Math.min(...all.map((p) => p.x)) - pad;
  const minY = Math.min(...all.map((p) => p.y)) - pad;
  const W = Math.max(...all.map((p) => p.x)) - minX + pad;
  const H = Math.max(...all.map((p) => p.y)) - minY + pad;
  return (
    <svg className="fig-svg fig-cubes" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: Math.min(W * 1.4, 380) }} role="img" aria-label={`Shape made of ${cubes.length} cubes`}>
      {faces.map((f, i) => (
        <polygon key={i} points={f.pts.map((p) => `${p.x - minX},${p.y - minY}`).join(' ')} className={f.cls} />
      ))}
    </svg>
  );
}

type Pt = { x: number; y: number };

/** An arc between two rays from `v` and a label along the middle of the angle (angles under 180°). */
function AngleMark({ v, p, q, r, label, labelR }: { v: Pt; p: Pt; q: Pt; r: number; label: string; labelR: number }) {
  const a1 = Math.atan2(p.y - v.y, p.x - v.x);
  let d = Math.atan2(q.y - v.y, q.x - v.x) - a1;
  while (d <= -PI) d += 2 * PI;
  while (d > PI) d -= 2 * PI;
  const point = (a: number, rr: number) => ({ x: v.x + rr * Math.cos(a), y: v.y + rr * Math.sin(a) });
  const s = point(a1, r);
  const e = point(a1 + d, r);
  // A narrow angle puts its label further out, where there is room between the lines.
  const t = point(a1 + d / 2, Math.max(labelR, 14 / Math.tan(Math.abs(d) / 2)));
  return (
    <>
      <path d={`M${s.x},${s.y} A${r},${r} 0 0 ${d > 0 ? 1 : 0} ${e.x},${e.y}`} className="fig-arc" />
      <text x={t.x} y={t.y} className={/^[a-z]$/.test(label) ? 'fig-unknown' : 'fig-label'} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </>
  );
}

/** A regular polygon standing on one side; corner 0 is bottom left, corner 1 the next one up. */
function RegularPolygon({ b }: { b: Extract<Block, { b: 'polygon' }> }) {
  const n = b.sides;
  const [W, H, margin] = [380, 300, 30];
  const unit = Array.from({ length: n }, (_, k) => {
    const t = ((90 + 180 / n + (k * 360) / n) * PI) / 180;
    return { x: Math.cos(t), y: Math.sin(t) };
  });
  const side = Math.hypot(unit[1].x - unit[0].x, unit[1].y - unit[0].y);
  // The extended side goes on to the left of corner 0, as far as one side's length.
  const ext = { x: unit[0].x - side * 1.1, y: unit[0].y };
  const pts = b.mark === 'exterior' ? [...unit, ext] : unit;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const k = Math.min((W - 2 * margin) / (maxX - minX), (H - 2 * margin) / (maxY - minY));
  const ox = (W - k * (maxX - minX)) / 2 - k * minX;
  const oy = (H - k * (maxY - minY)) / 2 - k * minY;
  const map = (p: Pt) => ({ x: ox + k * p.x, y: oy + k * p.y });
  const v = unit.map(map);
  const centre = map({ x: 0, y: 0 });
  const spokes = b.mark === 'centre' || b.mark === 'spoke';
  const far = b.mark === 'exterior' ? map(ext) : b.mark === 'diagonal' ? v[2] : b.mark === 'spoke' ? centre : v[n - 1];
  const name = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' }[n] ?? `${n}-sided shape`;
  return (
    <svg className="fig-svg fig-polygon" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Regular ${name}`}>
      <polygon points={v.map((p) => `${p.x},${p.y}`).join(' ')} className="fig-shape" />
      {spokes && v.map((p, i) => <line key={i} x1={centre.x} y1={centre.y} x2={p.x} y2={p.y} className="fig-shape" />)}
      {(b.mark === 'exterior' || b.mark === 'diagonal') && <line x1={v[0].x} y1={v[0].y} x2={far.x} y2={far.y} className="fig-shape" />}
      {b.mark === 'centre' ? (
        <AngleMark v={centre} p={v[0]} q={v[1]} r={22} label={b.label} labelR={44} />
      ) : (
        <AngleMark v={v[0]} p={v[1]} q={far} r={b.mark === 'interior' ? 24 : 30} label={b.label} labelR={b.mark === 'interior' ? 46 : 52} />
      )}
    </svg>
  );
}

/** Angles to sort by type, each drawn exactly and lettered below. Right angles have a square mark. */
function AngleSet({ b }: { b: Extract<Block, { b: 'angleset' }> }) {
  const cell = 124;
  const [W, H] = [b.angles.length * cell, 178];
  const TILT = [0, 30, -20, 50, 15, -35];
  const L = 46;
  return (
    <svg className="fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${b.angles.length} angles lettered A to ${String.fromCharCode(64 + b.angles.length)}`}>
      {b.angles.map((a, i) => {
        const cx = cell * i + cell / 2;
        const cy = 78;
        const t0 = TILT[i % TILT.length];
        const dir = (deg: number, r: number) => ({ x: cx + r * Math.cos((deg * PI) / 180), y: cy - r * Math.sin((deg * PI) / 180) });
        const p = dir(t0, L);
        const q = dir(t0 + a, L);
        const s = dir(t0, 17);
        const e = dir(t0 + a, 17);
        const corner = dir(t0 + 45, 17 * Math.SQRT2);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} className="fig-shape" />
            <line x1={cx} y1={cy} x2={q.x} y2={q.y} className="fig-shape" />
            {a === 90 ? (
              <path d={`M${s.x},${s.y} L${corner.x},${corner.y} L${e.x},${e.y}`} className="fig-right" />
            ) : (
              <path d={`M${s.x},${s.y} A17,17 0 ${a > 180 ? 1 : 0} 0 ${e.x},${e.y}`} className="fig-arc" />
            )}
            <text x={cx} y={H - 14} className="fig-point" textAnchor="middle">
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Figure({ block }: { block: FigureBlock }) {
  switch (block.b) {
    case 'table':
      return <Table b={block} />;
    case 'bar':
      return <BarChart b={block} />;
    case 'line':
      return <LineGraph b={block} />;
    case 'pie':
      return <PieChart b={block} />;
    case 'coords':
      return <CoordGrid b={block} />;
    case 'angles':
      return <AngleFigure b={block} />;
    case 'rect':
      return <Rect b={block} />;
    case 'lshape':
      return <LShape b={block} />;
    case 'cuboid':
      return <Cuboid b={block} />;
    case 'grid':
      return <ShadedGrid b={block} />;
    case 'numberline':
      return <NumberLine b={block} />;
    case 'scale':
      return <Scale b={block} />;
    case 'column':
      return <Column b={block} />;
    case 'cubes':
      return <Cubes b={block} />;
    case 'polygon':
      return <RegularPolygon b={block} />;
    case 'angleset':
      return <AngleSet b={block} />;
  }
}
