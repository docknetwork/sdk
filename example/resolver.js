/* eslint-disable  max-classes-per-file */
import { randomAsHex } from "@polkadot/util-crypto";
import ethr from "ethr-did-resolver";
import { DockAPI } from "../src/index";
import { DockDid, NoDIDError, DidKeypair } from "../src/did";
import {
  DIDResolver,
  DIDKeyResolver,
  UniversalResolver,
  WILDCARD,
  DockDIDResolver,
} from "../src/resolver";

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from "../tests/test-constants";
import { registerNewDIDUsingPair } from "../tests/integration/helpers";

const universalResolverUrl = "https://uniresolver.io";

// Infura's Ethereum provider for the main net
const ethereumProviderConfig = {
  networks: [
    {
      name: "mainnet",
      rpcUrl: "https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9",
    },
  ],
};

const dock = new DockAPI();

// Custom ethereum resolver class
class EtherResolver extends DIDResolver {
  static METHOD = "ethr";

  constructor(config) {
    super();
    this.ethres = ethr.getResolver(config).ethr;
  }

  async resolve(did) {
    const parsed = this.parseDid(did);
    try {
      return this.ethres(did, parsed);
    } catch (e) {
      throw new NoDIDError(did);
    }
  }
}

/**
 * Generate and register a new Dock DID return the DID
 * @returns {Promise<string>}
 */
async function createDockDID() {
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);

  const dockDID = DockDid.random();
  const pair = new DidKeypair(
    dock.keyring.addFromUri(randomAsHex(32), null, "sr25519"),
    1,
  );
  await registerNewDIDUsingPair(dock, dockDID, pair);
  return String(dockDID);
}

async function main() {
  console.log("Connecting to the node...");

  await dock.init({
    address: FullNodeEndpoint,
  });

  console.log("Creating DID resolvers...");

  const resolvers = [
    new DIDKeyResolver(), // did:key resolver
    new DockDIDResolver(dock), // Prebuilt resolver
    new EtherResolver(ethereumProviderConfig), // Custom resolver
  ];

  class AnyDIDResolver extends DIDResolver {
    static METHOD = WILDCARD;
  }

  const resolver = new AnyDIDResolver([
    new UniversalResolver(universalResolverUrl),
    ...resolvers,
  ]);

  console.log("Building DIDs list...");

  const dockDID = await createDockDID();
  const didsToTest = [
    dockDID,
    "did:key:z6Mkfriq1MqLBoPWecGoDLjguo1sB9brj6wT3qZ5BxkKpuP6",
    "did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675",
  ];

  console.log("Resolving", didsToTest.length, "dids...");

  return Promise.all(
    didsToTest.map(async (did) => {
      const document = await resolver.resolve(did);
      console.log("Resolved DID", did, document);
    }),
  );
}

main()
  .then(() => {
    console.log("Example ran successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error occurred somewhere, it was caught!", error);
    process.exit(1);
  });
