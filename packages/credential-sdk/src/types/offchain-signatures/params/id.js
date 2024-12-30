import { TypedNumber, TypedUUID, withFromDockId } from "../../generic";

export class DockParamsId extends TypedNumber {}

export class CheqdParamsId extends withFromDockId(
  TypedUUID,
  DockParamsId,
  "offchain-signature-params"
) {}
