// Example script creates a json-encoded proposal for master to vote on.

import { u8aToHex, hexToU8a } from '@polkadot/util';
import { randomAsU8a } from '@polkadot/util-crypto';
import { connect } from '../scripts/helpers';

require('dotenv').config();

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).then(() => {
  process.exit(0);
});

async function main() {
  const { FullNodeEndpoint } = process.env;

  const nc = (await connect(FullNodeEndpoint)).api;

  const proposal = nc.tx.system.setStorage([
    [u8aToHex(randomAsU8a(32)), u8aToHex(randomAsU8a(32))],
  ]);
  const jprop = proposal.method.toJSON();

  // Bug in polkadot-js makes hex-encoded call index unparsable so we convert to an array.
  jprop.callIndex = [...hexToU8a(jprop.callIndex)];

  console.log(JSON.stringify(jprop));
}
