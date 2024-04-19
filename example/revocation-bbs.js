import dock from "../src/index";
import BbsPlusPresentation from "../src/presentation";
import { verifyPresentation } from "../src/utils/vc/presentations";
import VerifiableCredential from "../src/verifiable-credential";
import {
  DIDKeyResolver,
  DockResolver,
  UniversalResolver,
  WildcardMultiResolver,
} from "../src/resolver";
import { initializeWasm } from "@docknetwork/crypto-wasm-ts/lib/index";
import VerifiablePresentation from "../src/verifiable-presentation";
import {
  Accumulator,
  PositiveAccumulator,
  AccumulatorPublicKey,
  dockAccumulatorParams,
  VBMembershipWitness,
  VBWitnessUpdateInfo,
  Encoder,
} from "@docknetwork/crypto-wasm-ts";
import { hexToU8a } from "@polkadot/util";

const credential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://ld.dock.io/security/bbs/v1",
    {
      dk: "https://ld.dock.io/credentials#",
      BasicCredential: "dk:BasicCredential",
      name: "dk:name",
      description: "dk:description",
      logo: "dk:logo",
    },
  ],
  credentialStatus: {
    id: "dock:accumulator:0xa987780d8b3146840048eaee2243359bfe7d9884d50c0e0012f1ba4171a6046e",
    type: "DockVBAccumulator2022",
    revocationCheck: "membership",
    revocationId: "4",
  },
  id: "https://creds-testnet.dock.io/ea5cdb2bbce199957d31715532f6fd2c5597e8f6774d24dfa46b6651877f433e",
  type: ["VerifiableCredential", "BasicCredential"],
  credentialSubject: {
    id: "did:key:z6Mku9R8zdA8LD6hcFXkn47jLnfcKZNGmwaTrDnaCBkSb8Un",
    name: "Wallet CI - BBS+ not revoked",
  },
  issuanceDate: "2024-04-19T16:44:58.828Z",
  issuer: {
    name: "Dock Labs",
    description:
      "Business automation with verified data in a privacy preserving manner.",
    logo: "https://img.dock.io/a4d62cf3697ae38c329af20cbdb1dc2c",
    id: "did:dock:5CxMzC6TujZCLNHNgQWVUdCwnoct4jmdtGe3k5GArVcXvdw3",
  },
  credentialSchema: {
    id: "data:application/json;charset=utf-8,%7B%22%24id%22%3A%22https%3A%2F%2Fschema.dock.io%2FBasicCredential-V2-1703777584571.json%22%2C%22%24schema%22%3A%22http%3A%2F%2Fjson-schema.org%2Fdraft-07%2Fschema%23%22%2C%22additionalProperties%22%3Atrue%2C%22description%22%3A%22A%20representation%20of%20a%20very%20basic%20example%20credential%22%2C%22name%22%3A%22Basic%20Credential%22%2C%22properties%22%3A%7B%22%40context%22%3A%7B%22type%22%3A%22string%22%7D%2C%22credentialSchema%22%3A%7B%22type%22%3A%22string%22%7D%2C%22credentialStatus%22%3A%7B%22properties%22%3A%7B%22id%22%3A%7B%22type%22%3A%22string%22%7D%2C%22revocationCheck%22%3A%7B%22type%22%3A%22string%22%7D%2C%22revocationId%22%3A%7B%22type%22%3A%22string%22%7D%2C%22type%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22type%22%3A%22object%22%7D%2C%22credentialSubject%22%3A%7B%22properties%22%3A%7B%22id%22%3A%7B%22description%22%3A%22A%20unique%20identifier%20of%20the%20recipient.%20Example%3A%20DID%2C%20email%20address%2C%20national%20ID%20number%2C%20employee%20ID%2C%20student%20ID%20etc.%20If%20you%20enter%20the%20recipient's%20DID%2C%20the%20person%20will%20automatically%20receive%20the%20credential%20in%20their%20Dock%20wallet.%22%2C%22title%22%3A%22Subject%20ID%22%2C%22type%22%3A%22string%22%7D%2C%22name%22%3A%7B%22description%22%3A%22The%20name%20of%20the%20credential%20holder.%22%2C%22title%22%3A%22Subject%20Name%22%2C%22type%22%3A%22string%22%7D%7D%2C%22required%22%3A%5B%22name%22%5D%2C%22type%22%3A%22object%22%7D%2C%22cryptoVersion%22%3A%7B%22type%22%3A%22string%22%7D%2C%22id%22%3A%7B%22type%22%3A%22string%22%7D%2C%22issuanceDate%22%3A%7B%22format%22%3A%22date-time%22%2C%22type%22%3A%22string%22%7D%2C%22issuer%22%3A%7B%22properties%22%3A%7B%22description%22%3A%7B%22type%22%3A%22string%22%7D%2C%22id%22%3A%7B%22type%22%3A%22string%22%7D%2C%22logo%22%3A%7B%22type%22%3A%22string%22%7D%2C%22name%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22type%22%3A%22object%22%7D%2C%22name%22%3A%7B%22type%22%3A%22string%22%7D%2C%22proof%22%3A%7B%22properties%22%3A%7B%22%40context%22%3A%7B%22items%22%3A%5B%7B%22properties%22%3A%7B%22proof%22%3A%7B%22properties%22%3A%7B%22%40container%22%3A%7B%22type%22%3A%22string%22%7D%2C%22%40id%22%3A%7B%22type%22%3A%22string%22%7D%2C%22%40type%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22type%22%3A%22object%22%7D%2C%22sec%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22type%22%3A%22object%22%7D%2C%7B%22type%22%3A%22string%22%7D%5D%2C%22type%22%3A%22array%22%7D%2C%22created%22%3A%7B%22format%22%3A%22date-time%22%2C%22type%22%3A%22string%22%7D%2C%22proofPurpose%22%3A%7B%22type%22%3A%22string%22%7D%2C%22type%22%3A%7B%22type%22%3A%22string%22%7D%2C%22verificationMethod%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22type%22%3A%22object%22%7D%2C%22type%22%3A%7B%22type%22%3A%22string%22%7D%7D%2C%22type%22%3A%22object%22%7D",
    type: "JsonSchemaValidator2018",
    parsingOptions: {
      useDefaults: true,
      defaultMinimumInteger: -4294967295,
      defaultMinimumDate: -17592186044415,
      defaultDecimalPlaces: 4,
    },
    version: "0.3.0",
  },
  name: "Wallet CI - BBS+ not revoked",
  cryptoVersion: "0.5.0",
  proof: {
    "@context": [
      {
        sec: "https://w3id.org/security#",
        proof: {
          "@id": "sec:proof",
          "@type": "@id",
          "@container": "@graph",
        },
      },
      "https://ld.dock.io/security/bbs/v1",
    ],
    type: "Bls12381BBS+SignatureDock2022",
    created: "2024-04-19T16:46:09Z",
    verificationMethod:
      "did:dock:5CxMzC6TujZCLNHNgQWVUdCwnoct4jmdtGe3k5GArVcXvdw3#keys-2",
    proofPurpose: "assertionMethod",
    proofValue:
      "zTtPPJAa7JXgT3AwQP51Bk5WGLpWNxTAzRTMTXGEPoxMMeSxW83pNasSjcUh9hbKgDD1MTC41JVJLysWXQDqYkJfs58Sucg7GfZH3t1ZiqJZmYvPeJ7PU59u4fNCCeu6K91n1PBcnLWeVpKGkes2z5nNcf",
  },
  $$accum__witness$$:
    "0xa7ef89c25ad2248238aed686a108f2dff3744a64ecf510a64e04d35e5adc5e8a1b7589e969803491ece6b622863cb95d",
};

const WITNESS_KEY = "$$accum__witness$$";

async function verifyCredential() {
  const resolver = new WildcardMultiResolver([
    new DockResolver(dock),
    new DIDKeyResolver(),
  ]);
  const witness = credential[WITNESS_KEY];

  delete credential[WITNESS_KEY];

  const isRevoked = await getIsRevoked(credential, witness);
  console.log("Is Revoked:", isRevoked);
}

dock
  .init({
    address: "wss://knox-1.dock.io",
  })
  .then(initializeWasm)
  .then(verifyCredential)
  .catch((error) => {
    console.error("Error occurred somewhere, it was caught!", error);
    process.exit(1);
  });

export const getWitnessDetails = async (credential, _membershipWitness) => {
  const { credentialStatus } = credential;
  const registryId = credentialStatus?.id.replace("dock:accumulator:", "");
  const revocationIndex = credentialStatus.revocationId;

  const queriedAccumulator = await dock.accumulatorModule.getAccumulator(
    registryId,
    false
  );

  if (!queriedAccumulator) {
    throw new Error("Accumulator not found");
  }

  const accumulator = PositiveAccumulator.fromAccumulated(
    hexToU8a(queriedAccumulator.accumulated)
  );

  const encodedRevId = Encoder.defaultEncodeFunc()(revocationIndex.toString());

  const publicKey = await dock.accumulatorModule.getPublicKeyByHexDid(
    queriedAccumulator.keyRef[0],
    queriedAccumulator.keyRef[1]
  );

  const params = dockAccumulatorParams();
  const pk = new AccumulatorPublicKey(hexToU8a(publicKey.bytes));

  let membershipWitness = new VBMembershipWitness(
    hexToU8a(_membershipWitness)
  );

  // Fetch updated membership witness
  const updatedWitness = await updateMembershipWitness({
    credential,
    membershipWitness: _membershipWitness,
    registryId,
    accumulator: queriedAccumulator,
  });

  membershipWitness = updatedWitness;

  return {
    encodedRevId,
    membershipWitness,
    pk,
    params,
    accumulator,
  };
};

async function updateMembershipWitness({
  credential,
  membershipWitness,
  registryId,
  accumulator,
}) {
  const revocationId = credential.credentialStatus.revocationId;
  const member = Accumulator.encodePositiveNumberAsAccumulatorMember(
    Number(revocationId)
  );

  let updates = [];
  try {
    updates = await dock.accumulatorModule.getUpdatesFromBlock(
      registryId,
      accumulator.lastModified
    );
  } catch (err) {
    if (err.code === -32000) {
      console.error(err);
      // "-32000: Client error: UnknownBlock: State already discarded for BlockId::Hash(<hash>)"
      // This means that the node has discarded old blocks to preserve space. This should not happen with a full node
      updates = [];
    } else {
      throw err;
    }
  }

  const additions = [];
  const removals = [];

  if (updates.length && updates[0].additions !== null) {
    for (const a of updates[0].additions) {
      additions.push(hexToU8a(a));
    }
  }

  if (updates.length && updates[0].removals !== null) {
    for (const a of updates[0].removals) {
      removals.push(hexToU8a(a));
    }
  }

  const queriedWitnessInfo = new VBWitnessUpdateInfo(
    hexToU8a(updates[0].witnessUpdateInfo)
  );
  const witness = new VBMembershipWitness(hexToU8a(membershipWitness));

  witness.updateUsingPublicInfoPostBatchUpdate(
    member,
    additions,
    removals,
    queriedWitnessInfo
  );

  return witness;
}

export const getIsRevoked = async (credential, _membershipWitness) => {
  const { encodedRevId, membershipWitness, pk, params, accumulator } =
    await getWitnessDetails(credential, _membershipWitness);

  console.log({
    pk: pk.hex,
    membershipWitnes: membershipWitness.hex,
    accumulator: accumulator.accumulated.toString("hex"),
  });

  try {
    const result = accumulator.verifyMembershipWitness(
      encodedRevId,
      membershipWitness,
      pk,
      params
    );

    return !result;
  } catch (err) {
    console.error(err);
    return false;
  }
};
