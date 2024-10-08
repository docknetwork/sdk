import { randomAsHex } from "@polkadot/util-crypto";

import { DockAPI } from "@docknetwork/dock-blockchain-api";
import {
  NoDIDError,
  NoOnchainDIDError,
} from "@docknetwork/credential-sdk/modules";
import { DockDid } from "@docknetwork/credential-sdk/types";
import { u8aToHex } from "@docknetwork/credential-sdk/utils";
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from "../../test-constants";
import {
  CIDOffchainDocRef,
  CustomOffchainDocRef,
  URLOffchainDocRef,
} from "@docknetwork/credential-sdk/types";
import { DockCoreModules } from "../../../src";

describe("Off-chain DIDs", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Generate a random DID
  const dockDID = DockDid.random();

  const firstDocRef = randomAsHex(100);
  const secondDocRef = randomAsHex(110);
  const thirdDocRef = randomAsHex(89);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test("Can create an off-chain DID", async () => {
    // DID does not exist
    await expect(
      modules.did.dockOnly.getOffchainDidDetail(dockDID),
    ).rejects.toThrow(NoDIDError);

    const docRef = new CIDOffchainDocRef(firstDocRef);
    await modules.did.dockOnly.newOffchain(dockDID, docRef, false);
    const didDetail = await modules.did.dockOnly.getOffchainDidDetail(dockDID);
    expect(didDetail.docRef).toEqual(docRef);
    expect(didDetail.accountId.value).toEqual(
      u8aToHex(dock.account.addressRaw),
    );

    // DID cannot be fetched as on-chain DID
    await expect(
      modules.did.dockOnly.getOnchainDidDetail(dockDID),
    ).rejects.toThrow(NoOnchainDIDError);
  });

  test("Can update DIDDoc reference for the DID to URL", async () => {
    const docRef = new URLOffchainDocRef(secondDocRef);
    await modules.did.dockOnly.setOffchainDidDocRef(dockDID, docRef, false);
    const didDetail = await modules.did.dockOnly.getOffchainDidDetail(dockDID);
    expect(didDetail.docRef).toEqual(docRef);
    expect(didDetail.accountId.value).toEqual(
      u8aToHex(dock.account.addressRaw),
    );
  });

  test("Can update DIDDoc reference for the DID to Custom", async () => {
    const docRef = new CustomOffchainDocRef(thirdDocRef);
    await modules.did.dockOnly.setOffchainDidDocRef(dockDID, docRef, false);
    const didDetail = await modules.did.dockOnly.getOffchainDidDetail(dockDID);
    expect(didDetail.docRef).toEqual(docRef);
    expect(didDetail.accountId.value).toEqual(
      u8aToHex(dock.account.addressRaw),
    );
  });

  test("Can remove the DID", async () => {
    await modules.did.dockOnly.removeOffchainDid(dockDID, false);
    await expect(
      modules.did.dockOnly.getOffchainDidDetail(dockDID),
    ).rejects.toThrow(NoDIDError);
  });
});
