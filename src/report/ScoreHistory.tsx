import { useState } from 'react';
import type { SessionRecord } from '../stats/stats';
import { formatDate, formatDateTime, formatDuration } from '../ui/time';

const W = 640;
const H = 230;
const PAD = { l: 44, r: 16, t: 26, b: 30 };
const TICKS = [0, 0.25, 0.5, 0.75, 1];
const MAX_SESSIONS = 20;

const pct = (s: SessionRecord) => s.score / s.total;
const name = (s: SessionRecord) => (s.day ? `Day ${s.day}` : 'Full paper');

/** Column path: 4px rounded data end, square at the baseline. */
function column(x: number, w: number, top: number, bottom: number): string {
  const r = Math.min(4, w / 2, bottom - top);
  return `M${x},${bottom} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${
    x + w
  },${top + r} L${x + w},${bottom} Z`;
}

/** Percentage score of each session, oldest to newest. */
export function ScoreHistory({ sessions }: { sessions: SessionRecord[] }) {
  const shown = sessions.slice(-MAX_SESSIONS);
  const [sel, setSel] = useState<number | null>(null);
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const band = plotW / Math.max(shown.length, 1);
  const barW = Math.min(24, band * 0.6);
  const y = (p: number) => PAD.t + plotH * (1 - p);
  const active = sel ?? shown.length - 1;
  const current = shown[active];
  const labelEvery = Math.ceil(shown.length / 5);

  return (
    <figure className="chart">
      <p className="readout" aria-live="polite">
        {current
          ? `${formatDateTime(current.at)} · ${name(current)} · ${current.score}/${current.total} (${Math.round(
              pct(current) * 100,
            )}%) · ${formatDuration(current.timeMs)}`
          : ''}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Score for each session, as a percentage">
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'gridline'} />
            <text x={PAD.l - 8} y={y(t)} className="tick" textAnchor="end" dominantBaseline="middle">
              {t * 100}%
            </text>
          </g>
        ))}
        {shown.map((s, i) => {
          const x = PAD.l + band * i + (band - barW) / 2;
          const top = y(pct(s));
          const bottom = y(0);
          return (
            <g key={`${s.attemptId}-${s.at}`}>
              {s.score > 0 ? (
                <path d={column(x, barW, top, bottom)} className={`bar ${i === active ? 'bar-active' : ''}`} />
              ) : (
                <rect x={x} y={bottom - 2} width={barW} height={2} className="bar-zero" />
              )}
              {i === shown.length - 1 && (
                <text x={x + barW / 2} y={top - 8} className="bar-label" textAnchor="middle">
                  {Math.round(pct(s) * 100)}%
                </text>
              )}
              {(i % labelEvery === 0 || i === shown.length - 1) && (
                <text x={x + barW / 2} y={H - 10} className="tick" textAnchor="middle">
                  {formatDate(s.at)}
                </text>
              )}
              <rect
                x={PAD.l + band * i}
                y={PAD.t}
                width={band}
                height={plotH}
                className="hit"
                tabIndex={0}
                aria-label={`${formatDate(s.at)}, ${name(s)}: ${s.score} out of ${s.total}`}
                onPointerEnter={() => setSel(i)}
                onClick={() => setSel(i)}
                onFocus={() => setSel(i)}
              />
            </g>
          );
        })}
      </svg>
      <details className="table-view">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Session</th>
              <th className="num">Score</th>
              <th className="num">Time</th>
            </tr>
          </thead>
          <tbody>
            {[...shown].reverse().map((s) => (
              <tr key={`${s.attemptId}-${s.at}`}>
                <td>{formatDateTime(s.at)}</td>
                <td>
                  {name(s)} · {s.paperCode}
                </td>
                <td className="num">
                  {s.score}/{s.total} ({Math.round(pct(s) * 100)}%)
                </td>
                <td className="num">{formatDuration(s.timeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
