import { StatusList2021Credential } from "../src";
import { withDockAPI } from "./helpers";

const { FullNodeEndpoint } = process.env;

async function main(dock) {
  console.log("Revoked:");

  for (const [
    id,
    unparsedCredential,
  ] of await dock.api.query.statusListCredential.statusListCredentials.entries()) {
    const credential = StatusList2021Credential.fromBytes(
      unparsedCredential.unwrap().statusListCredential
        .asStatusList2021Credential
    );
    const decoded = await credential.decodeStatusList();
    const revoked = await credential.revokedBatch(
      Array.from({ length: decoded.length }, (_, idx) => idx)
    );

    const toShow = revoked
      .map((revoked, idx) => (revoked ? idx : null))
      .filter((v) => v != null);

    if (toShow.length !== 0) {
      console.log(id.toHuman()[0], ":", toShow.join(", "));
    }
  }
}

withDockAPI({ address: FullNodeEndpoint })(main)().catch(console.error);
