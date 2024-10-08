import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { NoDIDError } from "@docknetwork/credential-sdk/modules";
import {
  Ed25519Keypair,
  Secp256k1Keypair,
  DidKeypair,
} from "@docknetwork/credential-sdk/keypairs";
import {
  DidMethodKey,
  DockDidOrDidMethodKey,
} from "@docknetwork/credential-sdk/types";
import {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccountURI,
} from "../../test-constants";
import { DockCoreModules } from "../../../src";

describe("Basic DID tests", () => {
  const dock = new DockAPI();
  const modules = new DockCoreModules(dock);

  // Generate a random DID
  let testDidMethodKeyPair1;
  let testDidMethodKey1;

  let testDidMethodKeyPair2;
  let testDidMethodKey2;

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);

    testDidMethodKeyPair1 = Ed25519Keypair.random();
    testDidMethodKey1 = DidMethodKey.fromKeypair(testDidMethodKeyPair1);

    testDidMethodKeyPair2 = Secp256k1Keypair.random();
    testDidMethodKey2 = DidMethodKey.fromKeypair(testDidMethodKeyPair2);

    await modules.did.dockOnly.newDidMethodKey(testDidMethodKey1, false);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test("Can create a did:key", async () => {
    // DID does not exist
    await expect(
      modules.did.dockOnly.getDidMethodKeyDetail(testDidMethodKey2),
    ).rejects.toThrow(NoDIDError);

    await modules.did.dockOnly.newDidMethodKey(testDidMethodKey2, false);
    const { nonce } =
      await modules.did.dockOnly.getDidMethodKeyDetail(testDidMethodKey2);
    expect(+nonce).toBeGreaterThan(1);
    expect(testDidMethodKey2.toString().startsWith("did:key:z")).toBe(true);
  }, 30000);

  test("Can attest with a DID", async () => {
    const iri = "my iri";

    await modules.attest.setClaim(
      iri,
      testDidMethodKey1,
      DidKeypair.didMethodKey(testDidMethodKeyPair1),
    );

    const att1 = await modules.attest.getAttests(testDidMethodKey1);
    expect(att1).toEqual(iri);

    await modules.attest.setClaim(
      iri,
      testDidMethodKey2,
      DidKeypair.didMethodKey(testDidMethodKeyPair2),
    );

    const att2 = await modules.attest.getAttests(testDidMethodKey2);
    expect(att2).toEqual(iri);
  }, 30000);

  test("Conversion works properly (including SS58 format)", () => {
    const substrateDid1 = dock.api.createType(
      "DidOrDidMethodKey",
      testDidMethodKey1,
    );
    expect(DockDidOrDidMethodKey.from(substrateDid1)).toEqual(
      testDidMethodKey1,
    );
    expect(testDidMethodKey1).toEqual(
      DockDidOrDidMethodKey.from(testDidMethodKey1),
    );

    const substrateDid2 = dock.api.createType(
      "DidOrDidMethodKey",
      testDidMethodKey2,
    );
    expect(DockDidOrDidMethodKey.from(substrateDid2)).toEqual(
      testDidMethodKey2,
    );
    expect(testDidMethodKey2).toEqual(
      DockDidOrDidMethodKey.from(testDidMethodKey2),
    );
  });
});
