// Signs a master proposal using sr25519, prints the signature as hex.

const fs = require('fs');

async function main() {
  require('dotenv').config();
  const { FullNodeEndpoint, MasterMemberSecret } = process.env;

  if (process.argv.length !== 3) {
    console.error('Use: ./scripts/master_vote.js <round_no> ./path/to/proposal.json');
    process.exit(2);
  }

  const round_no = parseInt(process.argv[1]);
  const proposal = JSON.parse(fs.readFileSync(process.argv[2]));

  // connect to node to automaticaly get types, would be nice not require node

  // encode proposal as call

  // encoded proposal as a StateChange

  // print signature
}

await main();
