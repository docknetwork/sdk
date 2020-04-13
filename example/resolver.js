import {randomAsHex} from '@polkadot/util-crypto';
import {DockAPI} from '../src/api';
import {createNewDockDID, createKeyDetail, NoDIDError} from '../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../src/utils/misc';
import {DIDResolver, MultiResolver, UniversalResolver, DockResolver} from '../src/resolver';
import ethr from 'ethr-did-resolver';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {FullNodeEndpoint, TestAccountURI} from '../tests/test-constants';

const universalResolverUrl = 'http://localhost:8080';

// Infura's Ethereum provider for the main net
const ethereumProviderConfig = {
  networks: [
    {
      name: 'mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9',
    },
  ]
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
 * @param {dock} DockAPI - An initialized connection to a dock full-node.
 * @returns {Promise<string>}
 */
async function createDockDID(dock) {
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);
  
  const dockDID = createNewDockDID();
  const pair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  const transaction = dock.did.new(dockDID, keyDetail);
  await dock.sendTransaction(transaction);

  return dockDID;
}

async function main() {
  console.log('Connecting to the node...');

  await dock.init({
    address: FullNodeEndpoint
  });

  console.log('Creating DID providers...');

  const providers = {
    'dock': new DockResolver(dock), // Provider as class
    'ethr': new EtherResolver(ethereumProviderConfig), // Custom provider
  };

  const resolver = new MultiResolver(providers, new UniversalResolver(universalResolverUrl));

  console.log('Building DIDs list...');

  const didsToTest = [
    'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675',
    'did:work:2UUHQCd4psvkPLZGnWY33L',
    'did:sov:WRfXPg8dantKVubE3HX8pw',
    'did:web:uport.me',
    'did:ethr:0x3b0BC51Ab9De1e5B7B6E34E5b960285805C41736',
    'did:nacl:Md8JiMIwsapml_FtQ2ngnGftNP5UmVCAUuhnLyAsPxI',
    'did:jolo:e76fb4b4900e43891f613066b9afca366c6d22f7d87fc9f78a91515be24dfb21',
    'did:stack:v0:16EMaNw3pkn3v6f2BgnSSs53zAKH4Q8YJg-0',
    'did:hcr:0f674e7e-4b49-4898-85f6-96176c1e30de',
    'did:neoid:priv:b4eeeb80d20bfb38b23001d0659ce0c1d96be0aa',
    'did:elem:EiAS3mqC4OLMKOwcz3ItIL7XfWduPT7q3Fa4vHgiCfSG2A',
    'did:github:gjgd',
    'did:ccp:ceNobbK6Me9F5zwyE3MKY88QZLw',
    'did:work:2UUHQCd4psvkPLZGnWY33L',
    'did:ont:AN5g6gz9EoQ3sCNu7514GEghZurrktCMiH',
    'did:kilt:5GFs8gCumJcZDDWof5ETFqDFEsNwCsVJUj2bX7y4xBLxN5qT',
    'did:evan:testcore:0x126E901F6F408f5E260d95c62E7c73D9B60fd734',
    await createDockDID(dock),
  ];

  console.log('Resolving', didsToTest.length, 'dids...');

  return Promise.all(didsToTest.map(async did => {
    const document = await resolver.resolve(did);
    console.log('Resolved DID', did, document)
  }));
}

main()
  .then(() => {
    console.log('Example ran successfully');
    // eslint-disable-next-line no-undef
    process.exit(0);
  })
  .catch(error => {
    console.error('Error occurred somewhere, it was caught!', error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  });
