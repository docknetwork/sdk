import {DockAPI} from '../../src/api';
import {FullNodeEndpoint} from '../test-constants';

describe('Config on NodeJS environment', () => {
  test('Is running in NodeJS environment', () => {
    expect(typeof window !== 'undefined').toBeFalsy();
  });
});

describe('Dock API', () => {
  const dock = new DockAPI(FullNodeEndpoint);

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts
    });
    done();
  }, 30000);

  test('Can connect to node', async () => {
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

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);
});
