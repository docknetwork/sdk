// Takes a proposal and a proof of master authorization and submits the proposal as a
// Master::execute() transaction.
// Assumes all signature are Sr25519.

import { sr25519Verify } from '@polkadot/util-crypto/sr25519';
import { u8aToHex, assert } from '@polkadot/util';
import { keypair, connect } from '../helpers';
import { createDidSig } from '../../src/utils/did';
import { getStateChange } from '../../src/utils/misc';

const { promises: fs } = require('fs');

require('dotenv').config();

const USAGE = `\
npx babel-node ./scripts/master_votes_submit.js <proposal_path> <votes_path>
  where
    <proposal_path> is the path to a json encoded proposal
    <votes_path> is the path to a json encoded list of votes. Each vote is a [did, keyId, nonce, signature] array.
env vars:
  - FullNodeEndpoint: websocket Url of a trusted node
  - PayerSecret:      secret key to the on-chain account that will submit the transaction
                      this account pays transaction fees. provided as a substrate secret URI

Note: This script only supports sr25519 keys.
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).then((_) => {
  process.exit(0);
});

async function main() {
  const {
    FullNodeEndpoint,
    PayerSecret,
  } = process.env;
  assert(FullNodeEndpoint !== undefined, 'env var FullNodeEndpoint must be defined');
  assert(PayerSecret !== undefined, 'env var PayerSecret must be defined');

  if (process.argv.length !== 4) {
    throw USAGE;
  }
  const [_, __, proposal_path, votes_path] = process.argv;
  const proposal = JSON.parse(await fs.readFile(proposal_path));
  const votes = JSON.parse(await fs.readFile(votes_path));

  await submit({
    nodeWsUrl: FullNodeEndpoint,
    payerKey: PayerSecret,
    proposal,
    votes,
  });

  console.log('Proposal and votes successfully submitted.');
}

/**
 * Submit the on-chain Master::execute extrinsic.
 * The extrinsic will be paid for by payerKey.
 * First checks to make sure the signatures are valid.
 * @param nodeWsUrl - string
 * @param payerKey - secretUri
 * @param proposal - json encoded Call
 * @param votes - list of [did, signature] pairs. values should be formated as 0x-prefixed hex.
 * @returns {Promise<()>}
 */
async function submit({
  nodeWsUrl,
  payerKey,
  proposal,
  votes,
}) {
  const nc = await connect(nodeWsUrl);

  // encode proposal as call
  const call = nc.api.createType('Call', proposal);

  // parse votes
  const mpauth = toAuth(votes);

  // verify votes are valid and sufficient before submitting
  await assertValidAuth(nc, call, mpauth);

  // combine signatures and encoded call into a single "execute" extrinsic
  const extrinsic = nc.api.tx.master.execute(call, mpauth);

  // submit
  await signSendTx(extrinsic, await keypair(payerKey));
}

/**
 * Convert an array of [did, keyId, signature, nonce] tuples to array of [didSig, nonce]
 * `did` and `signature` should both be formatted as 0x-prefixed hex.
 * @param votes
 * @returns {Array}
 */
function toAuth(votes) {
  return votes.map((did, keyId, signature, nonce) => [createDidSig(did, keyId, signature), nonce]);
}

/**
 * Throws descriptive error if the proof of authorization is insufficient.
 * Checks that
 * - all signatures are valid over proposal for current voting round
 * - all dids are members of master
 * - number of votes is sufficient
 * @param nodeClient
 * @param proposal - as on-chain type Call
 * @param mpauth - as on-chain type MPAuth
 * @returns {Promise<()>}
 */
async function assertValidAuth(nodeClient, proposal, mpauth) {
  // * - all signatures are valid over proposal for current voting round
  const roundNo = (await nodeClient.api.query.master.round()).toJSON();
  for (const [didSig, nonce] of mpauth) {
    const sig = didSig.sig;
    const did = didSig.did;
    const didKey = await nodeClient.didModule.getDidKey(did, didSig.keyId);
    const pk = didKey.publicKey;
    if (!pk.isSr25519) {
      throw `This script only supports sr25519. The public key registered for ${did} is not sr25519.`;
    }
    const srpk = pk.asSr25519.value;
    const srsig = sig.asSr25519.value;
    const encoded_state_change = asEncodedStateChange(nodeClient, roundNo, proposal, nonce);
    const ver = sr25519Verify(encoded_state_change, srsig, srpk);
    if (!ver) {
      throw 'Signature invalid:\n'
      + `  payload: ${u8aToHex(encoded_state_change)}\n`
      + `  did:     ${did}\n`
      + `  public:  ${srpk}\n`
      + `  sig:     ${srsig}`;
    }
  }

  // * - all dids are members of master
  const membership = await nodeClient.api.query.master.members();
  for (const [did, _sig] of mpauth) {
    const is_member = [...membership.members].some((member) => u8aToHex(member) === u8aToHex(did));
    if (!is_member) {
      throw `${did} is not a member of master`;
    }
  }

  // * - number of votes is sufficient
  const vote_count = [...mpauth].length;
  if (membership.voteRequirement > vote_count) {
    throw `Not enough votes. ${membership.voteRequirement} required. ${vote_count} provided.`;
  }
}

/**
 * Dumps call into a StateChange::MasterVote and serializes the result.
 * Round number is inferred from current chainstate.
 * @param nodeClient
 * @param roundNo
 * @param call - as on-chain type
 * @param nonce
 * @returns
 */
function asEncodedStateChange(nodeClient, roundNo, call, nonce) {
  const encodedProposal = [...nodeClient.api.createType('Call', call).toU8a()];
  const vote = { nonce, proposal: encodedProposal, round_no: roundNo };
  return getStateChange(nodeClient.api, 'MasterVote', vote);
}

/**
 * Sign extrinsic using kp, submit it and wait for it to finalize
 * @param extrinsic
 * @param kp - Keypair
 */
async function signSendTx(extrinsic, kp) {
  await extrinsic.signAsync(kp);

  const promise = new Promise((resolve, reject) => {
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

  return await promise;
}
