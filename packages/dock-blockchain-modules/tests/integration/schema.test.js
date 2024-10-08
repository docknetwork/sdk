import { stringToHex, randomAsHex } from "@docknetwork/credential-sdk/utils";

import { DockAPI } from "@docknetwork/dock-blockchain-api";

import { DockDid, DockBlobId } from "@docknetwork/credential-sdk/types";
import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../test-constants";
import {
  verifyCredential,
  verifyPresentation,
} from "@docknetwork/credential-sdk/vc";
import { Schema } from "@docknetwork/credential-sdk/modules";
import VerifiableCredential from "@docknetwork/credential-sdk/vc/verifiable-credential";
import exampleSchema from "../example-schema";
import VerifiablePresentation from "@docknetwork/credential-sdk/vc/verifiable-presentation";
import { getKeyDoc } from "@docknetwork/credential-sdk/vc/helpers";
import { DockResolver } from "@docknetwork/credential-sdk/resolver";
import { DockCoreModules } from "../../src";
import { registerNewDIDUsingPair } from "./helpers";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";

let account;
let pair;
let dockDID;
let blobId;
let keyDoc;
let validCredential;
let invalidCredential;
let invalidFormatBlobId;
let dockResolver;

const ctx1 = {
  "@context": {
    emailAddress: "https://schema.org/email",
    alumniOf: "https://schema.org/alumniOf",
  },
};

const ctx2 = {
  "@context": {
    emailAddress: "https://schema.org/email",
    notAlumniOf: "https://schema.org/alumniOf",
  },
};

describe("Schema Blob Module Integration", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    dockDID = DockDid.random();
    pair = new DidKeypair([dockDID, 1], Ed25519Keypair.random());
    await registerNewDIDUsingPair(dock, dockDID, pair);
    blobId = DockBlobId.random();

    // Write a blob with invalid JSON-schema format
    invalidFormatBlobId = DockBlobId.random();
    let blob = {
      id: invalidFormatBlobId,
      blob: stringToHex("hello world"),
    };
    await modules.blob.new(blob, dockDID, pair);

    // Write schema blob
    const blobStr = JSON.stringify(exampleSchema);
    blob = {
      id: blobId,
      blob: stringToHex(blobStr),
    };
    await modules.blob.new(blob, dockDID, pair);

    // Properly format a keyDoc to use for signing
    keyDoc = getKeyDoc(dockDID, new Ed25519Keypair(firstKeySeed));

    // Create a resolver for dock DIDs
    dockResolver = new DockResolver(modules);

    // Create a valid credential with a schema
    validCredential = new VerifiableCredential(
      "https://example.com/credentials/123",
    );
    validCredential.addContext(
      "https://www.w3.org/2018/credentials/examples/v1",
    );
    validCredential.addContext(ctx1);
    validCredential.addType("AlumniCredential");
    validCredential.addSubject({
      id: String(dockDID),
      alumniOf: "Example University",
      emailAddress: "john@gmail.com",
    });
    validCredential.setSchema(
      String(new DockBlobId(blobId)),
      "JsonSchemaValidator2018",
    );
    await validCredential.sign(keyDoc);

    // Create a valid credential that doesn't follow the schema
    invalidCredential = new VerifiableCredential(
      "https://example.com/credentials/1234",
    );
    invalidCredential.addContext(
      "https://www.w3.org/2018/credentials/examples/v1",
    );
    invalidCredential.addContext(ctx2);
    invalidCredential.addType("AlumniCredential");
    invalidCredential.addSubject({
      id: String(dockDID),
      notAlumniOf: "Example University",
      emailAddress: "john@gmail.com",
    });
    invalidCredential.setSchema(
      String(new DockBlobId(blobId)),
      "JsonSchemaValidator2018",
    );
    await invalidCredential.sign(keyDoc);
  }, 90000);

  afterAll(async () => {
    await dock.disconnect();
  }, 30000);

  test("Set and get schema", async () => {
    const schema = new Schema();
    await schema.setJSONSchema(exampleSchema);
    await modules.blob.new(schema.toBlob(), dockDID, pair);
    const schemaObj = await Schema.get(blobId, modules.blob);
    expect(schemaObj).toMatchObject({
      ...exampleSchema,
      id: String(blobId),
      author: dockDID.toString(),
    });
  }, 20000);

  test("Schema.get throws error when schema not in correct format.", async () => {
    await expect(Schema.get(invalidFormatBlobId, modules.blob)).rejects.toThrow(
      /Underlying value is not a valid JSON/,
    );
  }, 30000);

  test("Schema.get throws error when no blob exists at the given id.", async () => {
    await expect(Schema.get(DockBlobId.random(), modules.blob)).rejects.toThrow(
      /does not exist/,
    );
  }, 30000);

  test("Utility method verifyCredential should pass if the subject is compatible with the schema in credentialSchema.", async () => {
    await expect(
      verifyCredential(validCredential.toJSON(), {
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 30000);

  test("The verify method should pass if the subject is compatible with the schema in credentialSchema.", async () => {
    await expect(
      validCredential.verify({
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 30000);

  test("Utility method verifyCredential should check if schema is incompatible with the credentialSubject.", async () => {
    await expect(
      verifyCredential(invalidCredential.toJSON(), {
        resolver: null,
        compactProof: true,
      }),
    ).rejects.toThrow(/Unsupported protocol blob:/);

    await expect(
      verifyCredential(invalidCredential.toJSON(), {
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);

  test("The verify method should detect a subject with incompatible schema in credentialSchema.", async () => {
    await expect(
      invalidCredential.verify({
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 30000);

  test("Utility method verifyPresentation should check if schema is incompatible with the credentialSubject.", async () => {
    let vpInvalid = new VerifiablePresentation(
      "https://example.com/credentials/12345",
    );
    vpInvalid.addCredential(invalidCredential);
    vpInvalid.addContext(ctx2);
    vpInvalid = await vpInvalid.sign(keyDoc, "some_challenge", "some_domain");

    await expect(
      verifyPresentation(vpInvalid.toJSON(), {
        challenge: "some_challenge",
        domain: "some_domain",
        resolver: null,
        compactProof: true,
      }),
    ).rejects.toThrow(/Unsupported protocol blob:/);

    await expect(
      verifyPresentation(vpInvalid.toJSON(), {
        challenge: "some_challenge",
        domain: "some_domain",
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 90000);

  test("Utility method verifyPresentation should check if schema is compatible with the credentialSubject.", async () => {
    let vpValid = new VerifiablePresentation(
      "https://example.com/credentials/12345",
    );
    vpValid.addCredential(validCredential);
    vpValid.addContext(ctx1);
    vpValid = await vpValid.sign(keyDoc, "some_challenge", "some_domain");

    await expect(
      verifyPresentation(vpValid.toJSON(), {
        challenge: "some_challenge",
        domain: "some_domain",
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 90000);

  test("VerifiablePresentation's verify should check if the schema is incompatible with the credentialSubject.", async () => {
    let vpInvalid = new VerifiablePresentation(
      "https://example.com/credentials/12345",
    );
    vpInvalid.addCredential(invalidCredential);
    vpInvalid.addContext(ctx2);
    vpInvalid = await vpInvalid.sign(keyDoc, "some_challenge", "some_domain");

    await expect(
      vpInvalid.verify({
        challenge: "some_challenge",
        domain: "some_domain",
        resolver: null,
        compactProof: true,
      }),
    ).rejects.toThrow(/Unsupported protocol blob:/);

    await expect(
      vpInvalid.verify({
        challenge: "some_challenge",
        domain: "some_domain",
        resolver: dockResolver,
        compactProof: true,
      }),
    ).rejects.toThrow(/Schema validation failed/);
  }, 90000);

  test("VerifiablePresentation's verify should check if the schema is compatible with the credentialSubject.", async () => {
    let vpValid = new VerifiablePresentation(
      "https://example.com/credentials/12345",
    );
    vpValid.addCredential(validCredential);
    vpValid.addContext(ctx1);
    vpValid = await vpValid.sign(keyDoc, "some_challenge", "some_domain");

    await expect(
      vpValid.verify({
        challenge: "some_challenge",
        domain: "some_domain",
        resolver: dockResolver,
        compactProof: true,
      }),
    ).resolves.toBeDefined();
  }, 90000);
});
