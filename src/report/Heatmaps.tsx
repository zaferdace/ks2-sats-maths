import { useState } from 'react';
import { DAYS } from '../gen/blueprint';
import { TOPICS } from '../gen/types';
import type { Tally, TypeRow, WeeklyGrid } from '../stats/stats';
import { formatDate, formatSeconds } from '../ui/time';
import { LEVEL_ORDER, LEVELS, levelOf, LOW_DATA, pctText } from './levels';

export function Legend() {
  return (
    <ul className="legend" aria-label="Colour key">
      {LEVEL_ORDER.map((l) => (
        <li key={l}>
          <span className="legend-swatch" style={{ background: LEVELS[l].color, color: LEVELS[l].ink }} aria-hidden="true">
            {LEVELS[l].icon}
          </span>
          {LEVELS[l].label}
        </li>
      ))}
      <li className="muted">Faded: fewer than {LOW_DATA} answers so far</li>
    </ul>
  );
}

const describe = (t: Tally) =>
  t.total ? `${t.correct} of ${t.total} correct (${pctText(t)})` : 'not tried yet';

/** Every question type as a tile, grouped by topic and coloured by accuracy. */
export function SkillMap({ rows }: { rows: TypeRow[] }) {
  return (
    <div className="skillmap">
      {TOPICS.filter((topic) => rows.some((r) => r.topic === topic.id)).map((topic) => (
        <div key={topic.id} className="skill-topic">
          <h3>{topic.label}</h3>
          <div className="skill-tiles">
            {rows
              .filter((r) => r.topic === topic.id)
              .map((r) => {
                const level = LEVELS[levelOf(r.tally)];
                const faded = r.tally.total > 0 && r.tally.total < LOW_DATA;
                return (
                  <div
                    key={r.typeId}
                    className={`skill-tile ${faded ? 'faded' : ''}`}
                    style={{ background: level.wash, borderLeftColor: level.color }}
                  >
                    <span className="skill-icon" style={{ background: level.color, color: level.ink }} aria-hidden="true">
                      {level.icon}
                    </span>
                    <div>
                      <div className="skill-name">{r.label}</div>
                      <div className="skill-numbers">
                        <span className="sr-only">{level.short}: </span>
                        {r.tally.total ? `${r.tally.correct} / ${r.tally.total} · ${pctText(r.tally)}` : 'Not tried yet'}
                        {faded && ' · few answers'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cell({
  t,
  label,
  showNumbers,
  selected,
  onSelect,
}: {
  t: Tally;
  label: string;
  showNumbers: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const level = LEVELS[levelOf(t)];
  const faded = t.total > 0 && t.total < LOW_DATA;
  return (
    <button
      type="button"
      className={`heat-cell ${faded ? 'faded' : ''} ${selected ? 'selected' : ''}`}
      style={{ background: level.color, color: level.ink }}
      aria-label={`${label}: ${describe(t)}`}
      onClick={onSelect}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onSelect()}
      onFocus={onSelect}
    >
      {showNumbers && t.total ? `${t.correct}/${t.total}` : ''}
    </button>
  );
}

/** Question types × the last eight weeks: is each skill getting better? */
export function WeeklyHeat({ grid }: { grid: WeeklyGrid }) {
  const [sel, setSel] = useState<{ row: number; col: number } | null>(null);
  const [numbers, setNumbers] = useState(false);
  const selRow = sel ? grid.rows[sel.row] : null;
  const selCell = sel && selRow ? selRow.cells[sel.col] : null;

  return (
    <div>
      <div className="row heat-tools">
        <p className="readout grow" aria-live="polite">
          {selRow && selCell && sel
            ? `${selRow.label}, week of ${formatDate(grid.weekStarts[sel.col])}: ${describe(selCell)}`
            : 'Tap a square to see the numbers.'}
        </p>
        <label className="toggle">
          <input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} /> Show numbers
        </label>
      </div>
      <div className="heat-scroll">
        <table className="heat-table">
          <thead>
            <tr>
              <th scope="col">Question type</th>
              {grid.weekStarts.map((w) => (
                <th key={w} scope="col" className="heat-col">
                  {formatDate(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOPICS.filter((topic) => grid.rows.some((r) => r.topic === topic.id)).map((topic) => [
              <tr key={topic.id} className="heat-group">
                <th colSpan={grid.weekStarts.length + 1} scope="rowgroup">
                  {topic.label}
                </th>
              </tr>,
              ...grid.rows.flatMap((r, ri) =>
                r.topic !== topic.id
                  ? []
                  : [
                      <tr key={r.typeId}>
                        <th scope="row" className="heat-label">
                          {r.label}
                        </th>
                        {r.cells.map((c, ci) => (
                          <td key={ci}>
                            <Cell
                              t={c}
                              label={`${r.label}, week of ${formatDate(grid.weekStarts[ci])}`}
                              showNumbers={numbers}
                              selected={sel?.row === ri && sel.col === ci}
                              onSelect={() => setSel({ row: ri, col: ci })}
                            />
                          </td>
                        ))}
                      </tr>,
                    ],
              ),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Day × question position: does accuracy fall off in the harder, later questions? */
export function PositionHeat({ grid }: { grid: Tally[][] }) {
  const [sel, setSel] = useState<number | null>(null);
  const perDay = grid[0]?.length ?? 0;
  const selT = sel === null ? null : grid[Math.floor(sel / perDay)][sel % perDay];
  return (
    <div>
      <p className="readout" aria-live="polite">
        {sel !== null && selT
          ? `Question ${sel + 1} (Day ${Math.floor(sel / perDay) + 1}): ${describe(selT)}${
              selT.total ? `, ${formatSeconds(selT.timeMs / selT.total)} on average` : ''
            }`
          : 'Each square is one question number of the paper. Tap one for details.'}
      </p>
      <table className="heat-table position">
        <thead>
          <tr>
            <th scope="col" />
            {Array.from({ length: perDay }, (_, k) => (
              <th key={k} scope="col" className="heat-col">
                {k + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: DAYS }, (_, d) => (
            <tr key={d}>
              <th scope="row" className="heat-label">
                Day {d + 1}
              </th>
              {grid[d].map((t, k) => {
                const i = d * perDay + k;
                return (
                  <td key={k}>
                    <Cell
                      t={t}
                      label={`Question ${i + 1}`}
                      showNumbers
                      selected={sel === i}
                      onSelect={() => setSel(i)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
