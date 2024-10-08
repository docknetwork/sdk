import { TypedNumber } from '../../generic';

export class VerificationRelationship extends TypedNumber {
  constructor(value = 0) {
    super(value);
  }

  setAuthentication() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0001;
    return this;
  }

  setAssertion() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0010;
    return this;
  }

  setCapabilityInvocation() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0100;
    return this;
  }

  setKeyAgreement() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b1000;
    return this;
  }

  setAllSigning() {
    // eslint-disable-next-line no-bitwise
    this.value |= 0b0111;
    return this;
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
