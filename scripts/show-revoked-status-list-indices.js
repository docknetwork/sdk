import { StatusList2021Credential } from "../src";
import { DockDidOrDidMethodKey } from "../src/utils/did";
import { withDockAPI } from "./helpers";

const { FullNodeEndpoint, ShowEmpty, ShowDeprecated } = process.env;

async function main(dock) {
  console.log("Revoked:");

  const statusListCreds =
    await dock.api.query.statusListCredential.statusListCredentials.entries();
  for (const [id, unparsedCredential] of statusListCreds) {
    const credential = StatusList2021Credential.fromBytes(
      unparsedCredential.unwrap().statusListCredential
        .asStatusList2021Credential
    );
    const owners = [
      ...(await unparsedCredential.unwrap().policy.asOneOf.values()),
    ]
      .map((did) => DockDidOrDidMethodKey.from(did))
      .map((did) => did.toQualifiedEncodedString());
    const decoded = await credential.decodedStatusList();
    const revoked = await credential.revokedBatch(
      Array.from({ length: decoded.length }, (_, idx) => idx)
    );

    const toShow = revoked
      .map((revoked, idx) => (revoked ? idx : null))
      .filter((v) => v != null);

    if (toShow.length || ShowEmpty) {
      decoded.bitstring.leftToRightIndexing = false;
      const revoked = await credential.revokedBatch(
        Array.from({ length: decoded.length }, (_, idx) => idx)
      );
      const toShowBigEndian = revoked
        .map((revoked, idx) => (revoked ? idx : null))
        .filter((v) => v != null);

      if (ShowDeprecated) {
        console.log(
          id.toHuman()[0],
          "left to right encoding (correct):",
          toShow.join(", ") || "-",
          "right to left encoding (deprecated):",
          toShowBigEndian.join(", "),
          "; owners:",
          owners.join(",")
        );
      } else {
        console.log(
          id.toHuman()[0],
          ":",
          toShow.join(", ") || "-",
          "; owners:",
          owners.join(",")
        );
      }
    }
  }
}

withDockAPI({ address: FullNodeEndpoint })(main)().catch(console.error);
