import { withExtendedStaticProperties } from '@docknetwork/credential-sdk/utils/inheritance';
import CheqdAPIProvider from './cheqd-api-provider';

export default function injectDock(klass) {
  const name = `withCheqd(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Associated class which's only available when interacting with the dock blockchain.
       * Instance of this class is assigned to `cheqdOnly` property of the object.
       */
      static CheqdOnly;

      static ApiProvider = CheqdAPIProvider;

      constructor(dock) {
        const apiProvider = new CheqdAPIProvider(dock);

        super(apiProvider);

        this.cheqdOnly = new this.constructor.CheqdOnly(apiProvider);
      }
    },
  };

  return withExtendedStaticProperties(['CheqdOnly'], obj[name]);
}
