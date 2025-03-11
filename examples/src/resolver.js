/* eslint-disable  max-classes-per-file */
import ethr from 'ethr-did-resolver';
import { CheqdAPI } from '@docknetwork/cheqd-blockchain-api';
import { CheqdDid, DIDDocument } from '@docknetwork/credential-sdk/types';
import { parseDIDUrl } from '@docknetwork/credential-sdk/utils';
import { NoDIDError } from '@docknetwork/credential-sdk/modules/abstract/did';
import {
  DIDKeyResolver,
  UniversalResolver,
  WILDCARD,
  DIDResolver,
  ResolverRouter,
  Resolver,
} from '@docknetwork/credential-sdk/resolver';
import { CheqdDIDModule } from '@docknetwork/cheqd-blockchain-modules';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {
  Ed25519Keypair,
  DidKeypair,
} from '@docknetwork/credential-sdk/keypairs';
import { faucet, network, url } from './env.js';

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

const cheqd = new CheqdAPI();
const didModule = new CheqdDIDModule(cheqd);

// Custom ethereum resolver class
class EtherResolver extends Resolver {
  prefix = 'did';

  method = 'ethr';

  constructor(config) {
    super();
    this.ethres = ethr.getResolver(config).ethr;
  }

  async resolve(did) {
    const parsed = parseDIDUrl(did);
    try {
      return this.ethres(did, parsed);
    } catch (e) {
      throw new NoDIDError(did);
    }
  }
}

/**
 * Generate and register a new Cheqd DID return the DID
 * @returns {Promise<string>}
 */
async function createCheqdDID() {
  const cheqdDID = CheqdDid.random(network);
  const pair = new DidKeypair([cheqdDID, 1], Ed25519Keypair.random());
  await didModule.createDocument(
    DIDDocument.create(cheqdDID, [pair.didKey()]),
    pair,
  );
  return String(cheqdDID);
}

async function main() {
  console.log('Connecting to the node...');

  await cheqd.init({
    url,
    wallet: await faucet.wallet(),
    network,
  });

  console.log('Creating DID resolvers...');

  const resolvers = [
    new DIDKeyResolver(), // did:key resolver
    new DIDResolver(didModule), // Prebuilt resolver
    new EtherResolver(ethereumProviderConfig), // Custom resolver
  ];

  class AnyDIDResolver extends ResolverRouter {
    method = WILDCARD;
  }

  const resolver = new AnyDIDResolver([
    new UniversalResolver(universalResolverUrl),
    ...resolvers,
  ]);

  console.log('Building DIDs list...');

  const cheqdDID = await createCheqdDID();
  const didsToTest = [
    cheqdDID,
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
