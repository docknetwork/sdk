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

describe(`Verifiable Credential Verification With Controllers`, () => {
  test("Issuing should return an object with a proof, and it must pass validation.", async () => {
    const credential = {
      "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://ld.truvera.io/credentials/extensions-v1",
          {
              "BasicCredential": "dk:BasicCredential",
              "dk": "https://ld.truvera.io/credentials#"
          }
      ],
      "id": "https://creds-testnet.truvera.io/955ef4de8d4397ae59c4069d95593c0bedf6320b05fdbc0c6afbc3c947e6c10c",
      "type": [
          "VerifiableCredential",
          "BasicCredential"
      ],
      "credentialSubject": {
          "name": "test",
          "id": "test"
      },
      "issuanceDate": "2025-11-03T20:34:05.191Z",
      "issuer": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754",
      "credentialSchema": {
          "id": "https://schema.truvera.io/BasicCredential-V2-1703777584571.json",
          "type": "JsonSchemaValidator2018"
      },
      "name": "Basic Credential",
      "proof": {
          "type": "Ed25519Signature2018",
          "created": "2025-11-03T20:34:25Z",
          "verificationMethod": "did:cheqd:testnet:60b1d818-f8d0-4609-b299-a03d82c7f754#key-1",
          "proofPurpose": "assertionMethod",
          "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..n_SoTa5C0VQfrcqm0CON8pCoL8XtTr7Z6yMnIdN3Thdsufk35_67Txo6edlp9KBjSdAoghUKgL8sUhceIe6JDw"
      }
  };

    const result = await verifyCredential(credential);
    console.log(result);
    expect(result.verified).toBe(true);
    // expect(result.results[0].proof).toBeDefined();
    // expect(result.results[0].proof.proofPurpose).toBe("assertionMethod");
    // expect(result.results[0].proof.type).toBe(sigType);
    // expect(result.results[0].proof.verificationMethod).toBe(keyUrl);
    // expect(result.results[0].verified).toBe(true);
  }, 30000);
});
