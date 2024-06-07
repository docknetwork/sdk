import dock from "../src";
import { timestampLogger } from "./helpers";
import R from "ramda";

const {
  FullNodeEndpoint,
  FirstBlockNumber,
  SecondBlockNumber = +FirstBlockNumber + 1,
  Transform = "toHuman",
} = process.env;

const info = timestampLogger.error;
const output = console.log;

async function main() {
  await dock.init({ address: FullNodeEndpoint });

  info("Scanning the first block state");
  const first = await grabState(
    await dock.api.at(await dock.api.rpc.chain.getBlockHash(+FirstBlockNumber)),
  );
  info("-".repeat(50));
  info("Scanning the second block state");
  const second = await grabState(
    await dock.api.at(
      await dock.api.rpc.chain.getBlockHash(+SecondBlockNumber),
    ),
  );
  info("-".repeat(50));

  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);

  const diff = {};
  for (const key of keys) {
    if (key in first && key in second) {
      if (!R.equals(first[key], second[key])) {
        if (Array.isArray(first[key]) && Array.isArray(second[key])) {
          diff[key] = {
            beforeDifference: R.difference(first[key], second[key]),
            afterDifference: R.difference(second[key], first[key]),
          };
        } else {
          diff[key] = {
            before: first[key],
            after: second[key],
          };
        }
      }
    } else if (key in first) {
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
  const data = {};

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
          const value = (await member())[Transform]();

          data[key] = value;
        } catch {
          try {
            const value = [...(await member.entries())].map(([key, value]) => [
              key[Transform](),
              value[Transform](),
            ]);

            data[key] = value;
          } catch (e) {
            info(`Skipped ${key}`);
          }
        }
      } else {
        throw new Error(`Invalid type for the key: ${key}`);
      }
    }
  }

  return JSON.parse(JSON.stringify(data));
};

main()
  .catch(timestampLogger.error)
  .finally(() => process.exit());
