import { withExtendedStaticProperties } from "@docknetwork/credential-sdk/utils/inheritance";
import DockApiProvider from "./dock-api-provider";

export default function injectDock(klass) {
  const name = `withDock(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Associated class which's only available when interacting with the dock blockchain.
       * Instance of this class is assigned to `dockOnly` property of the object.
       */
      static DockOnly;

      constructor(dock) {
        super();

        this.apiProvider = new DockApiProvider(dock);
        this.dockOnly = new this.constructor.DockOnly(this.apiProvider);
      }
    },
  };

  return withExtendedStaticProperties(["DockOnly"], obj[name]);
}
