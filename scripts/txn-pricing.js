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
import { ServiceEndpointType } from '../src/modules/did/service-endpoint';
import { hexToU8a, stringToHex, u8aToHex } from '@polkadot/util';
import {
  Accumulator,
  AccumulatorParams,
  initializeWasm,
  BBSPlusKeypairG2, PositiveAccumulator,
  BBSPlusSignatureParamsG1, WitnessUpdatePublicInfo
} from '@docknetwork/crypto-wasm-ts';
import BBSPlusModule from '../src/modules/bbs-plus';
import AccumulatorModule from '../src/modules/accumulator';

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

async function printFeePaid(dockApi, address, fn) {
  const before = await getBalance(dockApi, address);
  await fn();
  const after = await getBalance(dockApi, address);
  console.info(`Fee paid is ${parseInt(before[0]) - parseInt(after[0])}`);
}

async function dids() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, didKey] = getDidPair();

  await printFeePaid(dock.api, account.address, async () => {
    console.info('Writing DID');
    await dock.did.new(did, [didKey], [], false, undefined, false);
  });

  // Add DID key with all verification relationships
  const [, , dk1] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding DID key with all verification relationships');
    await dock.did.addKeys([dk1], did, did, pair, 1, undefined, false);
  });

  // Add DID key with only 1 verification relationship
  const [, , dk2] = getDidPair();
  dk2.verRels.setAuthentication();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding DID key with only 1 verification relationship');
    await dock.did.addKeys([dk2], did, did, pair, 1, undefined, false);
  });

  // Add DID key with only 2 verification relationships
  const [, , dk3] = getDidPair();
  dk3.verRels.setAuthentication();
  dk3.verRels.setAssertion();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding DID key with only 2 verification relationships');
    await dock.did.addKeys([dk3], did, did, pair, 1, undefined, false);
  });

  // Add DID key with 3 verification relationships
  const [, , dk4] = getDidPair();
  dk4.verRels.setAuthentication();
  dk4.verRels.setAssertion();
  dk4.verRels.setCapabilityInvocation();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding DID key with 3 verification relationships');
    await dock.did.addKeys([dk4], did, did, pair, 1, undefined, false);
  });

  // Add 2 DID keys with only 1 verification relationship
  const [, , dk5] = getDidPair();
  const [, , dk6] = getDidPair();
  dk5.verRels.setAuthentication();
  dk6.verRels.setCapabilityInvocation();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding 2 DID keys with only 1 verification relationship');
    await dock.did.addKeys([dk5, dk6], did, did, pair, 1, undefined, false);
  });

  // Add 3 DID keys with only 1 verification relationship
  const [, , dk7] = getDidPair();
  const [, , dk8] = getDidPair();
  const [, , dk9] = getDidPair();
  dk7.verRels.setAuthentication();
  dk8.verRels.setCapabilityInvocation();
  dk9.verRels.setAssertion();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding 3 DID keys with only 1 verification relationship');
    await dock.did.addKeys([dk7, dk8, dk9], did, did, pair, 1, undefined, false);
  });

  const newControllers = [createNewDockDID(), createNewDockDID(), createNewDockDID()];
  // Add 1 controller
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding 1 controller');
    await dock.did.addControllers([newControllers[0]], did, did, pair, 1, undefined, false);
  });

  // Add 2 controllers
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding 2 controllers');
    await dock.did.addControllers([newControllers[1], newControllers[2]], did, did, pair, 1, undefined, false);
  });

  const spType = new ServiceEndpointType();
  spType.setLinkedDomains();
  const spId1 = randomAsHex(10);
  const spId2 = randomAsHex(20);
  const origins1 = [randomAsHex(100)];
  const origins2 = [randomAsHex(100), randomAsHex(100)];
  // Add 1 service endpoint with 1 origin
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding 1 service endpoint with 1 origin');
    await dock.did.addServiceEndpoint(spId1, spType, origins1, did, did, pair, 1, undefined, false);
  });

  // Add 1 service endpoint with 2 origins
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding 1 service endpoint with 2 origins');
    await dock.did.addServiceEndpoint(spId2, spType, origins2, did, did, pair, 1, undefined, false);
  });

  // Adding a new DID which doesn't control itself but controlled by one other controller
  const [did1] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Writing a DID that has no key is controlled by 1 other controller');
    await dock.did.new(did1, [], [did], false);
  });

  // Adding a new DID which doesn't control itself but controlled by 2 other controllers
  const [did2] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Writing a DID that has no key is controlled by 2 other controllers');
    await dock.did.new(did2, [], [did, did1], false);
  });

  // Adding a new DID which doesn't control itself but has a key and controlled by one other controller
  const [did3, , dk_] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Writing a DID that has 1 key is controlled by 1 other controller');
    await dock.did.new(did3, [dk_], [did], false);
  });

  // Add DID key with all verification relationships to a DID that doesn't control itself
  const [, , dk__] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding DID key with all verification relationships to a DID that doesnt control itself');
    await dock.did.addKeys([dk__], did1, did, pair, 1, undefined, false);
  });

  // Removing 1 key
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing 1 key');
    await dock.did.removeKeys([2], did, did, pair, 1, undefined, false);
  });

  // Removing 2 keys
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing 2 keys');
    await dock.did.removeKeys([3, 4], did, did, pair, 1, undefined, false);
  });

  // Removing 1 controller
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing 1 controller');
    await dock.did.removeControllers([newControllers[0]], did, did, pair, 1, undefined, false);
  });

  // Removing 2 controllers
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing 2 controllers');
    await dock.did.removeControllers([newControllers[1], newControllers[2]], did, did, pair, 1, undefined, false);
  });

  // Removing 1 service endpoint
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing service endpoint');
    await dock.did.removeServiceEndpoint(spId1, did, did, pair, 1, undefined, false);
  });

  // Remove DID
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing DID');
    await dock.did.remove(did, did, pair, 1, undefined, false);
  });
}

async function revocation() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const registryId = createRandomRegistryId();
  // Create owners
  const owners = new Set();
  owners.add(did);

  const policy = new OneOfPolicy(owners);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Create Registry');
    await dock.revocation.newRegistry(registryId, policy, false, false);
  });

  let revokeIds;
  for (const count of [1, 2, 3, 5, 10]) {
    revokeIds = new BTreeSet();
    for (let i = 0; i < count; i++) {
      revokeIds.add(randomAsHex(32));
    }

    const [update, sig, nonce] = await dock.revocation.createSignedRevoke(registryId, revokeIds, did, pair, 1, { didModule: dock.did });
    const revTx = dock.revocation.createRevokeTx(update, [[sig, nonce]]);
    console.info(`Payment info of ${count} revocation is ${(await revTx.paymentInfo(account.address))}`);
    await printFeePaid(dock.api, account.address, async () => {
      await dock.signAndSend(revTx, false);
    });
  }

  const [update, sig, nonce] = await dock.revocation.createSignedRemove(registryId, did, pair, 1, { didModule: dock.did });
  const revTx = dock.revocation.createRemoveRegistryTx(update, [[sig, nonce]]);
  console.info(`Payment info of removing registry is ${(await revTx.paymentInfo(account.address))}`);

  await printFeePaid(dock.api, account.address, async () => {
    await dock.signAndSend(revTx, false);
  });
}

async function anchors() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const anc = randomAsHex(32);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Anchor write');
    await dock.anchor.deploy(anc, false);
  });
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
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Blob write');
    await dock.blob.new(blob, did, pair, 1, { didModule: dock.did }, false);
  });
}

async function bbsPlus() {
  await initializeWasm();

  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const label = stringToHex('My BBS+ params');

  // Add params with different attribute sizes
  for (const attributeCount of [10, 11, 12, 13, 14, 15]) {
    const bytes = u8aToHex(BBSPlusSignatureParamsG1.generate(attributeCount, hexToU8a(label)).toBytes());
    const params = BBSPlusModule.prepareAddParameters(bytes, undefined, label);
    await printFeePaid(dock.api, account.address, async () => {
      console.info(`Add BBS+ params with ${attributeCount} attributes`);
      await dock.bbsPlusModule.addParams(params, did, pair, 1, { didModule: dock.did }, false);
    });
  }

  // Add a public key
  const kp = BBSPlusKeypairG2.generate(BBSPlusSignatureParamsG1.generate(10, hexToU8a(label)));
  const pk = BBSPlusModule.prepareAddPublicKey(u8aToHex(kp.publicKey.bytes), undefined, [did, 1]);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Add a BBS+ key');
    await dock.bbsPlusModule.addPublicKey(pk, did, did, pair, 1, { didModule: dock.did }, false);
  });

  // Remove public key
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Remove BBS+ key');
    await dock.bbsPlusModule.removePublicKey(2, did, did, pair, 1, { didModule: dock.did }, false);
  });

  // Remove params
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Remove BBS+ params');
    await dock.bbsPlusModule.removeParams(1, did, pair, 1, { didModule: dock.did }, false);
  });
}

async function accumulator() {
  await initializeWasm();

  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const label = stringToHex('My Accumulator params');
  const bytes = u8aToHex(Accumulator.generateParams(hexToU8a(label)).bytes);
  const params = AccumulatorModule.prepareAddParameters(bytes, undefined, label);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Accumulator params write');
    await dock.accumulatorModule.addParams(params, did, pair, 1, { didModule: dock.did }, false);
  });

  const kp = Accumulator.generateKeypair(new AccumulatorParams(hexToU8a(params.bytes)));

  const pk = AccumulatorModule.prepareAddPublicKey(u8aToHex(kp.publicKey.bytes), undefined, [did, 1]);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Accumulator key write');
    await dock.accumulatorModule.addPublicKey(pk, did, pair, 1, { didModule: dock.did }, false);
  });

  const accumulatorPos = PositiveAccumulator.initialize(new AccumulatorParams(hexToU8a(params.bytes)), kp.secretKey);
  const accumulatorIdPos = randomAsHex(32);
  const accumulatedPos = u8aToHex(accumulatorPos.accumulated);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding a positive accumulator');
    await dock.accumulatorModule.addPositiveAccumulator(accumulatorIdPos, accumulatedPos, [did, 1], did, pair, 1, { didModule: dock.did }, false);
  });

  const accumulatorIdUni = randomAsHex(32);
  const accumulatedUni = u8aToHex(accumulatorPos.accumulated);
  await printFeePaid(dock.api, account.address, async () => {
    console.info('Adding a universal accumulator');
    await dock.accumulatorModule.addUniversalAccumulator(accumulatorIdUni, accumulatedUni, [did, 1], 10000, did, pair, 1, { didModule: dock.did }, false);
  });

  const start = 10;
  // The following isn't correct logically but is good enough for getting transaction pricing
  const accumulated = u8aToHex(accumulatorPos.accumulated);
  for (let i = 1; i <= 5; i++) {
    const members = [];
    for (let j = 0; j < i; j++) {
      const member = Accumulator.encodePositiveNumberAsAccumulatorMember(start * 10 * i + j);
      members.push(member);
    }
    let witUpd = u8aToHex(WitnessUpdatePublicInfo.new(hexToU8a(accumulated), members, [], kp.secretKey).value);
    await printFeePaid(dock.api, account.address, async () => {
      console.info(`Updating a positive accumulator with ${members.length} additions`);
      await dock.accumulatorModule.updateAccumulator(accumulatorIdPos, accumulated, { additions: members.map((m) => u8aToHex(m)), witnessUpdateInfo: witUpd }, did, pair, 1, { didModule: dock.did }, false);
    });

    witUpd = u8aToHex(WitnessUpdatePublicInfo.new(hexToU8a(accumulated), [], members, kp.secretKey).value);

    await printFeePaid(dock.api, account.address, async () => {
      console.info(`Updating a positive accumulator with ${members.length} removals`);
      await dock.accumulatorModule.updateAccumulator(accumulatorIdPos, accumulated, { removals: members.map((m) => u8aToHex(m)), witnessUpdateInfo: witUpd }, did, pair, 1, { didModule: dock.did }, false);
    });
  }

  await printFeePaid(dock.api, account.address, async () => {
    console.info('Removing a positive accumulator');
    await dock.accumulatorModule.removeAccumulator(accumulatorIdPos, did, pair, 1, { didModule: dock.did }, false);
  });
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
    case 5:
      await bbsPlus();
      break;
    case 6:
      await accumulator();
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
