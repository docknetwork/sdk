# DID resolver

The process of learning the DID Document of a DID is called DID resolution and tool that does the resolution is called the
resolver. Resolution involves looking at the DID method and then fetching the DID Document from the registry, the registry
might be a centralized database or a blockchain. The SDK supports resolving Dock DIDs natively.
For other DIDs, resolving the DID through the [Universal Resolver](https://uniresolver.io) is supported.

Each resolver should extend the class `DIDResolver` and implement the `resolve` method that accepts a DID and returns the
DID document. There is another class called `MultiResolver` that can accept several types of resolvers (objects of subclasses
of `DIDResolver`) and once the `MultiResolver` is initialized with the resolvers of different DID methods, it can resolve
DIDs of those methods.

## Dock resolver
The resolver for Dock DIDs `DockResolver` connects to the Dock blockchain to get the DID details. The resolver is
constructed by passing it a Dock API object so that it can connect to a Dock node. This is how you resolve a Dock DID:
```js
import { DockResolver } from '@dock/sdk/resolver';

// Assuming the presence of Dock API object `dock`
const dockResolver = new DockResolver(dock);
// Say you had a DID `dock:did:5D.....`
const didDocument = dockResolver.resolve('dock:did:5D.....');
```

## Creating a resolver class for a different method
If you want to resolve DIDs other than Dock and do not have/want access to the universal resolver, you can extend the
`DIDResolver` class to create a custom resolver. Following is an example to build a custom Ethereum resolver. It uses the
library [ethr-did-resolver](https://github.com/decentralized-identity/ethr-did-resolver) and accepts a provider information
as configuration. The example below uses Infura to get access to an Ethereum node and read the DID off Ethereum.

```js
import { DIDResolver } from '@dock/sdk/resolver';
import ethr from 'ethr-did-resolver';

// Infura's Ethereum provider for the main net.
const ethereumProviderConfig = {
  networks: [
    {
      name: 'mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/blahblahtoken',
    },
  ],
};

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

// Construct the resolver
const ethResolver = new EtherResolver(ethereumProviderConfig);

// Say you had a DID `did:ethr:0x6f....`
const didDocument = ethResolver.resolve('did:ethr:0x6f....');
```

## Universal resolver
To resolve DIDs using the [Universal Resolver](https://uniresolver.io), use the `UniversalResolver`. It needs the URL
of the universal resolver and assumes the universal resolver from this [codebase](https://github.com/decentralized-identity/universal-resolver)
is running at the URL.
```js
import { UniversalResolver } from '@dock/sdk/resolver';

// Change the resolver URL to something else in case you cannot use the resolver at https://uniresolver.io
const universalResolverUrl = 'https://uniresolver.io';
const universalResolver = new UniversalResolver(universalResolverUrl);

// Say you had a DID `did:btcr:xk....`
const didDocument = universalResolver.resolve('did:btcr:xk....');
```

## Resolving DIDs of several DID methods with a single resolver
In case you need to resolve DIDs from more than one method, a `MultiResolver` object can be created by passing
resolvers of various DID methods. The `MultiResolver` also accepts a `UniversalResolver` as an optional parameter which
is used when a DID for an unknown method needs to be resolved. The `resolvers` object below has resolvers for DID methods
`dock` and `ethr`. For resolving DID of any other method, the given `UniversalResolver` object will be used.
```js
import { MultiResolver } from '@dock/sdk/resolver';


const resolvers = {
    dock: new DockResolver(dock), // Prebuilt resolver
    ethr: new EtherResolver(ethereumProviderConfig), // Custom resolver
  };

const multiResolver = new MultiResolver(resolvers, new UniversalResolver(universalResolverUrl));

// Say you had a DID `did:dock:5D....`, then the `DockResolver` will be used as there a resolver for Dock DID.
const didDocumentDock = multiResolver.resolve('did:dock:5D....');

// Say you had a DID `did:btcr:xk....`, then the `UniversalResolver` will be used as there is no resolver for BTC DID.
const didDocumentBtc = multiResolver.resolve('did:btcr:xk....');
```
