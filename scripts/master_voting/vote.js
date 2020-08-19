// Signs a master proposal using sr25519, prints the signature as hex.

import types from '../../src/types.json';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const fsp = require('fs').promises;

const USEAGE =
`
Use:
  ./vote.js <round_no> <./path/to/proposal.json>[ yes]

Call this script first without "yes" to perform a dry-run. The name of the call will be printed as \
well as its arguments. The provided <round_no> will be checked against the running node.

If you wish to vote yes on the proposal re-run this script with "yes", and a signature will be \
generated.

Expected Env vars:
- FullNodeEndpoint
    Websocket rpc url to a trusted live node e.g. wss://example.com:9944
- MasterMemberSecret
    Secret phrase or hex encoded private key with which to sign. Not required for dry-run.
`;

main().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  require('dotenv').config();
  const { FullNodeEndpoint, MasterMemberSecret } = process.env;

  if (process.argv.length !== 4 && process.argv.length !== 5) {
    console.error(USEAGE);
    process.exit(2);
  }

  const round_no = parseIntChecked(process.argv[2]);

  const proposal_filename = process.argv[3];
  const proposal_unparsed = await fsp.readFile(proposal_filename);

  let do_vote_yes = false;
  if (process.argv.length === 5) {
    if (process.argv[4] !== 'yes') {
      throw 'final argument must be either ommited or "yes"';
    }
    do_vote_yes = true;
  }

  let proposal;
  try {
    proposal = JSON.parse(proposal_unparsed);
  } catch (e) {
    console.error(`Proposal is not valid json.`);
    throw e;
  }

  const nc = await connect(FullNodeEndpoint);

  const actual_round_no = (await nc.query.master.round()).toJSON();
  if (actual_round_no !== round_no) {
    throw (
      'Round number passed as argument is not equal to round number reported by node.\n' +
      `Passed as argument: ${round_no}\n` +
      `Reported by node: ${actual_round_no}`
    );
  }

  // encode proposal as call
  const call = nc.createType('Call', proposal);

  console.log("");
  console.log(`This proposal calls "${call._meta.name}" with arguments:`);
  console.dir(JSON.parse(JSON.stringify(call.args)), { depth: null });
  console.log("");

  let payload = {
    proposal: [...nc.createType('Call', call).toU8a()],
    round_no: await nc.query.master.round(),
  };
  let encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();

  if (do_vote_yes) {
    // sign and print signature
    const kp = await keypair(MasterMemberSecret);
    let sig = kp.sign(encoded_state_change);
    console.log(`Signature:\n${u8aToHex(sig)}`);
  }
}

// connect to running node
async function connect(ws_url) {
  const extraTypes = {
    Address: 'AccountId',
    LookupSource: 'AccountId',
  };
  return await ApiPromise.create({
    provider: new WsProvider(ws_url),
    types: {
      ...types,
      ...extraTypes,
    },
  });
}

// Load a sr25519 keypair from secret, secret may be "0x" prefixed hex seed
// or seed phrase or "//DevKey/Derivation/Path".
async function keypair(seed) {
  await cryptoWaitReady();
  let keyring = new Keyring({ type: 'sr25519' });
  let key = keyring.addFromUri(seed);
  return key
}

// normal parseInt does't throw an error when invalid input is provided
// this function is more strict but it still doesn't catch all bad input
// for example "101a" does not trigger an error.
function parseIntChecked(str) {
  let ret = parseInt(str);
  if (isNaN(ret)) {
    throw `invalid number ${str}`;
  }
  return ret;
}
