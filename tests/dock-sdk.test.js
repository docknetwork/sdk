import {DockSDK} from '../src/dock-sdk';
import {FullNodeEndpoint} from './test-constants';

describe('Dock SDK', () => {
  const dock = new DockSDK(FullNodeEndpoint);

  // TODO: Unskip the tests once a node is deployed.
  test.skip('Can connect to node', async () => {
    await dock.init();
    expect(!!dock.api).toBe(true);
  });

  test.skip('Has DID Module', () => {
    expect(!!dock.did).toBe(true);
  });

  test.skip('Has Revocation Module', () => {
    expect(!!dock.revocation).toBe(true);
  });

  test.skip('Can disconnect from node', async () => {
    await dock.disconnect();
    expect(!!dock.api).toBe(false);
  });
});
