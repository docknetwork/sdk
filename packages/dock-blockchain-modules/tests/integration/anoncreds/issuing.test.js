import { u8aToHex } from "@docknetwork/credential-sdk/utils";
import {
  DefaultSchemaParsingOpts,
  CredentialBuilder,
  CredentialSchema,
  initializeWasm,
  EMPTY_SCHEMA_ID,
} from "@docknetwork/credential-sdk/crypto";
import stringify from "json-stringify-deterministic";
import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { CoreResolver } from "@docknetwork/credential-sdk/resolver";
import {
  registerNewDIDUsingPair,
  getCredMatcherDoc,
  getProofMatcherDoc,
} from "../helpers";
import {
  issueCredential,
  verifyCredential,
} from "@docknetwork/credential-sdk/vc";
import { getKeyDoc } from "@docknetwork/credential-sdk/vc/helpers";
import { getJsonSchemaFromCredential } from "@docknetwork/credential-sdk/vc/credentials";
import {
  getResidentCardCredentialAndSchema,
  setupExternalSchema,
} from "./utils";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from "../../test-constants";
import defaultDocumentLoader from "@docknetwork/credential-sdk/vc/document-loader";
import DockCryptoSignature from "@docknetwork/credential-sdk/vc/crypto/common/DockCryptoSignature";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { DockCoreModules } from "../../../src";

describe.each(Schemes)(
  "Issuance",
  ({ Name, Module, Context, CryptoKeyPair, getModule, VerKey, SigType }) => {
    const dock = new DockAPI();
    const modules = new MultiApiCoreModules([new DockCoreModules(dock)]);
    const resolver = new CoreResolver(modules);

    const did1 = DockDid.random();
    const pair1 = new DidKeypair([did1, 1], Ed25519Keypair.random());

    let account;
    let chainModule;
    let keypair;

    const [credentialJSON, residentCardSchema] =
      getResidentCardCredentialAndSchema(Context);

    beforeAll(async () => {
      await initializeWasm();
      await dock.init({
        keyring: TestKeyringOpts,
        address: FullNodeEndpoint,
      });
      chainModule = getModule(dock);
      account = dock.keyring.addFromUri(TestAccountURI);
      dock.setAccount(account);

      await registerNewDIDUsingPair(dock, did1, pair1);

      keypair = CryptoKeyPair.generate({
        controller: did1,
        msgCount: 100,
      });

      if (Name !== "BBDT16") {
        // Setup public key on blockchain
        const pk1 = new Module.DockOnly.PublicKey(
          new Module.DockOnly.PublicKey.Class(u8aToHex(keypair.publicKeyBuffer))
        );
        await chainModule.dockOnly.send.addPublicKey(pk1, did1, pair1);

        const didDocument = (await modules.did.getDocument(did1)).toJSON();
        const { verificationMethod } = didDocument;

        expect(verificationMethod.length).toEqual(2);
        expect(verificationMethod[1].type).toEqual(VerKey);

        keypair.id = verificationMethod[1].id;
      } else {
        // For KVAC, the public doesn't need to published as its not used in credential or presentation verification (except issuers).
        // But the signer still adds a key identifier in the credential to determine which key will be used for verification
        keypair.id = "my-key-id";
      }
    }, 20000);

    test(`Can issue+verify a ${Name} credential with external schema reference`, async () => {
      const [externalSchemaEncoded, schemaId] = await setupExternalSchema(
        residentCardSchema,
        "Resident Card Example",
        did1,
        pair1,
        modules.blob
      );

      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: String(did1),
      };
      unsignedCred.credentialSchema = externalSchemaEncoded;

      // The schema will be fetched from the blockchain before issuing
      const credential = await issueCredential(
        issuerKey,
        unsignedCred,
        true,
        defaultDocumentLoader(resolver)
      );
      expect(credential).toMatchObject(
        expect.objectContaining(
          getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType)
        )
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
          residentCardSchema.properties.credentialSubject.properties
        )
      );

      // Ensure extra properties from crypto-wasm-ts are assigned to schema object
      expect(credential.cryptoVersion).toEqual(CredentialBuilder.VERSION);
      expect(credential.credentialSchema.version).toEqual(
        CredentialSchema.VERSION
      );
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
        expect.objectContaining(getProofMatcherDoc())
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
          getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType)
        )
      );

      const fullSchema = getJsonSchemaFromCredential(credential, true);
      const externalSchema = getJsonSchemaFromCredential(credential, false);
      expect(externalSchema.$id).toEqual(residentCardSchema.$id);
      expect(fullSchema.$id).toEqual(residentCardSchema.$id);
      expect(externalSchema.properties).toBeDefined();
      // properties don't match exactly because some are generated while signing
      expect(fullSchema.properties.credentialSubject.properties).toMatchObject(
        expect.objectContaining(
          residentCardSchema.properties.credentialSubject.properties
        )
      );
      expect(
        externalSchema.properties.credentialSubject.properties
      ).toMatchObject(
        expect.objectContaining(
          residentCardSchema.properties.credentialSubject.properties
        )
      );

      // Ensure extra properties from crypto-wasm-ts are assigned to schema object
      expect(credential.cryptoVersion).toEqual(CredentialBuilder.VERSION);
      expect(credential.credentialSchema.version).toEqual(
        CredentialSchema.VERSION
      );
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
        expect.objectContaining(getProofMatcherDoc())
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
          getCredMatcherDoc(unsignedCred, did1, issuerKey.id, SigType)
        )
      );

      const fullSchema = getJsonSchemaFromCredential(credential, true);
      const externalSchema = getJsonSchemaFromCredential(credential, false);
      // These won't be defined as the whole schema was autogenerated
      expect(externalSchema.$id).not.toBeDefined();
      expect(fullSchema.$id).not.toBeDefined();
      expect(credential.credentialSchema.id).toEqual(EMPTY_SCHEMA_ID);

      for (const props of [
        fullSchema.properties.credentialSubject.properties,
        externalSchema.properties.credentialSubject.properties,
      ]) {
        // properties don't match exactly because some are generated while signing
        expect(
          residentCardSchema.properties.credentialSubject.properties.familyName
        ).toMatchObject(expect.objectContaining(props.familyName));
        expect(
          residentCardSchema.properties.credentialSubject.properties.givenName
        ).toMatchObject(expect.objectContaining(props.givenName));
      }

      // Ensure schema was now defined, added by crypto-wasm-ts
      expect(credential.cryptoVersion).toEqual(CredentialBuilder.VERSION);
      expect(credential.credentialSchema).toBeDefined();
      expect(credential.credentialSchema.version).toEqual(
        CredentialSchema.VERSION
      );
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
        expect.objectContaining(getProofMatcherDoc())
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
        id: "",
        type: "JsonSchemaValidator2018",
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
        expect.objectContaining(getProofMatcherDoc())
      );
    }, 30000);

    test(`Can issue+verify a ${Name} credential with embedded schema and custom parsingOptions`, async () => {
      const parsingOptions = {
        ...DefaultSchemaParsingOpts,
        defaultDecimalPlaces: 5,
        useDefaults: true,
      };

      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const schemaWithGivenParsingOptions =
        DockCryptoSignature.withUpdatedParsingOptions(
          credentialJSON.credentialSchema,
          parsingOptions
        );
      const unsignedCred = {
        ...credentialJSON,
        credentialSchema: schemaWithGivenParsingOptions,
        issuer: String(did1),
      };

      expect(unsignedCred.credentialSchema.id).toBeDefined();
      expect(unsignedCred.credentialSchema.id).not.toEqual("");

      const credential = await issueCredential(issuerKey, unsignedCred);

      // Ensure schema was now defined, added by crypto-wasm-ts
      const details = JSON.parse(credential.credentialSchema.details);
      expect(details.parsingOptions).toEqual(parsingOptions);
      expect(details.fullJsonSchema).not.toBeDefined();
      expect(credential.credentialSchema.id).toEqual(residentCardSchema.$id);

      const result = await verifyCredential(credential, { resolver });
      expect(result).toMatchObject(
        expect.objectContaining(getProofMatcherDoc())
      );
    }, 30000);

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  }
);
