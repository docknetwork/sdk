import {randomAsHex} from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import {Ed25519KeyPair} from 'jsonld-signatures';

import dock from '../src/api';
import VerifiableCredential from '../src/verifiable-credential';
import {createNewDockDID} from '../src/utils/did';
import {registerNewDIDUsingPair} from '../tests/integration/helpers';
import {OneOfPolicy} from '../src/utils/revocation';
import {FullNodeEndpoint, TestAccountURI} from '../tests/test-constants';
import {getKeyDoc} from '../src/utils/vc/helpers';
import {DockResolver} from '../src/resolver';
import {DockRevRegQualifier, RevRegType} from '../src/utils/vc';

// Both issuer and holder have DIDs
const issuerDID = createNewDockDID();
const issuerSeed = randomAsHex(32);

const holderDID = createNewDockDID();
const holderSeed = randomAsHex(32);

const registryId = randomAsHex(32);

// Sample credential data
const credentialId = 'auniquecredentialid';
const credentialContext = 'https://www.w3.org/2018/credentials/examples/v1';
const credentialType = 'AlumniCredential';
const credentialSubject = {id: holderDID, alumniOf: 'Example University'};
const credentialStatus = {id: `${DockRevRegQualifier}${registryId}`, type: RevRegType};
const credentialIssuanceDate = '2020-03-18T19:23:24Z';
const credentialExpirationDate = '2021-03-18T19:23:24Z';

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
  const transaction = dock.revocation.newRegistry(registryId, policy, false);
  await dock.sendTransaction(transaction);

  console.log('Issuer has created registry with id', registryId);
}

async function main() {
  await setup();

  // Incrementally build a verifiable credential
  let credential = new VerifiableCredential(credentialId);
  try {
    credential.addContext(credentialContext);
    credential.addType(credentialType);
    credential.addSubject(credentialSubject);
    credential.setStatus(credentialStatus);
    credential.setIssuanceDate(credentialIssuanceDate);
    credential.setExpirationDate(credentialExpirationDate);

    console.log('Credential created:', credential);

    // Sign the credential to get the proof
    const issuerKey = getKeyDoc(issuerDID, await Ed25519KeyPair.generate({seed: hexToU8a(issuerSeed)}), 'Ed25519VerificationKey2018');
    const signedCredential = await credential.sign(issuerKey);
    console.log('Credential signed, verifying...');

    // Verify the credential
    const verifyResult = await signedCredential.verify(resolver, true, true, {'dock': dock});
    if (verifyResult.verified) {
      console.log('Credential has been verified! Result:', verifyResult);
    } else {
      console.error('Credential could not be verified!');
    }
  } catch (e) {
    console.error('Error creating credential', e);
  }

  // Exit
  // eslint-disable-next-line no-undef
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint
})
  .then(main)
  .catch(error => {
    console.error('Error occurred somewhere, it was caught!', error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  });
