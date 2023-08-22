import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { initializeWasm } from '@docknetwork/crypto-wasm-ts';
import { DockAPI } from '../../../src';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import { createNewDockDID } from '../../../src/utils/did';

import { DockResolver } from '../../../src/resolver';
import {
  registerNewDIDUsingPair,
  getCredMatcherDoc,
  getProofMatcherDoc,
} from '../helpers';
import { issueCredential, verifyCredential } from '../../../src/utils/vc/index';
import { getKeyDoc } from '../../../src/utils/vc/helpers';

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
  id: `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(residentCardSchema),
  )}`,
  type: 'JsonSchemaValidator2018',
};

for (const {
  Name,
  Module,
  Context,
  CryptoKeyPair,
  getModule,
  VerKey,
  SigType,
} of Schemes) {
  const credentialJSON = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/citizenship/v1',
      Context,
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
  describe(`${Name} Module`, () => {
    const dock = new DockAPI();
    const resolver = new DockResolver(dock);
    let account;
    let did1;
    let pair1;
    let chainModule;
    let keypair;

    beforeAll(async () => {
      await initializeWasm();
      await dock.init({
        keyring: TestKeyringOpts,
        address: FullNodeEndpoint,
      });
      chainModule = getModule(dock);
      account = dock.keyring.addFromUri(TestAccountURI);
      dock.setAccount(account);
      pair1 = dock.keyring.addFromUri(randomAsHex(32));
      did1 = createNewDockDID();
      await registerNewDIDUsingPair(dock, did1, pair1);
    }, 20000);

    test(`Can create ${Name} public key for the DID`, async () => {
      keypair = CryptoKeyPair.generate({
        controller: did1,
        msgCount: 100,
      });

      const pk1 = Module.prepareAddPublicKey(u8aToHex(keypair.publicKeyBuffer));
      await chainModule.addPublicKey(
        pk1,
        did1,
        did1,
        pair1,
        1,
        { didModule: dock.did },
        false,
      );

      const didDocument = await dock.did.getDocument(did1);
      const { publicKey } = didDocument;

      expect(publicKey.length).toEqual(2);
      expect(publicKey[1].type).toEqual(VerKey);

      keypair.id = publicKey[1].id;
    }, 30000);

    test(`Can issue+verify a ${Name} credential with embedded schema`, async () => {
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: did1,
      };

      const credential = await issueCredential(issuerKey, unsignedCred);
      expect(credential).toMatchObject(
        expect.objectContaining(
          getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType),
        ),
      );

      const result = await verifyCredential(credential, { resolver });
      expect(result).toMatchObject(
        expect.objectContaining(getProofMatcherDoc()),
      );

      // Ensure embedding the schema doesnt conflict with the other schema resolutions
      const resultWithSchema = await verifyCredential(credential, {
        resolver,
      });
      expect(resultWithSchema).toMatchObject(
        expect.objectContaining(getProofMatcherDoc()),
      );
    }, 30000);

    test(`Can issue+verify a ${Name} credential with default schema`, async () => {
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: did1,
      };
      delete unsignedCred.credentialSchema;

      const credential = await issueCredential(issuerKey, unsignedCred);
      expect(credential).toMatchObject(
        expect.objectContaining(
          getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType),
        ),
      );

      const result = await verifyCredential(credential, { resolver });
      expect(result).toMatchObject(
        expect.objectContaining(getProofMatcherDoc()),
      );
    }, 30000);

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  });
}
