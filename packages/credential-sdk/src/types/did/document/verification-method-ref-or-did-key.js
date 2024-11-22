import VerificationMethodRef from './verification-method-ref';
import { VerificationMethodRefWithDidKey } from './verification-method';
import { withFrom } from '../../generic';

export default class VerificationMethodRefOrDidKey extends withFrom(
  VerificationMethodRef,
  (value, from) => {
    try {
      return VerificationMethodRefWithDidKey.from(value);
    } catch (err) {
      return from(value);
    }
  },
) {}
