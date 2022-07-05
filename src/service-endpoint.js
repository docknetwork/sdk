// eslint-disable-next-line import/prefer-default-export
export class ServiceEndpointType {
  constructor(value = 0) {
    this.value = value;
  }

  setLinkedDomains() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0001;
  }
}
