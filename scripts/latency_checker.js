import dock from '../src/index';
import { createNewDockDID } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { median } from './helpers';
import { DidKey, VerificationRelationship } from '../src/public-keys';

require('dotenv').config();

const { FullNodeEndpoint, EndowedSecretURI } = process.env;

// TODO: Check with batches as well. We need to measure how fully filled, partially filled and fully filled blocks affect latency

async function sendTxn(baseSeed, seedPath) {
  // DID will be generated randomly
  const dockDID = createNewDockDID();
  const seed = `${baseSeed}/${seedPath}`;
  const pair = dock.keyring.addFromUri(seed, null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const didKey = new DidKey(publicKey, new VerificationRelationship());
  const start = new Date().getTime();
  await dock.did.new(dockDID, [didKey], [], false);
  return (new Date().getTime()) - start;
}

async function main(countReqs) {
  if (countReqs <= 0) {
    process.exit(2);
  }
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const baseSeed = '0x3f7b9516b38f6bb8c3241e58eaa37d318c03d4facdf03c9ce61507b9bc1c34ea';
  // Send `count` requests and calculate for each request
  const durations = [];
  let counter = 0;
  console.log(`Going to send ${countReqs} reqs`);
  while (counter < countReqs) {
    const dur = await sendTxn(baseSeed, countReqs.toString());
    durations.push(dur);
    counter++;
    if (counter % 10 === 0) {
      console.log(`Sent ${counter} reqs so far`);
    }
  }
  const total = durations.reduce((a, b) => a + b, 0);
  const mean = Math.round(total / durations.length);
  const med = median(durations);
  console.log(`After sending ${durations.length} requests, mean latency is ${mean}ms and median is ${med}ms`);
  process.exit(1);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    let count;
    if (process.argv.length >= 3) {
      count = parseInt(process.argv[2]);
    } else {
      count = 10;
    }
    return main(count);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
