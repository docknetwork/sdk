import { encodeAddress } from '@polkadot/util-crypto';
import { u8aToString, hexToU8a } from '@polkadot/util';
import b58 from 'bs58';

import {
  getHexIdentifierFromDID,
  DockDIDQualifier,
  NoDIDError,
  validateDockDIDHexIdentifier,
} from '../utils/did';
import { getStateChange } from '../utils/misc';

import Signature from "../signatures/signature"; // eslint-disable-line

export const ATTESTS_IRI = 'https://rdf.dock.io/alpha/2021#attestsDocumentContents';

/** Class to create, update and destroy DIDs */
class DIDModule {
  /**
   * Creates a new instance of DIDModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.module = api.tx.didModule;
    this.signAndSend = signAndSend;
  }

  /**
   * Creates transaction to create a new DID on the Dock chain.
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {object} keyDetail - `KeyDetail` as expected by the Substrate node
   * @return {object} The extrinsic to sign and send.
   */
  createNewTx(did, keyDetail) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.new(hexId, keyDetail);
  }

  /**
   * Creates a new DID on the Dock chain.
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {object} keyDetail - `KeyDetail` as expected by the Substrate node
   * @return {Promise<object>} Promise to the pending transaction
   */
  async new(did, keyDetail, waitForFinalization = true, params = {}) {
    return await this.signAndSend(
      this.createNewTx(did, keyDetail),
      waitForFinalization,
      params,
    );
  }

  /**
   * Updates the details of an already registered DID on the Dock chain.
   * @param {object} keyUpdate - `KeyUpdate` as expected by the Substrate node
   * @param {Signature} signature - Signature from existing key
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createUpdateKeyTx(keyUpdate, signature) {
    return this.module.updateKey(keyUpdate, signature.toJSON());
  }

  /**
   * Updates the details of an already registered DID on the Dock chain.
   * @param {object} keyUpdate - `KeyUpdate` as expected by the Substrate node
   * @param {Signature} signature - Signature from existing key
   * @return {Promise<object>} Promise to the pending transaction
   */
  async updateKey(
    keyUpdate,
    signature,
    waitForFinalization = true,
    params = {},
  ) {
    return await this.signAndSend(
      this.createUpdateKeyTx(keyUpdate, signature),
      waitForFinalization,
      params,
    );
  }

  /**
   * Removes an already registered DID on the Dock chain.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @param {Signature} signature - Signature from existing key
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createRemoveTx(didRemoval, signature) {
    return this.module.remove(didRemoval, signature.toJSON());
  }

  /**
   * Removes an already registered DID on the Dock chain.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @param {Signature} signature - Signature from existing key
   * @return {Promise<object>} Promise to the pending transaction
   */
  async remove(didRemoval, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(
      this.createRemoveTx(didRemoval, signature),
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param {string} attester - Attester's DID
   * @param {object} attestation - Attestation object with priority and iri
   * @param {Signature} signature - Signature from existing key
   */
  async setClaim(
    attester,
    attestation,
    signature,
    waitForFinalization = true,
    params = {},
  ) {
    const hexId = getHexIdentifierFromDID(attester);
    const attestTx = this.api.tx.attest.setClaim(
      hexId,
      attestation,
      signature.toJSON(),
    );
    return await this.signAndSend(attestTx, waitForFinalization, params);
  }

  /**
   * Create the fully qualified DID like "did:dock:..."
   * @param {string} did - DID
   * @return {string} The DID identifier.
   */
  getFullyQualifiedDID(did) {
    return `${DockDIDQualifier}${did}`;
  }

  /**
   * Fetches the DIDs attestations IRI from the chain
   * @param {string} hexId - DID in hex format
   * @return {Promise<string | null>} The DID's attestation, if any
   */
  async getAttests(hexId) {
    const attests = await this.api.query.attest.attestations(hexId);
    return attests.iri.isSome
      ? u8aToString(hexToU8a(attests.iri.toString()))
      : null;
  }

  /**
   * Gets a DID from the Dock chain and create a DID document according to W3C spec.
   * Throws NoDID if the DID does not exist on chain.
   * @param {string} did - The DID can be passed as fully qualified DID like `dock:did:<SS58 string>` or
   * a 32 byte hex string
   * @return {Promise<object>} The DID document.
   */
  async getDocument(did) {
    const hexId = getHexIdentifierFromDID(did);
    const detail = (await this.getDetail(hexId))[0];

    // Get DIDs attestations
    const attests = await this.getAttests(hexId);

    // If given DID was in hex, encode to SS58 and then construct fully qualified DID else the DID was already fully qualified
    const id = did === hexId ? this.getFullyQualifiedDID(encodeAddress(hexId)) : did;

    // Determine the type of the public key
    let type;
    let publicKeyRaw;

    if (detail.publicKey.isSr25519) {
      type = 'Sr25519VerificationKey2020';
      publicKeyRaw = detail.publicKey.asSr25519;
    } else if (detail.publicKey.isEd25519) {
      type = 'Ed25519VerificationKey2018';
      publicKeyRaw = detail.publicKey.asEd25519;
    } else {
      type = 'EcdsaSecp256k1VerificationKey2019';
      publicKeyRaw = detail.publicKey.asSecp256k1;
    }

    // The DID has only one key as of now.
    const publicKey = {
      id: `${id}#keys-1`,
      type,
      controller: this.getFullyQualifiedDID(encodeAddress(detail.controller)),
      publicKeyBase58: b58.encode(publicKeyRaw.value),
      // publicKeyPem: '-----BEGIN PUBLIC KEY...END PUBLIC KEY-----\r\n', // TODO: add proper value
    };

    // Set keys and authentication reference
    const publicKeys = [publicKey];

    // Set `proofPurpose`s. Check the DID spec for details on `proofPurpose`

    // Set the `proofPurpose` authentication. As there is only one key, this will serve for authentication `proofPurpose`
    const authentication = [publicKey.id];

    // Set the `proofPurpose` assertionMethod
    // Explicitly cloning the authentication object as there is only one key supported as of now.
    // With multiple key support, the key creation will determine the proof purpose
    const assertionMethod = [...authentication];
    // TODO: setup proper service when we have it
    // const service = [{
    //   id: `${id}#vcs`,
    //   type: 'VerifiableCredentialService',
    //   serviceEndpoint: 'https://dock.io/vc/'
    // }];

    // Construct document
    const document = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id,
      authentication,
      assertionMethod,
      publicKey: publicKeys,
      // service,
    };

    // Assign attestations
    if (attests) {
      document[ATTESTS_IRI] = attests;
    }

    return document;
  }

  /**
   * Gets the key detail and block number in which the DID was last modified from
   * the chain and return them. It will throw NoDID if the DID does not exist on
   * chain.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<array>} A 2 element array with first
   */
  async getDetail(didIdentifier) {
    validateDockDIDHexIdentifier(didIdentifier);
    const resp = await this.api.query.didModule.dids(didIdentifier);
    if (resp.isNone) {
      throw new NoDIDError(`dock:did:${didIdentifier}`);
    }

    const respTuple = resp.unwrap();
    if (respTuple.length === 2) {
      return [respTuple[0], respTuple[1].toNumber()];
    }
    throw new Error(`Needed 2 items in response but got${respTuple.length}`);
  }

  /**
   * Gets the block number in which the DID was last modified in
   * the chain and return it. It will throw error if the DID does not exist on
   * chain or chain returns null response.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<array>} A 2 element array with first
   */
  async getBlockNoForLastChangeToDID(didIdentifier) {
    return (await this.getDetail(didIdentifier))[1];
  }

  /**
   * Serializes a `KeyUpdate` for signing.
   * @param {object} keyUpdate - `KeyUpdate` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedKeyUpdate(keyUpdate) {
    return getStateChange(this.api, 'KeyUpdate', keyUpdate);
  }

  /**
   * Serializes a `DidRemoval` for signing.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedDIDRemoval(didRemoval) {
    return getStateChange(this.api, 'DidRemoval', didRemoval);
  }

  /**
   * Serializes an `Attestation` for signing.
   * @param {object} attestation - `Attestation` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedAttestation(did, attestation) {
    const hexId = getHexIdentifierFromDID(did);
    return getStateChange(this.api, 'Attestation', [hexId, attestation]);
  }
}

export default DIDModule;
