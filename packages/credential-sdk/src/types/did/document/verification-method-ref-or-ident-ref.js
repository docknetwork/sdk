import VerificationMethodRef from './verification-method-ref';
import IdentRef from './ident-ref';
import { withFrom } from '../../generic';

export default class VerificationMethodRefOrIdentRef extends withFrom(
  VerificationMethodRef, (value, from) => {
    try {
      return from(value);
    } catch (err) {
      return IdentRef.from(value);
    }
  },
) {}
