import { motion } from 'motion/react';
import { useState } from 'react';

const COLOURS = ['#256abf', '#16a34a', '#f59e0b', '#7c3aed', '#ef4444', '#06b6d4'];

/** A short burst of confetti over the page, for a great score. Decorative only. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  // Fixed once, so a re-render does not move the pieces.
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 720,
      size: 7 + Math.random() * 7,
      colour: COLOURS[i % COLOURS.length],
      duration: 1.6 + Math.random() * 1.2,
    })),
  );
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block rounded-[2px]"
          style={{ left: `${b.left}%`, width: b.size, height: b.size * 0.6, background: b.colour }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: b.drift, rotate: b.spin, opacity: [1, 1, 0] }}
          transition={{ duration: b.duration, delay: b.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
