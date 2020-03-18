import dock from '../dist/client-sdk.cjs';

const address = 'ws://34.217.96.186:9944';

describe('Dock SDK', () => {
  test('Can connect to node', async () => {
    await dock.init(address);
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
