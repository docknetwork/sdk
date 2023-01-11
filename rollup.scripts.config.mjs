import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import multiInput from "rollup-plugin-multi-input";
import { wasm } from "@rollup/plugin-wasm";
import path from "path";
import pluginAlias from "@rollup/plugin-alias";

function expand(prefix, all) {
  return all.map((p) => (p ? `${prefix}-${p}` : prefix));
}

const baseEntries = [
  ...expand("api", ["augment", "base", "derive"]),
  ...expand("rpc", ["augment", "core", "provider"]),
  ...expand("types", [
    ...expand("augment", ["", "lookup", "registry"]),
    "codec",
    "create",
    "helpers",
    "known",
  ]),
].reduce(
  (all, p) => ({
    ...all,
    [`@polkadot/${p}`]: path.resolve(
      process.cwd(),
      `node_modules/@polkadot/${p}`
    ),
  }),
  {
    // we point to a specific file for these (default augmentations)
    "@polkadot/rpc-core/types/jsonrpc": path.resolve(
      process.cwd(),
      "node_modules/@polkadot/rpc-core/types/jsonrpc.js"
    ),
    "@polkadot/types-codec/types/registry": path.resolve(
      process.cwd(),
      "node_modules/@polkadot/types-codec/types/registry.js"
    ),
  }
);

const entries = [
  "hw-ledger-transports",
  "networks",
  "x-bigint",
  "x-fetch",
  "x-global",
  "x-randomvalues",
  "x-textdecoder",
  "x-textencoder",
  "x-ws",
  "wasm-crypto-init",
].reduce(
  (all, p) => ({
    ...all,
    [`@polkadot/${p}`]: path.resolve(
      process.cwd(),
      `node_modules/@polkadot/${p}`
    ),
  }),
  baseEntries
);

const overrides = {
  "@polkadot/hw-ledger": {
    // these are all in the un-shakable and unused hdDerivation stuff from the Zondax libs, ignore
    entries: {
      "bip32-ed25519": path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/empty.js"
      ),
      bip39: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/empty.js"
      ),
      blakejs: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/empty.js"
      ),
      bs58: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/empty.js"
      ),
      events: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/empty.js"
      ),
      "hash.js": path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/empty.js"
      ),
    },
  },
  "@polkadot/util-crypto": {
    entries: {
      "@polkadot/wasm-crypto": path.resolve(
        process.cwd(),
        "node_modules/@polkadot/wasm-crypto/bundle.js"
      ),
      "bn.js": path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/bn.cjs"
      ),
      buffer: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/buffer.js"
      ),
      crypto: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/crypto.js"
      ),
    },
    inject: {
      Buffer: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/buffer.js"
      ),
      crypto: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/crypto.js"
      ),
      inherits: path.resolve(
        process.cwd(),
        "node_modules/@polkadot/x-bundle/build/inherits.js"
      ),
    },
    polyfill: false,
  },
};

export default {
  external: [],
  plugins: [
    multiInput,
    pluginAlias({ entries }),
    json(),
    commonjs(),
    resolve({ preferBuiltins: false }),
    wasm({
      sync: ["*.wasm"],
    }),
  ],
  input: ["scripts/staking_payouts.js"],
  output: {
    manualChunks: {},
    dir: "build",
    format: "cjs",
    entryFileNames: "[name].js",
  },
};
