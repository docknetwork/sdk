// Txn pricing and weights

import { BTreeSet } from '@polkadot/types';

import { randomAsHex } from '@polkadot/util-crypto';
import dock from '../src/api';
import {
  createKeyDetail,
  createNewDockDID,
  createSignedDidRemoval,
  createSignedKeyUpdate,
  getHexIdentifierFromDID,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { createRandomRegistryId, KeyringPairDidKeys, OneOfPolicy } from '../src/utils/revocation';
import { BLOB_MAX_BYTE_SIZE } from '../src/modules/blob';

require('dotenv').config();

const { FullNodeEndpoint, EndowedSecretURI } = process.env;

function getDidPair() {
  const did = createNewDockDID();
  const seed = randomAsHex(32);
  const pair = dock.keyring.addFromUri(seed, null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, did);
  return [did, pair, keyDetail];
}

async function dids() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, keyDetail] = getDidPair();

  let bal0 = await dock.poaModule.getBalance(account.address);
  await dock.did.new(did, keyDetail, false);
  let bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid for DID write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  // Update DID key to the following
  const [, newPair] = getDidPair();
  // the following function will figure out the correct PublicKey type from the `type` property of `newPair`
  const newPk = getPublicKeyFromKeyringPair(newPair);
  const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, did, newPk, pair);

  bal0 = await dock.poaModule.getBalance(account.address);
  await dock.did.updateKey(keyUpdate, signature, false);
  bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid for DID update is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  const [didRemoval, signature1] = await createSignedDidRemoval(dock.did, did, newPair);
  bal0 = await dock.poaModule.getBalance(account.address);
  await dock.did.remove(didRemoval, signature1, false);
  bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid for DID remove is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);
}

async function revocation() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  // Create a did/keypair proof map
  const didKeys = new KeyringPairDidKeys();
  const [did, pair, keyDetail] = getDidPair();

  let bal0 = await dock.poaModule.getBalance(account.address);
  await dock.did.new(did, keyDetail, false);
  let bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid for DID write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  didKeys.set(did, pair);

  const registryId = createRandomRegistryId();
  // Create a list of controllers
  const controllers = new Set();
  controllers.add(did);

  bal0 = await dock.poaModule.getBalance(account.address);
  const policy = new OneOfPolicy(controllers);
  await dock.revocation.newRegistry(registryId, policy, false, false);
  bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid registry create is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);

  const revokeId = new Set();
  revokeId.add(randomAsHex(32));
  const lastModified = await dock.revocation.getBlockNoForLastChangeToRegistry(registryId);
  const revTx = dock.revocation.createRevokeTx(registryId, revokeId, lastModified, didKeys);
  console.info(`Payment info of 1 revocation is ${(await revTx.paymentInfo(account.address))}`);

  const bal1 = await dock.poaModule.getBalance(account.address);
  const r = await dock.signAndSend(revTx, false);
  console.info(`block ${r.status.asInBlock}`);
  const bal2 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid is ${parseInt(bal1[0]) - parseInt(bal2[0])}`);

  const count = 100;

  const revIds = [];
  let i = 0;
  while (i < count) {
    revIds.push(randomAsHex(32));
    i++;
  }
  revIds.sort();
  const revokeIds = new BTreeSet();
  i = 1;
  while (i < count) {
    revokeIds.add(revIds[i]);
    i++;
  }

  const revTx1 = dock.revocation.createRevokeTx(registryId, revokeIds, await dock.revocation.getBlockNoForLastChangeToRegistry(registryId), didKeys);
  console.info(`Payment info of ${count} revocations is ${(await revTx1.paymentInfo(account.address))}`);

  const bal3 = await dock.poaModule.getBalance(account.address);
  const r1 = await dock.signAndSend(revTx1, false);
  console.info(`block ${r1.status.asInBlock}`);
  const bal4 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid is ${parseInt(bal3[0]) - parseInt(bal4[0])}`);
}

async function anchors() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const anc = randomAsHex(32);
  const bal0 = await dock.poaModule.getBalance(account.address);
  await dock.anchor.deploy(anc, false);
  const bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid for anchor write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);
}

async function blobs() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, keyDetail] = getDidPair();
  await dock.did.new(did, keyDetail, false);

  const blobId = randomAsHex(32);
  const blob = {
    id: blobId,
    blob: randomAsHex(BLOB_MAX_BYTE_SIZE),
    author: getHexIdentifierFromDID(did),
  };
  const bal0 = await dock.poaModule.getBalance(account.address);
  await dock.blob.new(blob, pair, undefined, false);
  const bal00 = await dock.poaModule.getBalance(account.address);
  console.info(`Fee paid for blob write is ${parseInt(bal0[0]) - parseInt(bal00[0])}`);
}

async function transfers() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  const bal1 = await dock.poaModule.getBalance(account.address);

  const transfer = dock.api.tx.balances.transfer(BOB, 100);

  console.info(`Payment info of 1 transfer is ${(await transfer.paymentInfo(account.address))}`);

  const txs = Array(3).fill(dock.api.tx.balances.transfer(BOB, 100));

  const txBatch = dock.api.tx.utility.batch(txs);
  console.log(`Batch of ${txs.length} transfers`);
  console.info(`Payment info of batch is ${(await txBatch.paymentInfo(account.address))}`);

  await dock.signAndSend(transfer, false);

  const bal2 = await dock.poaModule.getBalance(account.address);

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
    case 3:
      await anchors();
      break;
    case 4:
      await blobs();
      break;
    case 5:
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
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
