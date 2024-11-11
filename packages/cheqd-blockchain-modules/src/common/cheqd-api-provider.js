import { AbstractApiProvider } from "@docknetwork/credential-sdk/modules/abstract/common";
import { ensureInstanceOf } from "@docknetwork/credential-sdk/utils/type-helpers";

class CheqdApiProvider extends AbstractApiProvider {
  constructor(cheqd) {
    super();

    this.cheqd = ensureInstanceOf(cheqd, AbstractApiProvider);
  }

  get sdk() {
    return this.cheqd.ensureInitialized().sdk;
  }

  get fees() {
    return this.cheqd.fees;
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
