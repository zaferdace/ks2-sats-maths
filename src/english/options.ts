// Ready-made questions are stored with their options in a fixed order; each paper shows them in
// a new order, so the right answer's position is never a clue.
import type { Rng } from '../gen/rng';

export function shuffleOptions(options: string[], answer: number[], rng: Rng): { options: string[]; answer: number[] } {
  const order = rng.shuffle(options.map((_, i) => i));
  return {
    options: order.map((i) => options[i]),
    answer: answer.map((a) => order.indexOf(a)).sort((x, y) => x - y),
  };
}
