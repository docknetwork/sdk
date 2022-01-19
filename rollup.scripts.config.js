import json from "@rollup/plugin-json";
import multiInput from "rollup-plugin-multi-input";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default async function () {
  return [
    {
      plugins: [multiInput(), json(), terser(), commonjs()],
      input: ["scripts/staking_payouts.js"],
      output: [
        {
          dir: "build",
          format: "cjs",
          entryFileNames: "[name].js",
        },
      ],
    },
  ];
}
