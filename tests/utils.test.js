import {isHexWithGivenByteSize} from '../src/utils/misc';

describe('Utils SDK', () => {

  test('isHexWithGivenByteSize rejects strings not starting with 0x', () => {
    expect(isHexWithGivenByteSize('12')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with invalid hex', () => {
    expect(isHexWithGivenByteSize('0x1h')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with non-full byte', () => {
    expect(isHexWithGivenByteSize('0x123')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings with byte size 0', () => {
    expect(isHexWithGivenByteSize('0x')).toBe(false);
  });

  test('isHexWithGivenByteSize rejects strings not matching expected byte size', () => {
    expect(isHexWithGivenByteSize('0x12', 2)).toBe(false);
    expect(isHexWithGivenByteSize('0x1234', 1)).toBe(false);
  });

  test('isHexWithGivenByteSize accepts correct hex string with full bytes', () => {
    expect(isHexWithGivenByteSize('0x12')).toBe(true);
    expect(isHexWithGivenByteSize('0x1234')).toBe(true);
    expect(isHexWithGivenByteSize('0x1234ef')).toBe(true);
  });

  test('isHexWithGivenByteSize accepts correct hex string matching expected byte size', () => {
    expect(isHexWithGivenByteSize('0x12', 1)).toBe(true);
    expect(isHexWithGivenByteSize('0x1234', 2)).toBe(true);
    expect(isHexWithGivenByteSize('0x1234ef', 3)).toBe(true);
  });
});
