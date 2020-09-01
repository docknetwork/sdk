// Example script creates a json-encoded proposal for master to vote on.

import { connect } from '../scripts/helpers';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { randomAsU8a } from '@polkadot/util-crypto';

main().catch(e => {
  console.error(e);
  process.exit(1);
}).then(_ => {
  process.exit(0);
});

async function main() {
  require('dotenv').config();
  const { FullNodeEndpoint } = process.env;

  const nc = await connect(FullNodeEndpoint);

  let proposal = nc.tx.system.setStorage([
    [u8aToHex(randomAsU8a(32)), u8aToHex(randomAsU8a(32))]
  ]);
  let jprop = proposal.method.toJSON();

  // Bug in polkadot-js makes hex-encoded call index unparsable so we convert to an array.
  jprop.callIndex = [...hexToU8a(jprop.callIndex)];

  console.log(JSON.stringify(jprop));
}
