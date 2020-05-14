import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';

import Schema, { BlobQualifier, EncodedIDByteSize } from '../../src/modules/schema';

import {
  generateEcdsaSecp256k1Keypair,
  getPublicKeyFromKeyringPair,
} from '../../src/utils/misc';

import {
  validateCredentialSchema,
} from '../../src/utils/vc';

import { PublicKeySecp256k1 } from '../../src/public-keys';
import { SignatureSecp256k1 } from '../../src/signatures';

const exampleAuthor = 'did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW';
const exampleAlumniSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Alumni',
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    emailAddress: {
      type: 'string',
      format: 'email',
    },
    alumniOf: {
      type: 'string',
    },
  },
  required: ['emailAddress', 'alumniOf'],
  additionalProperties: false,
};

describe('VerifiableCredential Tests', () => {
  test.skip('VerifiableCredential\'s setSchema should appropriately set credentialSchema.', () => {
    // TODO
  });

  test.skip('VerifiableCredential\'s validateSchema should validate the credentialSubject with given JSON schema.', () => {
    // TODO
  });

  test.skip('Utility methods verifyCredential and verifyPresentation should check if schema is incompatible with the credentialSubject.', () => {
    // TODO
  });

  test.skip('The verify and verifyPresentation should detect a subject with incompatible schema in credentialSchema.', () => {
    // TODO
  });
});

describe('Basic Schema Tests', () => {
  let keypair;
  beforeAll(async (done) => {
    await cryptoWaitReady();
    const keyring = new Keyring();
    const seed = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    keypair = keyring.addFromSeed(hexToU8a(seed), {}, 'sr25519');
    done();
  });

  const schema = new Schema('blob:dock:5C78GCA');
  schema.name = 'AlumniCredSchema';
  schema.version = '1.0.0';

  test('accepts the id optionally and generates id of correct size when id is not given', () => {
    const schemaNoID = new Schema();
    expect(schemaNoID.id && schemaNoID.id.length).toBe(EncodedIDByteSize + BlobQualifier.length);
  });

  test('setAuthor will set the author and accepts a DID identifier or full DID', () => {
    schema.setAuthor(exampleAuthor);
    expect(schema.author).toBe(exampleAuthor);
  });

  test('setJSONSchema will only accept valid JSON schema and set the schema key of the object.', async () => {
    await expect(schema.setJSONSchema({
      invalidSchema: true,
    })).rejects.toThrow();

    await schema.setJSONSchema(exampleAlumniSchema);
    expect(schema.schema).toBe(exampleAlumniSchema);
  });

  test('setSignature will only accept signature of the supported types and set the signature key of the object.', () => {
    const msg = [1, 2, 3, 4]; // TODO: proper message
    const pk = getPublicKeyFromKeyringPair(keypair);
    const sig = new SignatureSecp256k1(msg, keypair);
    schema.setSignature(sig);
    expect(schema.signature).toBe(sig);
  });

  test('sign will generate a signature on the schema detail, this signature is verifiable.', () => {
    schema.sign(keypair);
    expect(!!schema.signature).toBe(true);
  });

  test('validateSchema will check that the given schema is a valid JSON-schema.', async () => {
    await expect(Schema.validateSchema(exampleAlumniSchema)).resolves.toBeDefined();
  });

  test('toJSON will generate a JSON that can be sent to chain.', () => {
    const result = schema.toJSON();
    expect(result).toMatchObject(
      expect.objectContaining({
        id: expect.anything(),
        schema: expect.anything(),
      }),
    );
  });

  // TODO: implement when blobmodule is integrated
  test('getSchema will return schema in correct format.', async () => {
    await expect(Schema.getSchema('validid')).resolves.toBeDefined();
  });

  test('getSchema throws error when no blob exists at the given id.', async () => {
    await expect(Schema.getSchema('invalid-id')).rejects.toThrow(/Invalid schema id/);
  });

  // TODO: implement when blobmodule is integrated
  test('getSchema throws error when schema not in correct format.', async () => {
    await expect(Schema.getSchema('invalid-format')).rejects.toThrow(/Incorrect schema format/);
  });
});

const exampleCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.w3.org/2018/credentials/examples/v1',
  ],
  id: 'uuid:0x9b561796d3450eb2673fed26dd9c07192390177ad93e0835bc7a5fbb705d52bc',
  type: [
    'VerifiableCredential',
    'AlumniCredential',
  ],
  issuanceDate: '2020-03-18T19:23:24Z',
  credentialSchema: { // this is the schema
    id: 'blob:dock:5C78GCA',
    type: 'JsonSchemaValidator2018',
  },
  credentialSubject: {
    id: 'did:dock:5GL3xbkr3vfs4qJ94YUHwpVVsPSSAyvJcafHz1wNb5zrSPGi',
    emailAddress: 'john.smith@example.com',
    alumniOf: 'Example University',
  },
  credentialStatus: {
    id: 'rev-reg:dock:0x0194...',
    type: 'CredentialStatusList2017',
  },
  issuer: 'did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr',
  proof: {
    type: 'Ed25519Signature2018',
    created: '2020-04-22T07:50:13Z',
    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GBqyaiTMhVt4R5P2bMGcLNJPWEUq7WmGHG7Wc6mKBo9k3vSo7v7sRKwqS8-m0og_ANKcb5m-_YdXC2KMnZwLBg',
    proofPurpose: 'assertionMethod',
    verificationMethod: 'did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr#keys-1',
  },
};

describe('Validate Credential Schema utility', () => {
  const schema = new Schema();
  schema.name = 'AlumniCredSchema';
  schema.version = '1.0.0';
  schema.setJSONSchema(exampleAlumniSchema);
  schema.setAuthor(exampleAuthor);

  test('credentialSubject has same fields and fields have same types as JSON-schema', () => {
    expect(validateCredentialSchema(exampleCredential, schema)).toBeDefined();
  });

  test('credentialSubject has same fields but fields have different type than JSON-schema', () => {
    expect(() => validateCredentialSchema({
      credentialSubject: {
        invalid: true,
      },
    }, schema)).toThrow();
  });

  test('credentialSubject is missing required fields from the JSON-schema and it should fail to validate.', () => {
    const credentialSubject = { ...exampleCredential.credentialSubject };
    delete credentialSubject.alumniOf;
    expect(() => validateCredentialSchema({
      credentialSubject,
    }, schema)).toThrow();
  });

  test('The schema\'s properties is missing the required key and credentialSubject can omit some of the properties.', async () => {
    const nonRequiredSchema = { ...exampleAlumniSchema };
    delete nonRequiredSchema.required;
    await schema.setJSONSchema(nonRequiredSchema);

    const credentialSubject = { ...exampleCredential.credentialSubject };
    delete credentialSubject.alumniOf;

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });

  test('credentialSubject has extra fields than given schema specifies and additionalProperties is false.', () => {
    const credentialSubject = { ...exampleCredential.credentialSubject };
    credentialSubject.additionalProperty = true;
    expect(() => validateCredentialSchema({
      credentialSubject,
    }, schema)).toThrow();
  });

  test('credentialSubject has extra fields than given schema specifies and additionalProperties is true.', async () => {
    const credentialSubject = { ...exampleCredential.credentialSubject };
    credentialSubject.additionalProperty = true;

    await schema.setJSONSchema({
      ...exampleAlumniSchema,
      additionalProperties: true,
    });

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });

  test('credentialSubject has extra fields than given schema specifies and additionalProperties has certain type.', async () => {
    const credentialSubject = { ...exampleCredential.credentialSubject };
    credentialSubject.additionalString = 'mystring';

    await schema.setJSONSchema({
      ...exampleAlumniSchema,
      additionalProperties: { type: 'string' },
    });

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });

  test('credentialSubject has nested fields and given schema specifies the nested structure.', async () => {
    const credentialSubject = { ...exampleCredential.credentialSubject };
    credentialSubject.nestedFields = {
      test: true,
    };

    await schema.setJSONSchema({
      ...exampleAlumniSchema,
      properties: {
        ...exampleAlumniSchema.properties,
        nestedFields: {
          properties: {
            test: {
              type: 'boolean',
            },
          },
        },
      },
    });

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });
});
