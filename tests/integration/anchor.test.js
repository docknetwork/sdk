import { randomAsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { DockAPI } from '../../src/api';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
import { getBlock } from '../../src/utils/chain-ops';

describe('Anchoring Module', () => {
  const dock = new DockAPI();

  beforeAll(async (done) => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    done();
  });

  test('Can create and query anchors', async () => {
    const documents = Array(8).fill(undefined).map(() => randomAsU8a(300));

    // The root is to be written to chain and proofs must be stored.
    const [root, proofs] = dock.anchor.batchDocumentsInMerkleTree(documents);

    // Check that the proof is correct
    documents.forEach((d, i) => {
      const r = dock.anchor.verifyMerkleProofOfDocument(d, proofs[i], root);
      expect(r).toBe(true);
    });

    const resp = await dock.anchor.deploy(root, false);
    const block = await getBlock(dock.api, u8aToHex(resp.status.asInBlock));
    const blockNumber = await dock.anchor.get(root);
    expect(block.header.number.toNumber()).toBe(blockNumber);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
