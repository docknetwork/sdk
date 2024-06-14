import { ApiPromise } from "@polkadot/api";
import dock from "../src";
import { timestampLogger } from "./helpers";
import R from "ramda";
import { nth } from "ramda";

const {
  FullNodeEndpoint,
  FirstBlockNumber,
  SecondBlockNumber = +FirstBlockNumber + 1,
  Transform = "toHuman",
} = process.env;

const info = timestampLogger.error;
const output = console.log;
const KeyedSymbol = Symbol("Keyed");
const ToSkip = new Set([
  "offences::reports",
  "substrate::code",
  "democracy::preimages",
]);

/**
 * Documentation for storage entry migration process:
 *
 * # Storage entry migration
 *
 * ## Success
 * Each migrated storage entry must have:
 * - For iterable entries (`Vec`s, `Set`s): `differenceBefore` containing old values and `differenceAfter` showing new values.
 * - For non-iterable entries: `stateBefore` containing old value and `stateAfter` showing new value.
 * - If the storage entry didn't exist before, it will have the `ADDED` value.
 * - If the storage entry will be removed during the upgrade and existed before, it will have the `REMOVED` value.
 *
 * ## Failures
 * - If there's no migrated key in the difference output, the data wasn't changed.
 *
 * # Storage entry keys migration
 *
 * ## Success
 * Each migrated storage entry must have:
 * - A `keys` field with two properties: `differenceBefore` containing old keys and `differenceAfter` showing new keys.
 * - If the storage entry didn't exist before, it will have the `ADDED` value.
 * - If the storage entry will be removed during the upgrade and existed before, it will have the `REMOVED` value.
 *
 * ## Failures
 * - If there's no migrated key in the difference output, the data wasn't changed.
 * - If there's no associated `keys` field but `differenceAfter`/`differenceBefore` instead, the data was also modified.
 *
 * # Storage entry values translation
 *
 * ## Success
 * Each migrated storage entry must have:
 * - A `values` field with two properties: `differenceBefore` containing old keys and `differenceAfter` showing new keys.
 * - If the storage entry didn't exist before, it will have the `ADDED` value.
 * - If the storage entry will be removed during the upgrade and existed before, it will have the `REMOVED` value.
 *
 * ## Failures
 * - If there's no migrated key in the difference output, the data wasn't changed.
 * - If there's no associated `values` field but `differenceAfter`/`differenceBefore` instead, the data was also modified.
 */
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
  const calcDiff = R.curry((a, b) => ({
    differenceBefore: R.difference(a, b),
    differenceAfter: R.difference(b, a),
  }));

  const diff = {};
  for (const key of keys) {
    if (key in first && key in second) {
      if (!R.equals(first[key], second[key])) {
        if (Array.isArray(first[key]) && Array.isArray(second[key])) {
          if (first[key][KeyedSymbol] && second[key][KeyedSymbol]) {
            const { keys, values } = R.pipe(
              R.addIndex(R.reduce)(
                (acc, cur, idx) => ({
                  ...acc,
                  [cur]: R.map(R.o(R.defaultTo([]), R.map(R.nth(idx))), [
                    first[key],
                    second[key],
                  ]),
                }),
                {},
              ),
              R.map(R.o(R.reject(R.isEmpty), R.apply(calcDiff))),
            )(["keys", "values"]);

            if (R.isEmpty(keys) || R.isEmpty(values)) {
              diff[key] = R.reject(R.isEmpty, { keys, values });
            } else {
              diff[key] = calcDiff(first[key], second[key]);
            }
          } else {
            diff[key] = calcDiff(first[key], second[key]);
          }
        } else {
          diff[key] = {
            stateBefore: first[key],
            stateAfter: second[key],
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

/**
 * Grabs the state of the blockchain at a given API instance.
 *
 * @async
 * @function grabState
 * @param {ApiPromise} api - The API instance to query.
 * @returns {Object} The state data of the blockchain.
 */
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

      if (ToSkip.has(key)) {
        info(`Skipping ${key}`);
        continue;
      }
      info(`Scanning ${key}`);

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
            data[key][KeyedSymbol] = true;
          } catch (e) {
            info(`Skipped ${key}`);
          }
        }
      } else {
        throw new Error(`Invalid type for the key: ${key}`);
      }
    }
  }

  return data;
};

main()
  .catch(timestampLogger.error)
  .finally(() => process.exit());
