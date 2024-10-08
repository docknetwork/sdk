import json from "@rollup/plugin-json";
import multiInput from "rollup-plugin-multi-input";
import commonjs from "@rollup/plugin-commonjs";

export default async function () {
  return [
    {
      plugins: [
        multiInput(),
        json(),
        // terser(),
        commonjs(),
        // Temporarily disabled, not sure if required
        // since rify is a node module doesnt seem to work
        // but would be nice to try embed it
        // wasm({
        //   sync: ['*.wasm'],
        // }),
      ],
      input: ["src/**/*.js"],
      output: [
        {
          sourcemap: true,
          dir: "dist/esm",
          format: "esm",
          entryFileNames: "[name].js",
        },
        {
          sourcemap: true,
          dir: "dist/cjs",
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      ],
    },
  ];
}
