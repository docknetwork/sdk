import { VerificationMethodRef } from './verification-method-ref';
import IdentRef from './ident-ref';
import { anyOf } from '../../generic';

export default class VerificationMethodRefOrIdentRef extends anyOf(
  VerificationMethodRef,
  IdentRef,
) {}
