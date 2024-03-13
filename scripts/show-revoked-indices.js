import { StatusList2021Credential } from "../src";
import { withDockAPI } from "./helpers";

const { FullNodeEndpoint, ShowEmpty } = process.env;

async function main(dock) {
  console.log("Revoked:");

  const statusListCreds =
    await dock.api.query.statusListCredential.statusListCredentials.entries();
  for (const [id, unparsedCredential] of statusListCreds) {
    const credential = StatusList2021Credential.fromBytes(
      unparsedCredential.unwrap().statusListCredential
        .asStatusList2021Credential,
      dock.api
    );
    const decoded = await credential.decodeStatusList();
    const revoked = await credential.revokedBatch(
      Array.from({ length: decoded.length }, (_, idx) => idx)
    );

    const toShow = revoked
      .map((revoked, idx) => (revoked ? idx : null))
      .filter((v) => v != null);

    if (toShow.length || ShowEmpty) {
      console.log(id.toHuman()[0], ":", toShow.join(", ") || "-");
    }
  }
}

withDockAPI({ address: FullNodeEndpoint })(main)().catch(console.error);
