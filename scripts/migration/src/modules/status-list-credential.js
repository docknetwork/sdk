import {
  StatusListCredentialId,
  DockStatusList2021CredentialWithPolicy,
  DockStatusListCredentialId,
} from "@docknetwork/credential-sdk/types";
import { option } from "@docknetwork/credential-sdk/types";
import { Base } from "./common.js";

export default class DIDMigration extends Base {
  static Prop = "attest";

  async existsOnCheqd([did, _]) {
    return (await this.module.fetchStatusListCredential(did)) != null;
  }

  async keys() {
    return await this.dock.api.query.statusListCredential.statusListCredentials.keys();
  }

  parse(key) {
    return StatusListCredentialId.from(key);
  }

  async fetchEntry(id) {
    return (
      option(DockStatusList2021CredentialWithPolicy).from(
        await this.dock.api.query.statusListCredential.statusListCredentials(
          DockStatusListCredentialId.from(id).value
        )
      )?.policy ?? null
    );
  }

  async *txs() {
    const { module } = this;

    for await (const [id, statusListCredential] of this.fetchAndFilter()) {
      const didKeypair = this.findKeypair(document);

      yield await module.createStatusListCredentialTx(
        id,
        statusListCredential,
        didKeypair
      );
    }
  }
}
