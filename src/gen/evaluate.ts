// Evaluates a prompt independently of the generator that built it. Tests use it to prove every
// generated answer is right: substitute the answer into the box and check both sides agree.
import {
  add,
  div,
  eq,
  fromDecimalString,
  mul,
  pow,
  rat,
  sub,
  type Rational,
} from '../math/rational';
import type { Op, Part } from './types';

type BinaryOp = Exclude<Op, '(' | ')' | '='>;

const PRECEDENCE: Record<BinaryOp, number> = { '+': 1, '-': 1, '×': 2, '÷': 2, of: 2 };

function apply(o: BinaryOp, a: Rational, b: Rational): Rational {
  switch (o) {
    case '+':
      return add(a, b);
    case '-':
      return sub(a, b);
    case '×':
    case 'of':
      return mul(a, b);
    case '÷':
      return div(a, b);
  }
}

function operand(p: Exclude<Part, { t: 'op' }>, box: Rational | null): Rational {
  switch (p.t) {
    case 'num':
      return fromDecimalString(p.v);
    case 'frac':
      return rat((p.w ?? 0) * p.d + p.n, p.d);
    case 'pow':
      return pow(rat(p.b), p.e);
    case 'pct':
      return div(fromDecimalString(p.v), rat(100));
    case 'box':
      if (!box) throw new Error('Box without a value');
      return box;
  }
}

/** Shunting-yard evaluation of an expression without "=". */
export function evaluateExpression(parts: Part[], box: Rational | null = null): Rational {
  const values: Rational[] = [];
  const ops: (BinaryOp | '(')[] = [];
  const reduce = () => {
    const o = ops.pop();
    const b = values.pop();
    const a = values.pop();
    if (!o || o === '(' || !a || !b) throw new Error('Malformed expression');
    values.push(apply(o, a, b));
  };
  let expectOperand = true;
  for (const p of parts) {
    if (p.t !== 'op') {
      if (!expectOperand) throw new Error('Two operands in a row');
      values.push(operand(p, box));
      expectOperand = false;
      continue;
    }
    if (p.v === '=') throw new Error('"=" inside an expression');
    if (p.v === '(') {
      if (!expectOperand) throw new Error('"(" after an operand');
      ops.push('(');
    } else if (p.v === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') reduce();
      if (!ops.length) throw new Error('Unbalanced ")"');
      ops.pop();
    } else {
      if (expectOperand) throw new Error(`Operator "${p.v}" without a left operand`);
      const o = p.v;
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top === '(' || PRECEDENCE[top] < PRECEDENCE[o]) break;
        reduce();
      }
      ops.push(o);
      expectOperand = true;
    }
  }
  while (ops.length) reduce();
  if (values.length !== 1 || expectOperand) throw new Error('Malformed expression');
  return values[0];
}

/** True when `answer` makes the prompt correct. */
export function answerFits(parts: Part[], answer: Rational): boolean {
  const boxes = parts.filter((p) => p.t === 'box').length;
  const equals = parts.filter((p) => p.t === 'op' && p.v === '=').length;
  if (boxes > 1 || equals > 1) throw new Error('At most one box and one "=" allowed');
  if (equals === 0) {
    if (boxes) throw new Error('A box needs an equation');
    return eq(evaluateExpression(parts), answer);
  }
  if (!boxes) throw new Error('An equation needs a box');
  const i = parts.findIndex((p) => p.t === 'op' && p.v === '=');
  return eq(evaluateExpression(parts.slice(0, i), answer), evaluateExpression(parts.slice(i + 1), answer));
}
