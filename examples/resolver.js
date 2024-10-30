/* eslint-disable  max-classes-per-file */
import ethr from 'ethr-did-resolver';
import { DockAPI } from '@docknetwork/dock-blockchain-api';
import {
  DockDid,
  DidKey,
  DIDDocument,
} from '@docknetwork/credential-sdk/types';
import { NoDIDError } from '@docknetwork/credential-sdk/modules/abstract/did';
import {
  DIDKeyResolver,
  UniversalResolver,
  WILDCARD,
  DIDResolver,
  Resolver,
} from '@docknetwork/credential-sdk/resolver';
import { DockDIDModule } from '@docknetwork/dock-blockchain-modules';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';

const universalResolverUrl = 'https://uniresolver.io';

// Infura's Ethereum provider for the main net
const ethereumProviderConfig = {
  networks: [
    {
      name: 'mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9',
    },
  ],
};

const dock = new DockAPI();
const didModule = new DockDIDModule(dock);

// Custom ethereum resolver class
class EtherResolver extends Resolver {
  prefix = 'did';

  method = 'ethr';

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
  const account = dock.keyring.addFromUri(
    process.env.TestAccountURI || '//Alice',
  );
  dock.setAccount(account);

  const dockDID = DockDid.random();
  const pair = new DidKeypair([dockDID, 1], Ed25519Keypair.random());
  await didModule.createDocument(
    DIDDocument.create(dockDID, [new DidKey(pair.publicKey())], []),
  );
  return String(dockDID);
}

async function main() {
  console.log('Connecting to the node...');

  await dock.init({
    address: process.env.FullNodeEndpoint || 'ws://127.0.0.1:9944',
  });

  console.log('Creating DID resolvers...');

  const resolvers = [
    new DIDKeyResolver(), // did:key resolver
    new DIDResolver(didModule), // Prebuilt resolver
    new EtherResolver(ethereumProviderConfig), // Custom resolver
  ];

  class AnyDIDResolver extends DIDResolver {
    method = WILDCARD;
  }

  const resolver = new AnyDIDResolver([
    new UniversalResolver(universalResolverUrl),
    ...resolvers,
  ]);

  console.log('Building DIDs list...');

  const dockDID = await createDockDID();
  const didsToTest = [
    dockDID,
    'did:key:z6Mkfriq1MqLBoPWecGoDLjguo1sB9brj6wT3qZ5BxkKpuP6',
    'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675',
  ];

  console.log('Resolving', didsToTest.length, 'dids...');

  return Promise.all(
    didsToTest.map(async (did) => {
      const document = await resolver.resolve(did);
      console.log('Resolved DID', did, document);
    }),
  );
}

main()
  .then(() => {
    console.log('Example ran successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
