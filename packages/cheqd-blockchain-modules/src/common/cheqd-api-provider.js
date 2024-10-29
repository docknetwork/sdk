import { ApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils/type-helpers';

class CheqdApiProvider extends ApiProvider {
  constructor(cheqd) {
    super();

    this.cheqd = ensureInstanceOf(cheqd, ApiProvider);
  }

  get sdk() {
    return this.cheqd.ensureInitialized().sdk;
  }

  get fees() {
    return this.cheqd.fees;
  }

  isInitialized() {
    return this.cheqd.isInitialized();
  }

  async stateChangeBytes(name, payload) {
    return await this.cheqd.stateChangeBytes(name, payload);
  }

  async signAndSend(transaction, params) {
    return await this.cheqd.signAndSend(transaction, params);
  }
}

export default CheqdApiProvider;
