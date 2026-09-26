import type { ReasoningType } from '../types';
import { angleTypes, anglesCross, regularPolygons } from './angles';
import { inverse, moneyProblems, multiStep, remainders } from './calculation';
import { compareSigns, mixedNumbers, orderFdp, trueFalse } from './compare';
import { bestValue, commonMultiples, findPairs, roundLarge, timeUnits } from './context';
import { compareFractions, decimalContext, fdpConvert, fractionContext, percentContext, shadedFraction } from './fdp';
import { anglesLinePoint, anglesPolygon, anglesTriangle, coordinates, shapeProperties, transformations } from './geometry';
import { areaFormula, convertUnits, perimeterArea, timeProblems, volume } from './measurement';
import { digitValue, estimating, factorsMultiples, negatives, orderNumbers, romanNumerals, rounding } from './number';
import { equations, formulae, patterns, ratioShare, recipes, scale, sequences, twoUnknowns } from './ratioAlgebra';
import { conversionGraphs, numberLines, readingScales } from './scales';
import { areaBySquares, cubeVolume } from './space';
import { barCharts, lineGraphs, mean, pieCharts, tables } from './statistics';
import { knownFacts, missingDigits } from './written';

/** Every reasoning template, in the order the report lists them. */
export const REASONING_TYPES: readonly ReasoningType[] = [
  digitValue,
  rounding,
  roundLarge,
  numberLines,
  negatives,
  romanNumerals,
  orderNumbers,
  compareSigns,
  moneyProblems,
  multiStep,
  missingDigits,
  remainders,
  inverse,
  knownFacts,
  factorsMultiples,
  commonMultiples,
  estimating,
  shadedFraction,
  compareFractions,
  mixedNumbers,
  orderFdp,
  trueFalse,
  fractionContext,
  decimalContext,
  fdpConvert,
  percentContext,
  recipes,
  ratioShare,
  bestValue,
  scale,
  formulae,
  equations,
  twoUnknowns,
  findPairs,
  sequences,
  patterns,
  convertUnits,
  timeUnits,
  timeProblems,
  readingScales,
  perimeterArea,
  areaFormula,
  areaBySquares,
  volume,
  cubeVolume,
  anglesLinePoint,
  anglesCross,
  anglesTriangle,
  anglesPolygon,
  regularPolygons,
  angleTypes,
  shapeProperties,
  coordinates,
  transformations,
  barCharts,
  lineGraphs,
  conversionGraphs,
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
