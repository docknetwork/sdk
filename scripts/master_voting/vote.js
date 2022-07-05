// Signs a master proposal using sr25519, prints the signature as hex.

import { u8aToHex } from '@polkadot/util';
import { connect, keypair } from '../helpers';
import { getHexIdentifierFromDID } from '../../src/utils/did';
import { getStateChange } from '../../src/utils/misc';

require('dotenv').config();

const fsp = require('fs').promises;

const USAGE = `
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
- Did
    Did of the member in hex or fully qualified form.
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).then((_) => {
  process.exit(0);
});

async function main() {
  const { FullNodeEndpoint, MasterMemberSecret, Did } = process.env;

  if (process.argv.length !== 4 && process.argv.length !== 5) {
    console.error(USAGE);
    process.exit(2);
  }

  const round_no = parseIntChecked(process.argv[2]);

  const did = getHexIdentifierFromDID(did);

  const proposal_filename = process.argv[3];
  const proposal_unparsed = await fsp.readFile(proposal_filename);

  let do_vote_yes = false;
  if (process.argv.length === 5) {
    if (process.argv[4] !== 'yes') {
      throw 'final argument must be either omitted or "yes"';
    }
    do_vote_yes = true;
  }

  let proposal;
  try {
    proposal = JSON.parse(proposal_unparsed);
  } catch (e) {
    console.error('Proposal is not valid json.');
    throw e;
  }

  const nc = await connect(FullNodeEndpoint);

  const actual_round_no = (await nc.api.query.master.round()).toJSON();
  if (actual_round_no !== round_no) {
    throw (
      'Round number passed as argument is not equal to round number reported by node.\n'
      + `Passed as argument: ${round_no}\n`
      + `Reported by node: ${actual_round_no}`
    );
  }

  // encode proposal as call
  const call = nc.api.createType('Call', proposal);

  console.log('');
  console.log(`This proposal calls "${call._meta.name}" with arguments:`);
  console.dir(JSON.parse(JSON.stringify(call.args)), { depth: null });
  console.log('');

  const encodedProposal = [...nc.api.createType('Call', proposal).toU8a()];
  const nonce = await nc.didModule.getNextNonceForDID(did);
  const vote = { nonce, proposal: encodedProposal, round_no: actual_round_no };
  const encodedStateChange = getStateChange(nc.api, 'MasterVote', vote);

  if (do_vote_yes) {
    // sign and print signature
    const kp = await keypair(MasterMemberSecret);
    const sig = kp.sign(encodedStateChange);
    console.log(`Nonce:\n${nonce}\n`);
    console.log(`Signature:\n${u8aToHex(sig)}\n`);
  }
}

// normal parseInt does't throw an error when invalid input is provided
// this function is more strict but it still doesn't catch all bad input
// for example "101a" does not trigger an error.
function parseIntChecked(str) {
  const ret = parseInt(str, 10);
  if (isNaN(ret)) {
    throw new Error(`invalid number ${str}`);
  }
  return ret;
}
