import {DockSDK} from '../src/dock-sdk';
import {FULL_NODE_ENDPOINT} from './test-constants';

describe('Dock SDK', () => {
  const dock = new DockSDK(FULL_NODE_ENDPOINT);

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
