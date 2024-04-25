import VerifiableCredential from '../src/verifiable-credential';
import { DIDKeyResolver } from '../src/resolver';

// Sample credential data from https://gist.githubusercontent.com/ottonomy/6f72f5055220cfa8c6926e1a753f1870/raw/e7882e4a6eebb503359cce4bdc8978331d47544c/asu-tln-unconference-example-credential.json
const credentialJSON = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "type": [
    "VerifiableCredential",
    "OpenBadgeCredential"
  ],
  "issuer": {
    "type": "Profile",
    "id": "did:key:z6MkoowWdLogChc6mRp18YcKBd2yYTNnQLeHdiT73wjL1h6z",
    "name": "Trusted Learner Network (TLN) Unconference Issuer",
    "url": "https://tln.asu.edu/",
    "image": {
      "id": "https://plugfest3-assets-20230928.s3.amazonaws.com/TLN+Gold+Circle.png",
      "type": "Image"
    }
  },
  "issuanceDate": "2024-04-04T16:43:31.485Z",
  "name": "2024 TLN Unconference Change Agent",
  "credentialSubject": {
    "type": "AchievementSubject",
    "id": "did:key:7af28a8b2b9684073a0884aacd8c31eb5908baf4a1ba7e2ca60582bf585c68ad",
    "achievement": {
      "id": "https://tln.asu.edu/achievement/369435906932948",
      "type": "Achievement",
      "name": "2024 TLN Unconference Change Agent",
      "description": "This credential certifies attendance, participation, and knowledge-sharing at the 2024 Trusted Learner Network (TLN) Unconference.",
      "criteria": {
        "type": "Criteria",
        "narrative": "* Demonstrates initiative and passion for digital credentialing\n* Shares knowledge, skills and experience to broaden and deepen the community's collective understanding and competency\n* Engages in complex problems by collaborating with others\n* Creates connections and builds coalition to advance the ecosystem"
      }
    }
  },
  "id": "https://tln.asu.edu/achievement/369435906932948",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-04-04T16:43:31Z",
    "verificationMethod": "did:key:z6MkoowWdLogChc6mRp18YcKBd2yYTNnQLeHdiT73wjL1h6z#z6MkoowWdLogChc6mRp18YcKBd2yYTNnQLeHdiT73wjL1h6z",
    "proofPurpose": "assertionMethod",
    "proofValue": "z23JQwSmJKnWXw1HWDMBv1yoZDVyfUsRWihQFsrSLpb8cENqbuqpdnaSY72VmCkY3WQ4GovpNRZPNLRaatXeDJE8G"
  }
};

const resolver = new DIDKeyResolver();

async function main() {
  // Incrementally build a verifiable credential
  const credential = VerifiableCredential.fromJSON(credentialJSON);

  // Verify the credential
  const verifyResult = await credential.verify({
    resolver,
    compactProof: true,
  });
  if (verifyResult.verified) {
    console.log('Credential has been verified! Result:', verifyResult);
  } else {
    console.error('Credential could not be verified!. Got error', verifyResult.error);
    process.exit(1);
  }

  // Exit
  process.exit(0);
}

main();
