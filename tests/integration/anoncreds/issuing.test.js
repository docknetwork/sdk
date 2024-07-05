import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import {
  DefaultSchemaParsingOpts, CredentialBuilder, CredentialSchema, initializeWasm, EMPTY_SCHEMA_ID,
} from '@docknetwork/crypto-wasm-ts';
import stringify from 'json-stringify-deterministic';
import { DockAPI } from '../../../src';
import { DidKeypair, DockDid } from '../../../src/did';
import { DockResolver } from '../../../src/resolver';
import {
  registerNewDIDUsingPair,
  getCredMatcherDoc,
  getProofMatcherDoc,
} from '../helpers';
import { issueCredential, verifyCredential } from '../../../src/utils/vc/index';
import { getKeyDoc } from '../../../src/utils/vc/helpers';
import { getJsonSchemaFromCredential } from '../../../src/utils/vc/credentials';
import { getResidentCardCredentialAndSchema, setupExternalSchema } from './utils';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from '../../test-constants';
import defaultDocumentLoader from '../../../src/utils/vc/document-loader';
import DockCryptoSignature from '../../../src/utils/vc/crypto/common/DockCryptoSignature';

describe.each(Schemes)('Issuance', ({
  Name,
  Module,
  Context,
  CryptoKeyPair,
  getModule,
  VerKey,
  SigType,
}) => {
  const dock = new DockAPI();
  const resolver = new DockResolver(dock);
  let account;
  const did1 = DockDid.random();
  let pair1;
  let chainModule;
  let keypair;

  const [credentialJSON, residentCardSchema] = getResidentCardCredentialAndSchema(Context);

  beforeAll(async () => {
    await initializeWasm();
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    chainModule = getModule(dock);
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair1 = new DidKeypair(dock.keyring.addFromUri(randomAsHex(32)), 1);

    await registerNewDIDUsingPair(dock, did1, pair1);

    keypair = CryptoKeyPair.generate({
      controller: did1,
      msgCount: 100,
    });

    if (Name !== 'BBDT16') {
      // Setup public key on blockchain
      const pk1 = Module.prepareAddPublicKey(u8aToHex(keypair.publicKeyBuffer));
      await chainModule.addPublicKey(
        pk1,
        did1,
        did1,
        pair1,
        { didModule: dock.did },
        false,
      );

      const didDocument = await dock.did.getDocument(did1);
      const { publicKey } = didDocument;

      expect(publicKey.length).toEqual(2);
      expect(publicKey[1].type).toEqual(VerKey);

      keypair.id = publicKey[1].id;
    } else {
      // For KVAC, the public doesn't need to published as its not used in credential or presentation verification (except issuers).
      // But the signer still adds a key identifier in the credential to determine which key will be used for verification
      keypair.id = 'my-key-id';
    }
  }, 20000);

  test(`Can issue+verify a ${Name} credential with external schema reference`, async () => {
    const [externalSchemaEncoded, schemaId] = await setupExternalSchema(residentCardSchema, 'Resident Card Example', did1, pair1, dock);

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: String(did1),
    };
    unsignedCred.credentialSchema = externalSchemaEncoded;

    // The schema will be fetched from the blockchain before issuing
    const credential = await issueCredential(issuerKey, unsignedCred, true, defaultDocumentLoader(resolver));
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType),
      ),
    );

    // Get JSON schema from the credential
    const fullSchema = getJsonSchemaFromCredential(credential, true);
    const externalSchema = getJsonSchemaFromCredential(credential, false);
    expect(externalSchema.$id).toEqual(schemaId);
    expect(fullSchema.$id).toEqual(residentCardSchema.$id);
    expect(externalSchema.properties).not.toBeDefined();
    // properties don't match exactly because some are generated while signing
    expect(fullSchema.properties.credentialSubject.properties).toMatchObject(
      expect.objectContaining(
        residentCardSchema.properties.credentialSubject.properties,
      ),
    );

    // Ensure extra properties from crypto-wasm-ts are assigned to schema object
    expect(credential.cryptoVersion).toEqual(CredentialBuilder.VERSION);
    expect(credential.credentialSchema.version).toEqual(CredentialSchema.VERSION);
    expect(credential.credentialSchema.id).toEqual(schemaId);
    const details = JSON.parse(credential.credentialSchema.details);
    expect(details.parsingOptions).toEqual({
      useDefaults: false,
      defaultMinimumInteger: -4294967295,
      defaultMinimumDate: -17592186044415,
      defaultDecimalPlaces: 0,
    });
    expect(details.fullJsonSchema).toBeDefined();

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(getProofMatcherDoc()),
    );
  }, 30000);

  test(`Can issue+verify a ${Name} credential with embedded schema`, async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: String(did1),
    };

    const credential = await issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType),
      ),
    );

    const fullSchema = getJsonSchemaFromCredential(credential, true);
    const externalSchema = getJsonSchemaFromCredential(credential, false);
    expect(externalSchema.$id).toEqual(residentCardSchema.$id);
    expect(fullSchema.$id).toEqual(residentCardSchema.$id);
    expect(externalSchema.properties).toBeDefined();
    // properties don't match exactly because some are generated while signing
    expect(fullSchema.properties.credentialSubject.properties).toMatchObject(
      expect.objectContaining(
        residentCardSchema.properties.credentialSubject.properties,
      ),
    );
    expect(externalSchema.properties.credentialSubject.properties).toMatchObject(
      expect.objectContaining(
        residentCardSchema.properties.credentialSubject.properties,
      ),
    );

    // Ensure extra properties from crypto-wasm-ts are assigned to schema object
    expect(credential.cryptoVersion).toEqual(CredentialBuilder.VERSION);
    expect(credential.credentialSchema.version).toEqual(CredentialSchema.VERSION);
    expect(credential.credentialSchema.id).toEqual(residentCardSchema.$id);
    const details = JSON.parse(credential.credentialSchema.details);
    expect(details.parsingOptions).toEqual({
      useDefaults: false,
      defaultMinimumInteger: -4294967295,
      defaultMinimumDate: -17592186044415,
      defaultDecimalPlaces: 0,
    });
    expect(details.fullJsonSchema).not.toBeDefined();

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(getProofMatcherDoc()),
    );
  }, 30000);

  test(`Can issue+verify a ${Name} credential with default schema`, async () => {
    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: String(did1),
    };
    delete unsignedCred.credentialSchema;

    const credential = await issueCredential(issuerKey, unsignedCred);
    expect(credential).toMatchObject(
      expect.objectContaining(
        getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType),
      ),
    );

    const fullSchema = getJsonSchemaFromCredential(credential, true);
    const externalSchema = getJsonSchemaFromCredential(credential, false);
    // These won't be defined as the whole schema was autogenerated
    expect(externalSchema.$id).not.toBeDefined();
    expect(fullSchema.$id).not.toBeDefined();
    expect(credential.credentialSchema.id).toEqual(EMPTY_SCHEMA_ID);

    for (const props of [fullSchema.properties.credentialSubject.properties, externalSchema.properties.credentialSubject.properties]) {
      // properties don't match exactly because some are generated while signing
      expect(residentCardSchema.properties.credentialSubject.properties.familyName).toMatchObject(
        expect.objectContaining(
          props.familyName,
        ),
      );
      expect(residentCardSchema.properties.credentialSubject.properties.givenName).toMatchObject(
        expect.objectContaining(
          props.givenName,
        ),
      );
    }

    // Ensure schema was now defined, added by crypto-wasm-ts
    expect(credential.cryptoVersion).toEqual(CredentialBuilder.VERSION);
    expect(credential.credentialSchema).toBeDefined();
    expect(credential.credentialSchema.version).toEqual(CredentialSchema.VERSION);
    const details = JSON.parse(credential.credentialSchema.details);
    expect(details.parsingOptions).toEqual({
      useDefaults: false,
      defaultMinimumInteger: -4294967295,
      defaultMinimumDate: -17592186044415,
      defaultDecimalPlaces: 0,
    });
    expect(details.fullJsonSchema).not.toBeDefined();

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(getProofMatcherDoc()),
    );
  }, 30000);

  test(`Can issue+verify a ${Name} credential with blank schema and custom parsingOptions`, async () => {
    const parsingOptions = {
      ...DefaultSchemaParsingOpts,
      defaultDecimalPlaces: 5,
      useDefaults: true,
    };

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const unsignedCred = {
      ...credentialJSON,
      issuer: String(did1),
    };

    unsignedCred.credentialSchema = {
      id: '',
      type: 'JsonSchemaValidator2018',
      details: stringify({
        parsingOptions,
      }),
    };

    const credential = await issueCredential(issuerKey, unsignedCred);

    // Ensure schema was now defined, added by crypto-wasm-ts
    const details = JSON.parse(credential.credentialSchema.details);
    expect(details.parsingOptions).toEqual(parsingOptions);
    expect(details.fullJsonSchema).not.toBeDefined();
    expect(credential.credentialSchema.id).toEqual(EMPTY_SCHEMA_ID);

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(getProofMatcherDoc()),
    );
  }, 30000);

  test(`Can issue+verify a ${Name} credential with embedded schema and custom parsingOptions`, async () => {
    const parsingOptions = {
      ...DefaultSchemaParsingOpts,
      defaultDecimalPlaces: 5,
      useDefaults: true,
    };

    const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
    const schemaWithGivenParsingOptions = DockCryptoSignature.withUpdatedParsingOptions(credentialJSON.credentialSchema, parsingOptions);
    const unsignedCred = {
      ...credentialJSON,
      credentialSchema: schemaWithGivenParsingOptions,
      issuer: String(did1),
    };

    expect(unsignedCred.credentialSchema.id).toBeDefined();
    expect(unsignedCred.credentialSchema.id).not.toEqual('');

    const credential = await issueCredential(issuerKey, unsignedCred);

    // Ensure schema was now defined, added by crypto-wasm-ts
    const details = JSON.parse(credential.credentialSchema.details);
    expect(details.parsingOptions).toEqual(parsingOptions);
    expect(details.fullJsonSchema).not.toBeDefined();
    expect(credential.credentialSchema.id).toEqual(residentCardSchema.$id);

    const result = await verifyCredential(credential, { resolver });
    expect(result).toMatchObject(
      expect.objectContaining(getProofMatcherDoc()),
    );
  }, 30000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
