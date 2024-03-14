import { ensureMatchesPattern } from '../../src/utils/misc';

const checkError = (fn) => {
  let thrown = false;

  try {
    fn();
  } catch (err) {
    for (const key of ['message', 'path', 'pattern', 'errors']) {
      expect(err[key]).toMatchSnapshot();
    }
    thrown = true;
  }

  if (!thrown) {
    throw new Error('Expected an error to be thrown');
  }
};

describe('ensureMatchesPattern', () => {
  test('$matchType', () => {
    const pat = { $matchType: 'number' };
    checkError(() => ensureMatchesPattern(pat, 'sasda'));
    ensureMatchesPattern(pat, 10);
  });

  test('$matchValue', () => {
    const pat = { $matchValue: 11 };

    checkError(() => ensureMatchesPattern(pat, 10));
    ensureMatchesPattern(pat, 11);
  });

  test('$matchObject', () => {
    const pat = {
      $matchObject: { a: { $matchValue: 1 }, b: { $matchValue: 2 } },
    };

    checkError(() => ensureMatchesPattern(pat, { c: 3 }));
    checkError(() => ensureMatchesPattern(pat, { a: 3 }));
    checkError(() => ensureMatchesPattern(pat, { a: 1, b: 3 }));

    ensureMatchesPattern(pat, { a: 1 });
    ensureMatchesPattern(pat, { b: 2 });
    ensureMatchesPattern(pat, { a: 1, b: 2 });
  });

  test('$matchIterable', () => {
    const pat = { $matchIterable: [{ $matchValue: 1 }, { $matchValue: 2 }] };
    checkError(() => ensureMatchesPattern(pat, [3]));
    checkError(() => ensureMatchesPattern(pat, [1, 3]));
    checkError(() => ensureMatchesPattern(pat, []));
    checkError(() => ensureMatchesPattern(pat, [1]));
    checkError(() => ensureMatchesPattern(pat, [2]));

    expect(ensureMatchesPattern(pat, [1, 2]));
  });

  test('$instanceOf', () => {
    checkError(() => ensureMatchesPattern({ $instanceOf: Function }, {}));
    ensureMatchesPattern({ $instanceOf: Object }, {});
  });

  test('$iterableOf', () => {
    const pat = { $iterableOf: { $matchValue: 1 } };

    checkError(() => ensureMatchesPattern(pat, [3]));
    checkError(() => ensureMatchesPattern(pat, [1, 3]));

    checkError(() => ensureMatchesPattern(pat, [2]));

    checkError(() => ensureMatchesPattern(pat, [1, 2]));

    ensureMatchesPattern(pat, []);
    ensureMatchesPattern(pat, [1]);
    ensureMatchesPattern(pat, [1, 1, 1, 1, 1]);
  });

  test('$mapOf', () => {
    const pat = { $mapOf: [{ $matchValue: 1 }, { $matchValue: 2 }] };

    checkError(() => ensureMatchesPattern(pat, new Map([[1, 3]])));
    checkError(() => ensureMatchesPattern(pat, new Map([[3, 2]])));
    checkError(() => ensureMatchesPattern(
      pat,
      new Map([
        [1, 2],
        [3, 1],
      ]),
    ));
    ensureMatchesPattern(pat, new Map([]));
    ensureMatchesPattern(pat, new Map([[1, 2]]));
  });

  test('$anyOf', () => {
    const pat = { $anyOf: [{ $matchValue: 1 }, { $matchValue: 2 }] };

    checkError(() => ensureMatchesPattern(pat, 3));
    ensureMatchesPattern(pat, 1);
    ensureMatchesPattern(pat, 2);
  });

  test('$mapOf', () => {
    const pat = { $objOf: { A: { $matchValue: 1 } } };

    checkError(() => ensureMatchesPattern(pat, { A: 5 }));
    checkError(() => ensureMatchesPattern(pat, { B: 1 }));
    checkError(() => ensureMatchesPattern(pat, { A: 1, B: 3 }));

    ensureMatchesPattern(pat, { A: 1 });
  });
});
