// Error class for passing extrinsic errors upstream
export default class ExtrinsicError extends Error {
  constructor(message, method, data, status, events) {
    super(message);
    this.name = 'ExtrinsicError';
    this.method = method;
    this.data = data;
    this.status = status;
    this.events = events;
  }
}
