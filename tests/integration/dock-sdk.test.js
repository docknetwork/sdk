import {DockSDK} from '../../src/dock-sdk';
import {FullNodeEndpoint} from '../test-constants';

describe('Config on NodeJS environment', () => {
  test('Is running in NodeJS environment', () => {
    expect(typeof window !== 'undefined').toBeFalsy();
  });
});

describe('Dock SDK', () => {
  const dock = new DockSDK(FullNodeEndpoint);

  test('Can connect to node', async () => {
    await dock.init();
    expect(!!dock.api).toBe(true);
  });

  test('Has DID Module', () => {
    expect(!!dock.did).toBe(true);
  });

  test('Has Revocation Module', () => {
    expect(!!dock.revocation).toBe(true);
  });

  test('Can disconnect from node', async () => {
    await dock.disconnect();
    expect(!!dock.api).toBe(false);
  });
});
