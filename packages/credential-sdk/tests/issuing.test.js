// Mock fetch
import mockFetch from "./mocks/fetch";

import {
  issueCredential,
  verifyCredential,
  verifyPresentation,
  signPresentation,
} from "../src/vc";
import VerifiableCredential from "../src/vc/verifiable-credential";
import VerifiablePresentation from "../src/vc/verifiable-presentation";
import testingKeys from "./data/test-keys";

mockFetch();

// Test constants
const issuanceDate = "2020-04-15T09:05:35Z";

const vpId = "https://example.com/credentials/12345";
const vpHolder = "https://example.com/credentials/1234567890";
const sampleId = "http://example.edu/credentials/2803";
const fakeContext = {
  "@context": {
    "@protected": true,
    id: "@id",
    type: "@type",
  },
};

function getSampleCredential() {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
    ],
    id: "https://example.com/credentials/1872",
    type: ["VerifiableCredential", "AlumniCredential"],
    issuanceDate,
    credentialSubject: {
      id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
      alumniOf: "Example University",
    },
  };
}

function getSamplePres(presentationCredentials) {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: presentationCredentials,
    id: vpId,
    holder: vpHolder,
  };
}

testingKeys.forEach((testKey) => {
  const { sigType, keyDocument } = testKey;
  const keyUrl = keyDocument.id;
  const controllerUrl = keyDocument.controller;

  describe(`Verifiable Credential Issuing [${keyDocument.type}]`, () => {
    test("Issuing should return an object with a proof, and it must pass validation.", async () => {
      const credential = await issueCredential(
        testKey.keyDocument,
        getSampleCredential(),
      );
      expect(credential.id).toBe("https://example.com/credentials/1872");
      expect(credential.type).toContain("VerifiableCredential");
      expect(credential.type).toContain("AlumniCredential");
      expect(credential.issuanceDate).toBe(issuanceDate);
      expect(credential.credentialSubject.id).toBe(
        "did:example:ebfeb1f712ebc6f1c276e12ec21",
      );
      expect(credential.credentialSubject.alumniOf).toBe("Example University");
      expect(credential.issuer).toBe(controllerUrl);
      expect(credential.proof.type).toBe(sigType);
      expect(credential.proof.created).toBeDefined();
      expect(credential.proof.proofPurpose).toBe("assertionMethod");
      expect(credential.proof.verificationMethod).toBe(keyUrl);

      const result = await verifyCredential(credential);
      expect(result.verified).toBe(true);
      expect(result.results[0].proof).toBeDefined();
      expect(result.results[0].proof.proofPurpose).toBe("assertionMethod");
      expect(result.results[0].proof.type).toBe(sigType);
      expect(result.results[0].proof.verificationMethod).toBe(keyUrl);
      expect(result.results[0].verified).toBe(true);
    }, 30000);

    // JsonWebKey signatures cant use proofValue
    if (keyDocument.type !== "JsonWebKey2020") {
      test("Issuing should return an object with a proof, and it must pass validation (using proofValue).", async () => {
        const credential = await issueCredential(
          testKey.keyDocument,
          getSampleCredential(),
          true,
          null,
          null,
          null,
          null,
          false,
          "proofValue",
        );
        expect(credential.proof.proofValue).toBeDefined();
        const result = await verifyCredential(credential);
        expect(result.verified).toBe(true);
      }, 30000);
    }

    test("Issuing should return a valid JWT, and it must pass validation", async () => {
      const credential = await issueCredential(
        testKey.keyDocument,
        getSampleCredential(),
        true,
        null,
        null,
        null,
        null,
        false,
        "jwt",
      );
      expect(typeof credential).toEqual("string");
      const result = await verifyCredential(credential);
      expect(result.verified).toBe(true);
    }, 30000);

    test("Tampered Credential should not pass validation.", async () => {
      const credential = await issueCredential(
        testKey.keyDocument,
        getSampleCredential(),
      );
      credential.issuanceDate = "9020-04-15T09:05:35Z";
      const result = await verifyCredential(credential);
      expect(result.verified).toBe(false);
    }, 30000);

    test("Expired Credential should not pass validation with verifyDates as true", async () => {
      const credential = await issueCredential(testKey.keyDocument, {
        ...getSampleCredential(),
        expirationDate: new Date("2000-01-01T09:05:35Z").toISOString(),
      });
      const result = await verifyCredential(credential);
      expect(result.verified).toBe(false);
      expect(result.error.message).toEqual("Credential has expired");
    }, 30000);

    test("Expired Credential should pass validation with verifyDates as false", async () => {
      const credential = await issueCredential(testKey.keyDocument, {
        ...getSampleCredential(),
        expirationDate: new Date("2000-01-01T09:05:35Z").toISOString(),
      });
      const result = await verifyCredential(credential, { verifyDates: false });
      expect(result.verified).toBe(true);
    }, 30000);

    test("Credential With incorrect issuer should not pass validation.", async () => {
      const keydoc = { ...testKey.keyDocument };
      keydoc.controller = "did:rando:id";
      const credential = await issueCredential(keydoc, getSampleCredential());
      const result = await verifyCredential(credential);
      expect(result.verified).toBe(false);
    }, 30000);
  });

  describe(`Verifiable Presentation creation [${keyDocument.type}]`, () => {
    let presentationCredentials;
    beforeAll(async () => {
      const sampleIssuedCredential = await issueCredential(
        testKey.keyDocument,
        getSampleCredential(),
      );
      presentationCredentials = [
        sampleIssuedCredential,
        sampleIssuedCredential,
      ];
    });

    test("A verifiable presentation should contain a proof once signed, and it should pass verification.", async () => {
      const signedVp = await signPresentation(
        getSamplePres(presentationCredentials),
        testKey.keyDocument,
        "some_challenge",
        "some_domain",
      );

      const results = await verifyPresentation(signedVp, {
        challenge: "some_challenge",
        domain: "some_domain",
      });

      expect(results.verified).toBe(true);
      expect(results.error).toBe(undefined);
      expect(results.presentationResult.verified).toBe(true);
      // expect(results.presentationResult.results[0].proof['@context']).toBe('https://w3id.org/security/v2');
      expect(results.presentationResult.results[0].proof.type).toBe(sigType);
      expect(results.presentationResult.results[0].proof.challenge).toBe(
        "some_challenge",
      );
      expect(results.presentationResult.results[0].proof.domain).toBe(
        "some_domain",
      );
      expect(results.presentationResult.results[0].proof.proofPurpose).toBe(
        "authentication",
      );
      expect(
        results.presentationResult.results[0].proof.verificationMethod,
      ).toBe(keyUrl);
      expect(results.presentationResult.results[0].verified).toBe(true);
      expect(results.credentialResults[0].verified).toBe(true);
      expect(results.credentialResults[0].results).toBeDefined();
      expect(results.credentialResults[1].verified).toBe(true);
      expect(results.credentialResults[1].results).toBeDefined();
    }, 30000);
  });

  describe(`Verifiable Credential incremental creation [${keyDocument.type}]`, () => {
    test("VC creation with only id should be possible, yet bring default values", async () => {
      const credential = new VerifiableCredential(sampleId);
      expect(credential.id).toBe(sampleId);
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
      ]);
      expect(credential.type).toEqual(["VerifiableCredential"]);
      expect(credential.issuanceDate).toEqual(expect.anything());
    });

    test("VC creation with an object context should be possible", async () => {
      const credential = new VerifiableCredential(sampleId);
      credential.addContext(fakeContext);
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        fakeContext,
      ]);
    });

    test("JSON representation of a VC should bring the proper keys", async () => {
      const credential = new VerifiableCredential(sampleId);
      const credentialJSON = credential.toJSON();
      expect(credentialJSON["@context"]).toContain(
        "https://www.w3.org/2018/credentials/v1",
      );
      expect(credentialJSON.id).toBe(sampleId);
      expect(credentialJSON.credentialSubject).toEqual([]);
      expect(credentialJSON.type).toEqual(["VerifiableCredential"]);
      expect(credentialJSON.issuanceDate).toBeDefined();
    });

    test("Incremental VC creation should be possible", async () => {
      const credential = new VerifiableCredential(sampleId);
      expect(credential.id).toBe(sampleId);

      credential.addContext("https://www.w3.org/2018/credentials/examples/v1");
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
      ]);
      credential.addType("some_type");
      expect(credential.type).toEqual(["VerifiableCredential", "some_type"]);
      credential.addSubject({ id: "some_subject_id" });
      expect(credential.credentialSubject).toEqual([{ id: "some_subject_id" }]);
      credential.setStatus({
        id: "some_status_id",
        type: "CredentialStatusList2017",
      });
      expect(credential.status).toEqual({
        id: "some_status_id",
        type: "CredentialStatusList2017",
      });
      credential.setIssuanceDate("2020-03-18T19:23:24Z");
      expect(credential.issuanceDate).toEqual("2020-03-18T19:23:24Z");
      credential.setExpirationDate("2021-03-18T19:23:24Z");
      expect(credential.expirationDate).toEqual("2021-03-18T19:23:24Z");
    });

    test("Duplicates in context, types and subjects are omitted.", async () => {
      const credential = new VerifiableCredential(sampleId);

      credential.addContext("https://www.w3.org/2018/credentials/examples/v1");
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
      ]);
      credential.addContext("https://www.w3.org/2018/credentials/examples/v1");
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
      ]);
      credential.addContext({ "@context": "https://www.google.com" });
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
        { "@context": "https://www.google.com" },
      ]);
      credential.addContext({ "@context": "https://www.google.com" });
      expect(credential.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
        { "@context": "https://www.google.com" },
      ]);

      credential.addType("some_type");
      expect(credential.type).toEqual(["VerifiableCredential", "some_type"]);
      credential.addType("some_type");
      expect(credential.type).toEqual(["VerifiableCredential", "some_type"]);

      credential.addSubject({
        id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
        alumniOf: "Example University",
      });
      expect(credential.credentialSubject).toEqual([
        {
          id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
          alumniOf: "Example University",
        },
      ]);
      credential.addSubject({
        id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
        alumniOf: "Example University",
      });
      expect(credential.credentialSubject).toEqual([
        {
          id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
          alumniOf: "Example University",
        },
      ]);
    });

    test("Incremental VC creations runs basic validation", async () => {
      const credential = new VerifiableCredential(sampleId);
      expect(() => {
        credential.addContext(123);
      }).toThrowError("needs to be a string.");

      expect(() => {
        credential.setStatus({ some: "value", type: "something" });
      }).toThrowError("\"credentialStatus\" must include the 'id' property.");
      expect(() => {
        credential.setStatus({ id: "value", some: "value" });
      }).toThrowError('"credentialStatus" must include a type.');

      expect(() => {
        credential.setIssuanceDate("2020");
      }).toThrowError("needs to be a valid datetime.");

      expect(() => {
        credential.setExpirationDate("2020");
      }).toThrowError("needs to be a valid datetime.");

      await expect(credential.verify()).rejects.toThrowError(
        "The current Verifiable Credential has no proof.",
      );
    });

    test("Issuing an incrementally-created VC should return an object with a proof, and it must pass validation.", async () => {
      const unsignedCredential = new VerifiableCredential(
        "https://example.com/credentials/1872",
      );
      unsignedCredential.addContext(
        "https://www.w3.org/2018/credentials/examples/v1",
      );
      const signedCredential = await unsignedCredential.sign(
        testKey.keyDocument,
      );
      expect(signedCredential.proof).toBeDefined();
      const result = await signedCredential.verify();
      expect(result.verified).toBe(true);
      expect(result.results[0].proof).toBeDefined();
      expect(result.results[0].verified).toBe(true);
    }, 30000);
  });

  describe(`Verifiable Presentation incremental creation [${keyDocument.type}]`, () => {
    let presentationCredentials;
    beforeAll(async () => {
      const sampleIssuedCredential = await issueCredential(
        testKey.keyDocument,
        getSampleCredential(),
      );
      presentationCredentials = [
        sampleIssuedCredential,
        sampleIssuedCredential,
      ];
    });

    test("VP creation with only id should be possible, yet bring default values", async () => {
      const vp = new VerifiablePresentation(sampleId);
      expect(vp.id).toBe(sampleId);
      expect(vp.context).toEqual(["https://www.w3.org/2018/credentials/v1"]);
      expect(vp.type).toEqual(["VerifiablePresentation"]);
      expect(vp.credentials).toEqual([]);
    });

    test("VP creation with an object context should be possible", async () => {
      const vp = new VerifiablePresentation(sampleId);
      vp.addContext(fakeContext);
      expect(vp.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        fakeContext,
      ]);
    });

    test("The JSON representation of a VP should bring the proper keys", async () => {
      const vp = new VerifiablePresentation(sampleId);
      const vpJSON = vp.toJSON();
      expect(vpJSON["@context"]).toContain(
        "https://www.w3.org/2018/credentials/v1",
      );
      expect(vpJSON.id).toBe(sampleId);
      expect(vpJSON.type).toEqual(["VerifiablePresentation"]);
      expect(vpJSON.verifiableCredential).toEqual([]);
    });

    test("Incremental VP creation should be possible", async () => {
      const vp = new VerifiablePresentation(sampleId);
      expect(vp.id).toBe(sampleId);

      vp.addContext("https://www.w3.org/2018/credentials/examples/v1");
      expect(vp.context).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
      ]);
      vp.addType("some_type");
      expect(vp.type).toEqual(["VerifiablePresentation", "some_type"]);
      vp.addCredential({ id: "some_credential_id" });
      expect(vp.credentials).toEqual([{ id: "some_credential_id" }]);
    });

    test("Incremental VP creations runs basic validation", async () => {
      const vp = new VerifiablePresentation(sampleId);
      expect(() => {
        vp.addContext(123);
      }).toThrowError("needs to be a string.");
      expect(() => {
        vp.addContext("123");
      }).toThrowError("needs to be a valid URI.");

      expect(() => {
        vp.addCredential({ some: "value" });
      }).toThrowError("\"credential\" must include the 'id' property.");

      await expect(
        vp.verify({
          challenge: "some_challenge",
          domain: "some_domain",
        }),
      ).rejects.toThrowError(
        "The current VerifiablePresentation has no proof.",
      );
    });

    test("Incremental VP creation from external VCs should be possible", async () => {
      const vp = new VerifiablePresentation(vpId);
      vp.addCredential(presentationCredentials[0]);
      expect(vp.credentials).toEqual([presentationCredentials[0]]);
      await vp.sign(testKey.keyDocument, "some_challenge", "some_domain");
      expect(vp.proof).toMatchObject({ type: sigType });
      expect(vp.proof).toMatchObject({ created: expect.anything() });
      expect(vp.proof).toMatchObject({ challenge: "some_challenge" });
      expect(vp.proof).toMatchObject({ domain: "some_domain" });
      expect(vp.proof).toMatchObject({ jws: expect.anything() });
      expect(vp.proof).toMatchObject({ proofPurpose: "authentication" });
      expect(vp.proof).toMatchObject({ verificationMethod: expect.anything() });

      const results = await vp.verify({
        challenge: "some_challenge",
        domain: "some_domain",
      });

      expect(results.presentationResult).toMatchObject({ verified: true });
      expect(results.presentationResult.results[0]).toMatchObject({
        verified: true,
      });
      expect(results.presentationResult.results[0]).toMatchObject({
        proof: expect.anything(),
      });
      expect(results.credentialResults[0]).toMatchObject({ verified: true });
      expect(results.credentialResults[0]).toMatchObject({
        results: expect.anything(),
      });
    }, 20000);

    test("Issuing an incrementally-created VP from an incrementally created VC should return an object with a proof, and it must pass validation.", async () => {
      const vc = new VerifiableCredential(
        "https://example.com/credentials/1872",
      );
      vc.addContext("https://www.w3.org/2018/credentials/examples/v1");
      vc.addType("AlumniCredential");
      vc.addSubject({
        id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
        alumniOf: "Example University",
      });
      await vc.sign(testKey.keyDocument);
      const vcVerificationResult = await vc.verify();
      expect(vcVerificationResult).toMatchObject({ verified: true });

      const vp = new VerifiablePresentation(vpId);
      vp.setHolder(vpHolder);
      vp.addCredential(vc);
      await vp.sign(testKey.keyDocument, "some_challenge", "some_domain");
      expect(vp.proof).toMatchObject({ type: sigType });
      expect(vp.proof).toMatchObject({ created: expect.anything() });
      expect(vp.proof).toMatchObject({ challenge: "some_challenge" });
      expect(vp.proof).toMatchObject({ domain: "some_domain" });
      expect(vp.proof).toMatchObject({ jws: expect.anything() });
      expect(vp.proof).toMatchObject({ proofPurpose: "authentication" });
      expect(vp.proof).toMatchObject({ verificationMethod: expect.anything() });

      const results = await vp.verify({
        challenge: "some_challenge",
        domain: "some_domain",
      });
      expect(results.presentationResult).toMatchObject({ verified: true });
      expect(results.presentationResult.results[0]).toMatchObject({
        verified: true,
      });
      expect(results.presentationResult.results[0]).toMatchObject({
        proof: expect.anything(),
      });
      expect(results.credentialResults[0]).toMatchObject({ verified: true });
      expect(results.credentialResults[0]).toMatchObject({
        results: expect.anything(),
      });
    }, 30000);

    test("Support contexts without @context key", () => {
      const credential = new VerifiableCredential(sampleId);
      const context = {
        name: "http://schema.org/name",
        image: {
          "@id": "http://schema.org/image",
          "@type": "@id",
        },
        homepage: {
          "@id": "http://schema.org/url",
          "@type": "@id",
        },
      };
      credential.setContext(context);
      expect(credential.context).toEqual(context);
    });
  });
});
