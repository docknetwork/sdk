import DockSDK from '../src/dock-sdk';

describe('dockSDK', () => {
  const dockSDK = new DockSDK();

  test('foo should be bar', async () => {
    const result = dockSDK.foo();
    expect(result).toBe('bar');
  })
});
