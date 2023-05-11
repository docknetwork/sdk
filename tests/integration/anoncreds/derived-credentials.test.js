import { randomAsHex } from "@polkadot/util-crypto";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { initializeWasm } from "@docknetwork/crypto-wasm-ts";
import { DockAPI } from "../../../src";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  Schemes,
} from "../../test-constants";
import { createNewDockDID } from "../../../src/utils/did";
import Bls12381G2KeyPairDock2022 from "../../../src/utils/vc/crypto/Bls12381G2KeyPairDock2022";
import { registerNewDIDUsingPair } from "../helpers";
import getKeyDoc from "../../../src/utils/vc/helpers";
import {
  issueCredential,
  signPresentation,
  verifyPresentation,
  verifyCredential,
} from "../../../src/utils/vc";
import { DockResolver } from "../../../src/resolver";
import { createPresentation } from "../../create-presentation";

// TODO: move to fixtures
const residentCardSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://ld.dock.io/examples/resident-card-schema.json",
  title: "Resident Card Example",
  type: "object",
  properties: {
    credentialSubject: {
      type: "object",
      properties: {
        givenName: {
          title: "Given Name",
          type: "string",
        },
        familyName: {
          title: "Family Name",
          type: "string",
        },
        lprNumber: {
          title: "LPR Number",
          type: "integer",
          minimum: 0,
        },
      },
      required: [],
    },
  },
};

const embeddedSchema = {
  id: `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(residentCardSchema)
  )}`,
  type: "JsonSchemaValidator2018",
};

const holder3DID = createNewDockDID();
// seed used for 3rd holder keys
const holder3KeySeed = randomAsHex(32);

for (const {
  Name,
  Module,
  Presentation,
  convertToPresentation,
  VerKey,
  getModule,
  Context,
} of Schemes) {
  // TODO: move to fixtures
  const credentialJSON = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/citizenship/v1",
      Context,
    ],
    id: "https://issuer.oidp.uscis.gov/credentials/83627465",
    type: ["VerifiableCredential", "PermanentResidentCard"],
    credentialSchema: embeddedSchema,
    identifier: "83627465",
    name: "Permanent Resident Card",
    description: "Government of Example Permanent Resident Card.",
    issuanceDate: "2019-12-03T12:19:52Z",
    expirationDate: "2029-12-03T12:19:52Z",
    credentialSubject: {
      id: "did:example:b34ca6cd37bbf23",
      type: ["PermanentResident", "Person"],
      givenName: "JOHN",
      familyName: "SMITH",
      lprNumber: 1234,
    },
  };

  describe(`${Name} Derived Credentials`, () => {
    const dock = new DockAPI();
    const resolver = new DockResolver(dock);
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
      chainModule = getModule(dock);
      account = dock.keyring.addFromUri(TestAccountURI);

      dock.setAccount(account);
      pair1 = dock.keyring.addFromUri(randomAsHex(32));
      did1 = createNewDockDID();
      await registerNewDIDUsingPair(dock, did1, pair1);

      keypair = Bls12381G2KeyPairDock2022.generate({
        controller: did1,
      });

      const pk1 = Module.prepareAddPublicKey(u8aToHex(keypair.publicKeyBuffer));
      await chainModule.addPublicKey(
        pk1,
        did1,
        did1,
        pair1,
        1,
        { didModule: dock.did },
        false
      );

      didDocument = await dock.did.getDocument(did1);
      const { publicKey } = didDocument;
      expect(publicKey.length).toEqual(2);
      expect(publicKey[1].type).toEqual(VerKey);
      keypair.id = publicKey[1].id;

      // Register holder DID with sr25519 key
      await registerNewDIDUsingPair(
        dock,
        holder3DID,
        dock.keyring.addFromUri(holder3KeySeed, null, "sr25519")
      );
    }, 30000);

    async function createAndVerifyPresentation(credentials) {
      const holderKey = getKeyDoc(
        holder3DID,
        dock.keyring.addFromUri(holder3KeySeed, null, "sr25519"),
        "Sr25519VerificationKey2020"
      );

      const presId = randomAsHex(32);
      const chal = randomAsHex(32);
      const domain = "test domain";
      const presentation = createPresentation(credentials, presId);

      expect(presentation).toMatchObject(
        expect.objectContaining({
          type: ["VerifiablePresentation"],
          verifiableCredential: credentials,
          id: presId,
        })
      );

      const signedPres = await signPresentation(
        presentation,
        holderKey,
        chal,
        domain,
        resolver
      );

      expect(signedPres).toMatchObject(
        expect.objectContaining({
          type: ["VerifiablePresentation"],
          verifiableCredential: credentials,
          id: presId,
          proof: expect.objectContaining({
            type: "Sr25519Signature2020",
            challenge: chal,
            domain,
            proofPurpose: "authentication",
          }),
        })
      );

      const result = await verifyPresentation(signedPres, {
        challenge: chal,
        domain,
        resolver,
      });

      expect(result.verified).toBe(true);
      expect(result.presentationResult.verified).toBe(true);
      expect(result.credentialResults.length).toBe(1);
      expect(result.credentialResults[0].verified).toBe(true);
    }

    test("Holder creates a derived verifiable credential from a credential with selective disclosure", async () => {
      const issuerKey = getKeyDoc(did1, keypair, keypair.type, keypair.id);
      const unsignedCred = {
        ...credentialJSON,
        issuer: did1,
      };

      const presentationOptions = {
        nonce: stringToU8a("noncetest"),
        context: "my context",
      };

      // Create W3C credential
      const credential = await issueCredential(issuerKey, unsignedCred);

      // Begin to derive a credential from the above issued one
      const presentationInstance = new Presentation();
      const idx = await presentationInstance.addCredentialToPresent(
        credential,
        { resolver }
      );

      // Reveal subject attributes
      await presentationInstance.addAttributeToReveal(idx, [
        "credentialSubject.lprNumber",
      ]);

      // NOTE: revealing subject type because of JSON-LD processing for this certain credential
      // you may not always need to do this depending on your JSON-LD contexts
      await presentationInstance.addAttributeToReveal(idx, [
        "credentialSubject.type.0",
      ]);
      await presentationInstance.addAttributeToReveal(idx, [
        "credentialSubject.type.1",
      ]);

      // Derive a W3C Verifiable Credential JSON from the above presentation
      const credentials = await presentationInstance.deriveCredentials(
        presentationOptions
      );
      expect(credentials.length).toEqual(1);
      expect(credentials[0].proof).toBeDefined();
      expect(credentials[0]).toHaveProperty("credentialSubject");
      expect(credentials[0].credentialSubject).toMatchObject(
        expect.objectContaining({
          type: unsignedCred.credentialSubject.type,
          lprNumber: 1234,
        })
      );

      // Ensure reconstructing presentation from credential matches
      // NOTE: ignoring proof here as itll differ when signed twice as above
      const presentation = await presentationInstance.createPresentation(
        presentationOptions
      );
      const reconstructedPres = convertToPresentation(credentials[0]);
      expect(reconstructedPres.proof).toBeDefined();
      expect({
        ...reconstructedPres,
        proof: "",
      }).toMatchObject({ ...presentation, proof: "" });

      // Try to verify the derived credential alone
      const credentialResult = await verifyCredential(credentials[0], {
        resolver,
      });
      expect(credentialResult.verified).toEqual(true);

      // Create a VP and verify it from this credential
      await createAndVerifyPresentation(credentials);
    }, 30000);

    afterAll(async () => {
      await dock.disconnect();
    }, 10000);
  });
}
