import { Resolver, parse } from 'did-resolver';
import ethr from 'ethr-did-resolver';

// TODO: This is WIP

function ethrResolve() {
  const providerConfig = {
    networks: [
      { name: "mainnet", rpcUrl: 'https://mainnet.infura.io/v3/05f321c3606e44599c54dbc92510e6a9' },
    ]
  };

  const ethrResolver = ethr.getResolver(providerConfig);
  console.log(ethrResolver);
  console.log(ethrResolver['ethr']);
  const resolver = new Resolver(ethrResolver);

  const ethDid = 'did:ethr:0xabcabc03e98e0dc2b855be647c39abe984193675';
  console.log(parse(ethDid));
  resolver.resolve(ethDid).then(doc => console.log(doc));
}

import {randomAsHex} from '@polkadot/util-crypto';

// Import Dock SDK
import dock, {
  PublicKeySr25519,
} from '../src/dock-sdk';
import {createNewDockDID, createKeyDetail} from '../src/utils/did';
import {getResolver as dockResolver} from '../src/dock-did-resolver';

const fullNodeWsRPCEndpoint = 'ws://127.0.0.1:9944';

const dockDID = createNewDockDID();

async function getDIDDoc() {
  console.log('Getting DID now.');
  // Check if DID exists
  const result = await dock.did.getDocument(dockDID);
  console.log('DID Document:', JSON.stringify(result, true, 2));
  const resolver = new Resolver(dockResolver(fullNodeWsRPCEndpoint));
  const result1 = await resolver.resolve(dockDID);
  console.log('DID Document from resolver:', JSON.stringify(result1, true, 2));
  return result1;
}

function registerNewDID() {
  // Generate keys for the DID.
  const firstPair = dock.keyring.addFromUri(randomAsHex(32), null, 'sr25519');
  const publicKey = PublicKeySr25519.fromKeyringPair(firstPair);

  // The controller is same as the DID
  const keyDetail = createKeyDetail(publicKey, dockDID);

  console.log('Submitting new DID', dockDID, publicKey);

  const transaction = dock.did.new(dockDID, keyDetail);
  return dock.sendTransaction(transaction);
}

dock.init(fullNodeWsRPCEndpoint)
  .then(() => {
    const account = dock.keyring.addFromUri('//Alice', {name: 'Alice'});
    dock.setAccount(account);
    return registerNewDID();
  }).then(getDIDDoc);


