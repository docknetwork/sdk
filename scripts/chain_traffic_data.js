import dock from '../src/index';
import {
  getLastBlock, getBlock,
} from '../src/utils/chain-ops';
import { median } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint } = process.env;

// Better to fetch constant from chain
const blockCap = 1000000000000;

/**
 * Get weight of all extrinsics in a block
 * @param blockHash
 * @returns {Promise<number>}
 */
async function getWeight(blockHash) {
  const events = await dock.api.query.system.events.at(blockHash);
  const evs = events.map((e) => e.toJSON());
  let weight = 0;
  evs.forEach((e) => {
    if (e.phase && e.phase.ApplyExtrinsic !== undefined && e.event && e.event.index === '0x0000') {
      if (e.event && e.event.data && e.event.data.length > 0 && e.event.data[0].weight) {
        weight += e.event.data[0].weight;
      } else {
        console.log('Weight could not be found');
        console.log(e.event.data);
      }
    }
  });
  return weight;
}

async function getTxnsStatsInLastBlocks(count) {
  if (count <= 0) {
    process.exit(2);
  }
  // TODO: Use the derived version once available to fetch the block to get the author as well.
  const lastBlock = await getLastBlock(dock.api);
  let weight = await getWeight(lastBlock.header.hash.toHex());
  const blocks = [lastBlock];
  let { parentHash } = lastBlock.header;

  /* eslint-disable no-await-in-loop */
  while (parentHash !== new Uint8Array(32) && blocks.length < count) {
    const block = await getBlock(dock.api, parentHash.toString());
    weight += await getWeight(parentHash.toString());
    parentHash = block.header.parentHash;
    blocks.push(block);
  }
  const extrinsicsCounts = blocks.map((b) => b.extrinsics.length);
  const total = extrinsicsCounts.reduce((a, b) => a + b, 0);
  const mean = Math.round(total / extrinsicsCounts.length);
  const mid = median(extrinsicsCounts);
  const avgWeight = weight / count;
  const blPc = Math.round((avgWeight * 100) / blockCap);
  console.log(`For ${blocks.length} blocks, total extrinsic count is ${total}, mean is ${mean} and median is ${mid}. Block fill % is ${blPc}`);
  return [blocks.length, total, mean, mid];
}

async function main() {
  await dock.init({
    address: FullNodeEndpoint,
  });
  let count;
  if (process.argv.length >= 3) {
    count = parseInt(process.argv[2]);
  } else {
    count = 10;
  }
  await getTxnsStatsInLastBlocks(count);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
