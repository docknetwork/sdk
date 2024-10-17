import {
  VerificationRelationship,
  DidKey,
  CheqdTestnetDid,
} from "../src/types/did";
import { DIDDocument } from "../src/types/did/document";
import { PublicKeyEd25519 } from "../src/types";

const RANDOM_PKS = [
  "0xa1aa6a2058dd190e284a64e72adaf4e16a9ae9fbf0673d7575924e6aca3b21dc",
  "0xed28a616e8f8cfd2232b62dac57281b24fc0d538150f8f5d91a0b6c3255cc2c9",
  "0x3f10af3f08a442251510f61ef2395b6419f30f5eaac2114864f72731452a71ec",
  "0xc9b4c22c2f5738b0adaf605a8233cdc2451c5ece045c25a3bc2b4c840fe9b11d",
  "0x86839d44e6f15cd21ede6e4db64c60b57cb4c5f6030212f48468090c1ed823ed",
  "0x91253c4b3401eade456953934325153c908444b8ea2705f8ee71e600bee6b0bc",
  "0xddf88ee3d89f5890ab0b14d37b9189e62cf88baf375557f917994edaec8b296d",
  "0x9d1aa9f5f7990737f670accdbdb8808ab4cbf256e6aaac73cba8bd89aa04befb",
  "0xacfa7cba73ee6d09d280c157b5e25c4354da462103568f3c2036f714de1a8b18",
  "0x853a2e866edb66d965326c019f039bc9c3b83d02ee5aa316fbe41edf55c45e0f",
  "0x97349a1977e401a9472587c2f81473fb20967c0f24b6dd1d1c8fb2a3833f6374",
].map((bytes) => new PublicKeyEd25519(bytes));

describe("`DIDDocument`", () => {
  const AUTH = new VerificationRelationship().setAuthentication();
  const ASSERT = new VerificationRelationship().setAssertion();
  const CAP_INV = new VerificationRelationship().setCapabilityInvocation();
  const KEY_AGR = new VerificationRelationship().setKeyAgreement();

  test(`DIDDocument.from works`, () => {
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

  test("`DIDDocument.create` works", () => {
    expect(
      DIDDocument.create(
        "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
        [],
        [],
        []
      )
    ).toMatchSnapshot();

    const cheqdDid = CheqdTestnetDid.from(
      "did:cheqd:testnet:f1749383-d9dd-479f-82aa-e52fe8f59c54"
    );

    expect(
      DIDDocument.create(cheqdDid, [new DidKey(RANDOM_PKS[0])], [cheqdDid], [])
    ).toMatchSnapshot();

    expect(
      DIDDocument.create(
        "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
        [
          new DidKey(RANDOM_PKS[0], AUTH),
          new DidKey(RANDOM_PKS[1], ASSERT),
          new DidKey(RANDOM_PKS[2], CAP_INV),
          new DidKey(RANDOM_PKS[3], AUTH | ASSERT),
          new DidKey(RANDOM_PKS[4], AUTH | CAP_INV),
          new DidKey(RANDOM_PKS[5], ASSERT | CAP_INV),
          new DidKey(RANDOM_PKS[6], AUTH | ASSERT | CAP_INV),
          new DidKey(RANDOM_PKS[7], KEY_AGR),
        ],
        [
          "did:key:z6MktvqCyLxTsXUH1tUZncNdVeEZ7hNh7npPRbUU27GTrYb8",
          "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
        ],
        []
      )
    ).toMatchSnapshot();

    expect(
      DIDDocument.create(
        "did:dock:5DEHasvC9G3eVF3qCsN2VQvEbHYdQtsv74ozZ1ngQQj39Luk",
        [],
        [],
        [],
        { context: ["overriden"] }
      )
    ).toMatchSnapshot();
  });
});
