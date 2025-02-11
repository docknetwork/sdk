import {
  VerificationRelationship,
  DidKey,
  CheqdTestnetDid,
  DockDidValue,
  CheqdTestnetDidValue,
  CheqdMainnetDidValue,
  DockDid,
} from "../src/types/did";
import {
  CheqdMainnetDIDDocument,
  CheqdTestnetDIDDocument,
  DIDDocument,
  VerificationMethodRef,
} from "../src/types/did/document";
import {
  PublicKeyEd25519,
  BBSPublicKey,
  BBSPublicKeyValue,
  DockOffchainSignatureParamsRef,
  CheqdOffchainSignatureParamsRef,
} from "../src/types";
import { TypedUUID } from "../src/types/generic";
import { hexToU8a, maybeToCheqdPayloadOrJSON } from "../src/utils";
import { verMethodRefsEqual } from "../src/vc";
import { CheqdTestnetVerificationMethodRef } from "../src/types/did/document/verification-method-ref";

const LEGACY_TESTNET_DOC = {
  context: ["https://www.w3.org/ns/did/v1"],
  id: "did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165",
  alsoKnownAs: [],
  controller: [],
  verificationMethod: [
    {
      id: "did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165#keys-1",
      controller: "did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165",
      verificationMethodType: "Ed25519VerificationKey2018",
      verificationMaterial: "Bt5Mafvpcqou1pBF8SnW1BJMvpkSzZnPEgWunTUFwHZm",
    },
    {
      id: "did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165#keys-2",
      controller: "did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165",
      verificationMethodType: "Ed25519VerificationKey2018",
      verificationMaterial: "11111111111111111111111111111111",
    },
  ],
  service: [],
  authentication: [
    "did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165#keys-1",
  ],
  assertionMethod: [
    '"{\\"id\\":\\"did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165#keys-2\\",\\"controller\\":\\"did:cheqd:testnet:ed3a581d-b968-423e-afd1-64239a086165\\",\\"verificationMethodType\\":\\"Bls12381BBSVerificationKeyDock2023\\",\\"verificationMaterial\\":\\"CeEf4Q1kvLo66eSbTSujuasf2mv1rTQEpK8rnuyqMxpP\\"}"',
  ],
  keyAgreement: [],
  capabilityInvocation: [],
  capabilityDelegation: [],
  versionId: "0557d7da-8dea-45cb-8f30-7370b59eab71",
};

const LEGACY_MAINNET_DOC = {
  context: ["https://www.w3.org/ns/did/v1"],
  id: "did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165",
  alsoKnownAs: [],
  controller: [],
  verificationMethod: [
    {
      id: "did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165#keys-1",
      controller: "did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165",
      verificationMethodType: "Ed25519VerificationKey2018",
      verificationMaterial: "Bt5Mafvpcqou1pBF8SnW1BJMvpkSzZnPEgWunTUFwHZm",
    },
    {
      id: "did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165#keys-2",
      controller: "did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165",
      verificationMethodType: "Ed25519VerificationKey2018",
      verificationMaterial: "11111111111111111111111111111111",
    },
  ],
  service: [],
  authentication: [
    "did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165#keys-1",
  ],
  assertionMethod: [
    '"{\\"id\\":\\"did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165#keys-2\\",\\"controller\\":\\"did:cheqd:mainnet:ed3a581d-b968-423e-afd1-64239a086165\\",\\"verificationMethodType\\":\\"Bls12381BBSVerificationKeyDock2023\\",\\"verificationMaterial\\":\\"CeEf4Q1kvLo66eSbTSujuasf2mv1rTQEpK8rnuyqMxpP\\"}"',
  ],
  keyAgreement: [],
  capabilityInvocation: [],
  capabilityDelegation: [],
  versionId: "0557d7da-8dea-45cb-8f30-7370b59eab71",
};

const RANDOM_PKS = [
  "0xa1aa6a2058dd190e284a64e72adaf4e16a9ae9fbf0673d7575924e6aca3b21dc",
  "0xed28a616e8f8cfd2232b62dac57281b24fc0d538150f8f5d91a0b6c3255cc2c9",
  "0x3f10af3f08a442251510f61ef2395b6419f30f5eaac2114864f72731452a71ec",
  "0xc9b4c22c2f5738b0adaf605a8233cdc2451c5ece045c25a3bc2b4c840fe9b11d",
  "0x86839d44e6f15cd21ede6e4db64c60b57cb4c5f6030212f48468090c1ed823ed",
  "0x91253c4b3401eade456953934325153c908444b8ea2705f8ee71e600bee6b0bc",
  "0xddf88ee3d89f5890ab0b14d37b9189e62cf88baf375557f917994edaec8b296d",
  "0x9d1aa9f5f7990737f670accdbdb8808ab4cbf256e6aaac73cba8bd89aa04befb",
].map((bytes) => new PublicKeyEd25519(bytes));

const RANDOM_OFFCHAIN_PKS = [
  "0xacfa7cba73ee6d09d280c157b5e25c4354da462103568f3c2036f714de1a8b18",
  "0x853a2e866edb66d965326c019f039bc9c3b83d02ee5aa316fbe41edf55c45e0f",
  "0x97349a1977e401a9472587c2f81473fb20967c0f24b6dd1d1c8fb2a3833f6374",
  "0xc9b4c22c2f5738b0adaf605a8233cdc2451c5ece045c25a3bc2b4c840fe9b11d",
];

const DOCK_DID = new DockDidValue(
  "0xc9b4c22c2f5738b0adaf605a8233cdc2451c5ece045c25a3bc2b4c840fe9b11d"
);

const DOCK_OFFCHAIN_PKS = RANDOM_OFFCHAIN_PKS.map(
  (bytes, idx) =>
    new BBSPublicKey(
      new BBSPublicKeyValue(
        bytes,
        new DockOffchainSignatureParamsRef(DOCK_DID, idx)
      )
    )
);

const CHEQD_TESTNET_OFFCHAIN_PKS = RANDOM_OFFCHAIN_PKS.map(
  (bytes, idx) =>
    new BBSPublicKey(
      new BBSPublicKeyValue(
        bytes,
        new CheqdOffchainSignatureParamsRef(
          CheqdTestnetDidValue.fromBytesAdapt([idx, ...hexToU8a(bytes)]),
          TypedUUID.fromBytesAdapt([idx])
        )
      )
    )
);

const CHEQD_MAINNET_OFFCHAIN_PKS = RANDOM_OFFCHAIN_PKS.map(
  (bytes, idx) =>
    new BBSPublicKey(
      new BBSPublicKeyValue(
        bytes,
        new CheqdOffchainSignatureParamsRef(
          CheqdMainnetDidValue.fromBytesAdapt([idx, ...hexToU8a(bytes)]),
          TypedUUID.fromBytesAdapt([idx])
        )
      )
    )
);

const catchErrorWith = (fn, message) => {
  try {
    return fn();
  } catch (err) {
    err.message = `${message}:\n${err.message}`;

    throw err;
  }
};

const checkDoc = (doc) => {
  catchErrorWith(() => expect(doc).toMatchSnapshot(), "Failed snapshot check");
  const jsonDoc = catchErrorWith(
    () => doc.toJSON(),
    "Failed `toJSON` conversion"
  );
  const newDoc = catchErrorWith(
    () => doc.constructor.from(jsonDoc),
    "Failed `fromJSON` conversion"
  );
  catchErrorWith(
    () => expect(newDoc.toJSON()).toEqual(jsonDoc),
    "Failed equality check"
  );
  const cheqdPayloadDoc = catchErrorWith(
    () => maybeToCheqdPayloadOrJSON(doc),
    "Failed `toCheqdPayload` conversion"
  );
  catchErrorWith(
    () => expect(cheqdPayloadDoc).toMatchSnapshot(),
    "Failed cheqd payload snapshot check"
  );
};

const checkDocs = (...docs) => {
  let idx = 0;
  for (const doc of docs) {
    catchErrorWith(() => {
      checkDoc(doc);
      idx++;
    }, `Error for docs[${idx}]`);
  }
};

describe("DID document workflow", () => {
  const AUTH = new VerificationRelationship().setAuthentication();
  const ASSERT = new VerificationRelationship().setAssertion();
  const CAP_INV = new VerificationRelationship().setCapabilityInvocation();
  const KEY_AGR = new VerificationRelationship().setKeyAgreement();

  test(`\`verMethodRefsEqual\` method conversion works`, () => {
    const dockVerMethod = new VerificationMethodRef(DockDid.random(), 3);
    const cheqdVerMethod =
      CheqdTestnetVerificationMethodRef.from(dockVerMethod);

    expect(
      verMethodRefsEqual(String(dockVerMethod), String(cheqdVerMethod))
    ).toBe(true);
    expect(
      verMethodRefsEqual(
        String(dockVerMethod),
        String(new VerificationMethodRef(CheqdTestnetDid.random(), 3))
      )
    ).toBe(false);
    expect(
      verMethodRefsEqual(String(dockVerMethod), String(dockVerMethod))
    ).toBe(true);
  });

  test(`\`DIDDocument.from\` works`, () => {
    const doc = {
      "@context": ["test"],
      id: "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      controller: ["did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk"],
      verificationMethod: [
        {
          controller:
            "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
          id: "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk#keys-3",
          publicKeyBase58: "EaNp37NGpe8KViTKxAdknyvUP44doH1fHnFpYqEcfUjE",
          type: "Ed25519VerificationKey2018",
        },
      ],
    };

    expect(DIDDocument.from(doc)).toMatchSnapshot();
  });

  test("`DIDDocument`", () => {
    const doc1 = DIDDocument.create(
      "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      [],
      [],
      []
    );

    const doc2 = DIDDocument.create(
      "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      [
        new DidKey(RANDOM_PKS[0], AUTH),
        new DidKey(DOCK_OFFCHAIN_PKS[0]),
        new DidKey(RANDOM_PKS[1], ASSERT),
        new DidKey(RANDOM_PKS[2], CAP_INV),
        new DidKey(DOCK_OFFCHAIN_PKS[1]),
        new DidKey(RANDOM_PKS[3], AUTH | ASSERT),
        new DidKey(RANDOM_PKS[4], AUTH | CAP_INV),
        new DidKey(RANDOM_PKS[5], ASSERT | CAP_INV),
        new DidKey(RANDOM_PKS[6], AUTH | ASSERT | CAP_INV),
        new DidKey(RANDOM_PKS[7], KEY_AGR),
        new DidKey(DOCK_OFFCHAIN_PKS[2]),
        new DidKey(DOCK_OFFCHAIN_PKS[3]),
      ],
      [
        "did:key:z6MktvqCyLxTsXUH1tUZncNdVeEZ7hNh7npPRbUU27GTrYb8",
        "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      ],
      []
    );

    const doc3 = DIDDocument.create(
      "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      [],
      [],
      [],
      { context: ["overriden"] }
    );

    checkDocs(doc1, doc2, doc3);
  });

  test("`CheqdDIDDocument`", () => {
    const cheqdDid = CheqdTestnetDid.from(
      "did:cheqd:testnet:f1749383-d9dd-479f-82aa-e52fe8f59c54"
    );

    const doc1 = DIDDocument.create(
      "did:cheqd:testnet:6ec66297-f55e-4744-b8cd-bd043bc45767",
      [],
      [],
      []
    ).toCheqd(void 0, "0557d7da-8dea-45cb-8f30-7370b59eab71");

    const doc2 = DIDDocument.create(
      cheqdDid,
      [new DidKey(RANDOM_PKS[0]), new DidKey(CHEQD_TESTNET_OFFCHAIN_PKS[0])],
      [cheqdDid],
      []
    ).toCheqd(void 0, "28edc043-872b-4ab7-9cb8-b01d1bd677c5");

    const doc2DIDDocument = DIDDocument.create(
      cheqdDid,
      [new DidKey(RANDOM_PKS[0]), new DidKey(CHEQD_TESTNET_OFFCHAIN_PKS[0])],
      [cheqdDid],
      []
    );
    expect(doc2.toDIDDocument().eq(doc2DIDDocument)).toBe(true);

    const doc3 = DIDDocument.create(
      "did:cheqd:testnet:f1749383-d9dd-479f-82aa-e52fe8f59c54",
      [
        new DidKey(RANDOM_PKS[0], AUTH),
        new DidKey(CHEQD_TESTNET_OFFCHAIN_PKS[0]),
        new DidKey(RANDOM_PKS[1], ASSERT),
        new DidKey(RANDOM_PKS[2], CAP_INV),
        new DidKey(CHEQD_MAINNET_OFFCHAIN_PKS[1]),
        new DidKey(RANDOM_PKS[3], AUTH | ASSERT),
        new DidKey(RANDOM_PKS[4], AUTH | CAP_INV),
        new DidKey(RANDOM_PKS[5], ASSERT | CAP_INV),
        new DidKey(RANDOM_PKS[6], AUTH | ASSERT | CAP_INV),
        new DidKey(RANDOM_PKS[7], KEY_AGR),
        new DidKey(CHEQD_TESTNET_OFFCHAIN_PKS[2]),
        new DidKey(CHEQD_MAINNET_OFFCHAIN_PKS[3]),
      ],
      [
        "did:cheqd:mainnet:f1749383-d9dd-479f-82aa-e52fe8f59c54",
        "did:cheqd:testnet:df3ba823-c1e2-46e0-bb54-056f9c506e90",
      ],
      []
    ).toCheqd(void 0, "47b4d97b-1ebe-4d81-a3ed-12eb63baaeb9");

    checkDocs(doc1, doc2, doc3);
  });

  test(`\`CheqdTestnetDIDDocument\``, () => {
    const testnetDoc = DIDDocument.create(
      "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      [
        new DidKey(RANDOM_PKS[0], AUTH),
        new DidKey(CHEQD_TESTNET_OFFCHAIN_PKS[0]),
      ]
    ).toCheqd(CheqdTestnetDIDDocument, "0557d7da-8dea-45cb-8f30-7370b59eab71");

    const fromLegacy = CheqdTestnetDIDDocument.from(LEGACY_TESTNET_DOC);

    checkDocs(testnetDoc, fromLegacy);
  });

  test(`\`CheqdMainnetDIDDocument\``, () => {
    const mainnetDoc = DIDDocument.create(
      "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
      [
        new DidKey(RANDOM_PKS[0], AUTH),
        new DidKey(CHEQD_MAINNET_OFFCHAIN_PKS[0]),
      ]
    ).toCheqd(CheqdMainnetDIDDocument, "0557d7da-8dea-45cb-8f30-7370b59eab71");

    const fromLegacy = CheqdMainnetDIDDocument.from(LEGACY_MAINNET_DOC);

    checkDoc(mainnetDoc, fromLegacy);
  });
});
