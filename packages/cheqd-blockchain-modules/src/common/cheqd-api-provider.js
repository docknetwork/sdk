import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils';

class CheqdApiProvider extends AbstractApiProvider {
  constructor(cheqd) {
    super();

    this.cheqd = ensureInstanceOf(cheqd, AbstractApiProvider);
  }

  get sdk() {
    return this.cheqd.sdk;
  }

  types() {
    return this.cheqd.types();
  }

  methods() {
    return this.cheqd.methods();
  }

  isInitialized() {
    return this.cheqd.isInitialized();
  }

  supportsIdentifier(id) {
    return this.cheqd.supportsIdentifier(id);
  }

  async stateChangeBytes(name, payload) {
    return await this.cheqd.stateChangeBytes(name, payload);
  }

  async signAndSend(transaction, params) {
    return await this.cheqd.signAndSend(transaction, params);
  }
}

export default CheqdApiProvider;
