import { cryptoWaitReady, randomAsHex } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/api';
import { hexToU8a } from '@polkadot/util';

import VerifiableCredential from '../../src/verifiable-credential';
import Schema from '../../src/modules/schema';
import { DockBlobQualifier } from '../../src/modules/blob';

import {
  getPublicKeyFromKeyringPair,
} from '../../src/utils/misc';

import {
  validateCredentialSchema,
} from '../../src/utils/vc';

import { SignatureSr25519 } from '../../src/signatures';
import exampleCredential from '../example-credential';
import exampleSchema from '../example-schema';

const exampleAuthor = 'did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW';

describe('VerifiableCredential Tests', () => {
  const vc = new VerifiableCredential(exampleCredential.id);
  vc.addSubject(exampleCredential.credentialSubject);

  test('VerifiableCredential\'s setSchema should appropriately set credentialSchema.', () => {
    vc.setSchema(exampleCredential.credentialSchema.id, exampleCredential.credentialSchema.type);
    expect(vc.credentialSchema).toMatchObject(
      expect.objectContaining({
        id: expect.anything(),
        type: expect.anything(),
      }),
    );
  });

  test('VerifiableCredential\'s validateSchema should validate the credentialSubject with given JSON schema.', async () => {
    await expect(vc.validateSchema(exampleSchema)).toBe(true);
  });
});

describe('Basic Schema Tests', () => {
  let keypair;
  let schema;
  beforeAll(async (done) => {
    await cryptoWaitReady();
    const keyring = new Keyring();
    const seed = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    keypair = keyring.addFromUri(randomAsHex(32), null, 'sr25519');

    schema = new Schema();
    schema.name = 'AlumniCredSchema';
    schema.version = '1.0.0';

    done();
  }, 10000);

  test('accepts the id optionally and generates id of correct size when id is not given', () => {
    const schemaNoID = new Schema();
    const encodedIDByteSize = 48;
    expect(schemaNoID.id && schemaNoID.id.length).toBe(encodedIDByteSize + DockBlobQualifier.length);
  });

  test('setAuthor will set the author and accepts a DID identifier or full DID', () => {
    schema.setAuthor(exampleAuthor);
    expect(schema.author).toBe(exampleAuthor);
  });

  test('setJSONSchema will only accept valid JSON schema and set the schema key of the object.', async () => {
    await expect(schema.setJSONSchema({
      invalidSchema: true,
    })).rejects.toThrow();

    await schema.setJSONSchema(exampleSchema);
    expect(schema.schema).toBe(exampleSchema);
  });

  test('setSignature will only accept signature of the supported types and set the signature key of the object.', () => {
    const msg = [1, 2, 3, 4]; // TODO: getSerializedBlob?
    const pk = getPublicKeyFromKeyringPair(keypair);
    const sig = new SignatureSr25519(msg, keypair);
    schema.setSignature(sig);
    expect(schema.signature).toBe(sig);
  });

  test('sign will generate a signature on the schema detail, this signature is verifiable.', () => {
    const msg = [1, 2, 3, 4]; // TODO: getSerializedBlob?
    schema.sign(msg, keypair);
    expect(!!schema.signature).toBe(true);
  });

  test('validateSchema will check that the given schema is a valid JSON-schema.', async () => {
    await expect(Schema.validateSchema(exampleSchema)).resolves.toBeDefined();
  });

  test('toJSON will generate a JSON that can be sent to chain.', () => {
    const result = schema.toJSON();
    console.log('toJSON:', result);
    expect(result).toMatchObject(
      expect.objectContaining({
        id: expect.anything(),
        schema: expect.anything(),
      }),
    );
  });
});

describe('Validate Credential Schema utility', () => {
  const schema = new Schema();
  schema.name = 'AlumniCredSchema';
  schema.version = '1.0.0';
  schema.setJSONSchema(exampleSchema);
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
    const nonRequiredSchema = { ...exampleSchema };
    delete nonRequiredSchema.required;
    await schema.setJSONSchema(nonRequiredSchema);

    const credentialSubject = { ...exampleCredential.credentialSubject };
    delete credentialSubject.alumniOf;

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });

  test('credentialSubject has extra fields than given schema specifies and additionalProperties is false.', () => {
    const credentialSubject = { ...exampleCredential.credentialSubject, additionalProperty: true };
    expect(() => validateCredentialSchema({
      credentialSubject,
    }, schema)).toThrow();
  });

  test('credentialSubject has extra fields than given schema specifies and additionalProperties is true.', async () => {
    const credentialSubject = { ...exampleCredential.credentialSubject, additionalProperty: true };
    await schema.setJSONSchema({
      ...exampleSchema,
      additionalProperties: true,
    });

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });

  test('credentialSubject has extra fields than given schema specifies and additionalProperties has certain type.', async () => {
    const credentialSubject = { ...exampleCredential.credentialSubject, additionalString: 'mystring' };
    await schema.setJSONSchema({
      ...exampleSchema,
      additionalProperties: { type: 'string' },
    });

    expect(validateCredentialSchema({
      credentialSubject,
    }, schema)).toBeDefined();
  });

  test('credentialSubject has nested fields and given schema specifies the nested structure.', async () => {
    const credentialSubject = {
      ...exampleCredential.credentialSubject,
      nestedFields: {
        test: true,
      },
    };

    await schema.setJSONSchema({
      ...exampleSchema,
      properties: {
        ...exampleSchema.properties,
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
