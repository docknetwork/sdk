import { randomAsHex } from '@polkadot/util-crypto';
import ethr from 'ethr-did-resolver';
import { DockAPI } from '../src/api';
import { createNewDockDID, createKeyDetail, NoDIDError } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import {
  DIDResolver, MultiResolver, UniversalResolver, DockResolver,
} from '../src/resolver';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

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

// Custom ethereum resolver class
class EtherResolver extends DIDResolver {
  constructor(config) {
    super();
    this.ethres = ethr.getResolver(config).ethr;
  }

  async resolve(did) {
    const parsed = this.parseDid(did);
    try {
      return await this.ethres(did, parsed);
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

  const dockDID = createNewDockDID();
  const pair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  await dock.did.new(dockDID, keyDetail, false);

  return dockDID;
}

async function main() {
  console.log('Connecting to the node...');

  await dock.init({
    address: FullNodeEndpoint,
  });

  console.log('Creating DID resolvers...');

  const resolvers = {
    dock: new DockResolver(dock), // Prebuilt resolver
    ethr: new EtherResolver(ethereumProviderConfig), // Custom resolver
  };

  const resolver = new MultiResolver(resolvers, new UniversalResolver(universalResolverUrl));

  console.log('Building DIDs list...');

  const dockDID = await createDockDID();

  const didsToTest = [
    dockDID,
    'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675',
    'did:work:2UUHQCd4psvkPLZGnWY33L',
    'did:sov:WRfXPg8dantKVubE3HX8pw',
    'did:nacl:Md8JiMIwsapml_FtQ2ngnGftNP5UmVCAUuhnLyAsPxI',
  ];

  console.log('Resolving', didsToTest.length, 'dids...');

  return Promise.all(didsToTest.map(async (did) => {
    const document = await resolver.resolve(did);
    console.log('Resolved DID', did, document);
  }));
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
