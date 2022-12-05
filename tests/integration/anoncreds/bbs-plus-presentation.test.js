import { u8aToHex } from '@polkadot/util';
import { initializeWasm } from '@docknetwork/crypto-wasm-ts';
import { randomAsHex } from '@polkadot/util-crypto';
import BbsPlusPresentation from '../../../src/bbs-plus-presentation';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import getKeyDoc from '../../../src/utils/vc/helpers';
import { issueCredential } from '../../../src/utils/vc';
import { createNewDockDID } from '../../../src/utils/did';
import { registerNewDIDUsingPair } from '../helpers';
import Bls12381G2KeyPairDock2022 from '../../../src/utils/vc/crypto/Bls12381G2KeyPairDock2022';
import BBSPlusModule from '../../../src/modules/bbs-plus';

const residentCardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ld.dock.io/examples/resident-card-schema.json',
  title: 'Resident Card Example',
  type: 'object',
  properties: {
    credentialSubject: {
      type: 'object',
      properties: {
        givenName: {
          title: 'Given Name',
          type: 'string',
        },
        familyName: {
          title: 'Family Name',
          type: 'string',
        },
        lprNumber: {
          title: 'LPR Number',
          type: 'integer',
          minimum: 0,
        },
      },
      required: [],
    },
  },
};

const embeddedSchema = {
  id: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(residentCardSchema))}`,
  type: 'JsonSchemaValidator2018',
};

const credentialJSON = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/citizenship/v1',
    'https://ld.dock.io/security/bbs/v1',
  ],
  id: 'https://issuer.oidp.uscis.gov/credentials/83627465',
  type: ['VerifiableCredential', 'PermanentResidentCard'],
  credentialSchema: embeddedSchema,
  identifier: '83627465',
  name: 'Permanent Resident Card',
  description: 'Government of Example Permanent Resident Card.',
  issuanceDate: '2019-12-03T12:19:52Z',
  expirationDate: '2029-12-03T12:19:52Z',
  credentialSubject: {
    id: 'did:example:b34ca6cd37bbf23',
    type: ['PermanentResident', 'Person'],
    givenName: 'JOHN',
    familyName: 'SMITH',
    lprNumber: 1234,
  },
};

describe('BBS plus presentation', () => {
  const dock = new DockAPI();
  let account;
  let did1;
  let pair1;
  let chainModule;
  let keypair;
  let bbsPlusPresentation;
  beforeAll(async () => {
    await initializeWasm();
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = dock.bbsPlusModule;
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair1 = dock.keyring.addFromUri(randomAsHex(32));
    did1 = createNewDockDID();
    await registerNewDIDUsingPair(dock, did1, pair1);
    keypair = Bls12381G2KeyPairDock2022.generate({
      controller: did1,
    });

    const pk1 = BBSPlusModule.prepareAddPublicKey(u8aToHex(keypair.publicKeyBuffer));
    await chainModule.addPublicKey(pk1, did1, did1, pair1, 1, { didModule: dock.did }, false);
    bbsPlusPresentation = new BbsPlusPresentation(dock);
  }, 30000);
  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
  test('dummy', ()=>{
    expect(true).toBeTruthy();
  })
  test('Can in add credentials to presentation builder', async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    const credential = await issueCredential(issuerKey, unsignedCred);
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential);
    expect(idx).toBe(0);
  });
  test('expect to reveal specified attributes', async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    const credential = await issueCredential(issuerKey, unsignedCred);
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential);
    await bbsPlusPresentation.addAttributeToReveal(idx, ['credentialSubject.lprNumber']);
    const presentation = await bbsPlusPresentation.createPresentation();
    expect(presentation.spec.credentials[0].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[0].revealedAttributes.credentialSubject).toHaveProperty('lprNumber', 1234);
  });
  test('expect not to reveal any attributes', async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    const credential = await issueCredential(issuerKey, unsignedCred);
    await bbsPlusPresentation.addCredentialsToPresent(credential);
    const presentation = await bbsPlusPresentation.createPresentation();
    expect(presentation.spec.credentials[0].revealedAttributes).toMatchObject({});
  });
  test('expect to throw exception when attributes provided is not an array', async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    const credential = await issueCredential(issuerKey, unsignedCred);
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential);
    expect(() => {
      bbsPlusPresentation.addAttributeToReveal(idx, {});
    }).toThrow();
  });
  //
});
