import { randomAsHex } from '@polkadot/util-crypto';

import dock from '../src/api';
import { createNewDockDID, createKeyDetail } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

import {
  OneOfPolicy,
  KeyringPairDidKeys,
} from '../src/utils/revocation';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

// Create a random registry id
const registryId = randomAsHex(32);

// Create a new controller DID, the DID will be registered on the network and own the registry
const controllerDID = createNewDockDID();
const controllerSeed = randomAsHex(32);

// Create a did/keypair proof map
const didKeys = new KeyringPairDidKeys();

// Create a list of controllers
const controllers = new Set();
controllers.add(controllerDID);

// Create a registry policy
const policy = new OneOfPolicy(controllers);

// Create revoke IDs
const revokeId = randomAsHex(32);
const revokeIds = new Set();
revokeIds.add(revokeId);

async function createRegistry() {
  console.log(`Creating a registry with owner DID (${controllerDID}) with policy type:`, policy.constructor.name);
  await dock.sendTransaction(dock.revocation.newRegistry(registryId, policy, false));
  console.log('Created registry');
}

async function removeRegistry() {
  console.log('Removing registry...');

  const registryDetail = await dock.revocation.getRegistryDetail(registryId);
  const lastModified = registryDetail[1];
  await dock.sendTransaction(dock.revocation.removeRegistry(registryId, lastModified, didKeys));

  console.log('Registry removed. All done.');
}

async function unrevoke() {
  console.log('Trying to undo the revocation (unrevoke) of id:', revokeId);
  const extrinsic = await dock.revocation.unrevokeCredential(didKeys, registryId, revokeId);
  await dock.sendTransaction(extrinsic);
}

async function revoke() {
  console.log('Trying to revoke id:', revokeId);
  const extrinsic = await dock.revocation.revokeCredential(didKeys, registryId, revokeId);
  await dock.sendTransaction(extrinsic);
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
  didKeys.set(controllerDID, pair);

  // The controller is same as the DID
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, controllerDID);
  await dock.sendTransaction(dock.did.new(controllerDID, keyDetail));

  // Create a registry
  await createRegistry();

  // Revoke
  await revoke();

  // Check if revocation was a sucess
  const isRevoked = await dock.revocation.getIsRevoked(registryId, revokeId);
  if (isRevoked) {
    console.log('Revocation success. Trying to unrevoke...');

    // Try to unrevoke
    await unrevoke();

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
  await removeRegistry();

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
