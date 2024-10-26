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

      constructor(cheqd) {
        super();

        this.apiProvider = new CheqdAPIProvider(cheqd);
        this.cheqdOnly = new this.constructor.CheqdOnly(this.apiProvider);
      }

      supportsIdentifier(id) {
        return this.apiProvider.supportsIdentifier(id);
      }
    },
  };

  return withExtendedStaticProperties(['CheqdOnly'], obj[name]);
}
