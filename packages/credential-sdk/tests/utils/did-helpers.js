import b58 from 'bs58';
import { randomAsHex } from '../../src/utils';
import { Secp256k1Keypair } from '../../src/keypairs';
import { verifyCredential, verifyPresentation } from '../../src/vc';
import { documentLoader, addDocument, registered } from './cached-document-loader';

export function registerDid(did, keypair) {
  if (registered(did)) {
    throw `${did} already registered`;
  }

  const publicKeyBase58 = b58.encode(keypair.publicKey.value.bytes);
  const pk = {
    id: `${did}#keys-1`,
    type: keypair.type,
    publicKeyBase58,
    controller: did,
    publicKey: keypair.publicKey.value,
  };
  const doc = {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: did,
    authentication: [pk.id],
    assertionMethod: [pk.id],
    publicKey: [pk],
  };
  addDocument(did, doc);
  addDocument(pk.id, {
    '@context': 'https://www.w3.org/ns/did/v1',
    ...pk,
    pkdoc: true,
  });
}

export function randoDID() {
  return `did:dock:${randomAsHex(32).substring(2, 2 + 20)}`;
}

export async function verifyC(credential) {
  return verifyCredential(credential, {
    documentLoader,
  });
}

export async function verifyP(presentation) {
  return verifyPresentation(presentation, {
    documentLoader,
    unsignedPresentation: true,
  });
}

export function getSampleKey(randomDID, keypair) {
  return {
    id: `${randomDID}#keys-1`,
    controller: randomDID,
    type: 'EcdsaSecp256k1VerificationKey2019',
    keypair,
    thisisstring: 'yes',
    publicKey: keypair.publicKey(),
  };
}

export async function newDid() {
  const kp = Secp256k1Keypair.random();
  const randomDID = randoDID();
  const keypair = getSampleKey(randomDID, kp);
  registerDid(randomDID, keypair);
  return {
    did: randomDID,
    suite: keypair,
  };
}
