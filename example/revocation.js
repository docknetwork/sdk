import {randomAsHex} from '@polkadot/util-crypto';

import dock from '../src/api';
import {createKeyDetail} from '../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../src/utils/misc';

import  {
  OneOfPolicy,
  KeyringPairDidKeys,
} from '../src/utils/revocation';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
const fullNodeWsRPCEndpoint = 'ws://127.0.0.1:9944';
const accountUri = '//Alice';
const accountMetadata = {name: 'Alice'};

// Create a random registry id
const registryID = randomAsHex(32);

// Create a new controller DID, the DID will be registered on the network and own the registry
const controllerDID = randomAsHex(32);
const controllerSeed = randomAsHex(32);

// Create a did/keypair proof map
const didKeys = new KeyringPairDidKeys();

// Create a list of controllers
const controllers = new Set();
controllers.add(controllerDID);

// Create a registry policy
const policy = new OneOfPolicy(controllers);

// Create revoke IDs
const revokeID = randomAsHex(32);
const revokeIds = new Set();
revokeIds.add(revokeID);

async function createRegistry() {
  console.log('Creating a registry with policy type:', policy.constructor.name);
  await dock.sendTransaction(dock.revocation.newRegistry(registryID, policy, false));
  console.log('Created registry');
}

async function removeRegistry() {
  console.log('Removing registry...');

  const registryDetail = await dock.revocation.getRegistryDetail(registryID);
  const lastModified = registryDetail[1];
  await dock.sendTransaction(dock.revocation.removeRegistry(registryID, lastModified, didKeys));

  console.log('Registry removed. All done.');
}

async function unrevoke() {
  const registryDetail = await dock.revocation.getRegistryDetail(registryID);
  const lastModified = registryDetail[1];
  await dock.sendTransaction(dock.revocation.unrevoke(registryID, revokeIds, lastModified, didKeys));
}

async function revoke() {
  console.log('Revoking ids:', revokeIds);

  const registryDetail = await dock.revocation.getRegistryDetail(registryID);
  const lastModified = registryDetail[1];
  await dock.sendTransaction(dock.revocation.revoke(registryID, revokeIds, lastModified, didKeys));
}

async function main() {
  console.log('Connected to node, creating account...');

  // We need an account to sign transactions with
  const account = dock.keyring.addFromUri(accountUri, accountMetadata);
  dock.setAccount(account);

  // The DID should be written before creating a registry
  const pair = dock.keyring.addFromUri(controllerSeed, null, 'sr25519');

  // Set our controller DID and associated keypair to be used for generating proof
  didKeys.set(controllerDID, pair);

  console.log('Creating controller DID using pair...');

  // The controller is same as the DID
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, controllerDID);
  await dock.sendTransaction(dock.did.new(controllerDID, keyDetail));

  // Create a registry
  await createRegistry();

  // Revoke
  await revoke();

  // Check if revocation was a sucess
  const isRevoked = await dock.revocation.getIsRevoked(registryID, revokeID);
  if (isRevoked) {
    console.log('Revocation success. Trying to unrevoke...');

    // Try to unrevoke
    await unrevoke();

    // Check if unrevoke worked
    const isRevoked = await dock.revocation.getIsRevoked(registryID, revokeID);
    if (!isRevoked) {
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
  address: fullNodeWsRPCEndpoint
})
  .then(main)
  .catch(error => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
