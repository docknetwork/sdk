import { encodeAddress } from '@polkadot/util-crypto';
import { u8aToString, hexToU8a, u8aToHex } from '@polkadot/util';
import { BTreeSet } from '@polkadot/types';
import b58 from 'bs58';
import {
  getHexIdentifierFromDID,
  DockDIDQualifier,
  NoDIDError,
  validateDockDIDHexIdentifier,
  NoOnchainDIDError,
  NoOffchainDIDError,
  createDidSig,
} from '../../utils/did';
import { getSignatureFromKeyringPair, getStateChange } from '../../utils/misc';

import Signature from "../../signatures/signature"; // eslint-disable-line
import OffChainDidDocRef from './offchain-did-doc-ref';
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519,
  PublicKeyX25519,
  DidKey,
  VerificationRelationship,
} from '../../public-keys';
import { ServiceEndpointType } from './service-endpoint';

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
   * Creates transaction to create a new off-chain DID
   * @param did -
   * @param {OffChainDidDocRef} didDocRef - Off chain reference for the DID
   * @returns {*}
   */
  createNewOffchainTx(did, didDocRef) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.newOffchain(hexId, didDocRef);
  }

  /**
   * Create a new off-chain DID
   * @param did
   * @param didDocRef - Off chain reference for the DID
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async newOffchain(did, didDocRef, waitForFinalization = true, params = {}) {
    return this.signAndSend(
      this.createNewOffchainTx(did, didDocRef),
      waitForFinalization,
      params,
    );
  }

  /**
   * Create a transaction to update the DID Doc reference of the off chain DID
   * @param did
   * @param didDocRef - new reference
   * @returns {*}
   */
  createSetOffchainDidRefTx(did, didDocRef) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.setOffchainDidDocRef(hexId, didDocRef);
  }

  /**
   * Update the DID Doc reference of the off chain DID
   * @param did
   * @param didDocRef
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async setOffchainDidRef(
    did,
    didDocRef,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.createSetOffchainDidRefTx(did, didDocRef),
      waitForFinalization,
      params,
    );
  }

  /**
   * Create transaction to remove off chain DID
   * @param did
   * @returns {Promise<*>}
   */
  createRemoveOffchainDidTx(did) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.removeOffchainDid(hexId);
  }

  /**
   * Remove off-chain DID
   * @param did
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeOffchainDid(did, waitForFinalization = true, params = {}) {
    return this.signAndSend(
      this.createRemoveOffchainDidTx(did),
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates transaction to create a new DID on the Dock chain.
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param {array} controllers - Array of `Did`s as expected by the Substrate node
   * @return {object} The extrinsic to sign and send.
   */
  createNewOnchainTx(did, didKeys, controllers) {
    const cnts = new BTreeSet();
    if (controllers !== undefined) {
      controllers.forEach((c) => {
        cnts.add(getHexIdentifierFromDID(c));
      });
    }
    const hexId = getHexIdentifierFromDID(did);
    return this.module.newOnchain(
      hexId,
      didKeys.map((d) => d.toJSON()),
      cnts,
    );
  }

  /**
   * Creates a new DID on the Dock chain.
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param {array} controllers - Array of `Did`s as expected by the Substrate node.
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async new(
    did,
    didKeys,
    controllers,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.createNewOnchainTx(did, didKeys, controllers),
      waitForFinalization,
      params,
    );
  }

  /**
   * Create transaction to add keys to an on-chain DID.
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param targetDid - The DID to which keys are being added
   * @param signerDid - The DID that is adding the keys by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createAddKeysTx(
    didKeys,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addKeys, signature] = await this.createSignedAddKeys(
      didKeys,
      targetHexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.addKeys(addKeys, signature);
  }

  /**
   * Add keys to an on-chain DID
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param targetDid - The DID to which keys are being added
   * @param signerDid - The DID that is adding the keys by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addKeys(
    didKeys,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      await this.createAddKeysTx(
        didKeys,
        targetDid,
        signerDid,
        keyPair,
        keyId,
        nonce,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   *  Create transaction to add controllers to an on-chain DID.
   * @param controllers - The DIDs that will control the `targetDid`
   * @param targetDid - The DID to which keys are being added
   * @param signerDid - The DID that is adding the controllers by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createAddControllersTx(
    controllers,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addControllers, signature] = await this.createSignedAddControllers(
      controllers,
      targetHexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.addControllers(addControllers, signature);
  }

  /**
   * Add controllers to an on-chain DID.
   * @param controllers - The DIDs that will control the `targetDid`
   * @param targetDid - The DID to which controllers are being added
   * @param signerDid - The DID that is adding the controllers by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addControllers(
    controllers,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddControllersTx(
      controllers,
      targetDid,
      signerDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create a transaction to add a new service endpoint
   * @param endpointId - The id of the service endpoint. Each endpoint has a unique id.
   * @param {ServiceEndpointType} endpointType - The type of the endpoint.
   * @param {Array} origins - An array of one of URIs encoded as hex.
   * @param targetDid - The DID to which service endpoint is being added
   * @param signerDid - The DID that is adding the service endpoint by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createAddServiceEndpointTx(
    endpointId,
    endpointType,
    origins,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [addServiceEndpoint, signature] = await this.createSignedAddServiceEndpoint(
      endpointId,
      endpointType,
      origins,
      targetHexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.addServiceEndpoint(addServiceEndpoint, signature);
  }

  /**
   * Add a new service endpoint
   * @param endpointId - The id of the service endpoint. Each endpoint has a unique id.
   * @param {ServiceEndpointType} endpointType - The type of the endpoint.
   * @param {Array} origins - An array of one of URIs encoded as hex.
   * @param targetDid - The DID to which service endpoint is being added
   * @param signerDid - The DID that is adding the service endpoint by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async addServiceEndpoint(
    endpointId,
    endpointType,
    origins,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddServiceEndpointTx(
      endpointId,
      endpointType,
      origins,
      targetDid,
      signerDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create transaction to remove keys
   * @param keyIds - Key indices to remove
   * @param targetDid - The DID from which keys are being removed
   * @param signerDid - The DID that is removing the keys by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createRemoveKeysTx(
    keyIds,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [removeKeys, signature] = await this.createSignedRemoveKeys(
      keyIds,
      targetHexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.removeKeys(removeKeys, signature);
  }

  /**
   * Remove keys from a DID
   * @param keyIds - Key indices to remove
   * @param targetDid - The DID from which keys are being removed
   * @param signerDid - The DID that is removing the keys by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeKeys(
    keyIds,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemoveKeysTx(
      keyIds,
      targetDid,
      signerDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create transaction to remove controllers from a DID
   * @param controllers - Controller DIDs to remove.
   * @param targetDid - The DID from which controllers are being removed
   * @param signerDid - The DID that is removing the controllers by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async removeControllersTx(
    controllers,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [removeControllers, signature] = await this.createSignedRemoveControllers(
      controllers,
      targetHexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.removeControllers(removeControllers, signature);
  }

  /**
   * Remove controllers from a DID
   * @param controllers - Controller DIDs to remove.
   * @param targetDid - The DID from which controllers are being removed
   * @param signerDid - The DID that is removing the controllers by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeControllers(
    controllers,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.removeControllersTx(
      controllers,
      targetDid,
      signerDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create transaction to remove a service endpoint from a DID
   * @param endpointId - The endpoint to remove
   * @param targetDid - The DID from which endpoint is being removed
   * @param signerDid - The DID that is removing the endpoint by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createRemoveServiceEndpointTx(
    endpointId,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const targetHexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [removeServiceEndpoint, signature] = await this.createSignedRemoveServiceEndpoint(
      endpointId,
      targetHexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.removeServiceEndpoint(removeServiceEndpoint, signature);
  }

  /**
   * Remove a service endpoint from a DID
   * @param endpointId - The endpoint to remove
   * @param targetDid - The DID from which endpoint is being removed
   * @param signerDid - The DID that is removing the endpoint by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async removeServiceEndpoint(
    endpointId,
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemoveServiceEndpointTx(
      endpointId,
      targetDid,
      signerDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create a transaction to remove an on-chain DID
   * @param targetDid - The DID being removed
   * @param signerDid - The DID that is removing `targetDid` by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  async createRemoveTx(
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const hexDid = getHexIdentifierFromDID(targetDid);
    const signerHexDid = getHexIdentifierFromDID(signerDid);
    const [didRemoval, signature] = await this.createSignedDidRemoval(
      hexDid,
      signerHexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.module.removeOnchainDid(didRemoval, signature);
  }

  /**
   * Removes an on-chain DID.
   * @param targetDid - The DID being removed
   * @param signerDid - The DID that is removing `targetDid` by signing the payload because it controls `targetDid`
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async remove(
    targetDid,
    signerDid,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemoveTx(
      targetDid,
      signerDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   *
   * @param priority
   * @param iri
   * @param did
   * @param keyPair
   * @param keyId
   * @param nonce
   * @returns {Promise<SubmittableExtrinsic<ApiType>>}
   */
  async createSetClaimTx(
    priority,
    iri,
    did,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const hexDid = getHexIdentifierFromDID(did);
    const [setAttestation, signature] = await this.createSignedAttestation(
      priority,
      iri,
      hexDid,
      keyPair,
      keyId,
      nonce,
    );
    return this.api.tx.attest.setClaim(setAttestation, signature);
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param priority
   * @param iri
   * @param did
   * @param keyPair
   * @param keyId
   * @param nonce
   * @param waitForFinalization
   * @param params
   */
  async setClaim(
    priority,
    iri,
    did,
    keyPair,
    keyId,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const attestTx = await this.createSetClaimTx(
      priority,
      iri,
      did,
      keyPair,
      keyId,
      nonce,
    );
    return this.signAndSend(attestTx, waitForFinalization, params);
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
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async getDocument(did) {
    const hexId = getHexIdentifierFromDID(did);

    let didDetails = await this.api.rpc.core_mods.didDetails(hexId);
    if (didDetails.isNone) {
      throw new NoDIDError(`dock:did:${did}`);
    }
    didDetails = didDetails.unwrap();

    let { controllers, serviceEndpoints } = didDetails;
    const rawKeys = didDetails.get('keys').unwrap();
    controllers = controllers.unwrap();
    serviceEndpoints = serviceEndpoints.unwrap();

    // Get DIDs attestations
    const attests = await this.getAttests(hexId);

    // If given DID was in hex, encode to SS58 and then construct fully qualified DID else the DID was already fully qualified
    const id = did === hexId ? this.getFullyQualifiedDID(encodeAddress(hexId)) : did;

    // Categorize keys them by verification relationship type
    const keys = [];
    const assertion = [];
    const authn = [];
    const capInv = [];
    const keyAgr = [];

    [...rawKeys].forEach(({ id: i, key: dk }) => {
      const index = i.toNumber();
      const pk = dk.publicKey;
      let publicKeyRaw;
      let typ;
      if (pk.isSr25519) {
        typ = 'Sr25519VerificationKey2020';
        publicKeyRaw = pk.asSr25519.value;
      } else if (pk.isEd25519) {
        typ = 'Ed25519VerificationKey2018';
        publicKeyRaw = pk.asEd25519.value;
      } else if (pk.isSecp256K1) {
        typ = 'EcdsaSecp256k1VerificationKey2019';
        publicKeyRaw = pk.asSecp256K1.value;
      } else if (pk.isX25519) {
        typ = 'X25519KeyAgreementKey2019';
        publicKeyRaw = pk.asX25519.value;
      } else {
        throw new Error(`Cannot parse public key ${pk}`);
      }
      keys.push([index, typ, publicKeyRaw]);
      const vr = new VerificationRelationship(dk.verRels.toNumber());
      if (vr.isAuthentication(vr)) {
        authn.push(index);
      }
      if (vr.isAssertion(vr)) {
        assertion.push(index);
      }
      if (vr.isCapabilityInvocation(vr)) {
        capInv.push(index);
      }
      if (vr.isKeyAgreement(vr)) {
        keyAgr.push(index);
      }
    });

    keys.sort((a, b) => a[0] - b[0]);
    assertion.sort();
    authn.sort();
    capInv.sort();
    keyAgr.sort();

    const verificationMethod = keys.map(([index, typ, publicKeyRaw]) => ({
      id: `${id}#keys-${index}`,
      type: typ,
      controller: id,
      publicKeyBase58: b58.encode(publicKeyRaw),
    }));
    const assertionMethod = assertion.map((i) => `${id}#keys-${i}`);
    const authentication = authn.map((i) => `${id}#keys-${i}`);
    const capabilityInvocation = capInv.map((i) => `${id}#keys-${i}`);
    const keyAgreement = keyAgr.map((i) => `${id}#keys-${i}`);

    // Construct document
    const document = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id,
      controller: [...controllers].map((c) => this.getFullyQualifiedDID(encodeAddress(c))),
      publicKey: verificationMethod,
    };

    if (authentication.length > 0) {
      document.authentication = authentication;
    }
    if (assertionMethod.length > 0) {
      document.assertionMethod = assertionMethod;
    }
    if (keyAgreement.length > 0) {
      document.keyAgreement = keyAgreement;
    }
    if (capabilityInvocation.length > 0) {
      document.capabilityInvocation = capabilityInvocation;
    }

    if (serviceEndpoints.length > 0) {
      document.service = serviceEndpoints.map(([spId, sp]) => {
        const decoder = new TextDecoder();
        const spType = sp.types.toNumber();
        if (spType !== 1) {
          throw new Error(
            `Only "LinkedDomains" supported as service endpoint type for now but found ${spType}`,
          );
        }
        return {
          id: decoder.decode(spId),
          type: 'LinkedDomains',
          serviceEndpoint: sp.origins.map((o) => decoder.decode(o)),
        };
      });
    }

    // Assign attestations
    if (attests) {
      document[ATTESTS_IRI] = attests;
    }

    return document;
  }

  /**
   * Gets the DID detail of an on chain DID
   * the chain and return them. It will throw NoDID if the DID does not exist on
   * chain.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<object>}
   */
  async getOnchainDidDetail(didIdentifier) {
    validateDockDIDHexIdentifier(didIdentifier);
    let resp = await this.api.query.didModule.dids(didIdentifier);
    if (resp.isNone) {
      throw new NoDIDError(`dock:did:${didIdentifier}`);
    }

    resp = resp.unwrap();
    if (resp.isOffChain) {
      throw new NoOnchainDIDError(`dock:did:${didIdentifier}`);
    }
    const didDetail = resp.asOnChain;
    return {
      nonce: didDetail.nonce.toNumber(),
      lastKeyId: didDetail.lastKeyId.toNumber(),
      activeControllerKeys: didDetail.activeControllerKeys.toNumber(),
      activeControllers: didDetail.activeControllers.toNumber(),
    };
  }

  /**
   * Gets the DID detail of an on chain DID
   * @param didIdentifier
   * @returns {Promise<{accountId: HexString}>}
   */
  async getOffchainDidDetail(didIdentifier) {
    validateDockDIDHexIdentifier(didIdentifier);
    let resp = await this.api.query.didModule.dids(didIdentifier);
    if (resp.isNone) {
      throw new NoDIDError(`dock:did:${didIdentifier}`);
    }
    resp = resp.unwrap();
    if (resp.isOnChain) {
      throw new NoOffchainDIDError(`dock:did:${didIdentifier}`);
    }
    resp = resp.asOffChain;
    const detail = { accountId: u8aToHex(resp.accountId) };

    if (resp.docRef.isCid) {
      detail.docRef = OffChainDidDocRef.cid(u8aToHex(resp.docRef.asCid));
    } else if (resp.docRef.isUrl) {
      detail.docRef = OffChainDidDocRef.url(u8aToHex(resp.docRef.asUrl));
    } else if (resp.docRef.isCustom) {
      detail.docRef = OffChainDidDocRef.custom(u8aToHex(resp.docRef.asCustom));
    } else {
      throw new Error(`Cannot parse DIDDoc ref ${resp.docRef}`);
    }
    return detail;
  }

  /**
   * Gets the current nonce for the DID. It will throw error if the DID does not exist on
   * chain or chain returns null response.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<number>}
   */
  async getNonceForDID(didIdentifier) {
    return (await this.getOnchainDidDetail(didIdentifier)).nonce;
  }

  /**
   * Gets the nonce that should be used for sending the next transaction by this DID. Its 1 more than the current nonce.
   * @param didIdentifier
   * @returns {Promise<*>}
   */
  async getNextNonceForDID(didIdentifier) {
    return (await this.getNonceForDID(didIdentifier)) + 1;
  }

  /**
   * Get the `DidKey` for the DID with given key index. Key indices start from 1 and can have holes
   * @param did
   * @param {number} keyIndex
   * @returns {Promise<DidKey>}
   */
  async getDidKey(did, keyIndex) {
    const hexId = getHexIdentifierFromDID(did);
    let resp = await this.api.query.didModule.didKeys(hexId, keyIndex);
    if (resp.isNone) {
      throw new Error(`No key for found did ${did} and key index ${keyIndex}`);
    }
    resp = resp.unwrap();

    const pk = resp.publicKey;
    let publicKey;
    if (pk.isSr25519) {
      publicKey = new PublicKeySr25519(u8aToHex(pk.asSr25519.value));
    } else if (pk.isEd25519) {
      publicKey = new PublicKeyEd25519(u8aToHex(pk.asEd25519.value));
    } else if (pk.isSecp256K1) {
      publicKey = new PublicKeySecp256k1(u8aToHex(pk.asSecp256K1.value));
    } else if (pk.isX25519) {
      publicKey = new PublicKeyX25519(u8aToHex(pk.asX25519.value));
    } else {
      throw new Error(`Cannot parse public key ${pk}`);
    }
    return new DidKey(
      publicKey,
      new VerificationRelationship(resp.verRels.toNumber()),
    );
  }

  /**
   * Returns true if DID `controller` is a controller of DID `controlled`, false otherwise
   * @param controlled
   * @param controller
   * @returns {Promise<boolean>}
   */
  async isController(controlled, controller) {
    const controlledHexId = getHexIdentifierFromDID(controlled);
    const controllerHexId = getHexIdentifierFromDID(controller);
    const resp = await this.api.query.didModule.didControllers(
      controlledHexId,
      controllerHexId,
    );
    return resp.isSome;
  }

  /**
   * Returns the service endpoint of the DID and known by `endpointId`
   * @param did
   * @param endpointId
   * @returns {Promise}
   */
  async getServiceEndpoint(did, endpointId) {
    const hexId = getHexIdentifierFromDID(did);
    let resp = await this.api.query.didModule.didServiceEndpoints(
      hexId,
      endpointId,
    );
    if (resp.isNone) {
      throw new Error(
        `No service endpoint found for did ${did} and with id ${endpointId}`,
      );
    }
    resp = resp.unwrap();
    return {
      type: new ServiceEndpointType(resp.types.toNumber()),
      origins: resp.origins.map((origin) => u8aToHex(origin)),
    };
  }

  async createSignedAddKeys(
    didKeys,
    hexDid,
    controllerHexDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const keys = didKeys.map((d) => d.toJSON());
    const addKeys = { did: hexDid, keys, nonce };
    const serializedAddKeys = this.getSerializedAddKeys(addKeys);
    const signature = getSignatureFromKeyringPair(keyPair, serializedAddKeys);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [addKeys, didSig];
  }

  async createSignedAddControllers(
    controllers,
    hexDid,
    controllerHexDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const cnts = new BTreeSet();
    controllers.forEach((c) => {
      cnts.add(getHexIdentifierFromDID(c));
    });
    const addControllers = { did: hexDid, controllers: cnts, nonce };
    const serializedAddControllers = this.getSerializedAddControllers(addControllers);
    const signature = getSignatureFromKeyringPair(
      keyPair,
      serializedAddControllers,
    );
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [addControllers, didSig];
  }

  async createSignedAddServiceEndpoint(
    endpointId,
    endpointType,
    origins,
    hexDid,
    controllerHexDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const endpoint = { types: endpointType.value, origins };
    const addServiceEndpoint = {
      did: hexDid,
      id: endpointId,
      endpoint,
      nonce,
    };
    const serializedServiceEndpoint = this.getSerializedAddServiceEndpoint(addServiceEndpoint);
    const signature = getSignatureFromKeyringPair(
      keyPair,
      serializedServiceEndpoint,
    );
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [addServiceEndpoint, didSig];
  }

  async createSignedRemoveKeys(
    keyIds,
    did,
    controllerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const keys = new BTreeSet();
    keyIds.forEach((k) => {
      keys.add(k);
    });
    const removeKeys = { did: hexDid, keys, nonce };
    const serializedRemoveKeys = this.getSerializedRemoveKeys(removeKeys);
    const signature = getSignatureFromKeyringPair(
      keyPair,
      serializedRemoveKeys,
    );
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removeKeys, didSig];
  }

  async createSignedRemoveControllers(
    controllers,
    did,
    controllerDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const cnts = new BTreeSet();
    controllers.forEach((c) => {
      cnts.add(getHexIdentifierFromDID(c));
    });

    const removeControllers = { did: hexDid, controllers: cnts, nonce };
    const serializedRemoveControllers = this.getSerializedRemoveControllers(removeControllers);
    const signature = getSignatureFromKeyringPair(
      keyPair,
      serializedRemoveControllers,
    );
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removeControllers, didSig];
  }

  async createSignedRemoveServiceEndpoint(
    endpointId,
    hexDid,
    controllerHexDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const removeServiceEndpoint = { did: hexDid, id: endpointId, nonce };
    const serializedRemoveServiceEndpoint = this.getSerializedRemoveServiceEndpoint(removeServiceEndpoint);
    const signature = getSignatureFromKeyringPair(
      keyPair,
      serializedRemoveServiceEndpoint,
    );
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removeServiceEndpoint, didSig];
  }

  async createSignedDidRemoval(
    hexDid,
    controllerHexDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const removal = { did: hexDid, nonce };
    const serializedRemoval = this.getSerializedDidRemoval(removal);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRemoval);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removal, didSig];
  }

  async createSignedAttestation(
    priority,
    iri,
    hexDid,
    keyPair,
    keyId,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(hexDid);
    }
    const setAttestation = {
      attest: {
        priority,
        iri,
      },
      nonce,
    };
    const serializedAttestation = this.getSerializedAttestation(setAttestation);
    const signature = getSignatureFromKeyringPair(
      keyPair,
      serializedAttestation,
    );
    const didSig = createDidSig(hexDid, keyId, signature);
    return [setAttestation, didSig];
  }

  /**
   * Serializes a `AddKeys` for signing.
   * @param {object} addKeys - `AddKeys` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedAddKeys(addKeys) {
    return getStateChange(this.api, 'AddKeys', addKeys);
  }

  getSerializedAddControllers(addControllers) {
    return getStateChange(this.api, 'AddControllers', addControllers);
  }

  getSerializedAddServiceEndpoint(addServiceEndpoint) {
    return getStateChange(this.api, 'AddServiceEndpoint', addServiceEndpoint);
  }

  getSerializedRemoveKeys(removeKeys) {
    return getStateChange(this.api, 'RemoveKeys', removeKeys);
  }

  getSerializedRemoveControllers(removeControllers) {
    return getStateChange(this.api, 'RemoveControllers', removeControllers);
  }

  getSerializedRemoveServiceEndpoint(removeServiceEndpoint) {
    return getStateChange(
      this.api,
      'RemoveServiceEndpoint',
      removeServiceEndpoint,
    );
  }

  /**
   * Serializes a `DidRemoval` for signing.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedDidRemoval(didRemoval) {
    return getStateChange(this.api, 'DidRemoval', didRemoval);
  }

  /**
   * Serializes an `Attestation` for signing.
   * @param {object} setAttestation - `SetAttestationClaim` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedAttestation(setAttestation) {
    return getStateChange(this.api, 'SetAttestationClaim', setAttestation);
  }
}

export default DIDModule;
