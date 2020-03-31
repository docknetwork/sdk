import {DockAPI} from '../../src/api';
import {FullNodeEndpoint} from '../test-constants';

describe('Config on NodeJS environment', () => {
  test('Is running in NodeJS environment', () => {
    expect(typeof window !== 'undefined').toBeFalsy();
  });
});

describe('Dock API', () => {
  const dock = new DockAPI();

  test('Can connect to node', async () => {
    await dock.init({
      address: FullNodeEndpoint
    });
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
