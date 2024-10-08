import {
  u8aToString,
  u8aToHex,
  randomAsHex,
} from "@docknetwork/credential-sdk/utils";

import { DockAPI } from "@docknetwork/dock-blockchain-api";

import { DockDid } from "@docknetwork/credential-sdk/types";
import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../test-constants";
import { registerNewDIDUsingPair } from "./helpers";
import {
  DockBlobId,
  BlobWithId,
  Blob,
} from "@docknetwork/credential-sdk/types";
import {
  Ed25519Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import { DockCoreModules } from "../../src";

let account;
let pair;
const dockDID = DockDid.random();
let blobId;

function errorInResult(result) {
  try {
    return result.events[0].event.data[0].toJSON().Module.error === 1;
  } catch (e) {
    return false;
  }
}

describe("Blob Module", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    pair = new DidKeypair([dockDID, 1], new Ed25519Keypair(firstKeySeed));
    await registerNewDIDUsingPair(dock, DockDid.from(dockDID), pair);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  beforeEach(async () => {
    blobId = DockBlobId.random();
  }, 30000);

  test("Can create and read a JSON Blob.", async () => {
    const blobJSON = new Blob({
      jsonBlob: true,
    });
    const blob = new BlobWithId(blobId, blobJSON);
    const result = await modules.blob.new(blob, dockDID, pair);

    expect(!!result).toBe(true);

    const chainBlob = await modules.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(DockDid.from(dockDID));
    expect(chainBlob[1]).toEqual(blobJSON);
  }, 30000);

  test("Can create and read a string Blob.", async () => {
    const blobHex = "my string";
    const blob = new BlobWithId(blobId, blobHex);
    const result = await modules.blob.new(blob, dockDID, pair);

    expect(!!result).toBe(true);

    const chainBlob = await modules.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(DockDid.from(dockDID));
    expect(u8aToString(chainBlob[1])).toEqual(blobHex);
  }, 30000);

  test("Can create and read a hex Blob.", async () => {
    const blobHex = randomAsHex(32);
    const blob = new BlobWithId(blobId, blobHex);

    const result = await modules.blob.new(blob, dockDID, pair);

    expect(!!result).toBe(true);

    const chainBlob = await modules.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(DockDid.from(dockDID));
    expect(u8aToHex(chainBlob[1])).toEqual(blobHex);
  }, 30000);

  test("Can create and read a Vector Blob.", async () => {
    const blobVect = new Uint8Array([1, 2, 3]);
    const blob = new BlobWithId(blobId, blobVect);

    const result = await modules.blob.new(blob, dockDID, pair);

    expect(!!result).toBe(true);

    const chainBlob = await modules.blob.get(blobId);
    expect(!!chainBlob).toBe(true);
    expect(chainBlob[0]).toEqual(DockDid.from(dockDID));
    expect([...chainBlob[1]]).toEqual([...blobVect]);
  }, 30000);

  test("Fails to write blob with size greater than allowed.", async () => {
    const blobHex = randomAsHex(8193); // Max size is 1024
    const blob = new BlobWithId(blobId, blobHex);
    await expect(modules.blob.new(blob, dockDID, pair)).rejects.toThrow();

    await expect(modules.blob.get(blobId)).rejects.toThrowError(
      "does not exist",
    );
  }, 30000);

  test("Fails to write blob with id already used.", async () => {
    const blobHexFirst = randomAsHex(12);
    let blob = new BlobWithId(blobId, blobHexFirst);
    const resultFirst = await modules.blob.new(blob, dockDID, pair);

    expect(!!resultFirst).toBe(true);
    expect(errorInResult(resultFirst)).toBe(false);

    blob = new BlobWithId(blobId, randomAsHex(123));

    await expect(modules.blob.new(blob, dockDID, pair)).rejects.toThrow();
  }, 60000);

  test("Should throw error when cannot read blob with given id from chain.", async () => {
    const nonExistentBlobId = DockBlobId.random();
    await expect(modules.blob.get(nonExistentBlobId)).rejects.toThrowError(
      "does not exist",
    );
  }, 30000);
});
