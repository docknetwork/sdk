// This example shows two ways to anchor content, Direct and Merklized.
//
// The first, direct anchoring, places the content directly into a transaction. This method makes
// the content public and immutable but direct anchors become expensive to post as content becomes
// large. Direct anchors are also costly to post in bulk (i.e. anchoring multiple documents).
//
// It's advised to hash documents in order to keep anchoring price constant irrespective of document size.
// It's advised to batch document hashes into a merkle tree to keep anchoring price constant
// irrespective of document count.
//
// A potential downside to merkle batching is that PoE verification of each batched document will
// require a merkle proof of inclusion. This is a tradeoff to consider when designing for your use
// case. Merkleized anchors can batch infinite anchors into a single, fixed cost transaction, but
// verification requires a proof.
//
// This example uses mrklt for merkle tree construction. A mrklt tree containing exactly one
// document will have `root = hash(hash(document))` and the merkle proof for that document will be
// an empty list `[]`. `verify_proof(hash(document), []) = root = hash(hash(document))`. In other
// words, when batch size is 1, we can infer `proof = []`.
//
// It is possible simply post `hash(document)` as an anchor, but it's recommended to double-hash
// the document instead. Since `hash(hash(document)) = compute_root(hash(document))` a double-hashed
// anchor can be interpreted as the root of a merkle-tree with 1 leaf. Since the merkle tree has
// only one leaf, the proof of inclusion for that leaf will be empty.

/* eslint-disable import/no-extraneous-dependencies */

/* eslint-disable camelcase */
import { create_proof, construct, verify_proof } from 'mrklt';
/* eslint-disable camelcase */
import assert from 'assert';
import BLAKE2b from 'blake2b';
import { randomAsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { connect, keypair } from '../scripts/helpers';

import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

const conn = connect(FullNodeEndpoint);

async function main() {
  // batched
  const docHashes = [
    utf8('{"example": "document"}'),
    utf8('{"example": 2}'),
    randomAsU8a(),
    utf8('{"example": 4}'),
  ].map(blake2b256);
  const proofs = await anchorBatched(docHashes);
  assert(await checkBatched(docHashes[0], proofs[0]) !== null);
  assert(await checkBatched(docHashes[0], proofs[1]) === null);

  // single
  const single = blake2b256(randomAsU8a());
  assert(await checkBatched(single, []) === null);
  await anchorBatched([single]);
  assert(await checkBatched(single, []) !== null);

  // Benchmarks
  runBenchmarks();
}

// Post a value to the anchors module.
async function anchor(hash) {
  const nc = await conn;
  await signExtrinsic(nc.tx.anchor.deploy(u8aToHex(hash)))
    .then(sendExtrinsic);
  assert((await check(hash)) !== null);
}

// Check to see at which block a value was anchored. Return the block when the hash was
// anchored. If the value is not anchored, return null.
async function check(hash) {
  const nc = await conn;
  const opt = await nc.query.anchor.anchors(u8aToHex(blake2b256(hash)));
  assert(opt.isNone !== opt.isSome);
  if (opt.isNone) {
    return null;
  }
  return opt.unwrap().toNumber();
}

// Run some benchmarks to measure time for proof generation and verification.
function runBenchmarks() {
  benchSingleProofCreation(4096);
  benchSingleProofCreation(65536);
  benchSingleProofCreation(131072);
  bench(3);
  bench(11);
  bench(128);
  bench(1024);
  bench(4096);
  bench(65536);
}

// Generate only 1 proof as call to proof generation recreates the tree
function benchSingleProofCreation(count) {
  /* eslint-disable no-unused-vars */
  const data = Array(count).fill(undefined).map((_, __) => randomAsU8a());
  const start = new Date().getTime();
  const hashes = data.map(blake2b256);
  const pl = pack32(hashes);
  create_proof(0, pl);
  const time = new Date().getTime() - start;
  console.log(`Time to generate tree of size ${count} and create a proof is ${time} msec`);
}

function bench(count) {
  const [root, hashes, proofs, proofDuration] = timeProofGeneration(count);
  console.log(`Time to compute proofs for ${count} is ${proofDuration} msec`);
  const verfDuration = timeProofVerification(root, [hashes, proofs]);
  console.log(`Time to verify proofs for ${count} is ${verfDuration} msec`);
}

function timeProofGeneration(count) {
  /* eslint-disable no-unused-vars */
  const data = Array(count).fill(undefined).map((_, __) => randomAsU8a());
  const start = new Date().getTime();
  const hashes = data.map(blake2b256);
  const [root, proofs] = buildMerkleTreeAndProofs(hashes);
  const end = new Date().getTime();
  return [root, hashes, proofs, end - start];
}

function timeProofVerification(root, [leaves, proofs]) {
  assert(leaves.length === proofs.length);
  const start = new Date().getTime();
  const calculatedRoots = leaves.map((l, index) => verify_proof(l, proofs[index]));
  const end = new Date().getTime();
  const rootJson = JSON.stringify(root);
  calculatedRoots.forEach((cr) => assert(JSON.stringify([...cr]) === rootJson));
  return end - start;
}

// Takes a list of leaves to build a merkle tree and return root of the tree and inclusion proof for all leaves
function buildMerkleTreeAndProofs(leafHashes) {
  const pl = pack32(leafHashes); // pl stands for packed leaves
  return construct(pl);
}

// Anchor a list of hashes to the chain as a batch. Return merkle proofs for each anchor
// in the order they we submitted.
//
// This function will fail if the input is an empty list.
async function anchorBatched(leafHashes) {
  const [root, proofs] = buildMerkleTreeAndProofs(leafHashes);
  await anchor(root);
  return proofs;
}

// Check a single hash from a batch.
//
// Check a hash against its merkle proof to find when its parent merkle tree root was anchored.
// If the merkle root was never anchored, return null.
async function checkBatched(hash, proof) {
  const root = verify_proof(hash, proof);
  return await check(root);
}

// encode a string as utf8
function utf8(str) {
  return new TextEncoder().encode(str);
}

// hash a byte array using blake2b-256
function blake2b256(bs) {
  const h = BLAKE2b(32);
  h.update(bs);
  return h.digest();
}

// pack a list of hashed leaves into a single byte array
function pack32(leaves) {
  for (const leaf of leaves) {
    assert(leaf instanceof Uint8Array);
    assert(leaf.length === 32);
  }
  const ret = new Uint8Array(leaves.map((a) => [...a]).flat());
  assert(ret.length === leaves.length * 32);
  return ret;
}

// MUTATING
// sign extrinsic as test account
async function signExtrinsic(extrinsic) {
  const key = await keypair(TestAccountURI);
  await extrinsic.signAsync(key);
  return extrinsic;
}

// submit extrinsic and wait for it to finalize
async function sendExtrinsic(extrinsic) {
  return await new Promise((resolve, reject) => {
    try {
      let unsubFunc = null;
      return extrinsic.send(({ events = [], status }) => {
        if (status.isFinalized) {
          unsubFunc();
          resolve({
            events,
            status,
          });
        }
      })
        .catch((error) => {
          reject(error);
        })
        .then((unsub) => {
          unsubFunc = unsub;
        });
    } catch (error) {
      reject(error);
    }
    return this;
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
