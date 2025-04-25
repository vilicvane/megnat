export function bigintMin(...args: [bigint, ...bigint[]]): bigint {
  return args.reduce((min, val) => (val < min ? val : min));
}

export function toMaxSignificant(
  value: number | bigint,
  significantDigits: number,
): string {
  if (typeof value === 'bigint') {
    value = Number(value);
  }

  if (value === 0) return '0';

  const mask = Math.pow(
    10,
    significantDigits - Math.floor(Math.log10(Math.abs(value))) - 1,
  );

  return (
    mask < 1
      ? // Avoid float precision issues when mask is less than 1.
        Math.round(value * mask) * Math.round(1 / mask)
      : Math.round(value * mask) / mask
  ).toString();
}
