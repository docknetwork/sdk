import { ApiProvider } from '@docknetwork/credential-sdk/modules/common';
import { ensureInstanceOf } from '@docknetwork/credential-sdk/utils/type-helpers';
import { DockDIDModuleInternal } from '../did/internal';

class DockApiProvider extends ApiProvider {
  constructor(dock) {
    super();
    this.dock = ensureInstanceOf(dock, ApiProvider);

    if (typeof dock.getAllExtrinsicsFromBlock !== 'function') {
      throw new Error('`getAllExtrinsicsFromBlock` must be a function');
    }
  }

  get api() {
    const { api } = this.dock;
    if (!api.isConnected) {
      throw new Error('API is not connected');
    }

    return api;
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
      includeFailedExtrinsics,
    );
  }

  async didNonce(did) {
    return await new DockDIDModuleInternal(this).nonce(did);
  }
}

export default DockApiProvider;
