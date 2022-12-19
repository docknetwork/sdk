import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex, stringToU8a } from '@polkadot/util';
import b58 from 'bs58';
import { initializeWasm } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { createNewDockDID } from '../../../src/utils/did';
import Bls12381G2KeyPairDock2022 from '../../../src/utils/vc/crypto/Bls12381G2KeyPairDock2022';
import BbsPlusPresentation from '../../../src/bbs-plus-presentation';
import BBSPlusModule from '../../../src/modules/bbs-plus';
import { registerNewDIDUsingPair } from '../helpers';
import getKeyDoc from '../../../src/utils/vc/helpers';
import { issueCredential, verifyPresentation } from '../../../src/utils/vc';
import { DockResolver } from '../../../src/resolver';

// TODO: move to fixtures
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

// TODO: move to fixtures
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

describe('BBS+ Presentation', () => {
  const dock = new DockAPI();
  const resolver = new DockResolver(dock);
  let account;
  let did1;
  let pair1;
  let chainModule;
  let keypair;
  let didDocument;

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

    didDocument = await dock.did.getDocument(did1);
    const { publicKey } = didDocument;
    expect(publicKey.length).toEqual(2);
    expect(publicKey[1].type).toEqual('Bls12381G2VerificationKeyDock2022');
    keypair.id = publicKey[1].id;
  }, 30000);

  test('expect to reveal specified attributes', async () => {
    const bbsPlusPresentation = new BbsPlusPresentation();
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const credential = await issueCredential(issuerKey, unsignedCred);

    const idx = await bbsPlusPresentation.addCredentialToPresent(credential, { resolver });

    await bbsPlusPresentation.addAttributeToReveal(idx, ['credentialSubject.lprNumber']);

    const presentation = await bbsPlusPresentation.createPresentation();
    expect(presentation.spec.credentials[0].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[0].revealedAttributes.credentialSubject).toHaveProperty('lprNumber', 1234);

    // Ensure verificationMethod & type is revealed always
    expect(presentation.spec.credentials[0].revealedAttributes.proof).toBeDefined();
    expect(presentation.spec.credentials[0].revealedAttributes.proof).toHaveProperty('verificationMethod', credential.proof.verificationMethod);
    expect(presentation.spec.credentials[0].revealedAttributes.proof).toHaveProperty('type', credential.proof.type);

    const { verified } = await verifyPresentation(presentation, { resolver });
    expect(verified).toEqual(true);
  }, 30000);

  test('expect to create presentation from multiple credentials', async () => {
    const bbsPlusPresentation = new BbsPlusPresentation();

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const credential = await issueCredential(issuerKey, unsignedCred);
    const credential2 = await issueCredential(issuerKey, unsignedCred);

    const idx = await bbsPlusPresentation.addCredentialToPresent(credential, { resolver });
    const idx2 = await bbsPlusPresentation.addCredentialToPresent(credential2, { resolver });
    await bbsPlusPresentation.addAttributeToReveal(idx, ['credentialSubject.lprNumber']);
    await bbsPlusPresentation.addAttributeToReveal(idx2, ['credentialSubject.familyName']);

    const presentation = await bbsPlusPresentation.createPresentation();

    expect(presentation.spec.credentials[0].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[0].revealedAttributes.credentialSubject).toHaveProperty('lprNumber', 1234);

    expect(presentation.spec.credentials[1].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[1].revealedAttributes.credentialSubject).toHaveProperty('familyName', 'SMITH');

    const { verified } = await verifyPresentation(presentation, { resolver });
    expect(verified).toEqual(true);
  }, 30000);

  test('expect to throw exception when attributes provided is not an array', async () => {
    const bbsPlusPresentation = new BbsPlusPresentation();
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    const credential = await issueCredential(issuerKey, unsignedCred);

    const idx = await bbsPlusPresentation.addCredentialToPresent(credential, { resolver });

    expect(() => {
      bbsPlusPresentation.addAttributeToReveal(idx, {});
    }).toThrow();
  }, 30000);

  test('expect to create presentation with nonce', async () => {
    const bbsPlusPresentation = new BbsPlusPresentation();

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };

    const credential = await issueCredential(issuerKey, unsignedCred);

    const idx = await bbsPlusPresentation.addCredentialToPresent(credential, { resolver });
    await bbsPlusPresentation.addAttributeToReveal(idx, ['credentialSubject.lprNumber']);

    const presentation = await bbsPlusPresentation.createPresentation({ nonce: '1234' });
    expect(presentation.nonce).toEqual(b58.encode(stringToU8a('1234')));
    expect(presentation.spec.credentials[0].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[0].revealedAttributes.credentialSubject).toHaveProperty('lprNumber', 1234);

    const { verified } = await verifyPresentation(presentation, { resolver });
    expect(verified).toEqual(true);
  }, 30000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
