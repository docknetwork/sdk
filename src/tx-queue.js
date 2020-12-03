// In-memory queue. Abstract better

export default class TxQueue {
  constructor(dockApi) {
    this.api = dockApi;
  }
}
