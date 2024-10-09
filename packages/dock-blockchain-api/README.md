# @docknetwork/dock-blockchain-api

Built with PolkadotJS, for use with the Dock Substrate Node or our public main/test networks.

## Initialize

```javascript
import { DockAPI } from "@docknetwork/dock-blockchain-api";

const dock = new DockAPI();
dock.init(...);
```

## Use

```javascript
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";

const modules = new DockCoreModules(dock);
...
```
