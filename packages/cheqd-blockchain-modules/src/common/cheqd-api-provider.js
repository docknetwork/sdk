import { ApiProvider } from '@docknetwork/credential-sdk/modules/common';
import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils/type-helpers';

class CheqdApiProvider extends ApiProvider {
  constructor(cheqd) {
    super();
    this.cheqd = ensureInstanceOf(cheqd, ApiProvider);
  }

  get sdk() {
    const { sdk } = this.cheqd;
    if (sdk == null) {
      throw new Error('SDK is not initialized');
    }

    return sdk;
  }

  get fees() {
    return this.cheqd.fees;
  }

  async stateChangeBytes(name, payload) {
    return await this.cheqd.stateChangeBytes(name, payload);
  }

  async signAndSend(transaction, params) {
    return await this.cheqd.signAndSend(transaction, params);
  }
}

export default CheqdApiProvider;
