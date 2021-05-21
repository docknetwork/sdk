# Types

The types to provide polkadot-js, sidecar, etc when working with mainnet. 
The file v22.js contains types to be used till spec version 22. The file v23.js contains types to be used starting from spec version 23. 
Coincidentally, the types are same for testnet and mainnet.

When using polkadot-js, the object exported from bundle.js should be passed to `typesBundle` argument of `ApiPromise.create`.


When using [sidecar](https://github.com/paritytech/substrate-api-sidecar), you can run the following command to connect to mainnet

```
SAS_SUBSTRATE_TYPES_BUNDLE=<path to bundle.js> SAS_SUBSTRATE_WS_URL=wss://mainnet-node.dock.io/ yarn dev
```


**TODO**: The SDK still uses types.json but should be moved to using this bundle and `init` method should accept a bundle as well.
