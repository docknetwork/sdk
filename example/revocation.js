import { randomAsHex } from '@polkadot/util-crypto';

import dock from '../src/index';
import { createNewDockDID } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

import {
  OneOfPolicy,
  createRandomRegistryId,
} from '../src/utils/revocation';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';
import { DidKey, VerificationRelationship } from '../src/public-keys';

// Create a random registry id
const registryId = createRandomRegistryId();

// Create a new controller DID, the DID will be registered on the network and own the registry
const controllerDID = createNewDockDID();
const controllerSeed = randomAsHex(32);

// Create a list of controllers
const controllers = new Set();
controllers.add(controllerDID);

// Create a registry policy
const policy = new OneOfPolicy(controllers);

// Create revoke IDs
const revokeId = randomAsHex(32);

async function createRegistry() {
  console.log(`Creating a registry with owner DID (${controllerDID}) with policy type:`, policy.constructor.name);
  await dock.revocation.newRegistry(registryId, policy, false, false);
  console.log('Created registry');
}

async function removeRegistry(pair) {
  console.log('Removing registry...');

  await dock.revocation.removeRegistryWithOneOfPolicy(registryId, controllerDID, pair, 1, { didModule: dock.did }, false);

  console.log('Registry removed. All done.');
}

async function unrevoke(pair) {
  console.log('Trying to undo the revocation (unrevoke) of id:', revokeId);
  const extrinsic = await dock.revocation.unrevokeCredentialWithOneOfPolicy(registryId, revokeId, controllerDID, pair, 1, { didModule: dock.did }, false);
  await extrinsic;
}

async function revoke(pair) {
  console.log('Trying to revoke id:', revokeId);
  const extrinsic = await dock.revocation.revokeCredentialWithOneOfPolicy(registryId, revokeId, controllerDID, pair, 1, { didModule: dock.did }, false);
  await extrinsic;
}

async function main() {
  console.log('Connected to node, creating account...');

  // We need an account to sign transactions with
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);

  // The DID should be written before creating a registry
  const pair = dock.keyring.addFromUri(controllerSeed, null, 'sr25519');

  // Set our controller DID and associated keypair to be used for generating proof
  console.log(`Creating controller DID (${controllerDID}) using sr25519 pair from seed (${controllerSeed})...`);

  // The controller is same as the DID
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  await dock.did.new(controllerDID, [didKey], [], false);

  // Create a registry
  await createRegistry();

  // Revoke
  await revoke(pair);

  // Check if revocation was a success
  const isRevoked = await dock.revocation.getIsRevoked(registryId, revokeId);
  if (isRevoked) {
    console.log('Revocation success. Trying to unrevoke...');

    // Try to unrevoke
    await unrevoke(pair);

    // Check if unrevoke worked
    const isUnrevoked = !(await dock.revocation.getIsRevoked(registryId, revokeId));
    if (isUnrevoked) {
      console.log('Unrevoke success!');
    } else {
      console.error('Unable to unrevoke, something went wrong.');
    }
  } else {
    console.error('Revocation failed');
  }

  // Cleanup, remove the registry
  await removeRegistry(pair);

  // Disconnect from the node
  await dock.disconnect();

  // Exit
  process.exit(0);
}

// Initialise Dock API, connect to the node and start working with it
dock.init({
  address: FullNodeEndpoint,
})
  .then(main)
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
