import { ensureValidDatetime } from '../../../src/utils/type-helpers';

describe('ensureValidDatetime.', () => {
  test('happy path', () => {
    expect(ensureValidDatetime('2023-10-09T20:05:44.039Z')).toBe(true);
    expect(ensureValidDatetime('2020-01-01T20:12:08.613Z')).toBe(true);
    expect(ensureValidDatetime('1970-01-01T20:12:08.613Z')).toBe(true);
  });

  test('unhappy path', () => {
    expect(() => ensureValidDatetime('2023-13-09T15:12:08.613Z')).toThrow();
    expect(() => ensureValidDatetime('2020-01-01')).toThrow();
    expect(() => ensureValidDatetime('not a date')).toThrow();
  });
});
