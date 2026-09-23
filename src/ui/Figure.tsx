// Exam-style figures for reasoning questions. Everything is plain SVG or HTML, drawn from the
// question's data; shapes marked "not to scale" use fixed, tidy proportions.
import type { Block } from '../gen/types';
import { formatNumber } from '../gen/format';

type FigureBlock = Exclude<Block, { b: 'text' }>;

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
  const H = 340;
  const pad = { l: 64, r: 24, t: 34, b: 44 };
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
      <polyline points={points} className="fig-line" />
      {b.values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={5} className="fig-dot" />
      ))}
    </svg>
  );
}

const PIE_FILLS = ['#cde2fb', '#86b6ef', '#e1e0d9', '#b7d3f6', '#f3f2ee'];

function PieChart({ b }: { b: Extract<Block, { b: 'pie' }> }) {
  const S = 340;
  const c = S / 2;
  const R = 130;
  const starts = b.slices.map((_, i) => b.slices.slice(0, i).reduce((sum, x) => sum + x.turn, 0));
  return (
    <svg className="fig-svg fig-pie" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`Pie chart: ${b.title}`}>
      {b.slices.map((s, i) => {
        const start = starts[i];
        const end = start + s.turn;
        const p0 = polar(c, c, R, start);
        const p1 = polar(c, c, R, end);
        const large = s.turn > 0.5 ? 1 : 0;
        const mid = (start + end) / 2;
        const outside = s.turn < 0.1;
        const lp = polar(c, c, outside ? R + 22 : R * 0.58, mid);
        const right = Math.abs(s.turn - 0.25) < 1e-9;
        const m0 = polar(c, c, 16, start);
        const m1 = polar(c, c, 16 * Math.SQRT2, mid);
        const m2 = polar(c, c, 16, end);
        return (
          <g key={s.label}>
            <path d={`M${c},${c} L${p0.x},${p0.y} A${R},${R} 0 ${large} 1 ${p1.x},${p1.y} Z`} fill={PIE_FILLS[i % PIE_FILLS.length]} className="fig-slice" />
            {right && <path d={`M${m0.x},${m0.y} L${m1.x},${m1.y} L${m2.x},${m2.y}`} className="fig-right" />}
            <text x={lp.x} y={lp.y} className="fig-label" textAnchor="middle" dominantBaseline="middle">
              {s.label}
            </text>
          </g>
        );
      })}
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

function AngleFigure({ b }: { b: Extract<Block, { b: 'angles' }> }) {
  const W = 420;
  const H = 260;
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

function Rect({ b }: { b: Extract<Block, { b: 'rect' }> }) {
  return (
    <svg className="fig-svg fig-small" viewBox="0 0 360 220" role="img" aria-label={`Rectangle ${b.labels[0]} by ${b.labels[1]}, not to scale`}>
      <rect x={50} y={30} width={230} height={140} className="fig-shape" />
      <text x={165} y={195} className="fig-label" textAnchor="middle">
        {b.labels[0]}
      </text>
      <text x={292} y={100} className="fig-label" dominantBaseline="middle">
        {b.labels[1]}
      </text>
    </svg>
  );
}

function LShape({ b }: { b: Extract<Block, { b: 'lshape' }> }) {
  // A 260 × 180 rectangle with a 100 × 80 corner cut from the top right; sides clockwise from the top.
  const [x0, y0, W, H, w, h] = [50, 30, 260, 180, 100, 80];
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
    <svg className="fig-svg fig-small" viewBox="0 0 400 240" role="img" aria-label="Shape made of rectangles, not to scale">
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="fig-shape" />
      {b.labels.map((l, i) =>
        l ? (
          <text key={i} x={labelAt[i].x} y={labelAt[i].y} className="fig-label" textAnchor={labelAt[i].a} dominantBaseline="middle">
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function Cuboid({ b }: { b: Extract<Block, { b: 'cuboid' }> }) {
  const [x, y, w, h, dx, dy] = [60, 80, 220, 120, 70, -50];
  const front = `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;
  const top = `${x},${y} ${x + dx},${y + dy} ${x + w + dx},${y + dy} ${x + w},${y}`;
  const side = `${x + w},${y} ${x + w + dx},${y + dy} ${x + w + dx},${y + h + dy} ${x + w},${y + h}`;
  return (
    <svg className="fig-svg fig-small" viewBox="0 0 400 240" role="img" aria-label={`Cuboid ${b.labels.join(' by ')}, not to scale`}>
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
    </svg>
  );
}

function ShadedGrid({ b }: { b: Extract<Block, { b: 'grid' }> }) {
  const cell = Math.min(52, 360 / b.cols);
  const W = cell * b.cols + 2;
  const H = cell * b.rows + 2;
  const shaded = new Set(b.shaded);
  return (
    <svg className="fig-svg fig-grid-shape" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W * 1.2 }} role="img" aria-label={`Grid of ${b.cols * b.rows} squares, ${b.shaded.length} shaded`}>
      {Array.from({ length: b.cols * b.rows }, (_, i) => (
        <rect key={i} x={1 + (i % b.cols) * cell} y={1 + Math.floor(i / b.cols) * cell} width={cell} height={cell} className={shaded.has(i) ? 'fig-cell on' : 'fig-cell'} />
      ))}
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
  }
}
