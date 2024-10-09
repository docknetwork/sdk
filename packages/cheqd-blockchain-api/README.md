# @docknetwork/cheqd-blockchain-api

This JavaScript library is developed on top of the `@cheqd/sdk` and provides a suite of tools and functionalities to seamlessly interact with the Cheqd blockchain.
It simplifies the process of connecting with the Cheqd network, enabling developers to efficiently manage digital identities and verifiable credentials within decentralized ecosystems.

## Initialize

```javascript
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";

const cheqd = new CheqdAPI();
cheqd.init(...);
```

## Use

```javascript
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";

const modules = new CheqdCoreModules(cheqd);
...
```
