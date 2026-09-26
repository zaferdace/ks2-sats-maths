// How to work out each kind of Paper 1 question, shown with a wrong answer on the results screen.

export const METHOD_TIPS: Record<string, string> = {
  'pv-partition': 'Each digit is worth its place: in 45,302 the 5 is worth 5,000. Write the number as its parts to find the missing one.',
  'pv-add-sub-power':
    'Adding or subtracting 10, 100 or 1,000 changes one digit, unless it goes past 9 or below 0: then the next digit changes too.',
  'pv-mul-div-10':
    '× 10, 100 or 1,000 moves the digits 1, 2 or 3 places to the left; ÷ moves them to the right. The decimal point stays where it is.',
  'add-column': 'Line up the ones. Add each column from the ones; when a column makes 10 or more, write the ones digit and carry the ten.',
  'add-three': 'Line up all three numbers by place value and add column by column from the ones, carrying as you go.',
  'sub-column':
    'Bigger number on top, ones lined up. Subtract from the ones; when the top digit is smaller, exchange 1 from the next column.',
  'sub-round':
    'Exchange across the zeros (1,000 is 9 hundreds, 9 tens and 10 ones), or count on from the smaller number to the round number.',
  'missing-add-sub': 'Use the inverse: if □ + 25 = 60 then □ = 60 − 25; if □ − 25 = 60 then □ = 60 + 25. Put your answer back in to check.',
  'mul-div-0-1': 'Anything × 1 or ÷ 1 stays the same. Anything × 0 is 0, 0 ÷ a number is 0, and a number ÷ itself is 1.',
  'mul-mental': 'Use your tables and place value: 30 × 40 = 3 × 4 × 10 × 10 = 1,200.',
  'mul-short': 'Short multiplication: multiply each digit by the one-digit number, starting with the ones, and carry into the next column.',
  'div-short': 'Bus stop method: divide each digit from the left and carry any remainder into the next digit.',
  'mul-long':
    'Long multiplication: multiply by the ones digit, then by the tens digit (put a 0 in the ones column first), then add the two rows. Show it: the method can earn a mark.',
  'div-long':
    'Long division: write out multiples of the divisor, then work from the left: how many times does it go, subtract, bring down the next digit. Show it: the method can earn a mark.',
  'missing-mul-div': 'Use the inverse: if □ × 6 = 72 then □ = 72 ÷ 6; if □ ÷ 6 = 12 then □ = 12 × 6.',
  'order-ops': 'Brackets first, then powers, then × and ÷, then + and −. So 5 + 3 × 2 = 5 + 6 = 11.',
  'squares-cubes': 'Squared means a number times itself (6² = 36); cubed means three times (4³ = 4 × 4 × 4 = 64). Do the powers first.',
  'frac-add-same': 'Same denominator: add the numerators and keep the denominator. More than 1? Write it as a mixed number.',
  'frac-sub-same': 'Same denominator: subtract the numerators and keep the denominator. For 1 − 3/8, think of 1 as 8/8.',
  'frac-add-diff': 'Make the denominators the same first (a common multiple), change both fractions to match, then add the numerators.',
  'frac-sub-diff': 'Make the denominators the same first (a common multiple), change both fractions to match, then subtract the numerators.',
  'frac-mixed':
    'Do the wholes and the fractions separately, with the same denominator. If the fraction part goes below 0, exchange a whole; if it goes over 1, make a whole.',
  'frac-mul-frac': 'Multiply the numerators, multiply the denominators (2/3 × 3/5 = 6/15), then simplify if you can.',
  'frac-mul-whole': 'Multiply the numerator by the whole number (3/4 × 5 = 15/4 = 3 3/4). Change a mixed number into an improper fraction first.',
  'frac-div-whole': 'Multiply the denominator by the whole number (2/5 ÷ 3 = 2/15), or divide the numerator if it divides exactly (6/7 ÷ 3 = 2/7).',
  'frac-of': 'Divide by the denominator, then multiply by the numerator: 3/4 of 60 is 60 ÷ 4 = 15, then 15 × 3 = 45.',
  'dec-add': 'Line up the decimal points (3.5 is 3.50), add in columns as usual and put the point in the answer under the others.',
  'dec-sub': 'Line up the decimal points and fill gaps with zeros (7 is 7.00), then subtract in columns, exchanging when you need to.',
  'dec-mul': 'Multiply without the point (0.7 × 6 → 7 × 6 = 42), then put back as many decimal places as the decimal had (4.2).',
  'dec-div': 'Short division, keeping the decimal point in the answer above the point in the number you are dividing.',
  'pct-of': 'Find 10% (÷ 10) and 1% (÷ 100), then build it: 35% = 3 × 10% + 5%. 50% is a half, 25% a quarter, 75% three quarters.',
};
