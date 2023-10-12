import { randomAsHex } from '@polkadot/util-crypto';

import dock from '../src/index';
import VerifiableCredential from '../src/verifiable-credential';
import VerifiablePresentation from '../src/verifiable-presentation';
import { createNewDockDID } from '../src/utils/did';
import { registerNewDIDUsingPair } from '../tests/integration/helpers';
import { createRandomRegistryId, OneOfPolicy, buildDockCredentialStatus } from '../src/utils/revocation';
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';
import { getKeyDoc } from '../src/utils/vc/helpers';
import { DockResolver } from '../src/resolver';

// Both issuer and holder have DIDs
const issuerDID = createNewDockDID();
const issuerSeed = randomAsHex(32);

const holderDID = createNewDockDID();
const holderSeed = randomAsHex(32);

const registryId = createRandomRegistryId();

// Sample credential data
const credentialId = 'http://example.edu/credentials/1986';
const credentialContext = 'https://www.w3.org/2018/credentials/examples/v1';
const credentialType = 'AlumniCredential';
const credentialSubject = { id: holderDID, alumniOf: 'Example University' };
const credentialStatus = buildDockCredentialStatus(registryId);
const credentialIssuanceDate = '2020-03-18T19:23:24Z';
const credentialExpirationDate = '2999-03-18T19:23:24Z';

const presentationId = 'http://example.edu/credentials/2803';
const challenge = randomAsHex(32);
const domain = 'example domain';

const resolver = new DockResolver(dock);

/**
 * Register issuer and holder DIDs
 * @returns {Promise<void>}
 */
async function setup() {
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);

  // Register issuer DID
  console.log('Registering issuer DID...');
  const pair = dock.keyring.addFromUri(issuerSeed, null, 'ed25519');
  await registerNewDIDUsingPair(dock, issuerDID, pair);

  // Register holder DID
  console.log('Registering holder DID...');
  const pair1 = dock.keyring.addFromUri(holderSeed, null, 'ed25519');
  await registerNewDIDUsingPair(dock, holderDID, pair1);

  // Create a new policy
  const policy = new OneOfPolicy();
  policy.addOwner(issuerDID);

  // Add a new revocation registry with above policy
  console.log('Creating registry...');
  await dock.revocation.newRegistry(registryId, policy, false, false);

  console.log('Issuer has created registry with id', registryId);
}

async function main() {
  await setup();

  // Incrementally build a verifiable credential
  const credential = new VerifiableCredential(credentialId);
  try {
    credential.addContext(credentialContext);
    credential.addType(credentialType);
    credential.addSubject(credentialSubject);
    credential.setStatus(credentialStatus);
    credential.setIssuanceDate(credentialIssuanceDate);
    credential.setExpirationDate(credentialExpirationDate);

    console.log('Credential created:', credential.toJSON());

    // Sign the credential to get the proof
    console.log('Issuer will sign the credential now');
    const issuerKey = getKeyDoc(issuerDID, dock.keyring.addFromUri(issuerSeed, null, 'ed25519'), 'Ed25519VerificationKey2018');
    const signedCredential = await credential.sign(issuerKey);
    console.log('Credential signed, verifying...');

    // Verify the credential
    const verifyResult = await signedCredential.verify({
      resolver,
      compactProof: true,
    });
    if (verifyResult.verified) {
      console.log('Credential has been verified! Result:', verifyResult);

      console.log('Holder creating presentation...');

      const presentation = new VerifiablePresentation(presentationId);
      presentation.addCredential(credential);

      console.log('Holder signing presentation', presentation.toJSON());
      const holderKey = getKeyDoc(holderDID, dock.keyring.addFromUri(holderSeed, null, 'ed25519'), 'Ed25519VerificationKey2018');
      await presentation.sign(holderKey, challenge, domain, resolver);
      console.log('Signed presentation', presentation.toJSON());

      const ver = await presentation.verify({
        challenge,
        domain,
        resolver,
        compactProof: true,
      });

      if (ver.verified) {
        console.log('Presentation has been verified! Result:', ver);
      } else {
        console.error('Presentation could not be verified!. Got error', ver.error);
        process.exit(1);
      }
    } else {
      console.error('Credential could not be verified!. Got error', verifyResult.error);
      process.exit(1);
    }
  } catch (e) {
    console.error('Error creating credential', e);
    process.exit(1);
  }

  // Exit
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(main)
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
