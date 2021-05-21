// Script to get earnings (emission and fees) made by Dock mainnet validator. Writes amount, block no and time in a CSV

import { u8aToHex } from '@polkadot/util';
import { DockAPI } from '../src/api';
import { asDockAddress } from '../src/utils/codec';

import fs from 'fs';

require('dotenv').config();

const { FullNodeEndpoint, Network } = process.env;

const dock = new DockAPI();

// Filesystem paths of JSON files containing events and epochs fetched from explorer db.
const eventsFilePath = ''; // To be filled
const epochsFilePath = ''; // To be filled

async function multiQuery(queries) {
  return new Promise((resolve, reject) => {
    try {
      dock.api.queryMulti(queries, (resp) => {
        resolve(resp);
      })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

async function main() {
  const events = JSON.parse(fs.readFileSync(eventsFilePath));
  const epochs = JSON.parse(fs.readFileSync(epochsFilePath));
  const epochToBlock = {};
  epochs.forEach((epoch) => {
    epochToBlock[epoch[1][0]] = epoch[0];
  });

  await dock.init({
    address: FullNodeEndpoint,
  });

  const emissionStats = await dock.api.query.poAModule.validatorStats.entries();
  emissionStats.forEach((stat) => {
    const validatorId = asDockAddress(stat[0]._args[1], Network);
    if (validatorId === '3Gb64wBURVBpAau5WVRRpAgNLPAnqsPR3CgoZPAK6diinaMp' && stat[1].locked_reward.isSome) {
      const locked = stat[1].locked_reward.unwrap();
      const unlocked = stat[1].unlocked_reward.unwrap();
      const total = (locked.add(unlocked)).toString();
      if (total !== '0') {
        const epochNo = stat[0]._args[0];
        events.push([epochToBlock[epochNo], total]);
      }
    }
  });

  // Whether to fetch time for each block as well.
  const showBlockTime = false;

  // Block to time mapping
  const blockToTime = {};

  if (showBlockTime) {
    const blockNos = new Set();
    events.forEach((e) => {
      blockNos.add(e[0]);
    });
    const blockNosArray = [...blockNos];

    console.log(`Fetching ${blockNosArray.length} blocks ...`);

    const hashes = [];
    /* blockNosArray.forEach(async (b) => {
      // queries.push([dock.api.query.system.blockHash, b]);
      // queries.push([dock.api.rpc.chain.getBlockHash, b]);
    }); */

    for (const b of blockNosArray) {
      const h = await dock.api.rpc.chain.getBlockHash(b);
      hashes.push(u8aToHex(h));
    }
    // const hashes = (await multiQuery(queries)).map((h) => u8aToHex(h));
    // const hashes = await multiQuery(queries);
    // console.log(hashes);

    console.log(`Fetched ${hashes.length} hashes ...`);

    /* const queries = [];
    hashes.forEach((h) => {
      queries.push([dock.api.query.timestamp.now.at, h]);
    });

    const timestamps = await multiQuery(queries); */

    const timestamps = [];
    for (const h of hashes) {
      const t = await dock.api.query.timestamp.now.at(h);
      timestamps.push(t.toNumber());
    }
    console.log(timestamps);

    blockNosArray.forEach((b, i) => {
      blockToTime[b] = new Date(timestamps[i]).toISOString();
    });
  }

  // console.log(blockToTime);

  events.sort((a, b) => a[0] - b[0]);

  const lines = [];

  if (showBlockTime) {
    lines.push('Block number,Tokens,Time');
  } else {
    lines.push('Block number,Tokens');
  }

  events.forEach((event) => {
    let amount = event[1].toString();
    const decLen = amount.length - 6;
    if (decLen >= 0) {
      amount = `${amount.substr(0, decLen)}.${amount.substr(decLen)}`;
    }
    if (showBlockTime) {
      lines.push(`${event[0]},${amount},${blockToTime[event[0]]}`);
    } else {
      lines.push(`${event[0]},${amount}`);
    }
  });

  fs.writeFileSync('./amounts.csv', lines.join('\n'));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
