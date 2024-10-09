import { randomAsU8a, u8aToHex } from "@docknetwork/credential-sdk/utils";
import { DockAPI } from "@docknetwork/dock-blockchain-api";

import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../test-constants";
import { BlocksProvider } from "@docknetwork/dock-blockchain-api/utils/block";
import { DockCoreModules, DockAnchorModule } from "../../src";

describe("Anchoring Module", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
  });

  test("Can create and query anchors", async () => {
    const provider = new BlocksProvider(dock);
    const documents = Array(8)
      .fill(undefined)
      .map(() => randomAsU8a(300));

    // The root is to be written to chain and proofs must be stored.
    const [root, proofs] =
      DockAnchorModule.batchDocumentsInMerkleTree(documents);

    // Check that the proof is correct
    documents.forEach((d, i) => {
      const r = DockAnchorModule.verifyMerkleProofOfDocument(
        d,
        proofs[i],
        root
      );
      expect(r).toBe(true);
    });

    const resp = await modules.anchor.deploy(root);
    const block = await provider.blockByHash(
      u8aToHex(
        resp.status.isInBlock ? resp.status.asInBlock : resp.status.asFinalized
      )
    );
    const blockNumber = await modules.anchor.get(root);
    expect(block.toJSON().block.header.number).toBe(+blockNumber);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});
