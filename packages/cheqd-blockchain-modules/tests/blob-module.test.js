import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import {
  CheqdTestnetDid,
  CheqdBlobId,
} from "@docknetwork/credential-sdk/types";
import generateBlobModuleTests from "@docknetwork/credential-sdk/generate-tests/blob-module";
import CheqdDIDModule from "../src/did/module";
import { faucet } from "./constants";
import CheqdBlobModule from "../src/blob/module";

describe("BlobModule", () => {
  const cheqd = new CheqdAPI();

  beforeAll(async () => {
    await cheqd.init({
      url: process.env.ENDPOINT_URL || "http://localhost:26657",
      mnemonic: faucet.mnemonic,
    });
  });

  afterAll(async () => {
    await cheqd.disconnect();
  });

  generateBlobModuleTests(
    {
      did: new CheqdDIDModule(cheqd),
      blob: new CheqdBlobModule(cheqd),
    },
    {
      DID: CheqdTestnetDid,
      BlobId: CheqdBlobId,
    }
  );
});
