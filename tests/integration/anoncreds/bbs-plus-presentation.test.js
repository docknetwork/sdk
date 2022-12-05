import BbsPlusPresentation from '../../../src/bbs-plus-presentation';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestKeyringOpts } from '../../test-constants';
import { createAnonCredential } from './bbs-test-helpers';

let credential

describe('BBS plus presentation', () => {
  const dock = new DockAPI();
  let bbsPlusPresentation;
  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    bbsPlusPresentation = new BbsPlusPresentation(dock);
    credential = await createAnonCredential();
  }, 30000);
  test('Can in add credentials to presentation builder', async () => {
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential);
    expect(idx).toBe(0);
  });
  test('expect to reveal specified attributes', async () => {
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential);
    await bbsPlusPresentation.addAttributeToReveal(idx, ['credentialSubject.lprNumber']);
    const presentation = await bbsPlusPresentation.createPresentation();
    expect(presentation.spec.credentials[0].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[0].revealedAttributes.credentialSubject).toHaveProperty('lprNumber', 1234);
  });
  test('expect not to reveal any attributes', async () => {
    await bbsPlusPresentation.addCredentialsToPresent(credential);
    const presentation = await bbsPlusPresentation.createPresentation();
    expect(presentation.spec.credentials[0].revealedAttributes).toMatchObject({});
  });
  test('expect to throw exception when attributes provided is not an array', async () => {
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential);
    expect(() => {
      bbsPlusPresentation.addAttributeToReveal(idx, {});
    }).toThrow();
  });
  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
