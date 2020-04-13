import {randomAsHex} from '@polkadot/util-crypto';
import { Resolver as DIFResolver} from 'did-resolver';

// Import Dock API
import dock from '../src/api';
import {createNewDockDID, createKeyDetail} from '../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../src/utils/misc';
import {getResolver as dockResolver} from '../src/dock-did-resolver';
import Resolver from '../src/resolver';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
import {FullNodeEndpoint, TestAccountURI} from '../tests/test-constants';

// Infura's Ethereum provider for the main net
const ethereumProviderConfig = {
  networks: [
    { name: 'mainnet', rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9' },
  ]
};

const universalResolverUrl = 'http://localhost:8080';

// Create a new Dock DID
const dockDID = createNewDockDID();
// This DID was randomly picked from the publicly available examples out there
const ethrDid = 'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675';
// This DID was randomly picked from the publicly available example at universal resolver repo
const workdayDID = 'did:work:2UUHQCd4psvkPLZGnWY33L';

/**
 * Register a new Dock DID and then resolve using the Dock DID resolver
 * @returns {Promise<void>}
 */
async function resolveDockDID() {
  const pair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(pair);
  const keyDetail = createKeyDetail(publicKey, dockDID);
  const transaction = dock.did.new(dockDID, keyDetail);
  await dock.sendTransaction(transaction);

  console.log('DID registered', dockDID);

  const resolver = new DIFResolver(dockResolver(FullNodeEndpoint));
  const result = await resolver.resolve(dockDID);
  console.log('DID Document from resolver:', JSON.stringify(result, true, 2));
}

/**
 * Resolve several DID methods using a single resolver
 * @returns {Promise<void>}
 */
async function resolveSeveralDIDMethodsUsingResolver() {
  // Register providers for Dock and Ethereum.
  const providers = {
    'dock': FullNodeEndpoint,
    'ethr': ethereumProviderConfig,
  };

  const resolver = new Resolver(providers, universalResolverUrl);
  resolver.init();

  console.log('Resolving ethereum DID', ethrDid);
  console.log(await resolver.resolve(ethrDid));

  console.log('Resolving Dock DID', dockDID);
  console.log(await resolver.resolve(dockDID));

  // There is no provider registered for Workday. Universal resolver will be queried
  console.log('Resolving Workday DID', workdayDID);
  console.log(await resolver.resolve(workdayDID));
}

dock.init({
  address: FullNodeEndpoint
})
  .then(() => {
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
    return resolveDockDID();
  })
  .then(resolveSeveralDIDMethodsUsingResolver)
  .then(async () => {
    console.log('Example ran successfully');
    // eslint-disable-next-line no-undef
    process.exit(0);
  })
  .catch(error => {
    console.error('Error occurred somewhere, it was caught!', error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  });
