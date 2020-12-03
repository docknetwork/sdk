// This file will be removed soon.

import { randomAsU8a } from '@polkadot/util-crypto';
import { DockAPI } from '../src/api';

require('dotenv').config();

const { FullNodeEndpoint, EndowedSecretURI } = process.env;

async function main() {
  const dock = await initSDK();

  const credCount = 8;
  // Generating random credentials of 300 bytes each
  const credentials = Array(credCount).fill(undefined).map(() => randomAsU8a(300));

  let start = new Date().getTime();

  // The root is to be written to chain and proofs must be stored.
  const [root, proofs] = dock.anchor.batchDocumentsInMerkleTree(credentials);

  let end = new Date().getTime();
  console.log(`Time to compute proofs for ${credCount} credentials is ${end - start} msec`);

  // Check that the proof is correct
  credentials.forEach((c, i) => {
    const r = dock.anchor.verifyMerkleProofOfDocument(c, proofs[i], root);
    if (!r) {
      console.error('Proof verification failed');
      process.exit(1);
    }
  });

  start = new Date().getTime();

  // Write the anchor to chain
  const resp = await dock.anchor.deploy(root, false);
  console.log(`Written in blockhash ${resp.status.asInBlock}`);

  end = new Date().getTime();

  console.log(`Time to write anchor to chain is ${end - start} msec`);

  // Read the anchor from chain
  const blockNumber = await dock.anchor.get(root);
  console.log(`Written in block number ${blockNumber}`);
}

async function initSDK() {
  const dock = new DockAPI();
  await dock.init({
    address: FullNodeEndpoint,
  });
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);
  return dock;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
