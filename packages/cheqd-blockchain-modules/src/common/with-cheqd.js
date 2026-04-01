import {
  withExtendedStaticProperties,
  ensureInstanceOf,
} from '@docknetwork/credential-sdk/utils';
import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract';

export default function withCheqd(klass) {
  const name = `withCheqd(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Associated class which's only available when interacting with the cheqd blockchain.
       * Instance of this class is assigned to `cheqdOnly` property of the object.
       */
      static CheqdOnly;

      constructor(cheqd) {
        super(ensureInstanceOf(cheqd, AbstractApiProvider));

        this.cheqdOnly = new this.constructor.CheqdOnly(this.apiProvider);
      }

      supportsIdentifier(id) {
        return this.apiProvider.supportsIdentifier(id);
      }

      methods() {
        return this.apiProvider.methods();
      }

      get types() {
        return this.apiProvider.types();
      }
    },
  };

  return withExtendedStaticProperties(['CheqdOnly'], obj[name]);
}
