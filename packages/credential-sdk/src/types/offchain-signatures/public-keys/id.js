import { TypedNumber, TypedUUID, anyOf } from '../../generic';

export class DockPublicKeyId extends TypedNumber {}

export class CheqdPublicKeyId extends TypedUUID {}

export class DockOrCheqdPublicKeyId extends anyOf(
  DockPublicKeyId,
  CheqdPublicKeyId,
) {}
