import { motion } from 'motion/react';

/** A ring filled to the score, with the percentage inside. */
export function ScoreRing({ pct, size = 132 }: { pct: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const colour = pct >= 85 ? 'var(--color-good)' : pct >= 70 ? 'var(--color-warn)' : pct >= 50 ? '#f97316' : 'var(--color-bad)';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - Math.min(pct, 100) / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-3xl font-black text-ink">{pct}%</div>
    </div>
  );
}
