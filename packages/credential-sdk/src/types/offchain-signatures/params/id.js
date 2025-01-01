import { TypedNumber, TypedUUID } from "../../generic";
import withFromDockId from "../../generic/with-from-dock-id";

export class DockParamsId extends TypedNumber {}

export class CheqdParamsId extends withFromDockId(
  TypedUUID,
  DockParamsId,
  "offchain-signature-params"
) {}
