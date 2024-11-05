import {
  Blob,
  CheqdBlobId,
  CheqdBlobWithId,
} from "@docknetwork/credential-sdk/types";
import { option } from "@docknetwork/credential-sdk/types/generic";
import { CheqdCreateResource, createInternalCheqdModule } from "../common";

const methods = {
  addParams: (id, params, did) => {
    return new CheqdCreateResource(
      did.value.value,
      id,
      "1.0",
      [],
      "Blob",
      "blob",
      params.toJSON()
    );
  },
  removeParams: (id, did) => {
    new CheqdCreateResource(
      did.value.value,
      uuid,
      "1.0",
      [],
      "Blob",
      "blob",
      null
    );
  },
};

export default class CheqdInternalOffchainSignatures extends createInternalCheqdModule(
  methods
) {
  static Prop = "resource";

  static MsgNames = {
    new: "MsgCreateResource",
  };

  async blob(blobId) {
    return option(Blob).from(
      (await this.resource(...CheqdBlobId.from(blobId).value))?.resource?.data
    );
  }
}
