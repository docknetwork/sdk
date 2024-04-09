import { DidKeypair } from "../../src/utils/did";

export default (dock) => ({
  "did:dock:5EEV4xWYWmsXVEeG2d1mPyK19J5tXwQekGB7YveoK1LD4XD5":
    DidKeypair.fromApi(dock, {
      seed: "0x0000000000000000000000000000000000000000000000000000000000000000",
      keypairType: "sr25519",
    }),
});
