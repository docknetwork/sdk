import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { initializeWasm } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { createNewDockDID } from '../../../src/utils/did';
import Bls12381G2KeyPairDock2022 from '../../../src/utils/vc/crypto/Bls12381G2KeyPairDock2022';
import BbsPlusPresentation from '../../../src/bbs-plus-presentation';
import BBSPlusModule from '../../../src/modules/bbs-plus';
import { registerNewDIDUsingPair } from '../helpers';
import getKeyDoc from '../../../src/utils/vc/helpers';
import { issueCredential } from '../../../src/utils/vc';

const residentCardSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://ld.dock.io/examples/resident-card-schema.json',
  title: 'Resident Card Example',
  type: 'object',
  properties: {
    '@context': {
      title: 'Context',
      type: 'array',
      items: [{ type: 'string' }, { type: 'string' }, { type: 'string' }],
    },
    id: {
      title: 'Id',
      type: 'string',
    },
    type: {
      title: 'Type',
      type: 'array',
      items: [{ type: 'string' }, { type: 'string' }],
    },
    identifier: {
      title: 'identifier',
      type: 'string',
    },
    name: {
      title: 'Name',
      type: 'string',
    },
    description: {
      title: 'Desc',
      type: 'string',
    },
    credentialSubject: {
      type: 'object',
      properties: {
        id: {
          title: 'Id',
          type: 'string',
        },
        type: {
          title: 'Type',
          type: 'array',
          items: [{ type: 'string' }, { type: 'string' }],
        },
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
    expirationDate: {
      title: 'Expiration Date',
      type: 'string',
    },
    issuanceDate: {
      title: 'Issuance Date',
      type: 'string',
    },
    issuer: {
      title: 'Issuer DID',
      type: 'string',
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

describe('BBS+ Presentation', () => {
  const dock = new DockAPI();
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
  }, 20000);

  test('expect to reveal specified attributes', async () => {
    const bbsPlusPresentation = new BbsPlusPresentation();

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    
    const credential = await issueCredential(issuerKey, unsignedCred);
    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential, didDocument.publicKey[1].publicKeyBase58);
    await bbsPlusPresentation.addAttributeToReveal(idx, ['credentialSubject.lprNumber']);

    const presentation = await bbsPlusPresentation.createPresentation();
    expect(presentation.spec.credentials[0].revealedAttributes).toHaveProperty('credentialSubject');
    expect(presentation.spec.credentials[0].revealedAttributes.credentialSubject).toHaveProperty('lprNumber', 1234);
    console.log('result', JSON.stringify(presentation, null, 2))
  });

  test('expect to throw exception when attributes provided is not an array', async () => {
    const bbsPlusPresentation = new BbsPlusPresentation();
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: did1,
    };
    const credential = await issueCredential(issuerKey, unsignedCred);

    const didDocument = await dock.did.getDocument(did1);

    const idx = await bbsPlusPresentation.addCredentialsToPresent(credential, didDocument.publicKey[1].publicKeyBase58);

    expect(() => {
      bbsPlusPresentation.addAttributeToReveal(idx, {});
    }).toThrow();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
