// Txn pricing and weights

import { BTreeMap, BTreeSet } from "@polkadot/types";

import { randomAsHex } from "@polkadot/util-crypto";
import { hexToU8a, stringToHex, u8aToHex } from "@polkadot/util";
import {
  Accumulator,
  AccumulatorParams,
  initializeWasm,
  BBSPlusKeypairG2,
  PositiveAccumulator,
  BBSPlusSignatureParamsG1,
  VBWitnessUpdateInfo,
} from "@docknetwork/crypto-wasm-ts";
import dock from "../src/index";
import { DockDid, DidKeypair, DidMethodKey } from "../src/utils/did";
import {
  generateEcdsaSecp256k1Keypair,
  getPublicKeyFromKeyringPair,
} from "../src/utils/misc";
import { createRandomRegistryId, OneOfPolicy } from "../src/utils/revocation";
import { getBalance } from "./helpers";
import { DidKey, VerificationRelationship } from "../src/public-keys";
import { ServiceEndpointType } from "../src/modules/did/service-endpoint";
import BBSPlusModule from "../src/modules/bbs-plus";
import AccumulatorModule from "../src/modules/accumulator";
import StatusList2021Credential from "../src/status-list-credential/status-list2021-credential";
import { getKeyDoc } from "../src/utils/vc/helpers";

require("dotenv").config();

const { FullNodeEndpoint, EndowedSecretURI } = process.env;

const unit = 1e6;

function getDidPair() {
  const did = DockDid.random();
  // Creating ECDSA pair because its most expensive to verify and thus gives max fees
  const pair = generateEcdsaSecp256k1Keypair(randomAsHex(32));
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  return [did, new DidKeypair(pair, 1), didKey];
}

async function printFeePaid(dockApi, address, fn) {
  const before = await getBalance(dockApi, address);
  await fn();
  const after = await getBalance(dockApi, address);
  console.info(
    `Fee paid is ${(parseInt(before[0]) - parseInt(after[0])) / unit}`,
  );
}

async function dids() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  // Using secp curve as its most expensive to verify on node
  const didMethodKeyPair = DidKeypair.randomSecp256k1();
  const didMethodKey = DidMethodKey.fromKeypair(didMethodKeyPair);

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Writing did:key");
    await dock.did.newDidMethodKey(didMethodKey.asDidMethodKey, false);
  });

  const [did, pair, didKey] = getDidPair();

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Writing did:dock");
    await dock.did.new(did, [didKey], [], false, undefined, false);
  });

  // Add DID key with all verification relationships
  const [, , dk1] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding DID key with all verification relationships");
    await dock.did.addKeys([dk1], did, did, pair, undefined, false);
  });

  // Add DID key with only 1 verification relationship
  const [, , dk2] = getDidPair();
  dk2.verRels.setAuthentication();
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding DID key with only 1 verification relationship");
    await dock.did.addKeys([dk2], did, did, pair, undefined, false);
  });

  // Add DID key with only 2 verification relationships
  const [, , dk3] = getDidPair();
  dk3.verRels.setAuthentication();
  dk3.verRels.setAssertion();
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding DID key with only 2 verification relationships");
    await dock.did.addKeys([dk3], did, did, pair, undefined, false);
  });

  // Add DID key with 3 verification relationships
  const [, , dk4] = getDidPair();
  dk4.verRels.setAuthentication();
  dk4.verRels.setAssertion();
  dk4.verRels.setCapabilityInvocation();
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding DID key with 3 verification relationships");
    await dock.did.addKeys([dk4], did, did, pair, undefined, false);
  });

  // Add 2 DID keys with only 1 verification relationship
  const [, , dk5] = getDidPair();
  const [, , dk6] = getDidPair();
  dk5.verRels.setAuthentication();
  dk6.verRels.setCapabilityInvocation();
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 2 DID keys with only 1 verification relationship");
    await dock.did.addKeys([dk5, dk6], did, did, pair, undefined, false);
  });

  // Add 3 DID keys with only 1 verification relationship
  const [, , dk7] = getDidPair();
  const [, , dk8] = getDidPair();
  const [, , dk9] = getDidPair();
  dk7.verRels.setAuthentication();
  dk8.verRels.setCapabilityInvocation();
  dk9.verRels.setAssertion();
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 3 DID keys with only 1 verification relationship");
    await dock.did.addKeys([dk7, dk8, dk9], did, did, pair, undefined, false);
  });

  const newControllers = [DockDid.random(), DockDid.random(), DockDid.random()];
  // Add 1 controller
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 controller");
    await dock.did.addControllers(
      [newControllers[0]],
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  // Add 2 controllers
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 2 controllers");
    await dock.did.addControllers(
      [newControllers[1], newControllers[2]],
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  const spType = new ServiceEndpointType();
  spType.setLinkedDomains();
  const spId1 = randomAsHex(10);
  const spId2 = randomAsHex(20);
  const origins1 = [randomAsHex(100)];
  const origins2 = [randomAsHex(100), randomAsHex(100)];
  // Add 1 service endpoint with 1 origin
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 service endpoint with 1 origin");
    await dock.did.addServiceEndpoint(
      spId1,
      spType,
      origins1,
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  // Add 1 service endpoint with 2 origins
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 service endpoint with 2 origins");
    await dock.did.addServiceEndpoint(
      spId2,
      spType,
      origins2,
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  // Adding a new DID which doesn't control itself but controlled by one other controller
  const [did1] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info(
      "Writing a DID that has no key is controlled by 1 other controller",
    );
    await dock.did.new(did1, [], [did], false);
  });

  // Adding a new DID which doesn't control itself but controlled by 2 other controllers
  const [did2] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info(
      "Writing a DID that has no key is controlled by 2 other controllers",
    );
    await dock.did.new(did2, [], [did, did1], false);
  });

  // Adding a new DID which doesn't control itself but has a key and controlled by one other controller
  const [did3, , dk_] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info(
      "Writing a DID that has 1 key is controlled by 1 other controller",
    );
    await dock.did.new(did3, [dk_], [did], false);
  });

  // Add DID key with all verification relationships to a DID that doesn't control itself
  const [, , dk__] = getDidPair();
  await printFeePaid(dock.api, account.address, async () => {
    console.info(
      "Adding DID key with all verification relationships to a DID that doesnt control itself",
    );
    await dock.did.addKeys([dk__], did1, did, pair, undefined, false);
  });

  // Removing 1 key
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing 1 key");
    await dock.did.removeKeys([2], did, did, pair, undefined, false);
  });

  // Removing 2 keys
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing 2 keys");
    await dock.did.removeKeys([3, 4], did, did, pair, undefined, false);
  });

  // Removing 1 controller
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing 1 controller");
    await dock.did.removeControllers(
      [newControllers[0]],
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  // Removing 2 controllers
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing 2 controllers");
    await dock.did.removeControllers(
      [newControllers[1], newControllers[2]],
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  // Removing 1 service endpoint
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing service endpoint");
    await dock.did.removeServiceEndpoint(
      spId1,
      did,
      did,
      pair,
      undefined,
      false,
    );
  });

  // Remove DID
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing DID");
    await dock.did.remove(did, did, pair, undefined, false);
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
  owners.add(DockDid.from(did));

  const policy = new OneOfPolicy(owners);
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Create Registry");
    await dock.revocation.newRegistry(registryId, policy, false, false);
  });

  let revokeIds;
  for (const count of [1, 2, 3, 5, 10]) {
    revokeIds = new BTreeSet(dock.api.registry, "RevokeId");
    for (let i = 0; i < count; i++) {
      revokeIds.add(randomAsHex(32));
    }

    const [update, sig, nonce] = await dock.revocation.createSignedRevoke(
      registryId,
      revokeIds,
      did,
      pair,
      { didModule: dock.did },
    );
    const revTx = dock.revocation.createRevokeTx(update, [{ nonce, sig }]);
    console.info(
      `Payment info of ${count} revocation is ${await revTx.paymentInfo(account.address)}`,
    );
    await printFeePaid(dock.api, account.address, async () => {
      await dock.signAndSend(revTx, false);
    });
  }

  const [update, sig, nonce] = await dock.revocation.createSignedRemove(
    registryId,
    did,
    pair,
    { didModule: dock.did },
  );
  const revTx = dock.revocation.createRemoveRegistryTx(update, [
    { nonce, sig },
  ]);
  console.info(
    `Payment info of removing registry is ${await revTx.paymentInfo(account.address)}`,
  );

  await printFeePaid(dock.api, account.address, async () => {
    await dock.signAndSend(revTx, false);
  });
}

async function anchors() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const anc = randomAsHex(32);
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Anchor write");
    await dock.anchor.deploy(anc, false);
  });
}

async function blobs() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  for (const blobSize of [100, 200, 300]) {
    await printFeePaid(dock.api, account.address, async () => {
      console.info(`Blob write of ${blobSize} bytes`);
      const blobId = randomAsHex(32);
      const blob = {
        id: blobId,
        blob: randomAsHex(blobSize),
      };
      await dock.blob.new(blob, did, pair, { didModule: dock.did }, false);
    });
  }
}

async function bbsPlus() {
  await initializeWasm();

  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const label = stringToHex("My BBS+ params");

  // Add params with different attribute sizes
  for (const attributeCount of [10, 11, 12, 13, 14, 15]) {
    const bytes = u8aToHex(
      BBSPlusSignatureParamsG1.generate(
        attributeCount,
        hexToU8a(label),
      ).toBytes(),
    );
    const params = BBSPlusModule.prepareAddParameters(bytes, undefined, label);
    await printFeePaid(dock.api, account.address, async () => {
      console.info(`Add BBS+ params with ${attributeCount} attributes`);
      await dock.bbsPlusModule.addParams(
        params,
        did,
        pair,
        { didModule: dock.did },
        false,
      );
    });
  }

  // Add a public key
  const kp = BBSPlusKeypairG2.generate(
    BBSPlusSignatureParamsG1.generate(10, hexToU8a(label)),
  );
  const pk = BBSPlusModule.prepareAddPublicKey(
    u8aToHex(kp.publicKey.bytes),
    undefined,
    [did, 1],
  );
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Add a BBS+ key");
    await dock.bbsPlusModule.addPublicKey(
      pk,
      did,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });

  // Remove public key
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Remove BBS+ key");
    await dock.bbsPlusModule.removePublicKey(
      2,
      did,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });

  // Remove params
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Remove BBS+ params");
    await dock.bbsPlusModule.removeParams(
      1,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });
}

async function accumulator() {
  await initializeWasm();

  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const label = stringToHex("My Accumulator params");
  const bytes = u8aToHex(Accumulator.generateParams(hexToU8a(label)).bytes);
  const params = AccumulatorModule.prepareAddParameters(
    bytes,
    undefined,
    label,
  );
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Accumulator params write");
    await dock.accumulatorModule.addParams(
      params,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });

  const kp = Accumulator.generateKeypair(
    new AccumulatorParams(hexToU8a(params.bytes)),
  );

  const pk = AccumulatorModule.prepareAddPublicKey(
    u8aToHex(kp.publicKey.bytes),
    undefined,
    [did, 1],
  );
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Accumulator key write");
    await dock.accumulatorModule.addPublicKey(
      pk,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });

  const accumulatorPos = PositiveAccumulator.initialize(
    new AccumulatorParams(hexToU8a(params.bytes)),
    kp.secretKey,
  );
  const accumulatorIdPos = randomAsHex(32);
  const accumulatedPos = u8aToHex(accumulatorPos.accumulated);
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding a positive accumulator");
    await dock.accumulatorModule.addPositiveAccumulator(
      accumulatorIdPos,
      accumulatedPos,
      [did, 1],
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });

  const accumulatorIdUni = randomAsHex(32);
  const accumulatedUni = u8aToHex(accumulatorPos.accumulated);
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding a universal accumulator");
    await dock.accumulatorModule.addUniversalAccumulator(
      accumulatorIdUni,
      accumulatedUni,
      [did, 1],
      10000,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });

  const start = 10;
  // The following isn't correct logically but is good enough for getting transaction pricing
  const accumulated = u8aToHex(accumulatorPos.accumulated);
  for (let i = 1; i <= 5; i++) {
    const members = [];
    for (let j = 0; j < i; j++) {
      const member = Accumulator.encodePositiveNumberAsAccumulatorMember(
        start * 10 * i + j,
      );
      members.push(member);
    }
    let witUpd = u8aToHex(
      VBWitnessUpdateInfo.new(hexToU8a(accumulated), members, [], kp.secretKey)
        .value,
    );
    await printFeePaid(dock.api, account.address, async () => {
      console.info(
        `Updating a positive accumulator with ${members.length} additions`,
      );
      await dock.accumulatorModule.updateAccumulator(
        accumulatorIdPos,
        accumulated,
        {
          additions: members.map((m) => u8aToHex(m)),
          witnessUpdateInfo: witUpd,
        },
        did,
        pair,
        { didModule: dock.did },
        false,
      );
    });

    witUpd = u8aToHex(
      VBWitnessUpdateInfo.new(hexToU8a(accumulated), [], members, kp.secretKey)
        .value,
    );

    await printFeePaid(dock.api, account.address, async () => {
      console.info(
        `Updating a positive accumulator with ${members.length} removals`,
      );
      await dock.accumulatorModule.updateAccumulator(
        accumulatorIdPos,
        accumulated,
        {
          removals: members.map((m) => u8aToHex(m)),
          witnessUpdateInfo: witUpd,
        },
        did,
        pair,
        { didModule: dock.did },
        false,
      );
    });
  }

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing a positive accumulator");
    await dock.accumulatorModule.removeAccumulator(
      accumulatorIdPos,
      did,
      pair,
      { didModule: dock.did },
      false,
    );
  });
}

async function transfers() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

  const bal1 = await getBalance(dock.api, account.address);

  const amount = 10 * unit;
  const transfer = dock.api.tx.balances.transfer(BOB, amount);

  console.info(
    `Payment info of 1 transfer is ${await transfer.paymentInfo(account.address)}`,
  );
  await dock.signAndSend(transfer, false);

  const bal2 = await getBalance(dock.api, account.address);

  console.log(parseInt(bal1[0]));
  console.log(parseInt(bal2[0]));

  console.info(
    `Fee paid is ${(parseInt(bal1[0]) - parseInt(bal2[0]) - amount) / unit}`,
  );

  const txs = Array(3).fill(dock.api.tx.balances.transfer(BOB, amount));

  const txBatch = dock.api.tx.utility.batch(txs);
  console.log(`Batch of ${txs.length} transfers`);
  console.info(
    `Payment info of batch is ${await txBatch.paymentInfo(account.address)}`,
  );
}

async function statusList() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const [did, pair, dk] = getDidPair();
  await dock.did.new(did, [dk], [], false);

  const statusListCredId = randomAsHex(32);
  const ownerKey = getKeyDoc(
    did,
    pair.keyPair,
    "EcdsaSecp256k1VerificationKey2019",
  );

  const owners = new Set();
  owners.add(DockDid.from(did));
  const policy = new OneOfPolicy(owners);

  const cred = await StatusList2021Credential.create(
    ownerKey,
    statusListCredId,
  );

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Creating status list credential");
    await dock.statusListCredential.createStatusListCredential(
      statusListCredId,
      cred,
      policy,
      false,
    );
  });

  const revokeIds = new Set();

  revokeIds.add((Math.random() * 10e3) | 0);

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Updating status list credential with 1 item");
    await cred.update(ownerKey, { revokeIndices: revokeIds });
    const [revoke, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        cred,
        did,
        pair,
        { didModule: dock.did },
      );
    await dock.statusListCredential.updateStatusListCredential(
      revoke,
      [{ nonce, sig }],
      false,
    );
  });

  revokeIds.add((Math.random() * 10e3) | 0);

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Updating status list credential with 2 items");
    await cred.update(ownerKey, { revokeIndices: revokeIds });
    const [revoke, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        cred,
        did,
        pair,
        { didModule: dock.did },
      );
    await dock.statusListCredential.updateStatusListCredential(
      revoke,
      [{ nonce, sig }],
      false,
    );
  });

  revokeIds.add((Math.random() * 10e3) | 0);

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Updating status list credential with 3 items");
    await cred.update(ownerKey, { revokeIndices: revokeIds });
    const [revoke, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        cred,
        did,
        pair,
        { didModule: dock.did },
      );
    await dock.statusListCredential.updateStatusListCredential(
      revoke,
      [{ nonce, sig }],
      false,
    );
  });

  for (let i = 0; i < 98; i++) {
    revokeIds.add((Math.random() * 10e3) | 0);
  }

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Updating status list credential with 100 items");
    await cred.update(ownerKey, { revokeIndices: revokeIds });
    const [revoke, sig, nonce] =
      await dock.statusListCredential.createSignedUpdateStatusListCredential(
        statusListCredId,
        cred,
        did,
        pair,
        { didModule: dock.did },
      );
    await dock.statusListCredential.updateStatusListCredential(
      revoke,
      [{ nonce, sig }],
      false,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing status list credential");
    const [remove, sig, nonce] =
      await dock.statusListCredential.createSignedRemoveStatusListCredential(
        statusListCredId,
        did,
        pair,
        { didModule: dock.did },
      );
    await dock.statusListCredential.removeStatusListCredential(
      remove,
      [{ nonce, sig }],
      false,
    );
  });
}

async function trustRegistry() {
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  let [cDid, cPair, cDk] = getDidPair();
  await dock.did.new(cDid, [cDk], [], false);

  let [i1Did, i1Pair, i1Dk] = getDidPair();
  await dock.did.new(i1Did, [i1Dk], [], false);

  let [i2Did, i2Pair, i2Dk] = getDidPair();
  await dock.did.new(i2Did, [i2Dk], [], false);

  let [i3Did, i3Pair, i3Dk] = getDidPair();
  await dock.did.new(i3Did, [i3Dk], [], false);

  let [v1Did, v1Pair, v1Dk] = getDidPair();
  await dock.did.new(v1Did, [v1Dk], [], false);

  let [v2Did, v2Pair, v2Dk] = getDidPair();
  await dock.did.new(v2Did, [v2Dk], [], false);

  cDid = DockDid.fromQualifiedString(cDid);
  i1Did = DockDid.fromQualifiedString(i1Did);
  i2Did = DockDid.fromQualifiedString(i2Did);
  i3Did = DockDid.fromQualifiedString(i3Did);
  v1Did = DockDid.fromQualifiedString(v1Did);
  v2Did = DockDid.fromQualifiedString(v2Did);

  const trustRegistryId = randomAsHex(32);
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Creating trust registry");
    await dock.trustRegistry.initOrUpdate(
      cDid,
      trustRegistryId,
      randomAsHex(20).toString(),
      randomAsHex(450).toString(),
      cPair,
      dock,
    );
  });

  const schemaId1 = randomAsHex(32);
  const schemaId2 = randomAsHex(32);

  const schemas = new BTreeMap(
    dock.api.registry,
    "TrustRegistrySchemaId",
    "TrustRegistrySchemaMetadata",
  );
  const issuers = new BTreeMap(
    dock.api.registry,
    "Issuer",
    "VerificationPrices",
  );
  const verifiers = new BTreeSet(dock.api.registry, "Verifier");

  const issuerPrices1 = new BTreeMap(
    dock.api.registry,
    "String",
    "VerificationPrice",
  );
  issuerPrices1.set("A", 20);
  const issuerPrices2 = new BTreeMap(
    dock.api.registry,
    "String",
    "VerificationPrice",
  );
  issuerPrices2.set("A", 20);
  issuerPrices2.set("B", 30);

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 issuer with 1 price");
    issuers.set(i1Did, issuerPrices1);
    schemas.set(schemaId1, {
      issuers,
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Set: schemas },
      cPair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding second issuer with 1 price");
    issuers.set(i2Did, issuerPrices1);
    schemas.set(schemaId1, {
      issuers,
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Set: schemas },
      cPair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    // This will be less costly than previous because this doesn't add a new issuer
    console.info("Adding 2 prices for both issuers");
    issuers.set(i1Did, issuerPrices2);
    issuers.set(i2Did, issuerPrices2);
    schemas.set(schemaId1, {
      issuers,
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Set: schemas },
      cPair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 verifier");
    verifiers.add(v1Did);
    schemas.set(schemaId1, {
      verifiers,
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Set: schemas },
      cPair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 more verifier to the same schema");
    verifiers.add(v2Did);
    schemas.set(schemaId1, {
      verifiers,
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Set: schemas },
      cPair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding 1 delegated issuer");
    const issuers = new BTreeSet(dock.api.registry, "Issuer");
    issuers.add(i3Did);
    await dock.trustRegistry.updateDelegatedIssuers(
      i1Did,
      trustRegistryId,
      { Set: issuers },
      i1Pair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Suspending 1 issuer");
    await dock.trustRegistry.suspendIssuers(
      cDid,
      trustRegistryId,
      [i1Did],
      cPair,
      dock,
    );
  });

  const schemas2 = new BTreeMap(
    dock.api.registry,
    "TrustRegistrySchemaId",
    "TrustRegistrySchemaMetadata",
  );
  let issuers2 = new BTreeMap(
    dock.api.registry,
    "Issuer",
    "VerificationPrices",
  );

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding issuer with 1 price to a new schema using `Modify`");
    issuers2.set(i2Did, issuerPrices1);
    schemas2.set(schemaId2, {
      Add: {
        issuers: issuers2,
      },
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Modify: schemas2 },
      cPair,
      dock,
    );
  });

  const schemaId3 = randomAsHex(32);
  await printFeePaid(dock.api, account.address, async () => {
    console.info("Adding issuer with 1 price to a new schema");
    const schemas3 = new BTreeMap(
      dock.api.registry,
      "TrustRegistrySchemaId",
      "TrustRegistrySchemaMetadata",
    );
    issuers2 = new BTreeMap(dock.api.registry, "Issuer", "VerificationPrices");
    issuers2.set(i2Did, issuerPrices1);
    schemas3.set(schemaId3, {
      issuers: issuers2,
    });
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Set: schemas3 },
      cPair,
      dock,
    );
  });

  await printFeePaid(dock.api, account.address, async () => {
    console.info("Removing 1 existing schema");
    const schemas = new BTreeMap(
      dock.api.registry,
      "TrustRegistrySchemaId",
      "TrustRegistrySchemaMetadata",
    );
    schemas.set(schemaId3, "Remove");
    await dock.trustRegistry.setSchemasMetadata(
      cDid,
      trustRegistryId,
      { Modify: schemas },
      cPair,
      dock,
    );
  });
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
    case 7:
      await statusList();
      break;
    case 8:
      await trustRegistry();
      break;
    default:
      console.error("Invalid value for argument");
      process.exit(1);
  }
  process.exit(0);
}

dock
  .init({
    address: FullNodeEndpoint,
  })
  .then(main)
  .catch((error) => {
    console.error("Error occurred somewhere, it was caught!", error);
    process.exit(1);
  });
