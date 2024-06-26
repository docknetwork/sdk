import { randomAsHex } from "@polkadot/util-crypto";
import Schema from "../src/modules/schema";

import { DockAPI } from "../src/index";
import { DockDid, DidKeypair } from "../src/utils/did";
import VerifiableCredential from "../src/verifiable-credential";
import { Ed25519VerKeyName } from "../src/utils/vc/crypto/constants";
import { getKeyDoc } from "../src/utils/vc/helpers";

import {
  UniversalResolver,
  DockResolver,
  WildcardMultiResolver,
} from "../src/resolver";

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from "../tests/test-constants";
import { registerNewDIDUsingPair } from "../tests/integration/helpers";

import { DidKey, VerificationRelationship } from "../src/public-keys";

async function createAuthorDID(dock, pair) {
  // Generate a DID to be used as author
  const dockDID = DockDid.random();
  console.log("Creating new author DID", dockDID);

  // Create an author DID to write with
  const publicKey = pair.publicKey();
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  await dock.did.new(dockDID, [didKey], [], false);
  return dockDID;
}

async function main() {
  console.log("Connecting to the node...");
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });

  console.log("Setting sdk account...");
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);
  const keySeed = randomAsHex(32);
  const subjectKeySeed = randomAsHex(32);

  // Generate first key with this seed. The key type is Sr25519
  const pair = new DidKeypair(
    dock.keyring.addFromUri(keySeed, null, "ed25519"),
    1,
  );

  // Generate a DID to be used as author
  const dockDID = await createAuthorDID(dock, pair);

  // Properly format a keyDoc to use for signing
  const keyDoc = getKeyDoc(dockDID, pair, Ed25519VerKeyName);

  const subjectPair = new DidKeypair(
    dock.keyring.addFromUri(subjectKeySeed),
    1,
  );
  const subjectDID = DockDid.random();
  await registerNewDIDUsingPair(dock, subjectDID, subjectPair);

  console.log("Creating a new schema...");
  const schema = new Schema();
  await schema.setJSONSchema({
    $schema: "http://json-schema.org/draft-07/schema#",
    description: "Dock Schema Example",
    type: "object",
    properties: {
      id: {
        type: "string",
      },
      emailAddress: {
        type: "string",
        format: "email",
      },
      alumniOf: {
        type: "string",
      },
    },
    required: ["emailAddress", "alumniOf"],
    additionalProperties: false,
  });

  console.log("The schema is:", JSON.stringify(schema.toJSON(), null, 2));
  console.log("Writing schema to the chain with blob id of", schema.id, "...");

  await schema.writeToChain(dock, dockDID, pair, undefined, false);

  console.log(`Schema written, reading from chain (${schema.id})...`);

  const result = await Schema.get(schema.id, dock);
  console.log("Result from chain:", result);

  const universalResolverUrl = "https://uniresolver.io";
  const resolver = new WildcardMultiResolver([
    new DockResolver(dock),
    new UniversalResolver(universalResolverUrl),
  ]);

  console.log("Creating a verifiable credential and assigning its schema...");
  const vc = new VerifiableCredential("https://example.com/credentials/187");
  vc.setSchema(result.id, "JsonSchemaValidator2018");
  vc.addContext("https://www.w3.org/2018/credentials/examples/v1");
  vc.addContext({
    emailAddress: "https://schema.org/email",
    alumniOf: "https://schema.org/alumniOf",
  });
  vc.addType("AlumniCredential");
  vc.addSubject({
    id: String(subjectDID),
    alumniOf: "Example University",
    emailAddress: "abc@example.com",
  });
  await vc.sign(keyDoc);

  console.log("Verifying the credential:", vc);
  const { verified, error } = await vc.verify({
    resolver,
    compactProof: false,
  });
  if (!verified) {
    throw error || new Error("Verification failed");
  }

  console.log("Credential verified, mutating the subject and trying again...");
  vc.addSubject({
    id: "uuid:0x0",
    thisWillFail: true,
  });

  try {
    await vc.verify({
      resolver,
      compactProof: false,
    });
    throw new Error(
      "Verification succeeded, but it shouldn't have. This is a bug.",
    );
  } catch (e) {
    console.log("Verification failed as expected:", e);
  }

  console.log("All done, disconnecting...");
  await dock.disconnect();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error occurred somewhere, it was caught!", error);
    process.exit(1);
  });
