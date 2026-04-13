import { Secp256k1Keypair } from "../../src/keypairs";
import {
  Bls12381BBSKeyPairDock2023,
  Bls12381G2KeyPairDock2022,
} from "../../src/vc/crypto";
import {
  Bls12381BBSDockVerKeyName,
  Bls12381BBS23DockVerKeyName,
} from "../../src/vc/crypto";

const keypairEcdsaSecp256k1 = new Secp256k1Keypair(
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
const bbsPublicKeyBase58 = "24wuq4w44W7dpvtz6RCRzrmrAm3mfzwkJApR7N2spya85BkhmxzmkT3KfTQnYrZp3dUF3nAaF8EcPgM4wwAEMjMjU8h5w3t3u6JX7wdT8KZGnEsdo8UWv6SdADKDf3RtqbYC";
const bbsPrivateKeyBase58 = "HTgG6R8vFKTjf19TxgX2KsEAxKpTRvZ6VXuGQjpWKkJz";
const bbsPlusPublicKeyBase58 = "rBXz1saXxcQkiHxsPYwW6Zzi4AJH29iyW1zkf6xQsSTNrtWStmeo7DqgAqrWufjQ6H7HWdMDCv1wir6yQw5RaSJgdC4huy36vXYWgWBEhLDJrUne8oot8KDQvH5QpG91QNJ";
const bbsPlusPrivateKeyBase58 = "9Db4pHuSXxkBKcopyMMXxtYMxm16w7y8ji79vM1Uuek3";
const keypairBBS = new Bls12381BBSKeyPairDock2023({
  publicKeyBase58: bbsPublicKeyBase58,
  privateKeyBase58: bbsPrivateKeyBase58,
});
const keypairBBSPlus = new Bls12381G2KeyPairDock2022({
  publicKeyBase58: bbsPlusPublicKeyBase58,
  privateKeyBase58: bbsPlusPrivateKeyBase58,
});

// TODO: add more testing keys (ed25519 etc)
export default [
  {
    sigType: "JsonWebSignature2020",
    keyDocument: {
      "@context": "https://w3id.org/security/suites/jws-2020/v1",
      id: "urn:JsonWebKey2020#keys-1",
      controller: "urn:JsonWebKey2020",
      type: "JsonWebKey2020",
      publicKeyJwk: {
        kty: "EC",
        crv: "P-384",
        x: "dMtj6RjwQK4G5HP3iwOD94RwbzPhS4wTZHO1luk_0Wz89chqV6uJyb51KaZzK0tk",
        y: "viPKF7Zbc4FxKegoupyVRcBr8TZHFxUrKQq4huOAyMuhTYJbFpAwMhIrWppql02E",
      },
      privateKeyJwk: {
        kty: "EC",
        crv: "P-384",
        x: "dMtj6RjwQK4G5HP3iwOD94RwbzPhS4wTZHO1luk_0Wz89chqV6uJyb51KaZzK0tk",
        y: "viPKF7Zbc4FxKegoupyVRcBr8TZHFxUrKQq4huOAyMuhTYJbFpAwMhIrWppql02E",
        d: "Wq5_KgqjvYh_EGvBDYtSs_0ufJJP0y0tkAXl6GqxHMkY0QP8vmD76mniXD-BWhd_",
      },
    },
  },
  {
    sigType: "EcdsaSecp256k1Signature2019",
    keyDocument: {
      id: "urn:EcdsaSecp256k1VerificationKey2019#keys-1",
      controller: "urn:EcdsaSecp256k1VerificationKey2019",
      type: "EcdsaSecp256k1VerificationKey2019",
      keypair: keypairEcdsaSecp256k1,
      publicKey: keypairEcdsaSecp256k1.publicKey(),
    },
  },
  {
    sigType: "Bls12381BBSSignatureDock2023",
    customDidKey: true,
    issuanceOnly: true,
    keyDocument: {
      id: "did:key:zVMDdqJYbY3rCsiPzLrYamJvzuCBdPZ59CYktJAdTaZV36TKjqGakw5QX2iiMiuHhJnnpBxSzeZZF7pvApQhWLgyfcmutrhJqg3C9rT1jD2t6qiU4smQgjF6AcHuPVJaa5a7xEU#zVMDdqJYbY3rCsiPzLrYamJvzuCBdPZ59CYktJAdTaZV36TKjqGakw5QX2iiMiuHhJnnpBxSzeZZF7pvApQhWLgyfcmutrhJqg3C9rT1jD2t6qiU4smQgjF6AcHuPVJaa5a7xEU",
      controller:
        "did:key:zVMDdqJYbY3rCsiPzLrYamJvzuCBdPZ59CYktJAdTaZV36TKjqGakw5QX2iiMiuHhJnnpBxSzeZZF7pvApQhWLgyfcmutrhJqg3C9rT1jD2t6qiU4smQgjF6AcHuPVJaa5a7xEU",
      type: Bls12381BBS23DockVerKeyName,
      keypair: keypairBBS,
      publicKeyBase58: bbsPublicKeyBase58,
      privateKeyBase58: bbsPrivateKeyBase58,
    },
  },
  {
    sigType: "Bls12381BBS+SignatureDock2022",
    customDidKey: true,
    issuanceOnly: true,
    keyDocument: {
      id: "did:key:zVTveaDBbAi5VnWZSHkgTHEi2BLdgi2bUS9guCs3R24Z4dHURpEa6S9W6xys3gr6yrTFgSxEk7kUQ6bj4suVE73jXKu6nLeQgmun4fhMZDet1MBn2bJFjnzTnicEZkVjjpZvwsU#zVTveaDBbAi5VnWZSHkgTHEi2BLdgi2bUS9guCs3R24Z4dHURpEa6S9W6xys3gr6yrTFgSxEk7kUQ6bj4suVE73jXKu6nLeQgmun4fhMZDet1MBn2bJFjnzTnicEZkVjjpZvwsU",
      controller:
        "did:key:zVTveaDBbAi5VnWZSHkgTHEi2BLdgi2bUS9guCs3R24Z4dHURpEa6S9W6xys3gr6yrTFgSxEk7kUQ6bj4suVE73jXKu6nLeQgmun4fhMZDet1MBn2bJFjnzTnicEZkVjjpZvwsU",
      type: Bls12381BBSDockVerKeyName,
      keypair: keypairBBSPlus,
      publicKeyBase58: bbsPlusPublicKeyBase58,
      privateKeyBase58: bbsPlusPrivateKeyBase58,
    },
  },
];
