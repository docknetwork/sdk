// Txn pricing and weights

import { BTreeSet } from '@polkadot/types';

import { randomAsHex } from '@polkadot/util-crypto';
import dock from '../src/index';
import {
  createNewDockDID,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { createRandomRegistryId, OneOfPolicy } from '../src/utils/revocation';
import { BLOB_MAX_BYTE_SIZE } from '../src/modules/blob';
import { getBalance } from './helpers';
import { DidKey, VerificationRelationship } from '../src/public-keys';
import { ServiceEndpointType } from '../src/service-endpoint';

require('dotenv').config();

const { FullNodeEndpoint, EndowedSecretURI } = process.env;

function getDidPair() {
  const did = createNewDockDID();
  const seed = randomAsHex(32);
  const pair = dock.keyring.addFromUri(seed, null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  return [did, pair, didKey];
}

async function dids() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, didKey] = getDidPair();

  let bal0 = await getBalance(dock.api, account.address);
  await dock.did.new(did, [didKey], [], false);
  let bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for DID write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add DID key with all verification relationships
  const [, , dk1] = getDidPair();
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addKeys([dk1], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding DID key with all verification relationships is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add DID key with only 1 verification relationship
  const [, , dk2] = getDidPair();
  dk2.verRels.setAuthentication();
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addKeys([dk2], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding DID key with only 1 verification relationship is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add DID key with only 2 verification relationships
  const [, , dk3] = getDidPair();
  dk3.verRels.setAuthentication();
  dk3.verRels.setAssertion();
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addKeys([dk3], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding DID key with only 2 verification relationships is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add DID key with 3 verification relationships
  const [, , dk4] = getDidPair();
  dk4.verRels.setAuthentication();
  dk4.verRels.setAssertion();
  dk4.verRels.setCapabilityInvocation();
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addKeys([dk4], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding DID key with 3 verification relationships is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add 2 DID keys with only 1 verification relationship
  const [, , dk5] = getDidPair();
  const [, , dk6] = getDidPair();
  dk5.verRels.setAuthentication();
  dk6.verRels.setCapabilityInvocation();
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addKeys([dk5, dk6], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding 2 DID keys with only 1 verification relationship is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add 3 DID keys with only 1 verification relationship
  const [, , dk7] = getDidPair();
  const [, , dk8] = getDidPair();
  const [, , dk9] = getDidPair();
  dk7.verRels.setAuthentication();
  dk8.verRels.setCapabilityInvocation();
  dk9.verRels.setAssertion();
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addKeys([dk7, dk8, dk9], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding 3 DID keys with only 1 verification relationship is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  const newControllers = [createNewDockDID(), createNewDockDID(), createNewDockDID()];
  // Add 1 controller
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addControllers([newControllers[0]], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding 1 controller is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add 2 controllers
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addControllers([newControllers[1], newControllers[2]], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding 2 controllers is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  const spType = new ServiceEndpointType();
  spType.setLinkedDomains();
  const spId1 = randomAsHex(10);
  const spId2 = randomAsHex(20);
  const origins1 = [randomAsHex(100)];
  const origins2 = [randomAsHex(100), randomAsHex(100)];
  // Add 1 service endpoint with 1 origin
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addServiceEndpoint(spId1, spType, origins1, did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding 1 service endpoint with 1 origin is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Add 1 service endpoint with 2 origins
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.addServiceEndpoint(spId2, spType, origins2, did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for adding 1 service endpoint with 2 origins is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Removing 1 key
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.removeKeys([2], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for removing 1 key is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Removing 2 keys
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.removeKeys([3, 4], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for removing 2 keys is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Removing 1 controller
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.removeControllers([newControllers[0]], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for removing 1 controller is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Removing 2 controllers
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.removeControllers([newControllers[1], newControllers[2]], did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for removing 2 controllers is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Removing 1 service endpoint
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.removeServiceEndpoint(spId1, did, did, pair, 1);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for removing 1 service endpoint is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Remove DID
  bal0 = await getBalance(dock.api, account.address);
  await dock.did.remove(did, did, pair, 1, undefined, false);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for DID remove is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);
}

async function revocation() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();

  let bal0 = await getBalance(dock.api, account.address);
  await dock.did.new(did, [dk], [], false);
  let bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for DID write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  const registryId = createRandomRegistryId();
  // Create owners
  const owners = new Set();
  owners.add(did);

  bal0 = await getBalance(dock.api, account.address);
  const policy = new OneOfPolicy(owners);
  await dock.revocation.newRegistry(registryId, policy, false, false);
  bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid registry create is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  let revokeIds = new Set();
  revokeIds.add(randomAsHex(32));
  let [update, sig, nonce] = await dock.revocation.createSignedRevoke(registryId, revokeIds, did, pair, 1, { didModule: dock.did });
  const revTx = dock.revocation.createRevokeTx(update, [[sig, nonce]]);
  console.info(`Payment info of 1 revocation is ${(await revTx.paymentInfo(account.address))}`);

  const bal1 = await getBalance(dock.api, account.address);
  const r = await dock.signAndSend(revTx, false);
  console.info(`block ${r.status.asInBlock}`);
  const bal2 = await getBalance(dock.api, account.address);
  console.info(`Fee paid is ${parseInt(bal1[0]) - parseInt(bal2[0])}`);

  const count = 10;

  const revIds = [];
  let i = 0;
  while (i < count) {
    revIds.push(randomAsHex(32));
    i++;
  }
  revIds.sort();
  revokeIds = new BTreeSet();
  i = 0;
  while (i < count) {
    revokeIds.add(revIds[i]);
    i++;
  }

  [update, sig, nonce] = await dock.revocation.createSignedRevoke(registryId, revokeIds, did, pair, 1, { didModule: dock.did });
  const revTx1 = dock.revocation.createRevokeTx(update, [[sig, nonce]]);
  console.info(`Payment info of ${count} revocations is ${(await revTx1.paymentInfo(account.address))}`);

  const bal3 = await getBalance(dock.api, account.address);
  const r1 = await dock.signAndSend(revTx1, false);
  console.info(`block ${r1.status.asInBlock}`);
  const bal4 = await getBalance(dock.api, account.address);
  console.info(`Fee paid is ${parseInt(bal3[0]) - parseInt(bal4[0])}`);

  [update, sig, nonce] = await dock.revocation.createSignedRemove(registryId, did, pair, 1, { didModule: dock.did });
  const revTx2 = dock.revocation.createRemoveRegistryTx(update, [[sig, nonce]]);
  console.info(`Payment info of removing registry is ${(await revTx2.paymentInfo(account.address))}`);
}

async function anchors() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const anc = randomAsHex(32);
  const bal0 = await getBalance(dock.api, account.address);
  await dock.anchor.deploy(anc, false);
  const bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for anchor write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);
}

async function blobs() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const blobId = randomAsHex(32);
  const blob = {
    id: blobId,
    blob: randomAsHex(BLOB_MAX_BYTE_SIZE),
  };
  const bal0 = await getBalance(dock.api, account.address);
  await dock.blob.new(blob, did, pair, 1, { didModule: dock.did }, false);
  const bal00 = await getBalance(dock.api, account.address);
  console.info(`Fee paid for blob write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);
}

async function transfers() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  const bal1 = await getBalance(dock.api, account.address);

  const transfer = dock.api.tx.balances.transfer(BOB, 100);

  console.info(`Payment info of 1 transfer is ${(await transfer.paymentInfo(account.address))}`);

  const txs = Array(3).fill(dock.api.tx.balances.transfer(BOB, 100));

  const txBatch = dock.api.tx.utility.batch(txs);
  console.log(`Batch of ${txs.length} transfers`);
  console.info(`Payment info of batch is ${(await txBatch.paymentInfo(account.address))}`);

  await dock.signAndSend(transfer, false);

  const bal2 = await getBalance(dock.api, account.address);

  console.info(`Fee paid is ${parseInt(bal1[0]) - parseInt(bal2[0]) + 100}`);
}

async function main() {
  let action = 0;
  if (process.argv.length >= 3) {
    action = parseInt(process.argv[2]);
  }
  switch (action) {
    case 0:
      await dids();
      break;
    case 1:
      await revocation();
      break;
    case 2:
      await anchors();
      break;
    case 3:
      await blobs();
      break;
    case 4:
      await transfers();
      break;
    default:
      console.error('Invalid value for argument');
      process.exit(1);
  }
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
