import VerifiableCredential from '../src/verifiable-credential';
import { DIDResolver } from '../src/resolver';
import Bls12381G2KeyPairDock2022 from '../src/utils/vc/crypto/Bls12381G2KeyPairDock2022';

const keypairOpts = {
  id: 'did:example:489398593#keys-1',
  controller: 'did:example:489398593',
  privateKeyBase58: '23fKPbbSJ7tCJVDYynRZQ1wPs6GannD2dEMjKZnFtKxy',
  publicKeyBase58: 'GzJYyMYXQyAdmRK3JcfQnHJtz5TyRiYyYtfj6SZD9LQ4zDapQ3qeC1AaBwCtzhQ8En6EGiLe7ke2RaeLNTxJ9GVompK6j6kHB8e5m2ya5qdCB2bbNMVii99QfmYsbj36J3B',
};

class ExampleDIDResolver extends DIDResolver {
  static METHOD = 'example';

  constructor() {
    super(void 0);
  }

  async resolve(did) {
    if (did.indexOf('#keys-1') !== -1) {
      return {
        ...keypairOpts,
        privateKeyBase58: undefined,
      };
    }
    return {
      '@context': 'https://w3id.org/security/v2',
      id: did,
      assertionMethod: [`${did}#keys-1`],
    };
  }
}

const resolver = new ExampleDIDResolver();

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

// Defining schema allows to specify custom encoding
const example = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://w3id.org/citizenship/v1',
    'https://ld.dock.io/security/bbs/v1',
  ],
  id: 'https://issuer.oidp.uscis.gov/credentials/83627465',
  type: ['VerifiableCredential', 'PermanentResidentCard'],
  issuer: {
    id: 'did:example:489398593',
  },
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

async function signAndVerify(credentialJSON) {
  // Incrementally build a verifiable credential
  const credential = new VerifiableCredential();
  credential.setFromJSON(credentialJSON);
  credential.setIssuer(keypairOpts.controller);

  // Create the keypair
  const keyPair = new Bls12381G2KeyPairDock2022(keypairOpts);

  // Sign and print the results
  console.log('Signing credential:', JSON.stringify(credential.toJSON(), null, 2));
  await credential.sign({ keypair: keyPair, type: keyPair.type });
  console.log('Signed credential:', JSON.stringify(credential.toJSON(), null, 2));

  // Verify the credential
  const verifyResult = await credential.verify({
    resolver,
  });

  if (verifyResult.verified) {
    console.log('Credential has been verified!', verifyResult.results);
  } else {
    throw verifyResult.error;
  }

  return credential.toJSON();
}

async function main() {
  let exitCode = 0;
  try {
    await signAndVerify(example);
  } catch (e) {
    console.error(e);
    exitCode = 1;
  }

  // Exit
  process.exit(exitCode);
}

main();
