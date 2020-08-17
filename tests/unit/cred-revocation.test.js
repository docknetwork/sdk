import {
  isRevocationCheckNeeded,
  expandedStatusProperty,
} from '../../src/utils/vc';

describe('Check isRevocationCheckNeeded', () => {
  test('isRevocationCheckNeeded returns true when credentialStatus is present and forceRevocationCheck is true and revocation API is not given', () => {
    expect(isRevocationCheckNeeded({ [expandedStatusProperty]: {} }, true, undefined)).toBe(true);
  });

  test('isRevocationCheckNeeded returns true when credentialStatus is present and forceRevocationCheck is true and revocation API is given', () => {
    expect(isRevocationCheckNeeded({ [expandedStatusProperty]: {} }, true, { dock: 'Anything' })).toBe(true);
  });

  test('isRevocationCheckNeeded returns true when credentialStatus is present and forceRevocationCheck is false but revocation API is given', () => {
    expect(isRevocationCheckNeeded({ [expandedStatusProperty]: {} }, false, { dock: 'Anything' })).toBe(true);
  });

  test('isRevocationCheckNeeded returns true when credentialStatus is present and forceRevocationCheck is false but revocation API is empty object', () => {
    expect(isRevocationCheckNeeded({ [expandedStatusProperty]: {} }, false, {})).toBe(true);
  });

  test('isRevocationCheckNeeded returns false when credentialStatus is present and forceRevocationCheck is false and revocation API is not given', () => {
    expect(isRevocationCheckNeeded({ [expandedStatusProperty]: {} }, false, undefined)).toBe(false);
  });

  test('isRevocationCheckNeeded returns false when credentialStatus is not present and forceRevocationCheck is true and revocation API is not given', () => {
    expect(isRevocationCheckNeeded({}, true, undefined)).toBe(false);
  });

  test('isRevocationCheckNeeded returns true when credentialStatus is not present and forceRevocationCheck is true and revocation API is given', () => {
    expect(isRevocationCheckNeeded({}, true, { dock: 'Anything' })).toBe(false);
  });
});
