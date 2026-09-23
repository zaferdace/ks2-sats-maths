import { addColumn, addThree, missingAddSub, subColumn, subRound } from './generators/addSub';
import { decAdd, decDiv, decMul, decSub, pctOf } from './generators/decimalsPercent';
import {
  fracAddDiff,
  fracAddSame,
  fracDivWhole,
  fracMixed,
  fracMulFrac,
  fracMulWhole,
  fracOf,
  fracSubDiff,
  fracSubSame,
} from './generators/fractions';
import {
  divLong,
  divShort,
  missingMulDiv,
  mulDiv01,
  mulLong,
  mulMental,
  mulShort,
  orderOps,
  squaresCubes,
} from './generators/mulDiv';
import { pvAddSubPower, pvMulDiv10, pvPartition } from './generators/placeValue';
import type { QuestionType } from './types';

/** Every question type, in the order the report lists them. */
export const QUESTION_TYPES: readonly QuestionType[] = [
  pvPartition,
  pvAddSubPower,
  pvMulDiv10,
  addColumn,
  addThree,
  subColumn,
  subRound,
  missingAddSub,
  mulDiv01,
  mulMental,
  mulShort,
  divShort,
  mulLong,
  divLong,
  missingMulDiv,
  orderOps,
  squaresCubes,
  fracAddSame,
  fracSubSame,
  fracAddDiff,
  fracSubDiff,
  fracMixed,
  fracMulFrac,
  fracMulWhole,
  fracDivWhole,
  fracOf,
  decAdd,
  decSub,
  decMul,
  decDiv,
  pctOf,
];

const BY_ID = new Map(QUESTION_TYPES.map((t) => [t.id, t]));

export const findType = (id: string): QuestionType | undefined => BY_ID.get(id);

export function getType(id: string): QuestionType {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown question type "${id}"`);
  return t;
}
