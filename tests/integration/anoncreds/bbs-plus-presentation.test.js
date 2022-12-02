import BbsPlusPresentation from '../../../src/bbs-plus-presentation';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestKeyringOpts } from '../../test-constants';

const credential = {
  cryptoVersion: '0.0.1',
  credentialSchema: '{"id":"data:application/json;charset=utf-8,%7B%22%24schema%22%3A%22http%3A%2F%2Fjson-schema.org%2Fdraft-07%2Fschema%23%22%2C%22%24id%22%3A%22https%3A%2F%2Fld.dock.io%2Fexamples%2Fresident-card-schema.json%22%2C%22title%22%3A%22Resident%20Card%20Example%22%2C%22type%22%3A%22object%22%2C%22properties%22%3A%7B%22%40context%22%3A%7B%22title%22%3A%22Context%22%2C%22type%22%3A%22array%22%2C%22items%22%3A%5B%7B%22type%22%3A%22string%22%7D%2C%7B%22type%22%3A%22string%22%7D%2C%7B%22type%22%3A%22string%22%7D%5D%7D%2C%22id%22%3A%7B%22title%22%3A%22Id%22%2C%22type%22%3A%22string%22%7D%2C%22type%22%3A%7B%22title%22%3A%22Type%22%2C%22type%22%3A%22array%22%2C%22items%22%3A%5B%7B%22type%22%3A%22string%22%7D%2C%7B%22type%22%3A%22string%22%7D%5D%7D%2C%22identifier%22%3A%7B%22title%22%3A%22identifier%22%2C%22type%22%3A%22string%22%7D%2C%22name%22%3A%7B%22title%22%3A%22Name%22%2C%22type%22%3A%22string%22%7D%2C%22description%22%3A%7B%22title%22%3A%22Desc%22%2C%22type%22%3A%22string%22%7D%2C%22credentialSubject%22%3A%7B%22type%22%3A%22object%22%2C%22properties%22%3A%7B%22id%22%3A%7B%22title%22%3A%22Id%22%2C%22type%22%3A%22string%22%7D%2C%22type%22%3A%7B%22title%22%3A%22Type%22%2C%22type%22%3A%22array%22%2C%22items%22%3A%5B%7B%22type%22%3A%22string%22%7D%2C%7B%22type%22%3A%22string%22%7D%5D%7D%2C%22givenName%22%3A%7B%22title%22%3A%22Given%20Name%22%2C%22type%22%3A%22string%22%7D%2C%22familyName%22%3A%7B%22title%22%3A%22Family%20Name%22%2C%22type%22%3A%22string%22%7D%2C%22lprNumber%22%3A%7B%22title%22%3A%22LPR%20Number%22%2C%22type%22%3A%22integer%22%2C%22minimum%22%3A0%7D%7D%7D%7D%7D","type":"JsonSchemaValidator2018","parsingOptions":{"useDefaults":true,"defaultMinimumInteger":-4294967295,"defaultDecimalPlaces":0},"version":"0.0.1"}',
  credentialSubject: {
    id: 'did:example:b34ca6cd37bbf23',
    type: ['PermanentResident', 'Person'],
    givenName: 'JOHN',
    familyName: 'SMITH',
    lprNumber: 1234,
  },
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/citizenship/v1',
    'https://ld.dock.io/security/bbs/v1',
  ],
  id: 'https://issuer.oidp.uscis.gov/credentials/83627465',
  type: ['VerifiableCredential', 'PermanentResidentCard'],
  identifier: '83627465',
  name: 'Permanent Resident Card',
  description: 'Government of Example Permanent Resident Card.',
  issuer: 'did:dock:5DWePRw2jvrmeZc6terSm3ndDvJVDrCXXBJdxNLNsNT1kPYB',
  proof: {
    type: 'Bls12381BBS+SignatureDock2022',
    proofValue: 'i9fuNSkuTTfm8Tiexy7VFef9RnkcwetQ9Sh5RNT79zSMxGVqj6CeDaRQEvrXF13mSBNAxbmL28K2J9t8nPRJWnbuV4jJf3DUGAkSC4T9JHmmsLFNz4EZhh5ijEDKFPwVJg8jb8wzsyV1e6axHxLciTvAj',
  },
};

describe('BBS plus presentation', () => {
  const dock = new DockAPI();
  let bbsPlusPresentation;
  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
  });
  beforeEach(() => {
    bbsPlusPresentation = new BbsPlusPresentation();
  });
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
    await expect(bbsPlusPresentation.addAttributeToReveal(idx, {}))
      .rejects
      .toThrow('The value provided must be an array');
  });
});
