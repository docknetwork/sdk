import { ensureMatchesStructurePattern } from '../../src/utils/misc';

describe('ensureMatchesStructurePattern', () => {
  test('$matchType', () => {
    const pat = { $matchType: 'number' };
    expect(() => ensureMatchesStructurePattern(pat, 'sasda')).toThrowErrorMatchingSnapshot();
    ensureMatchesStructurePattern(pat, 10);
  });

  test('$matchValue', () => {
    const pat = { $matchValue: 11 };

    expect(() => ensureMatchesStructurePattern(pat, 10)).toThrowErrorMatchingSnapshot();
    ensureMatchesStructurePattern(pat, 11);
  });

  test('$matchObject', () => {
    const pat = {
      $matchObject: { a: { $matchValue: 1 }, b: { $matchValue: 2 } },
    };

    expect(() => ensureMatchesStructurePattern(pat, { c: 3 })).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, { a: 3 })).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, { a: 1, b: 3 })).toThrowErrorMatchingSnapshot();

    ensureMatchesStructurePattern(pat, { a: 1 });
    ensureMatchesStructurePattern(pat, { b: 2 });
    ensureMatchesStructurePattern(pat, { a: 1, b: 2 });
  });

  test('$matchIterable', () => {
    const pat = { $matchIterable: [{ $matchValue: 1 }, { $matchValue: 2 }] };
    expect(() => ensureMatchesStructurePattern(pat, [3])).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, [1, 3])).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, [])).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, [1])).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, [2])).toThrowErrorMatchingSnapshot();

    expect(ensureMatchesStructurePattern(pat, [1, 2]));
  });

  test('$instanceOf', () => {
    expect(() => ensureMatchesStructurePattern({ $instanceOf: Function }, {})).toThrowErrorMatchingSnapshot();
    ensureMatchesStructurePattern({ $instanceOf: Object }, {});
  });

  test('$iterableOf', () => {
    const pat = { $iterableOf: { $matchValue: 1 } };

    expect(() => ensureMatchesStructurePattern(pat, [3])).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, [1, 3])).toThrowErrorMatchingSnapshot();

    expect(() => ensureMatchesStructurePattern(pat, [2])).toThrowErrorMatchingSnapshot();

    expect(() => ensureMatchesStructurePattern(pat, [1, 2])).toThrowErrorMatchingSnapshot();

    ensureMatchesStructurePattern(pat, []);
    ensureMatchesStructurePattern(pat, [1]);
    ensureMatchesStructurePattern(pat, [1, 1, 1, 1, 1]);
  });

  test('$mapOf', () => {
    const pat = { $mapOf: [{ $matchValue: 1 }, { $matchValue: 2 }] };

    expect(() => ensureMatchesStructurePattern(pat, new Map([[1, 3]]))).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, new Map([[3, 2]]))).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(
      pat,
      new Map([
        [1, 2],
        [3, 1],
      ]),
    )).toThrowErrorMatchingSnapshot();

    ensureMatchesStructurePattern(pat, new Map([]));
    ensureMatchesStructurePattern(pat, new Map([[1, 2]]));
  });

  test('$anyOf', () => {
    const pat = { $anyOf: [{ $matchValue: 1 }, { $matchValue: 2 }] };

    expect(() => ensureMatchesStructurePattern(pat, 3)).toThrowErrorMatchingSnapshot();
    ensureMatchesStructurePattern(pat, 1);
    ensureMatchesStructurePattern(pat, 2);
  });

  test('$mapOf', () => {
    const pat = { $objOf: { A: { $matchValue: 1 } } };

    expect(() => ensureMatchesStructurePattern(pat, { A: 5 })).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, { B: 1 })).toThrowErrorMatchingSnapshot();
    expect(() => ensureMatchesStructurePattern(pat, { A: 1, B: 3 })).toThrowErrorMatchingSnapshot();

    ensureMatchesStructurePattern(pat, { A: 1 });
  });
});
