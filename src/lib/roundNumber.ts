export default function roundNumber(number: number, precision = 2) {
  const pow = 10 ** precision;

  return Math.round((number + Number.EPSILON) * pow) / pow;
}
