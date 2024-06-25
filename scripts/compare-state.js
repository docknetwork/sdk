import { ApiPromise } from "@polkadot/api";
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
 * - For iterable entries (`Vec`s, `Set`s): `diffBefore` containing old values that don't exist anymore and `diffAfter` showing new values that didn't exist before.
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
 * - A `keys` field with two properties: `diffBefore` containing old keys that don't exist anymore and `diffAfter` showing new keys that didn't exist before.
 * - If the storage entry didn't exist before, it will have the `ADDED` value.
 * - If the storage entry will be removed during the upgrade and existed before, it will have the `REMOVED` value.
 *
 * ## Failures
 * - If there's no migrated key in the difference output, the data wasn't changed.
 * - If there's no associated `keys` field but `diffBefore`/`diffAfter` instead, the values were also modified.
 *
 * # Storage entry values translation
 *
 * ## Success
 * Each migrated storage entry must have:
 * - A `values` field with two properties: `diffBefore` containing old values that don't exist anymore and `diffAfter` showing new values that didn't exist before.
 * - If the storage entry didn't exist before, it will have the `ADDED` value.
 * - If the storage entry will be removed during the upgrade and existed before, it will have the `REMOVED` value.
 *
 * ## Failures
 * - If there's no migrated key in the difference output, the data wasn't changed.
 * - If there's no associated `values` field but `diffBefore`/`diffAfter` instead, the keys were also modified.
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

  const entries = new Set([...Object.keys(first), ...Object.keys(second)]);

  const res = {};
  for (const entry of entries) {
    if (entry in first && entry in second) {
      if (!R.equals(first[entry], second[entry])) {
        res[entry] = buildDiff(first[entry], second[entry]);
      }
    } else if (entry in first) {
      res[entry] = "REMOVED";
      info(`Removed storage entry: ${entry}`);
    } else {
      res[entry] = "ADDED";
      info(`New storage entry: ${entry}`);
    }
  }

  output(JSON.stringify(res, null, 2));
}

/** Calculates the difference for two values, returning the before- and after-looking differences. */
const diff = R.curry((a, b) => ({
  diffBefore: R.difference(a, b),
  diffAfter: R.difference(b, a),
}));

/** Extracts keys and values from the supplied objects then calculates the difference for keys and values. */
const keysValuesDiff = R.pipe(
  R.addIndex(R.map)((key, idx) => ({
    [key]: R.pipe(
      R.map(R.o(R.defaultTo([]), R.map(R.nth(idx)))),
      R.apply(diff),
      R.reject(R.isEmpty),
    ),
  })),
  R.mergeAll,
  R.applySpec,
)(["keys", "values"]);

/** Calculates the difference between the first and second states. */
const buildDiff = R.curryN(
  2,
  R.unapply(
    R.ifElse(
      R.all(Array.isArray),
      R.either(
        R.both(
          R.all(R.prop(KeyedSymbol)),
          R.pipe(
            keysValuesDiff,
            R.reject(R.isEmpty),
            R.unless(R.pipe(R.keys, R.length, R.equals(1)), R.F),
          ),
        ),
        R.apply(diff),
      ),
      R.applySpec({
        stateBefore: R.nth(0),
        stateAfter: R.nth(1),
      }),
    ),
  ),
);

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
  const parseObj = R.o(JSON.parse, JSON.stringify);

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
          data[key] = parseObj((await member())[Transform]());
        } catch {
          try {
            data[key] = [...(await member.entries())].map(([key, value]) => [
              parseObj(key[Transform]()),
              parseObj(value[Transform]()),
            ]);
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
