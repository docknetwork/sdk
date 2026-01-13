import bs58 from "bs58";
import { v4 as uuidv4 } from "uuid";
import {
  initializeWasm,
  Accumulator,
  PositiveAccumulator,
  BoundCheckSnarkSetup,
} from "@docknetwork/crypto-wasm-ts";
import { InMemoryState } from "@docknetwork/crypto-wasm-ts/lib/accumulator/in-memory-persistence";
import { stringToU8a, u8aToHex } from "../src/utils";
import {
  Bls12381G2KeyPairDock2022,
  Bls12381BBSKeyPairDock2023,
  Bls12381BBDT16KeyPairDock2024,
  Bls12381BBSSignatureProofDock2022,
  Bls12381BBSSignatureProofDock2023,
  Bls12381BBDT16MACProofDock2024,
} from "../src/vc/crypto";
import defaultDocumentLoader from "../src/vc/document-loader";
import { getKeyDoc } from "../src/vc/helpers";
import { Ed25519Keypair } from "../src/keypairs";
import { issueCredential, verifyCredential, verifyPresentation } from "../src/vc";
import mockFetch from "./mocks/fetch";
import {
  filterCredentialsByPexRequest,
  generatePresentationFromPexRequest,
  GeneratePresentationStatus,
  evaluatePresentationAgainstDefinition,
} from "../src/utils/pex-utils";
import * as pexBounds from "../src/utils/pex-bounds";

mockFetch();

const ISSUER_DID = "did:example:issuer";
const HOLDER_DID = "did:example:holder";

const samplePresentationDefinition = {
  id: "alumni-definition",
  format: {
    ldp_vc: {
      proof_type: [
        "JsonWebSignature2020",
        "EcdsaSecp256k1Signature2019",
        "Ed25519Signature2018",
        "Bls12381BBS+SignatureDock2022",
      ],
    },
  },
  input_descriptors: [
    {
      id: "alumni_credential",
      constraints: {
        fields: [
          {
            path: ["$.credentialSubject.alumniOf"],
            filter: {
              type: "string",
              const: "Example University",
            },
          },
        ],
      },
    },
  ],
};

const selectiveDisclosureDefinition = {
  id: "selective-definition",
  input_descriptors: [
    {
      id: "basic_name",
      constraints: {
        limit_disclosure: "required",
        fields: [
          {
            path: ["$.credentialSubject.name"],
            purpose: "Reveal a name claim",
          },
        ],
      },
    },
  ],
};

const selectiveDisclosureDefinitionWithDegree = {
  id: "selective-definition-degree",
  input_descriptors: [
    {
      id: "basic_name_and_degree",
      constraints: {
        limit_disclosure: "required",
        fields: [
          {
            path: ["$.credentialSubject.name"],
            purpose: "Reveal a name claim",
          },
          {
            path: ["$.credentialSubject.degree.name"],
            purpose: "Reveal degree name",
          },
        ],
      },
    },
  ],
};

const rangeProofPresentationDefinition = {
  id: "range-proof-definition",
  input_descriptors: [
    {
      id: "age_bounds",
      constraints: {
        fields: [
          {
            path: ["$.credentialSubject.age"],
            predicate: "required",
            filter: {
              type: "integer",
              minimum: 18,
              maximum: 65,
            },
          },
        ],
      },
    },
  ],
};

const ANONCREDS_ALGORITHM_CONFIGS = {
  dockbbs: {
    proofType: "Bls12381BBSSignatureDock2023",
    context: "https://ld.truvera.io/security/bbs23/v1",
    keyPairClass: Bls12381BBSKeyPairDock2023,
    suiteFactory: () => new Bls12381BBSSignatureProofDock2023(),
    issuerKeyFragment: "dockbbs-key",
  },
  "dockbbs+": {
    proofType: "Bls12381BBS+SignatureDock2022",
    context: "https://ld.dock.io/security/bbs/v1",
    keyPairClass: Bls12381G2KeyPairDock2022,
    suiteFactory: () => new Bls12381BBSSignatureProofDock2022(),
    issuerKeyFragment: "bbs-key",
  },
  bbdt16: {
    proofType: "Bls12381BBDT16MACDock2024",
    context: "https://ld.truvera.io/security/bbdt16/v1",
    keyPairClass: Bls12381BBDT16KeyPairDock2024,
    suiteFactory: () => new Bls12381BBDT16MACProofDock2024(),
    issuerKeyFragment: "bbdt16-key",
  },
};

const SELECTIVE_DISCLOSURE_ALGORITHMS = [
  "dockbbs",
  "dockbbs+",
  "bbdt16",
];

function buildSelectiveProofTypeDefinition(proofType) {
  return {
    id: `selective-${proofType}`,
    format: {
      ldp_vc: {
        proof_type: [proofType],
      },
    },
    input_descriptors: [
      {
        id: `descriptor-${proofType}`,
        constraints: {
          limit_disclosure: "required",
          fields: [
            {
              path: ["$.credentialSubject.name"],
              purpose: "Reveal a name claim",
            },
          ],
        },
      },
    ],
  };
}

function addContextIfMissing(contexts, context) {
  if (!context || !Array.isArray(contexts)) {
    return;
  }
  if (contexts.some((entry) => entry === context)) {
    return;
  }
  const lastEntry = contexts[contexts.length - 1];
  if (lastEntry && typeof lastEntry === "object" && !Array.isArray(lastEntry)) {
    contexts.splice(contexts.length - 1, 0, context);
  } else {
    contexts.push(context);
  }
}

function toBase58(u8a) {
  return bs58.encode(Buffer.from(u8a));
}

function getPublicKeyBase58FromKeyDoc(keyDoc) {
  if (keyDoc.publicKeyBase58) {
    return keyDoc.publicKeyBase58;
  }
  const { keypair } = keyDoc;
  if (keypair?.publicKeyBuffer) {
    return toBase58(keypair.publicKeyBuffer);
  }
  if (typeof keypair?.publicKey === "function") {
    const pk = keypair.publicKey();
    if (pk?.value) {
      return toBase58(pk.value);
    }
  }
  throw new Error("Unable to derive public key bytes from key document");
}

function buildVerificationMethod(keyDoc) {
  const publicKeyBase58 = getPublicKeyBase58FromKeyDoc(keyDoc);
  return {
    id: keyDoc.id,
    type: keyDoc.type,
    controller: keyDoc.controller,
    publicKeyBase58,
  };
}

function buildDidDocument(keyDoc) {
  const verificationMethod = buildVerificationMethod(keyDoc);
  return {
    "@context": "https://w3id.org/security/v2",
    id: keyDoc.controller,
    verificationMethod: [verificationMethod],
    assertionMethod: [verificationMethod.id],
    authentication: [verificationMethod.id],
  };
}

function createDocumentLoaderForMap(map) {
  const fallbackLoader = defaultDocumentLoader(null);
  return async function load(uri) {
    if (map[uri]) {
      return {
        contextUrl: null,
        documentUrl: uri,
        document: map[uri],
      };
    }
    return fallbackLoader(uri);
  };
}

function createResolverForMap(map) {
  return {
    supports: (uri) => !!map[uri],
    resolve: async (uri) => {
      if (!map[uri]) {
        throw new Error(`Resolver cannot resolve ${uri}`);
      }
      return map[uri];
    },
  };
}

function buildCredentialTemplate(overrides = {}) {
  const contextExtensions = {
    dk: "https://ld.dock.io/credentials#",
    name: "dk:name",
    degree: "dk:degree",
    revocationCheck: "dk:revocationCheck",
    age: "dk:age",
  };

  const credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
      "https://ld.dock.io/security/bbs/v1",
      contextExtensions,
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: ["VerifiableCredential", "ExampleCredential"],
    issuer: { id: ISSUER_DID },
    issuanceDate: "2024-01-01T00:00:00Z",
    credentialSubject: {
      id: HOLDER_DID,
      name: "Alice",
      alumniOf: "Example University",
      degree: {
        type: "BachelorDegree",
        name: "BSc",
      },
      age: 30,
      ...overrides.credentialSubject,
    },
    ...overrides,
  };

  if (!credential.credentialSchema) {
    credential.credentialSchema = {
      id: "https://example.com/schemas/pex-utils",
      type: "JsonSchemaValidator2018",
      details: JSON.stringify({
        jsonSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            credentialSubject: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                alumniOf: { type: "string" },
                degree: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    name: { type: "string" },
                  },
                },
                revocationCheck: { type: "string" },
                age: { type: "integer", minimum: 0, maximum: 150 },
              },
            },
          },
          required: ["credentialSubject"],
        },
      }),
    };
  }

  if (credential.credentialSchema?.details) {
    const schemaDetails = JSON.parse(credential.credentialSchema.details);
    const schemaProps = schemaDetails.jsonSchema.properties || {};
    schemaDetails.jsonSchema.properties = schemaProps;
    if (credential.credentialStatus) {
      schemaProps.credentialStatus = {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          revocationCheck: { type: "string" },
          revocationId: { type: "string" },
        },
      required: ["id", "type", "revocationCheck", "revocationId"],
      };
    }
    credential.credentialSchema.details = JSON.stringify(schemaDetails);
  }

  return credential;
}

async function issueAnoncredsCredential({ algorithm = "dockbbs+", overrides = {} } = {}) {
  const config = ANONCREDS_ALGORITHM_CONFIGS[algorithm];
  if (!config) {
    throw new Error(`Unsupported anoncreds algorithm: ${algorithm}`);
  }

  const issuerKeypair = config.keyPairClass.generate({
    controller: ISSUER_DID,
    id: `${ISSUER_DID}#${config.issuerKeyFragment}`,
  });
  const holderKeypair = Ed25519Keypair.random();
  const issuerKeyDoc = getKeyDoc(
    ISSUER_DID,
    issuerKeypair,
    issuerKeypair.type,
    `${ISSUER_DID}#${config.issuerKeyFragment}`,
  );
  const holderKeyDoc = getKeyDoc(
    HOLDER_DID,
    holderKeypair,
    holderKeypair.constructor.VerKeyType,
    `${HOLDER_DID}#holder-key`,
  );

  const issuerDidDocument = buildDidDocument(issuerKeyDoc);
  const holderDidDocument = buildDidDocument(holderKeyDoc);

  const didDocuments = {
    [ISSUER_DID]: issuerDidDocument,
    [issuerKeyDoc.id]: issuerDidDocument.verificationMethod[0],
    [HOLDER_DID]: holderDidDocument,
    [holderKeyDoc.id]: holderDidDocument.verificationMethod[0],
  };

  const documentLoader = createDocumentLoaderForMap(didDocuments);
  const resolver = createResolverForMap(didDocuments);

  const credentialTemplate = buildCredentialTemplate(overrides);
  addContextIfMissing(credentialTemplate["@context"], config.context);
  credentialTemplate.credentialSubject = {
    ...credentialTemplate.credentialSubject,
    revocationCheck:
      credentialTemplate.credentialSubject.revocationCheck || "membership",
  };
  const credential = await issueCredential(
    issuerKeyDoc,
    credentialTemplate,
    true,
    documentLoader,
  );

  return {
    credential,
    holderKeyDoc,
    documentLoader,
    resolver,
  };
}

async function issueBbsCredential(overrides = {}) {
  return issueAnoncredsCredential({ algorithm: "dockbbs+", overrides });
}

async function createAccumulatorFixture() {
  const label = stringToU8a("accumulator-label");
  const params = Accumulator.generateParams(label);
  const keypair = Accumulator.generateKeypair(params);
  const accumulator = PositiveAccumulator.initialize(params, keypair.secretKey);
  const state = new InMemoryState();
  const member = Accumulator.encodePositiveNumberAsAccumulatorMember(1);
  await accumulator.add(member, keypair.secretKey, state);
  const witness = await accumulator.membershipWitness(member, keypair.secretKey, state);
  const revocationId = u8aToHex(member);

  return {
    credentialStatus: {
      id: "dock:accumulator:example",
      type: "DockVBAccumulator2022",
      revocationCheck: "membership",
      revocationId,
    },
    witnessData: {
      membershipWitness: witness,
      accumulated: accumulator.accumulated,
      pk: keypair.publicKey,
      params: params,
    },
  };
}

describe("PEX utilities", () => {
  beforeAll(async () => {
    await initializeWasm();
  });

  test("filters credentials that satisfy the presentation definition", async () => {
    const { credential } = await issueBbsCredential();

    const result = filterCredentialsByPexRequest({
      credentials: [credential],
      pexRequest: samplePresentationDefinition,
      holderDid: HOLDER_DID,
    });

    expect(result.verifiableCredential).toHaveLength(1);
    expect(result.vcIndexes).toEqual([0]);
    expect(result.matches ?? []).toHaveLength(1);
    expect(result.areRequiredCredentialsPresent).toBeDefined();
    expect(result.verifiableCredential[0].credentialSubject.alumniOf).toBe(
      "Example University",
    );
  });

  test("generates a verifiable presentation when requirements are met", async () => {
    const { credential, holderKeyDoc, documentLoader, resolver } =
      await issueBbsCredential();

    const result = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: samplePresentationDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "test-challenge",
      domain: "example.com",
      resolver,
    });

    expect(result.status).toBe(GeneratePresentationStatus.SUCCESS);
    expect(result.presentation.verifiableCredential).toHaveLength(1);
    expect(result.presentationSubmission).toBeDefined();
    const expectedProofType = holderKeyDoc.type?.includes("VerificationKey")
      ? holderKeyDoc.type.replace("VerificationKey", "Signature")
      : holderKeyDoc.type;
    expect(result.presentation.proof).toMatchObject({
      type: expectedProofType,
      challenge: "test-challenge",
      domain: "example.com",
    });

    const presentationVerification = await verifyPresentation(result.presentation, {
      challenge: "test-challenge",
      domain: "example.com",
      documentLoader,
    });
    expect(presentationVerification.verified).toBe(true);

    const credentialVerification = await verifyCredential(
      result.presentation.verifiableCredential[0],
      { documentLoader, skipRevocationCheck: true },
    );
    expect(credentialVerification.verified).toBe(true);

    expect(result.presentationSubmission.descriptor_map[0].id).toBe(
      "alumni_credential",
    );

    const evaluation = evaluatePresentationAgainstDefinition({
      presentation: result.presentation,
      pexRequest: samplePresentationDefinition,
      presentationSubmission: result.presentationSubmission,
    });
    expect(evaluation.errors ?? []).toHaveLength(0);
    expect(evaluation.value.definition_id).toBe(
      samplePresentationDefinition.id,
    );
  });

  test("returns requirements error when credentials do not satisfy PEX definition", async () => {
    const { holderKeyDoc } = await issueBbsCredential();

    const result = await generatePresentationFromPexRequest({
      credentials: [],
      pexRequest: samplePresentationDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "test-challenge",
    });

    expect(result.status).toBe(GeneratePresentationStatus.REQUIREMENTS_NOT_MET);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.details?.verifiableCredential ?? []).toHaveLength(0);
  });

  test("requires selective disclosure when PEX definition limits disclosure", async () => {
    const { credential, holderKeyDoc } = await issueBbsCredential();

    const selectiveResult = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: selectiveDisclosureDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "test-challenge",
      skipSigning: true,
    });

    expect(selectiveResult.status).toBe(
      GeneratePresentationStatus.SELECTIVE_DISCLOSURE_REQUIRED,
    );
    expect(
      selectiveResult.selectiveDisclosure.requiredAttributes[0],
    ).toContain("credentialSubject.name");
  });

  test("derives selective disclosure presentation when attributes are supplied", async () => {
    const { credential, holderKeyDoc, documentLoader, resolver } =
      await issueBbsCredential();

    const result = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: selectiveDisclosureDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "test-challenge",
      skipSigning: true,
      resolver,
      selectiveDisclosure: {
        attributes: ["credentialSubject.name"],
      },
    });

    expect(result.status).toBe(GeneratePresentationStatus.SUCCESS);
    expect(result.presentation.verifiableCredential).toHaveLength(1);
    const selectiveCredential = result.presentation.verifiableCredential[0];
    expect(selectiveCredential.credentialSubject.name).toBe("Alice");
    expect(selectiveCredential.credentialSubject).not.toHaveProperty("degree");

    const verification = await verifyPresentation(result.presentation, {
      challenge: "test-challenge",
      domain: "example.com",
      documentLoader,
      unsignedPresentation: true,
      suite: [new Bls12381BBSSignatureProofDock2022()],
    });
    expect(verification.verified).toBe(true);
  });

  test("supports credential-level configs with multiple attributes", async () => {
    const { credential, holderKeyDoc, documentLoader, resolver } = await issueBbsCredential();

    const selectiveResult = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: selectiveDisclosureDefinitionWithDegree,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "test-challenge-multi",
      skipSigning: true,
    });

    expect(selectiveResult.status).toBe(
      GeneratePresentationStatus.SELECTIVE_DISCLOSURE_REQUIRED,
    );

    const satisfiedResult = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: selectiveDisclosureDefinitionWithDegree,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "test-challenge-multi",
      skipSigning: true,
      resolver,
      selectiveDisclosure: {
        credentials: [
          {
            attributes: [
              "credentialSubject.name",
              "credentialSubject.degree.name",
            ],
          },
        ],
      },
    });

    expect(satisfiedResult.status).toBe(GeneratePresentationStatus.SUCCESS);
    const derivedCredential = satisfiedResult.presentation.verifiableCredential[0];
    expect(derivedCredential.credentialSubject.name).toBe("Alice");
    expect(derivedCredential.credentialSubject.degree).toMatchObject({
      name: "BSc",
    });
    const multiVerification = await verifyPresentation(satisfiedResult.presentation, {
      challenge: "test-challenge-multi",
      domain: "example.com",
      documentLoader,
      unsignedPresentation: true,
      suite: [new Bls12381BBSSignatureProofDock2022()],
    });
    expect(multiVerification.verified).toBe(true);
  });

  test("applies range proofs when proving key is provided", async () => {
    const { credential, holderKeyDoc, documentLoader, resolver } =
      await issueBbsCredential();
    const provingKey = BoundCheckSnarkSetup();
    const loadProvingKey = jest.fn(async ({ credentialIndex }) => {
      if (credentialIndex === 0) {
        return {
          provingKey,
          provingKeyId: "range-key",
        };
      }
      return null;
    });

    const result = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: rangeProofPresentationDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "range-proof",
      domain: "example.com",
      resolver,
      loadProvingKey,
      selectiveDisclosure: {
        credentials: [
          {
            attributes: ["credentialSubject.name"],
          },
        ],
      },
    });

    expect(result.status).toBe(GeneratePresentationStatus.SUCCESS);
    const derived = result.presentation.verifiableCredential[0];
    expect(derived).toBeDefined();
    if (derived?.credentialSubject) {
      expect(derived.credentialSubject).not.toHaveProperty("age");
    } else {
      expect(derived).not.toHaveProperty("credentialSubject");
    }
    const predicateParams = new Map([
      ["range-key", provingKey.getVerifyingKey()],
    ]);
    const rangeSuite = new Bls12381BBSSignatureProofDock2022({
      predicateParams,
    });
    const rangeVerification = await verifyPresentation(result.presentation, {
      challenge: "range-proof",
      domain: "example.com",
      documentLoader,
      suite: [rangeSuite],
      predicateParams,
    });
    expect(rangeVerification.verified).toBe(true);
    expect(loadProvingKey).toHaveBeenCalled();
  });

  test("applies global range proofs when loadProvingKey is provided", async () => {
    const { credential, holderKeyDoc, documentLoader, resolver } = await issueBbsCredential();
    const provingKey = BoundCheckSnarkSetup();
    const applyBoundsSpy = jest
      .spyOn(pexBounds, "applyEnforceBounds")
      .mockImplementation(() => [[{ attributeName: "credentialSubject.age", min: 18, max: 65 }]]);
    const loadProvingKey = jest.fn(async () => ({
      provingKey,
      provingKeyId: "range-key-global",
    }));

    const result = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: rangeProofPresentationDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "range-proof-global",
      domain: "example.com",
      resolver,
      skipSigning: true,
      loadProvingKey,
      selectiveDisclosure: {
        credentials: [
          {
            attributes: ["credentialSubject.name"],
          },
        ],
      },
    });

    expect(result.status).toBe(GeneratePresentationStatus.SUCCESS);
    expect(loadProvingKey).toHaveBeenCalledTimes(1);
    expect(applyBoundsSpy).toHaveBeenCalled();
    const scopedCall = applyBoundsSpy.mock.calls.find(
      ([args]) => args.credentialIdx === 0,
    );
    expect(scopedCall).toBeDefined();
    expect(scopedCall[0].selectedCredentials).toHaveLength(1);
    const globalPredicateParams = new Map([
      ["range-key-global", provingKey.getVerifyingKey()],
    ]);
    const rangeGlobalSuite = new Bls12381BBSSignatureProofDock2022({
      predicateParams: globalPredicateParams,
    });
    const presentationVerification = await verifyPresentation(result.presentation, {
      challenge: "range-proof-global",
      domain: "example.com",
      documentLoader,
      unsignedPresentation: true,
      suite: [rangeGlobalSuite],
      predicateParams: globalPredicateParams,
    });
    expect(presentationVerification.verified).toBe(true);
    applyBoundsSpy.mockRestore();
  });

  test("normalizes nested selective disclosure attributes arrays", async () => {
    const { credential, holderKeyDoc, documentLoader, resolver } = await issueBbsCredential();

    const result = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: selectiveDisclosureDefinitionWithDegree,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "nested-attrs",
      skipSigning: true,
      resolver,
      selectiveDisclosure: {
        attributes: [
          ["credentialSubject.name"],
          ["credentialSubject.degree.name"],
        ],
      },
    });

    expect(result.status).toBe(GeneratePresentationStatus.SUCCESS);
    const derived = result.presentation.verifiableCredential[0];
    expect(derived.credentialSubject.name).toBe("Alice");
    expect(derived.credentialSubject.degree).toMatchObject({
      name: "BSc",
    });
    const presentationVerification = await verifyPresentation(result.presentation, {
      challenge: "nested-attrs",
      domain: "example.com",
      documentLoader,
      unsignedPresentation: true,
      suite: [new Bls12381BBSSignatureProofDock2022()],
    });
    expect(presentationVerification.verified).toBe(true);
  });

  describe.each(SELECTIVE_DISCLOSURE_ALGORITHMS)(
    "PEX selective disclosure coverage for %s credentials",
    (algorithm) => {
      test(`derives selective disclosure presentations for ${algorithm}`, async () => {
        const config = ANONCREDS_ALGORITHM_CONFIGS[algorithm];
        const { credential, holderKeyDoc, documentLoader, resolver } = await issueAnoncredsCredential({
          algorithm,
        });
        const challenge = `${algorithm}-selective-proof`;
        const selectiveDefinition = buildSelectiveProofTypeDefinition(config.proofType);

        const requirementResult = await generatePresentationFromPexRequest({
          credentials: [credential],
          pexRequest: selectiveDefinition,
          holderKeyDoc,
          holderDid: holderKeyDoc.controller,
          challenge,
          skipSigning: true,
        });

        expect(requirementResult.status).toBe(
          GeneratePresentationStatus.SELECTIVE_DISCLOSURE_REQUIRED,
        );
        expect(
          requirementResult.selectiveDisclosure.requiredAttributes[0],
        ).toContain("credentialSubject.name");

        const satisfiedResult = await generatePresentationFromPexRequest({
          credentials: [credential],
          pexRequest: selectiveDefinition,
          holderKeyDoc,
          holderDid: holderKeyDoc.controller,
          challenge,
          skipSigning: true,
          resolver,
          selectiveDisclosure: {
            attributes: ["credentialSubject.name"],
          },
        });

        expect(satisfiedResult.status).toBe(GeneratePresentationStatus.SUCCESS);
        const derived = satisfiedResult.presentation.verifiableCredential[0];
        expect(derived.credentialSubject.name).toBe("Alice");
        expect(derived.credentialSubject).not.toHaveProperty("degree");

        const verification = await verifyPresentation(satisfiedResult.presentation, {
          challenge,
          domain: "example.com",
          documentLoader,
          unsignedPresentation: true,
          suite: [config.suiteFactory()],
        });
        expect(verification.verified).toBe(true);
      });
    },
  );

  test("adds revocation witness information when provided", async () => {
    const { credentialStatus, witnessData } = await createAccumulatorFixture();
    const { credential, holderKeyDoc, documentLoader, resolver } =
      await issueBbsCredential({ credentialStatus });

    const result = await generatePresentationFromPexRequest({
      credentials: [credential],
      pexRequest: selectiveDisclosureDefinition,
      holderKeyDoc,
      holderDid: holderKeyDoc.controller,
      challenge: "accu-challenge",
      domain: "example.com",
      resolver,
      selectiveDisclosure: {
        credentials: [
          {
            attributes: ["credentialSubject.name"],
            witness: witnessData,
          },
        ],
      },
    });

    expect(result.status).toBe(GeneratePresentationStatus.SUCCESS);
    const derived = result.presentation.verifiableCredential[0];
    expect(derived).toBeDefined();
    expect(derived.credentialStatus).toMatchObject({
      id: credentialStatus.id,
      type: credentialStatus.type,
    });
    expect(derived.credentialSubject.name).toBe("Alice");
    const accumulatorPublicKeys = new Map([
      [credentialStatus.id, witnessData.pk],
    ]);
    const presentationVerification = await verifyPresentation(result.presentation, {
      challenge: "accu-challenge",
      domain: "example.com",
      documentLoader,
      accumulatorPublicKeys,
    });
    expect(presentationVerification.verified).toBe(false);
    expect(
      presentationVerification.credentialResults?.[0]?.error?.message ?? ""
    ).toBe("Verification error(s).");
  });
});
