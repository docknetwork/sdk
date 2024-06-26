import { BTreeSet } from "@polkadot/types";
import {
  Accumulator,
  AccumulatorParams,
  initializeWasm,
  BBSPlusKeypairG2,
  PositiveAccumulator,
  BBSPlusSignatureParamsG1,
  VBWitnessUpdateInfo,
} from "@docknetwork/crypto-wasm-ts";
import { BN, hexToU8a, stringToHex, u8aToHex } from "@polkadot/util";
import { randomAsHex } from "@polkadot/util-crypto";
import { DockAPI } from "../../src/index";
import { DockDid, DockDidOrDidMethodKey } from "../../src/utils/did";
import { createDidPair, getBalance } from "./helpers";
import {
  createRandomRegistryId,
  OneOfPolicy,
} from "../../src/utils/revocation";
import { BLOB_MAX_BYTE_SIZE } from "../../src/modules/blob";
import { ServiceEndpointType } from "../../src/modules/did/service-endpoint";
import BBSPlusModule from "../../src/modules/bbs-plus";
import AccumulatorModule from "../../src/modules/accumulator";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
  TestAccountCouncilMemberURI,
} from "../test-constants";

// TODO: Unskip this test
describe.skip("Fees", () => {
  const dock = new DockAPI();

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });

    await initializeWasm();
  });

  beforeEach(() => {
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  const withPaidFeeAssertion = async (
    sendTx,
    assert,
    applyToBefore = Object.create(null),
  ) => {
    const { address } = dock.getAccount();

    const before = await getBalance(dock.api, address);
    const result = await sendTx();
    const after = await getBalance(dock.api, address);

    // Compare free balances with `10 DOCK` precision
    assert(Math.round((before.free - after.free) / 1e7) * 10);

    for (const prop of ["feeFrozen", "reserved", "miscFrozen"]) {
      const beforeProp = applyToBefore[prop]
        ? applyToBefore[prop](before[prop])
        : before[prop];

      expect([prop, "=", after[prop].toString()]).toEqual([
        prop,
        "=",
        beforeProp.toString(),
      ]);
    }

    return result;
  };

  const withPaidFeeMatchingSnapshot = (sendTx, applyToBefore) =>
    withPaidFeeAssertion(
      sendTx,
      (fee) => expect(fee).toMatchSnapshot(),
      applyToBefore,
    );

  const throwingWithPaidFeeAssertion = async (
    sendTx,
    assert,
    applyToBefore,
  ) => {
    let throwed = false;
    await withPaidFeeAssertion(
      async () => {
        try {
          await sendTx();
        } catch {
          throwed = true;
        }
      },
      assert,
      applyToBefore,
    );
    expect(throwed).toBe(true);
  };

  test("dids", async () => {
    const [did, pair, didKey] = createDidPair(dock);

    await withPaidFeeMatchingSnapshot(() =>
      dock.did.new(did, [didKey], [], false, undefined, false),
    );

    // Add DID key with all verification relationships
    const [, , dk1] = createDidPair(dock);
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk1], did, did, pair, undefined, false),
    );

    // Add DID key with only 1 verification relationship
    const [, , dk2] = createDidPair(dock);
    dk2.verRels.setAuthentication();
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk2], did, did, pair, undefined, false),
    );

    // Add DID key with only 2 verification relationships
    const [, , dk3] = createDidPair(dock);
    dk3.verRels.setAuthentication();
    dk3.verRels.setAssertion();
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk3], did, did, pair, undefined, false),
    );

    // Add DID key with 3 verification relationships
    const [, , dk4] = createDidPair(dock);
    dk4.verRels.setAuthentication();
    dk4.verRels.setAssertion();
    dk4.verRels.setCapabilityInvocation();
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk4], did, did, pair, undefined, false),
    );

    // Add 2 DID keys with only 1 verification relationship
    const [, , dk5] = createDidPair(dock);
    const [, , dk6] = createDidPair(dock);
    dk5.verRels.setAuthentication();
    dk6.verRels.setCapabilityInvocation();
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk5, dk6], did, did, pair, undefined, false),
    );

    // Add 3 DID keys with only 1 verification relationship
    const [, , dk7] = createDidPair(dock);
    const [, , dk8] = createDidPair(dock);
    const [, , dk9] = createDidPair(dock);
    dk7.verRels.setAuthentication();
    dk8.verRels.setCapabilityInvocation();
    dk9.verRels.setAssertion();
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk7, dk8, dk9], did, did, pair, 1, undefined, false),
    );

    const newControllers = [
      DockDid.random(),
      DockDid.random(),
      DockDid.random(),
    ];
    // Add 1 controller
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addControllers(
        [newControllers[0]],
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    // Add 2 controllers
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addControllers(
        [newControllers[1], newControllers[2]],
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    const spType = new ServiceEndpointType();
    spType.setLinkedDomains();
    const spId1 = randomAsHex(10);
    const spId2 = randomAsHex(20);
    const origins1 = [randomAsHex(100)];
    const origins2 = [randomAsHex(100), randomAsHex(100)];
    // Add 1 service endpoint with 1 origin
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addServiceEndpoint(
        spId1,
        spType,
        origins1,
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    // Add 1 service endpoint with 2 origins
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addServiceEndpoint(
        spId2,
        spType,
        origins2,
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    // Adding a new DID which doesn't control itself but controlled by one other controller
    const [did1] = createDidPair(dock);
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.new(did1, [], [did], false),
    );

    // Adding a new DID which doesn't control itself but controlled by 2 other controllers
    const [did2] = createDidPair(dock);
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.new(did2, [], [did, did1], false),
    );

    // Adding a new DID which doesn't control itself but has a key and controlled by one other controller
    const [did3, , dk_] = createDidPair(dock);
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.new(did3, [dk_], [did], false),
    );

    // Add DID key with all verification relationships to a DID that doesn't control itself
    const [, , dk__] = createDidPair(dock);
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.addKeys([dk__], did1, did, pair, undefined, false),
    );

    // Removing 1 key
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.removeKeys([2], did, did, pair, undefined, false),
    );

    // Removing 2 keys
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.removeKeys([3, 4], did, did, pair, undefined, false),
    );

    // Removing 1 controller
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.removeControllers(
        [newControllers[0]],
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    // Removing 2 controllers
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.removeControllers(
        [newControllers[1], newControllers[2]],
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    // Removing 1 service endpoint
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.removeServiceEndpoint(
        spId1,
        did,
        did,
        pair,
        1,
        undefined,
        false,
      ),
    );

    // Remove DID
    await withPaidFeeMatchingSnapshot(() =>
      dock.did.remove(did, did, pair, undefined, false),
    );
  }, 40000);

  test("revocation", async () => {
    const [did, pair, dk] = createDidPair(dock);
    await dock.did.new(did, [dk], [], false);

    const registryId = createRandomRegistryId();
    // Create owners
    const owners = new Set();
    owners.add(DockDid.from(did));

    const policy = new OneOfPolicy(owners);
    await withPaidFeeMatchingSnapshot(() =>
      dock.revocation.newRegistry(registryId, policy, false, false),
    );

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
        1,
        { didModule: dock.did },
      );
      const revTx = dock.revocation.createRevokeTx(update, [{ nonce, sig }]);

      await withPaidFeeMatchingSnapshot(async () => {
        await dock.signAndSend(revTx, false);
      });
    }

    const [update, sig, nonce] = await dock.revocation.createSignedRemove(
      registryId,
      did,
      pair,
      1,
      { didModule: dock.did },
    );
    const revTx = dock.revocation.createRemoveRegistryTx(update, [
      { nonce, sig },
    ]);

    await withPaidFeeMatchingSnapshot(() => dock.signAndSend(revTx, false));
  }, 40000);

  test("anchors", async () => {
    const anc = randomAsHex(32);
    await withPaidFeeMatchingSnapshot(() => dock.anchor.deploy(anc, false));
  }, 30000);

  test("blobs", async () => {
    const [did, pair, dk] = createDidPair(dock);
    await dock.did.new(did, [dk], [], false);

    const blobId = randomAsHex(32);
    const blob = {
      id: blobId,
      blob: randomAsHex(BLOB_MAX_BYTE_SIZE),
    };
    await withPaidFeeMatchingSnapshot(() =>
      dock.blob.new(blob, did, pair, { didModule: dock.did }, false),
    );
  }, 30000);

  test("bbsPlus", async () => {
    const [did, pair, dk] = createDidPair(dock);
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
      const params = BBSPlusModule.prepareAddParameters(
        bytes,
        undefined,
        label,
      );
      await withPaidFeeMatchingSnapshot(async () => {
        await dock.bbsPlusModule.addParams(
          params,
          did,
          pair,
          1,
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
      dock.api,
      u8aToHex(kp.publicKey.bytes),
      undefined,
      [did, 1],
    );
    await withPaidFeeMatchingSnapshot(() =>
      dock.bbsPlusModule.addPublicKey(
        pk,
        did,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );

    // Remove public key
    await withPaidFeeMatchingSnapshot(() =>
      dock.bbsPlusModule.removePublicKey(
        2,
        did,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );

    // Remove params
    await withPaidFeeMatchingSnapshot(() =>
      dock.bbsPlusModule.removeParams(
        1,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );
  }, 30000);

  test("accumulator", async () => {
    const [did, pair, dk] = createDidPair(dock);
    await dock.did.new(did, [dk], [], false);

    const label = stringToHex("My Accumulator params");
    const bytes = u8aToHex(Accumulator.generateParams(hexToU8a(label)).bytes);
    const params = AccumulatorModule.prepareAddParameters(
      bytes,
      undefined,
      label,
    );
    await withPaidFeeMatchingSnapshot(() =>
      dock.accumulatorModule.addParams(
        params,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );

    const kp = Accumulator.generateKeypair(
      new AccumulatorParams(hexToU8a(params.bytes)),
    );

    const pk = AccumulatorModule.prepareAddPublicKey(
      dock.api,
      u8aToHex(kp.publicKey.bytes),
      undefined,
      [did, 1],
    );
    await withPaidFeeMatchingSnapshot(() =>
      dock.accumulatorModule.addPublicKey(
        pk,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );

    const accumulatorPos = PositiveAccumulator.initialize(
      new AccumulatorParams(hexToU8a(params.bytes)),
      kp.secretKey,
    );
    const accumulatorIdPos = randomAsHex(32);
    const accumulatedPos = u8aToHex(accumulatorPos.accumulated);
    await withPaidFeeMatchingSnapshot(() =>
      dock.accumulatorModule.addPositiveAccumulator(
        accumulatorIdPos,
        accumulatedPos,
        [did, 1],
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );

    const accumulatorIdUni = randomAsHex(32);
    const accumulatedUni = u8aToHex(accumulatorPos.accumulated);
    await withPaidFeeMatchingSnapshot(() =>
      dock.accumulatorModule.addUniversalAccumulator(
        accumulatorIdUni,
        accumulatedUni,
        [did, 1],
        10000,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );

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
        VBWitnessUpdateInfo.new(
          hexToU8a(accumulated),
          members,
          [],
          kp.secretKey,
        ).value,
      );
      await withPaidFeeMatchingSnapshot(async () => {
        await dock.accumulatorModule.updateAccumulator(
          accumulatorIdPos,
          accumulated,
          {
            additions: members.map((m) => u8aToHex(m)),
            witnessUpdateInfo: witUpd,
          },
          did,
          pair,
          1,
          { didModule: dock.did },
          false,
        );
      });

      witUpd = u8aToHex(
        VBWitnessUpdateInfo.new(
          hexToU8a(accumulated),
          [],
          members,
          kp.secretKey,
        ).value,
      );

      await withPaidFeeMatchingSnapshot(async () => {
        await dock.accumulatorModule.updateAccumulator(
          accumulatorIdPos,
          accumulated,
          {
            removals: members.map((m) => u8aToHex(m)),
            witnessUpdateInfo: witUpd,
          },
          did,
          pair,
          1,
          { didModule: dock.did },
          false,
        );
      });
    }

    await withPaidFeeMatchingSnapshot(() =>
      dock.accumulatorModule.removeAccumulator(
        accumulatorIdPos,
        did,
        pair,
        1,
        { didModule: dock.did },
        false,
      ),
    );
  }, 30000);

  test("transfers", async () => {
    const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

    await withPaidFeeMatchingSnapshot(() =>
      dock.signAndSend(dock.api.tx.balances.transfer(BOB, 100), false),
    );

    const txs = Array(3).fill(dock.api.tx.balances.transfer(BOB, 100));

    const txBatch = dock.api.tx.utility.batch(txs);

    await withPaidFeeMatchingSnapshot(() => dock.signAndSend(txBatch, false));
  }, 30000);

  test("democracy.notePreimage", async () => {
    const runtimeVersion = await dock.api.rpc.state.getRuntimeVersion();
    const specVersion = runtimeVersion.specVersion.toNumber();

    if (specVersion < 44) {
      return;
    }

    const preimage = randomAsHex(2e6);

    // First, send a whitelist transaction. It should have a 40K DOCK deposit and a 5K DOCK fee.
    await withPaidFeeAssertion(
      () =>
        dock.signAndSend(dock.api.tx.democracy.notePreimage(preimage), false),
      (fee) => expect(fee).toBe(45020),
      {
        // 40K DOCK per deposit
        reserved: (before) => before.add(new BN(4e10)),
      },
    );

    // Second, attempt to execute a transaction that will fail (preimage already exists). The result total fee will be around 20K, with no deposit.
    await throwingWithPaidFeeAssertion(
      () =>
        dock.signAndSend(dock.api.tx.democracy.notePreimage(preimage), false),
      (fee) => expect(fee).toBe(20020),
    );
  }, 30000);

  test("democracy.notePreimageOperational", async () => {
    const runtimeVersion = await dock.api.rpc.state.getRuntimeVersion();
    const specVersion = runtimeVersion.specVersion.toNumber();

    if (specVersion < 44) {
      return;
    }

    const preimage = randomAsHex(4e6);
    const stashAccount = dock.keyring.addFromUri(
      TestAccountCouncilMemberURI,
      null,
      "sr25519",
    );
    dock.setAccount(stashAccount);

    // First, send a whitelist transaction. It should have a 80K DOCK deposit and a 10K DOCK fee.
    await withPaidFeeAssertion(
      () =>
        dock.signAndSend(
          dock.api.tx.council.execute(
            dock.api.tx.democracy.notePreimageOperational(preimage),
            preimage.length,
          ),
          false,
        ),
      (fee) => expect(fee).toBe(90120),
      {
        // 80K DOCK per deposit
        reserved: (before) => before.add(new BN(8e10)),
      },
    );

    // Second, attempt to execute a transaction that will fail implicitly (preimage already exists). The result total fee will be around 20K, with no deposit.
    await withPaidFeeAssertion(
      () =>
        dock.signAndSend(
          dock.api.tx.council.execute(
            dock.api.tx.democracy.notePreimageOperational(preimage),
            preimage.length,
          ),
          false,
        ),
      (fee) => expect(fee).toBe(40120),
    );

    // Finally, attempt to execute a transaction that will explicitly fail (bad origin). The result total fee will be around 40K, no deposit.
    await throwingWithPaidFeeAssertion(
      () =>
        dock.signAndSend(
          dock.api.tx.democracy.notePreimageOperational(preimage),
          false,
        ),
      (fee) => expect(fee).toBe(40040),
    );
  }, 30000);
});
