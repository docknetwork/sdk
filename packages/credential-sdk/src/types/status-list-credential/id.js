import { DockStatusList2021Qualifier } from '../../vc/constants';
import { sized, TypedBytes, withQualifier } from '../generic';

export class StatusListCredentialId extends withQualifier(TypedBytes) {
  static Qualifier = DockStatusList2021Qualifier;

  static fromUnqualifiedString(bytes) {
    return new this(bytes);
  }

  toEncodedString() {
    return this.value;
  }
}

export class DockStatusListCredentialId extends sized(StatusListCredentialId) {
  static Size = 32;
}
