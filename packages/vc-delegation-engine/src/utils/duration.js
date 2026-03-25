const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

/**
 * @param {{ value: number, unit: string }} duration
 * @returns {number}
 */
export function durationToMilliseconds(duration) {
  if (!duration || typeof duration.value !== 'number' || typeof duration.unit !== 'string') {
    return NaN;
  }
  const { value, unit } = duration;
  switch (unit) {
    case 'minutes':
      return value * MS_MINUTE;
    case 'hours':
      return value * MS_HOUR;
    case 'days':
      return value * MS_DAY;
    case 'months':
      return value * 30 * MS_DAY;
    case 'years':
      return value * 365 * MS_DAY;
    default:
      return NaN;
  }
}
