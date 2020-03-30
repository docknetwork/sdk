import {randomAsHex} from '@polkadot/util-crypto';
import { Resolver as DIFResolver} from 'did-resolver';

// Import Dock API
import dock from '../src/api';
import {createNewDockDID, createKeyDetail} from '../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../src/utils/misc';
import {getResolver as dockResolver} from '../src/dock-did-resolver';
import {Resolver} from '../src/resolver';

// The following can be tweaked depending on where the node is running and what
// account is to be used for sending the transaction.
const fullNodeWsRPCEndpoint = 'ws://127.0.0.1:9944';
const accountUri = '//Alice';
const accountMetadata = {name: 'Alice'};

// Infura's Ethereum provider for the main net
const ethereumProviderConfig = {
  networks: [
    { name: 'mainnet', rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9' },
  ]
};

// Create a new Dock DID
const dockDID = createNewDockDID();
// This DID was randomly picked from the publicly available examples out there
const ethrDid = 'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675';

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

  const resolver = new DIFResolver(dockResolver(fullNodeWsRPCEndpoint));
  const result = await resolver.resolve(dockDID);
  console.log('DID Document from resolver:', JSON.stringify(result, true, 2));
}

/**
 * Resolve an ethereum and dock DID using a single resolver
 * @returns {Promise<void>}
 */
async function resolveEthrDIDAndDockDID() {
  const resolver = new Resolver(fullNodeWsRPCEndpoint, ethereumProviderConfig);
  resolver.init();
  console.log('Resolving ethereum DID', ethrDid);
  console.log(await resolver.resolve(ethrDid));
  console.log('Resolving Dock DID', dockDID);
  console.log(await resolver.resolve(dockDID));
}

dock.init(fullNodeWsRPCEndpoint)
  .then(() => {
    const account = dock.keyring.addFromUri(accountUri, accountMetadata);
    dock.setAccount(account);
    return resolveDockDID();
  })
  .then(resolveEthrDIDAndDockDID)
  .then(async () => {
    console.log('Example ran successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error occurred somewhere, it was caught!', error);
  });


