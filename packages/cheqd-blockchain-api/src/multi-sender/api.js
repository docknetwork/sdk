import { CheqdAPI } from '../api';
import MultiSender from './multi-sender';

export default class CheqdMultiSenderAPI extends CheqdAPI {
  constructor(params) {
    super();

    this.sender = new MultiSender({ ...params, api: this });
  }

  async init(...args) {
    await super.init(...args);
    await this.sender.init(...args);

    return this;
  }

  async disconnect() {
    await this.sender.shutdown();
    await super.disconnect();

    return this;
  }

  async signAndSend(...args) {
    return await this.sender.signAndSend(...args);
  }
}
