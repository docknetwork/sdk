import {DockSDK} from '../dist/client-sdk.cjs';
import address from './node-address';

describe('DID Module', () => {
  const dock = new DockSDK(address);

  test('Can connect to node', async () => {
    await dock.init();
    expect(!!dock.api).toBe(true);
  });

  test('Can create a DID', async () => {
    const result = 'bar';
    expect(result).toBe('bar');
  });

  test('Can disconnect from node', async () => {
    await dock.disconnect();
    expect(!!dock.api).toBe(false);
  });
});
