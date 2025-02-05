import {
  CheqdVerificationMethodAssertion,
  CheqdMainnetVerificationMethodAssertion,
  CheqdTestnetVerificationMethodAssertion,
  CheqdVerificationMethodAssertionLegacy,
  CheqdTestnetVerificationMethodAssertionLegacy,
  CheqdMainnetVerificationMethodAssertionLegacy,
} from './verification-method';
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
} from './verification-method-ref';
import { anyOf } from '../../generic';

export class CheqdVerificationMethodRefOrCheqdVerificationMethod extends anyOf(
  CheqdVerificationMethodAssertion,
  CheqdVerificationMethodAssertionLegacy,
  CheqdVerificationMethodRef,
) {}

export class CheqdVerificationMethodRefOrCheqdTestnetVerificationMethod extends anyOf(
  CheqdTestnetVerificationMethodAssertion,
  CheqdTestnetVerificationMethodAssertionLegacy,
  CheqdTestnetVerificationMethodRef,
) {}

export class CheqdVerificationMethodRefOrCheqdMainnetVerificationMethod extends anyOf(
  CheqdMainnetVerificationMethodAssertion,
  CheqdMainnetVerificationMethodAssertionLegacy,
  CheqdMainnetVerificationMethodRef,
) {}
