export default class VerificationRelationship {
  constructor(value = 0) {
    this.value = value;
  }

  setAuthentication() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0001;
  }

  setAssertion() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0010;
  }

  setCapabilityInvocation() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0100;
  }

  setKeyAgreement() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b1000;
  }

  setAllSigning() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0111;
  }

  isAuthentication() {
    // eslint-disable-next-line no-bitwise
    return !!(this.value & 0b0001);
  }

  isAssertion() {
    // eslint-disable-next-line no-bitwise
    return !!(this.value & 0b0010);
  }

  isCapabilityInvocation() {
    // eslint-disable-next-line no-bitwise
    return !!(this.value & 0b0100);
  }

  isKeyAgreement() {
    // eslint-disable-next-line no-bitwise
    return !!(this.value & 0b1000);
  }
}
