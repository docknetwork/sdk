import b58 from "bs58";
import { u8aToHex } from "@docknetwork/credential-sdk/utils";
import Bls12381G2KeyPairDock2022 from "@docknetwork/credential-sdk/vc/crypto/Bls12381G2KeyPairDock2022";
import { Secp256k1Keypair } from "@docknetwork/credential-sdk/keypairs";

function createSecp256k1Keypair(privateKeyHex) {
  const pk = privateKeyHex || randomAsHex(32);
  const kp = new Secp256k1Keypair(pk);
  kp.pk = pk;
  return kp;
}

const docToKeyMap = {
  Sr25519VerificationKey2020: "sr25519",
  Ed25519VerificationKey2018: "ed25519",
};

export function keyDocToKeypair(keyDoc, dock) {
  // For now we expect multibase to just be b58, this needs fixing later if/when we support more keys
  const {
    type,
    privateKeyBase58,
    publicKeyBase58,
    privateKeyMultibase,
    publicKeyMultibase,
  } = keyDoc;
  const privateKeyEncoded = privateKeyBase58 || privateKeyMultibase.substr(1);
  const privateKeyBytes = b58.decode(privateKeyEncoded);

  if (type === "EcdsaSecp256k1VerificationKey2019") {
    return createSecp256k1Keypair(u8aToHex(privateKeyBytes));
  } else if (type === "Bls12381G2VerificationKeyDock2022") {
    return new Bls12381G2KeyPairDock2022(keyDoc);
  } else {
    const publicKeyEncoded = publicKeyBase58 || publicKeyMultibase.substr(1);
    const keyType = docToKeyMap[type];
    if (!keyType) {
      throw new Error(`Unsupported key type: ${type}`);
    }

    return dock.keyring.createFromPair(
      {
        publicKey: b58.decode(publicKeyEncoded),
        secretKey: privateKeyBytes,
      },
      {},
      keyType,
    );
  }
}
