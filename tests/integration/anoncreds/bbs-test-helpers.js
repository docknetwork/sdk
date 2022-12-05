import { u8aToHex } from '@polkadot/util';
import { initializeWasm, BBSPlusSecretKey } from '@docknetwork/crypto-wasm-ts';
import { CredentialSchema, CredentialBuilder } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import { randomAsHex } from '@polkadot/util-crypto';
import { createNewDockDID } from '../../../src/utils/did';
import { registerNewDIDUsingPair } from '../helpers';
import BBSPlusModule from '../../../src/modules/bbs-plus';
import Bls12381G2KeyPairDock2022 from '../../../src/utils/vc/crypto/Bls12381G2KeyPairDock2022';
import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../../test-constants';
import { DockAPI } from '../../../src';

const residentCardSchema1 = {
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
    },
  },
};
const credentialJSONWithoutSchema = {
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
  credentialSubject: {
    id: 'did:example:b34ca6cd37bbf23',
    type: ['PermanentResident', 'Person'],
    givenName: 'JOHN',
    familyName: 'SMITH',
    lprNumber: 1234,
  },
};

let bbsPlusModule;
let account;
let pair1;
let did1;
let keypair;
let dock;
async function initLibraries() {
  dock = new DockAPI();
  await initializeWasm();
  await dock.init({
    keyring: TestKeyringOpts,
    address: FullNodeEndpoint,
  });
  bbsPlusModule = dock.bbsPlusModule;
  account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);
  pair1 = dock.keyring.addFromUri(randomAsHex(32));
  did1 = createNewDockDID();
  await registerNewDIDUsingPair(dock, did1, pair1);
}
async function addBBSPlusKeyToDID() {
  keypair = Bls12381G2KeyPairDock2022.generate({
    controller: did1,
  });
  const pk1 = BBSPlusModule.prepareAddPublicKey(u8aToHex(keypair.publicKeyBuffer));
  await bbsPlusModule.addPublicKey(pk1, did1, did1, pair1, 1, { didModule: dock.did }, false);
}
export const createAnonCredential = async () => {
  await initLibraries();
  await addBBSPlusKeyToDID();
  const credSchema = new CredentialSchema(residentCardSchema1, { useDefaults: true });

  const credBuilder = new CredentialBuilder();
  credBuilder.schema = credSchema;
  credBuilder.subject = credentialJSONWithoutSchema.credentialSubject;

  for (const k of ['@context', 'id', 'type', 'identifier', 'name', 'description']) {
    credBuilder.setTopLevelField(k, credentialJSONWithoutSchema[k]);
  }
  credBuilder.setTopLevelField('issuer', did1);

  const sk = new BBSPlusSecretKey(keypair.privateKeyBuffer);
  const credential = credBuilder.sign(sk, undefined, { requireAllFieldsFromSchema: false });

  return credential.toJSON();
};
