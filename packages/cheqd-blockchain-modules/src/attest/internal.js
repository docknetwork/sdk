import {
  CheqdDid,
  Iri,
  CheqdCreateResource,
} from "@docknetwork/credential-sdk/types";
import { TypedUUID } from "@docknetwork/credential-sdk/types/generic";
import { createInternalCheqdModule, validateResource } from "../common";

const Name = "Attestation";
const Type = "attest";

const methods = {
  setClaim(iri, targetDid) {
    return new CheqdCreateResource(
      this.types.Did.from(targetDid).value,
      TypedUUID.random(),
      "1.0",
      [],
      Name,
      Type,
      Iri.from(iri)
    );
  },
};

export default class CheqdInternalAttestModule extends createInternalCheqdModule(
  methods
) {
  static MsgNames = {
    setClaim: "MsgCreateResource",
  };

  async attest(did, attestId) {
    return Iri.from(
      validateResource(await this.resource(did, attestId), Name, Type)
    );
  }

  async attestId(did) {
    const res = await this.latestResourceMetadataBy(
      did,
      (meta) => meta.resourceType === "attest"
    );

    return res?.id;
  }
}
