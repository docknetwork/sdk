import { StatusList } from "@digitalcredentials/vc-status-list";
import { StatusList2021Credential } from "../../src";
import { withDockAPI } from "../helpers";
import getKeypairs from "./keypairs";
import { fmtIter } from "../../src/utils/generic";
import { typedHexDID } from "../../src/utils/did/typed-did";
import { getKeyDoc } from "../../src/utils/vc/helpers";

const { FullNodeEndpoint, SenderAccountURI, IgnoreDids = '' } = process.env;

const IgnoreDidsSet = new Set(IgnoreDids.split(','))

const parseCred = async (dock, [id, rawCred]) => {
  const credential = StatusList2021Credential.fromBytes(
    rawCred.unwrap().statusListCredential.asStatusList2021Credential
  );
  const decoded = await credential.decodedStatusList();
  decoded.bitstring.leftToRightIndexing = false;
  const revokedRaw = await credential.revokedBatch(
    Array.from({ length: decoded.length }, (_, idx) => idx)
  );
  const revoked = revokedRaw
    .map((revoked, idx) => (revoked ? idx : null))
    .filter((v) => v != null);

  const [owner] = [...(await rawCred.unwrap().policy.asOneOf.values())]
    .map((did) => typedHexDID(dock.api, did))
    .map((did) => did.toQualifiedEncodedString());

  return (
    revoked.length !== 0 && !IgnoreDidsSet.has(owner) && { id: id.toHuman()[0], credential, revoked, owner }
  );
};

async function main(dock) {
  const keypairs = getKeypairs(dock);
  const statusListCreds =
    await dock.api.query.statusListCredential.statusListCredentials.entries();
  const parsedCreds = (
    await Promise.all(statusListCreds.map((cred) => parseCred(dock, cred)))
  ).filter(Boolean);
  const owners = new Set(parsedCreds.map(({ owner }) => owner).filter(Boolean));

  console.log(`Required owners: ${fmtIter(owners)}`);

  const txs = await Promise.all(
    parsedCreds.map(async ({ id, revoked, credential, owner }) => {
      const keyPair = keypairs[owner];
      if (!keyPair) {
        throw new Error(`Missing keyPair for \`${owner}\``);
      }

      const keyDoc = getKeyDoc(owner, keyPair);
      const decoded = await credential.decodedStatusList();
      Object.defineProperty(credential, "decodedStatusList", {
        value: () =>
          Promise.resolve(new StatusList({ length: decoded.length })),
      });
      await credential.update(keyDoc, { revokeIndices: revoked });

      console.log(id, ":", revoked.join(", ") || "-");

      const [update, sig, nonce] =
        await dock.statusListCredential.createSignedUpdateStatusListCredential(
          id,
          credential,
          owner,
          keyPair,
          { didModule: dock.did }
        );

      return dock.statusListCredential.buildUpdateStatusListCredentialTx(
        update,
        [{ sig, nonce }]
      );
    })
  );

  return dock.signAndSend(await dock.api.tx.utility.batchAll(txs));
}

withDockAPI({ senderAccountURI: SenderAccountURI, address: FullNodeEndpoint })(
  main
)().catch(console.error);
