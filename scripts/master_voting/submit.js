// Takes a proposal and a proof of master authorization and submits the proposal as a
// Master::execute() transaction.
// Assumes all signature are Sr25519.

import { keypair, connect } from '../helpers';
import { schnorrkelVerify } from '@polkadot/util-crypto/schnorrkel';
import { u8aToHex } from '@polkadot/util';

require('dotenv').config();
const { FullNodeEndpoint } = process.env;

submit({
  nodeWsUrl: FullNodeEndpoint,
  payerKey: '//Alice',
  proposal: {
    "args": [
      [
        ["0xaaaa", "0xbbbb"],
        ["0xbbbb", "0xcccc"]
      ]
    ],
    "callIndex": [0, 6]
  },
  votes: [
    [
      '0x416c696365000000000000000000000000000000000000000000000000000000', // Alice
      '0xe087ed705fed0d677b178f24f576338cb0e64ee42b49702aa07a4b7c8fb14f28' +
      '2270ce905bc2eee224913ff58ba5cda8434d144845efe7ca021a73e7b77cea86',
    ],
    [
      '0x426f620000000000000000000000000000000000000000000000000000000000', // Bob
      '0xbcfea6351fb136c7993762baef2931eb65575d2d8d7fa0f78d729937c454b94b' +
      'c916092ad1232926b5c04fa48a0530470878f3441b0a035fe85546029492f38c',
    ],
  ],
}).catch(e => {
  console.error(e);
  process.exit(1);
}).then(_ => {
  process.exit(0);
});

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
  const call = nc.createType('Call', proposal);

  // parse votes
  const mpauth = toPMAuth(nc, votes);

  // verify votes are valid and sufficient before submitting
  await assertValidAuth(nc, call, mpauth);

  // combine signatures and encoded call into a single "execute" extrinsic
  const extrinsic = nc.tx.master.execute(call, mpauth);

  // submit
  await signSendTx(extrinsic, await keypair(payerKey));
}

/**
 * Convert a list of [did, signature] pairs to Proof of Master Authorization
 * `did` and `signature` should both be formated as 0x-prefixed hex.
 * @param nodeClient
 * @param votes
 * @returns {Promise<()>}
 */
function toPMAuth(nodeClient, votes) {
  let dtk_sorted = [...votes];
  dtk_sorted.sort(); // this relies on dids being hex encoded

  let vote_map = new Map();
  for (let [did, key] of dtk_sorted) {
    vote_map.set(did, { Sr25519: key });
  }

  return nodeClient.createType('PMAuth', vote_map);
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
  const encoded_state_change = await asEncodedStateChange(nodeClient, proposal);
  for (let [did, sig] of mpauth) {
    let did_doc = await nodeClient.query.didModule.dids(did);
    let pk = did_doc.unwrap()[0].public_key;
    if (!pk.isSr25519) {
      throw `This script only supports sr25519. The public key registered for ${did} is not sr25519.`;
    }
    let srpk = pk.asSr25519.value;
    let srsig = sig.asSr25519.value;
    let ver = schnorrkelVerify(encoded_state_change, srsig, srpk);
    if (!ver) {
      throw `Signature invalid:\n` +
      `  payload: ${u8aToHex(encoded_state_change)}\n` +
      `  did:     ${did}\n` +
      `  public:  ${srpk}\n` +
      `  sig:     ${srsig}`;
    }
  }

  // * - all dids are members of master
  let membership = await nodeClient.query.master.members();
  for (let [did, _sig] of mpauth) {
    let is_member = [...membership.members].some(member => u8aToHex(member) === u8aToHex(did));
    if (!is_member) {
      throw `${did} is not a member of master`;
    }
  }

  // * - number of votes is sufficient
  let vote_count = [...mpauth].length;
  if (membership.vote_requirement > vote_count) {
    throw `Not enough votes. ${membership.vote_requirement} required. ${vote_count} provided.`;
  }
}

/**
 * Dumps call into a StateChange::MasterVote and serializes the result.
 * Round number is infered from current chainstate.
 * @param nodeClient
 * @param call - as on-chain type
 * @returns {Promise<()>}
 */
async function asEncodedStateChange(nodeClient, call) {
  let payload = {
    proposal: [...call.toU8a()],
    round_no: await nodeClient.query.master.round(),
  };
  return nodeClient.createType('StateChange', { MasterVote: payload }).toU8a();
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
