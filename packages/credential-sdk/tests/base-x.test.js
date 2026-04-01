import {
  encodeAsBase64,
  decodeFromBase64,
  encodeAsBase58,
  decodeFromBase58,
  encodeAsBase58btc,
  decodeFromBase58btc,
  stringFromU8a,
  u8aToHex,
  hexToU8a
} from '../src/utils';

const HEX_STR = '0xdeadbeefcafebabe';
const BYTES = hexToU8a(HEX_STR);

describe('base-x functions', () => {
  test('base58', () => {
    expect(encodeAsBase58(BYTES)).toBe('eFGDJTv8RoB');
    expect(u8aToHex(decodeFromBase58('eFGDJTv8RoB'))).toBe(HEX_STR);
  });

  test('base64', () => {
    expect(encodeAsBase64(BYTES)).toBe('3q2+78r+ur4=');
    expect(u8aToHex(decodeFromBase64('3q2+78r+ur4='))).toBe(HEX_STR);
  });

  test('multibase', () => {
    expect(encodeAsBase58btc(hexToU8a('0xed01'), BYTES)).toBe('zEKJLyQ1fpXdB5F');
    expect(u8aToHex(decodeFromBase58btc('zEKJLyQ1fpXdB5F'))).toBe(HEX_STR);
  });

  test('base58 and multibase', () => {
     const prefix = hexToU8a('0xed01');
     expect(`z${encodeAsBase58([...prefix, ...BYTES])}`).toBe(encodeAsBase58btc(prefix, BYTES));
  })
})
