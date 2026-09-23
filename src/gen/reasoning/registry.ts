import type { ReasoningType } from '../types';
import { inverse, moneyProblems, multiStep, remainders } from './calculation';
import { compareFractions, decimalContext, fdpConvert, fractionContext, percentContext, shadedFraction } from './fdp';
import { anglesLinePoint, anglesPolygon, anglesTriangle, coordinates, shapeProperties, transformations } from './geometry';
import { convertUnits, perimeterArea, timeProblems, volume } from './measurement';
import { digitValue, estimating, factorsMultiples, negatives, orderNumbers, romanNumerals, rounding } from './number';
import { equations, formulae, patterns, ratioShare, recipes, scale, sequences, twoUnknowns } from './ratioAlgebra';
import { barCharts, lineGraphs, mean, pieCharts, tables } from './statistics';

/** Every reasoning template, in the order the report lists them. */
export const REASONING_TYPES: readonly ReasoningType[] = [
  digitValue,
  rounding,
  negatives,
  romanNumerals,
  orderNumbers,
  moneyProblems,
  multiStep,
  remainders,
  inverse,
  factorsMultiples,
  estimating,
  shadedFraction,
  compareFractions,
  fractionContext,
  decimalContext,
  fdpConvert,
  percentContext,
  recipes,
  ratioShare,
  scale,
  formulae,
  equations,
  twoUnknowns,
  sequences,
  patterns,
  convertUnits,
  timeProblems,
  perimeterArea,
  volume,
  anglesLinePoint,
  anglesTriangle,
  anglesPolygon,
  shapeProperties,
  coordinates,
  transformations,
  barCharts,
  lineGraphs,
  pieCharts,
  tables,
  mean,
];

const BY_ID = new Map(REASONING_TYPES.map((t) => [t.id, t]));

export function getReasoningType(id: string): ReasoningType {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown reasoning type "${id}"`);
  return t;
}
