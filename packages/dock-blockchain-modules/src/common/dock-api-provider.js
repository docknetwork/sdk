import { AbstractApiProvider } from "@docknetwork/credential-sdk/modules/abstract/common";
import { ensureInstanceOf } from "@docknetwork/credential-sdk/utils/type-helpers";
import { DockDIDModuleInternal } from "../did/internal";

class DockApiProvider extends AbstractApiProvider {
  constructor(dock) {
    super();
    this.dock = ensureInstanceOf(dock, AbstractApiProvider);

    if (typeof dock.getAllExtrinsicsFromBlock !== "function") {
      throw new Error("`getAllExtrinsicsFromBlock` must be a function");
    }
  }

  get api() {
    const { api } = this.dock;
    if (!api.isConnected) {
      throw new Error("API is not connected");
    }

    return api;
  }

  methods() {
    return this.dock.methods();
  }

  supportsIdentifier(id) {
    return this.dock.supportsIdentifier(id);
  }

  isInitialized() {
    return this.dock.isInitialized();
  }

  async stateChangeBytes(name, payload) {
    return await this.dock.stateChangeBytes(name, payload);
  }

  async signAndSend(extrinsic, params) {
    return await this.dock.signAndSend(extrinsic, params);
  }

  async getAllExtrinsicsFromBlock(numberOrHash, includeFailedExtrinsics) {
    return await this.dock.getAllExtrinsicsFromBlock(
      numberOrHash,
      includeFailedExtrinsics
    );
  }

  async withDidNonce(did, fn) {
    if (typeof this.dock.withDidNonce === "function") {
      return await this.dock.withDidNonce(did, fn);
    } else {
      return fn(await new DockDIDModuleInternal(this).nonce(did));
    }
  }

  async batchAll(transactions) {
    return await this.dock.batchAll(transactions);
  }
}

export default DockApiProvider;
