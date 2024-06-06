import dock from "../src";
import { timestampLogger } from "./helpers";
import R from "ramda";

const { FullNodeEndpoint, TargetBlockNumber } = process.env;

const info = timestampLogger.error;
const output = console.log;

async function main() {
  await dock.init({ address: FullNodeEndpoint });

  info("Scanning the target block state");
  const prev = await grabState(
    await dock.api.at(
      await dock.api.rpc.chain.getBlockHash(+TargetBlockNumber),
    ),
  );
  info("-".repeat(50));
  info("Scanning the next block state");
  const cur = await grabState(
    await dock.api.at(
      await dock.api.rpc.chain.getBlockHash(+TargetBlockNumber + 1),
    ),
  );
  info("-".repeat(50));

  const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
  keys.delete("substrate::code");
  keys.delete("democracy::preimages");
  keys.delete("grandpa");

  const diff = Object.create(null);
  for (const key of keys) {
    if (key in prev && key in cur) {
      if (!R.equals(prev[key], cur[key])) {
        if (Array.isArray(prev[key]) && Array.isArray(cur[key])) {
          diff[key] = {
            beforeDifference: R.difference(prev[key], cur[key]),
            afterDifference: R.difference(cur[key], prev[key]),
          };
        } else {
          diff[key] = {
            before: prev[key],
            after: cur[key],
          };
        }
      }
    } else if (key in prev) {
      diff[key] = "REMOVED";
      info(`${key} doesn't exit anymore`);
    } else {
      diff[key] = "ADDED";
      info(`New key: ${key}`);
    }
  }

  output(JSON.stringify(diff, null, 2));
}

const grabState = async (api) => {
  let data = Object.create(null);

  for (const moduleName of Object.keys(api.query)) {
    const module = api.query[moduleName];

    if (!module) {
      info(`Skipping ${moduleName}`);
      continue;
    }
    for (const memberName of Object.keys(module)) {
      const member = module[memberName];

      const key = `${moduleName}::${memberName}`;
      info(`Scanning ${key}`);

      if (key === "substrate::code" || key === "democracy::preimages") continue;
      if (typeof member === "function") {
        try {
          const value = await member();

          data[key] = value;
        } catch {
          try {
            const value = await member.entries();

            data[key] = value;
          } catch (e) {
            info(`Skipped ${key}`);
          }
        }
      } else {
        throw key;
      }
    }
  }

  return JSON.parse(JSON.stringify(data));
};

main()
  .catch(console.error)
  .finally(() => process.exit());
