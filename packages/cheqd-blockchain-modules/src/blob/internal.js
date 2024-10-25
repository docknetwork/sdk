import {
  Blob,
  CheqdBlobId,
  CheqdBlobWithId,
  CheqdDid,
} from "@docknetwork/credential-sdk/types";
import { option } from "@docknetwork/credential-sdk/types/generic";
import { CheqdCreateResource, createInternalCheqdModule } from "../common";

const methods = {
  new: (blobWithId) => {
    const {
      blob,
      id: {
        value: [did, uuid],
      },
    } = CheqdBlobWithId.from(blobWithId);

    return new CheqdCreateResource(
      CheqdDid.from(did).value,
      uuid,
      "1.0",
      [],
      "Blob",
      "blob",
      blob
    );
  },
};

export default class CheqdInternalBlobModule extends createInternalCheqdModule(
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
