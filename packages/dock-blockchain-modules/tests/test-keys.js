import {
  generateEcdsaSecp256k1Keypair,
  getPublicKeyFromKeyringPair,
} from "../src/utils/misc";

const keypairEcdsaSecp256k1 = generateEcdsaSecp256k1Keypair(
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
);

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
      publicKey: getPublicKeyFromKeyringPair(keypairEcdsaSecp256k1),
    },
  },
];
