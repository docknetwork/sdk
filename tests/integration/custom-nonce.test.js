import { randomAsHex } from '@polkadot/util-crypto';
import {
  hexToU8a, stringToHex, u8aToHex,
} from '@polkadot/util';
import {
  Accumulator, initializeWasm, BBSPlusKeypairG2, BBSPlusSignatureParamsG1,
} from '@docknetwork/crypto-wasm-ts';
import { DockAPI, PublicKeySecp256k1 } from '../../src';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../test-constants';
import { createNewDockDID, typedHexDID, NoDIDError, DidKeypair } from '../../src/utils/did';
import { registerNewDIDUsingPair } from './helpers';
import { generateEcdsaSecp256k1Keypair } from '../../src/utils/misc';
import { DidKey, VerificationRelationship } from '../../src/public-keys';
import { ServiceEndpointType } from '../../src/modules/did/service-endpoint';
import { DockBlobIdByteSize } from '../../src/modules/blob';
import BBSPlusModule from '../../src/modules/bbs-plus';
import AccumulatorModule from '../../src/modules/accumulator';
import { OneOfPolicy } from '../../src/utils/revocation';

describe('Custom nonce', () => {
  const dock = new DockAPI();

  const did1 = createNewDockDID();
  const did2 = createNewDockDID();

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);

  /**
   * Send batch of transactions
   * @param txs
   * @returns {Promise<void>}
   */
  async function sendBatch(txs) {
    const txBatch = dock.api.tx.utility.batch(txs);
    const signedExtrinsic = await dock.signExtrinsic(txBatch);
    await dock.send(signedExtrinsic, false);
  }

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    const pair = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    await registerNewDIDUsingPair(dock, did1, pair);
    await initializeWasm();
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Add key, controller, service endpoint, blob, BBS+ params and keys and accumulator in a batch', async () => {
    const nonce = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did1));

    const pair = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    const txs = [];

    // Add key
    const pair1 = generateEcdsaSecp256k1Keypair(seed2);
    const publicKey = PublicKeySecp256k1.fromKeyringPair(pair1);
    const verRels = new VerificationRelationship();
    verRels.setAssertion();
    const didKey = new DidKey(publicKey, verRels);
    const tx1 = await dock.did.createAddKeysTx([didKey], did1, did1, pair, nonce + 1);
    txs.push(tx1);

    // Add controller
    const tx2 = await dock.did.createAddControllersTx([did2], did1, did1, pair, nonce + 2);
    txs.push(tx2);

    // Add service endpoint
    const spType = new ServiceEndpointType();
    spType.setLinkedDomains();
    const spId = randomAsHex(10);
    const origins = [randomAsHex(50), randomAsHex(70)];
    const tx3 = await dock.did.createAddServiceEndpointTx(spId, spType, origins, did1, did1, pair, nonce + 3);
    txs.push(tx3);

    // Add a blob
    const blobHex = randomAsHex(100);
    const blobId = randomAsHex(DockBlobIdByteSize);
    const blob = {
      id: blobId,
      blob: blobHex,
    };
    const tx4 = await dock.blob.createNewTx(blob, did1, pair, { nonce: nonce + 4 });
    txs.push(tx4);

    // Add BBS+ params and keys
    const label = stringToHex('test-label');
    const params = BBSPlusSignatureParamsG1.generate(10, hexToU8a(label));
    const addParams = BBSPlusModule.prepareAddParameters(u8aToHex(params.toBytes()), undefined, label);
    const tx5 = await dock.bbsPlusModule.createAddParamsTx(addParams, did1, pair, { nonce: nonce + 5 });
    txs.push(tx5);

    const keypair = BBSPlusKeypairG2.generate(params);
    const pk = BBSPlusModule.prepareAddPublicKey(u8aToHex(keypair.publicKey.bytes), undefined, [did1, 1]);
    const tx6 = await dock.bbsPlusModule.createAddPublicKeyTx(pk, did1, did1, pair, { nonce: nonce + 6 });
    txs.push(tx6);

    // Add accumulator params and keys
    const params1 = Accumulator.generateParams(hexToU8a(label));
    const addParams1 = AccumulatorModule.prepareAddParameters(u8aToHex(params1.bytes), undefined, label);
    const tx7 = await dock.accumulatorModule.createAddParamsTx(addParams1, did1, pair, { nonce: nonce + 7 });
    txs.push(tx7);

    const keypair1 = Accumulator.generateKeypair(params1);
    const pk1 = AccumulatorModule.prepareAddPublicKey(u8aToHex(keypair1.publicKey.bytes), undefined, [did1, 1]);
    const tx8 = await dock.accumulatorModule.createAddPublicKeyTx(pk1, did1, pair, { nonce: nonce + 8 });
    txs.push(tx8);

    // Add accumulators
    const id1 = randomAsHex(32);
    const accumulated1 = randomAsHex(100);
    const tx9 = await dock.accumulatorModule.createAddPositiveAccumulatorTx(id1, accumulated1, [did1, 1], did1, pair, { nonce: nonce + 9 });
    txs.push(tx9);

    const id2 = randomAsHex(32);
    const accumulated2 = randomAsHex(100);
    const maxSize = 100000;
    const tx10 = await dock.accumulatorModule.createAddUniversalAccumulatorTx(id2, accumulated2, [did1, 1], maxSize, did1, pair, { nonce: nonce + 10 });
    txs.push(tx10);

    // Send batch of transactions
    await sendBatch(txs);

    // Check results of all transactions
    const dk = await dock.did.getDidKey(did1, 2);
    expect(dk.publicKey).toEqual(publicKey);

    await expect(dock.did.isController(did1, did2)).resolves.toEqual(true);

    const sp = await dock.did.getServiceEndpoint(did1, spId);
    expect(sp.type).toEqual(spType);
    expect(sp.origins).toEqual(origins);

    const chainBlob = await dock.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(u8aToHex(chainBlob[1])).toEqual(blobHex);

    const queriedParams = await dock.bbsPlusModule.getParams(did1, 1);
    expect(queriedParams.bytes).toEqual(addParams.bytes);
    expect(queriedParams.label).toEqual(addParams.label);

    const queriedPk = await dock.bbsPlusModule.getPublicKey(did1, 3);
    expect(queriedPk.bytes).toEqual(pk.bytes);
    expect(queriedPk.paramsRef).toEqual([typedHexDID(dock.api, did1), 1]);

    const queriedParams1 = await dock.accumulatorModule.getParams(did1, 1);
    expect(queriedParams1.bytes).toEqual(addParams1.bytes);
    expect(queriedParams1.label).toEqual(addParams1.label);

    const queriedPk1 = await dock.accumulatorModule.getPublicKey(did1, 1);
    expect(queriedPk1.bytes).toEqual(pk1.bytes);
    expect(queriedPk1.paramsRef).toEqual([typedHexDID(dock.api, did1), 1]);

    const accum1 = await dock.accumulatorModule.getAccumulator(id1, true);
    expect(accum1.type).toEqual('positive');
    expect(accum1.accumulated).toEqual(accumulated1);
    expect(accum1.keyRef).toEqual([typedHexDID(dock.api, did1), 1]);

    const accum2 = await dock.accumulatorModule.getAccumulator(id2, true);
    expect(accum2.type).toEqual('universal');
    expect(accum2.accumulated).toEqual(accumulated2);
    expect(accum2.keyRef).toEqual([typedHexDID(dock.api, did1), 1]);
    expect(accum1.created).toEqual(accum2.created);
    expect(accum1.lastModified).toEqual(accum2.lastModified);
  }, 20000);

  test('Add 3 registries and submit revocations for all in a batch', async () => {
    const owners = new Set();
    owners.add(did1);

    const [revokeIds1, revokeIds2, revokeIds3] = [1, 2, 3].map((_) => {
      const r = new Set();
      r.add(randomAsHex(32));
      r.add(randomAsHex(32));
      r.add(randomAsHex(32));
      return r;
    });

    // Create registries
    const policy = new OneOfPolicy(owners);
    const registryId1 = randomAsHex(32);
    const registryId2 = randomAsHex(32);
    const registryId3 = randomAsHex(32);
    await dock.revocation.newRegistry(registryId1, policy, false, false);
    await dock.revocation.newRegistry(registryId2, policy, false, false);
    await dock.revocation.newRegistry(registryId3, policy, false, false);

    const pair = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    let currentNonce = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did1));
    let txs = [];

    // Revoke from all 3 registries in the same transaction batch
    for (const [regId, revs, nonce] of [[registryId1, revokeIds1, currentNonce + 1], [registryId2, revokeIds2, currentNonce + 2], [registryId3, revokeIds3, currentNonce + 3]]) {
      const [revoke, sig, computedNonce] = await dock.revocation.createSignedRevoke(regId, revs, did1, pair, { nonce });
      expect(computedNonce).toEqual(nonce);
      const tx = await dock.revocation.createRevokeTx(revoke, [{ nonce, data: sig }]);
      txs.push(tx);
    }

    // Send batch of transactions
    await sendBatch(txs);

    // Check results of transactions
    for (const [regId, revs] of [[registryId1, revokeIds1], [registryId2, revokeIds2], [registryId3, revokeIds3]]) {
      const reg = await dock.revocation.getRevocationRegistry(regId);
      expect(reg.policy.isOneOf).toBe(true);
      for (const rev of revs) {
        const revocationStatus = await dock.revocation.getIsRevoked(regId, rev);
        expect(revocationStatus).toBe(true);
      }
    }

    // Remove from all 3 registries in the same transaction batch
    currentNonce = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did1));
    txs = [];
    for (const [regId, nonce] of [[registryId1, currentNonce + 1], [registryId2, currentNonce + 2], [registryId3, currentNonce + 3]]) {
      const [remove, sig, computedNonce] = await dock.revocation.createSignedRemove(regId, did1, pair, { nonce });
      expect(computedNonce).toEqual(nonce);
      const tx = await dock.revocation.createRemoveRegistryTx(remove, [{ nonce, data: sig }]);
      txs.push(tx);
    }

    // Send batch of transactions
    await sendBatch(txs);

    // Check results of transactions
    for (const regId of [registryId1, registryId2, registryId3]) {
      await expect(dock.revocation.getRevocationRegistry(regId)).rejects.toThrow(/Could not find revocation registry/);
    }
  }, 30000);

  test('Add keys, service endpoints and remove several DIDs in a batch', async () => {
    // Create many DIDs with did1 as their controller
    const did3 = createNewDockDID();
    const did4 = createNewDockDID();
    const did5 = createNewDockDID();
    const seed3 = randomAsHex(32);
    const seed4 = randomAsHex(32);
    const seed5 = randomAsHex(32);

    let vr = new VerificationRelationship();
    vr.setAuthentication();

    const pair3 = new DidKeypair(dock.keyring.addFromUri(seed3), 1);
    const pair4 = new DidKeypair(dock.keyring.addFromUri(seed4), 1);
    const pair5 = new DidKeypair(dock.keyring.addFromUri(seed5), 1);
    await registerNewDIDUsingPair(dock, did3, pair3, vr, [did1]);
    await registerNewDIDUsingPair(dock, did4, pair4, vr, [did1]);
    await registerNewDIDUsingPair(dock, did5, pair5, vr, [did1]);

    const pair = new DidKeypair(dock.keyring.addFromUri(seed1), 1);

    let nonce = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did1));
    let txs = [];

    // Add a key and a service endpoint to each DID
    vr = new VerificationRelationship();
    vr.setAssertion();
    const tx1 = await dock.did.createAddKeysTx([new DidKey(pair3.publicKey(), vr)], did3, did1, pair, nonce + 1);
    txs.push(tx1);
    const tx2 = await dock.did.createAddKeysTx([new DidKey(pair4.publicKey(), vr)], did4, did1, pair, nonce + 2);
    txs.push(tx2);
    const tx3 = await dock.did.createAddKeysTx([new DidKey(pair5.publicKey(), vr)], did5, did1, pair, nonce + 3);
    txs.push(tx3);

    const spType = new ServiceEndpointType();
    spType.setLinkedDomains();
    const origins = [[randomAsHex(50), randomAsHex(70)], [randomAsHex(50), randomAsHex(70)], [randomAsHex(50), randomAsHex(70)]];
    const spId3 = randomAsHex(10);
    const spId4 = randomAsHex(10);
    const spId5 = randomAsHex(10);
    const tx4 = await dock.did.createAddServiceEndpointTx(spId3, spType, origins[0], did3, did1, pair, nonce + 4);
    txs.push(tx4);
    const tx5 = await dock.did.createAddServiceEndpointTx(spId4, spType, origins[1], did4, did1, pair, nonce + 5);
    txs.push(tx5);
    const tx6 = await dock.did.createAddServiceEndpointTx(spId5, spType, origins[2], did5, did1, pair, nonce + 6);
    txs.push(tx6);

    // Send batch of transactions
    await sendBatch(txs);

    // Check results of all transactions
    await expect(dock.did.getDidKey(did3, 2)).resolves.toEqual(new DidKey(pair3.publicKey(), vr));
    await expect(dock.did.getDidKey(did4, 2)).resolves.toEqual(new DidKey(pair4.publicKey(), vr));
    await expect(dock.did.getDidKey(did5, 2)).resolves.toEqual(new DidKey(pair5.publicKey(), vr));
    await expect(dock.did.getServiceEndpoint(did3, spId3)).resolves.toEqual({ type: spType, origins: origins[0] });
    await expect(dock.did.getServiceEndpoint(did4, spId4)).resolves.toEqual({ type: spType, origins: origins[1] });
    await expect(dock.did.getServiceEndpoint(did5, spId5)).resolves.toEqual({ type: spType, origins: origins[2] });

    // Each DID adds 2 blobs
    const nonce3 = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did3));
    const nonce4 = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did4));
    const nonce5 = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did5));
    txs = [];

    const [[blobId1, blobHex1, blob1], [blobId2, blobHex2, blob2], [blobId3, blobHex3, blob3], [blobId4, blobHex4, blob4], [blobId5, blobHex5, blob5], [blobId6, blobHex6, blob6]] = [1, 2, 3, 4, 5, 6].map((_) => {
      const bh = randomAsHex(100);
      const bi = randomAsHex(DockBlobIdByteSize);
      const b = {
        id: bi,
        blob: bh,
      };
      return [bi, bh, b];
    });
    const tx7 = await dock.blob.createNewTx(blob1, did3, pair3, { nonce: nonce3 + 1 });
    const tx8 = await dock.blob.createNewTx(blob2, did3, pair3, { nonce: nonce3 + 2 });
    txs.push(tx7);
    txs.push(tx8);

    const tx9 = await dock.blob.createNewTx(blob3, did4, pair4, { nonce: nonce4 + 1 });
    const tx10 = await dock.blob.createNewTx(blob4, did4, pair4, { nonce: nonce4 + 2 });
    txs.push(tx9);
    txs.push(tx10);

    const tx11 = await dock.blob.createNewTx(blob5, did5, pair5, { nonce: nonce5 + 1 });
    const tx12 = await dock.blob.createNewTx(blob6, did5, pair5, { nonce: nonce5 + 2 });
    txs.push(tx11);
    txs.push(tx12);

    // Send batch of transactions
    await sendBatch(txs);

    // Check results
    for (const [d, bi, bh] of [[did3, blobId1, blobHex1], [did3, blobId2, blobHex2], [did4, blobId3, blobHex3], [did4, blobId4, blobHex4], [did5, blobId5, blobHex5], [did5, blobId6, blobHex6]]) {
      const chainBlob = await dock.blob.get(bi);
      expect(!!chainBlob).toBe(true);
      expect(u8aToHex(chainBlob[1])).toEqual(bh);
      expect(chainBlob[0]).toEqual(typedHexDID(dock.api, d));
    }

    // Remove all DIDs in a batch
    nonce = await dock.didModule.getNonceForDid(typedHexDID(dock.api, did1));
    txs = [];

    const tx13 = await dock.did.createRemoveTx(did3, did1, pair, nonce + 1);
    txs.push(tx13);
    const tx14 = await dock.did.createRemoveTx(did4, did1, pair, nonce + 2);
    txs.push(tx14);
    const tx15 = await dock.did.createRemoveTx(did5, did1, pair, nonce + 3);
    txs.push(tx15);

    // Send batch of transactions
    await sendBatch(txs);

    // Check results
    await expect(dock.did.getDocument(did3)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getDocument(did4)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getDocument(did5)).rejects.toThrow(NoDIDError);
  }, 40000);
});
