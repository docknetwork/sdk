import { encodeAddress } from "@polkadot/util-crypto";
import { u8aToString, hexToU8a, u8aToHex } from "@polkadot/util";
import { BTreeSet } from "@polkadot/types";
import b58 from "bs58";
import {
  DockDidOrDidMethodKey,
  DockDIDQualifier,
  NoDIDError,
  validateDockDIDHexIdentifier,
  NoOnchainDIDError,
  NoOffchainDIDError,
  createDidSig,
  DidMethodKeyQualifier,
} from "../../utils/did";
import { getStateChange } from "../../utils/misc";

import OffChainDidDocRef from "./offchain-did-doc-ref";
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519,
  PublicKeyX25519,
  DidKey,
  VerificationRelationship,
} from "../../public-keys";
import { ServiceEndpointType } from "./service-endpoint";
import WithParamsAndPublicKeys from "../WithParamsAndPublicKeys";

export const ATTESTS_IRI =
  "https://rdf.dock.io/alpha/2021#attestsDocumentContents";

const valuePropOrIdentity = (val) => val.value || val;

/** Class to create, update and destroy DIDs */
class DIDModule {
  /**
   * Creates a new instance of DIDModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param signAndSend - Function to sign and send transaction
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
    const hexId = DockDidOrDidMethodKey.from(did).asDid;
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
    const hexId = DockDidOrDidMethodKey.from(did).asDid;
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
    const hexId = DockDidOrDidMethodKey.from(did).asDid;
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
    const cnts = new BTreeSet(this.api.registry, "Controller");
    if (controllers !== undefined) {
      controllers.forEach((c) => {
        cnts.add(DockDidOrDidMethodKey.from(c));
      });
    }
    const hexId = DockDidOrDidMethodKey.from(did).asDid;
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
   * Creates a new `did:key:` on the Dock chain.
   * @param {{ ed25519: Uint8Array } | { secp256k1: Uint8Array }} did - The new DID. Can be either `PublicKeyEd25519` or `PublicKeySecp256k1`.
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async newDidMethodKey(didMethodKey, waitForFinalization = true, params = {}) {
    return this.signAndSend(
      this.module.newDidMethodKey(didMethodKey),
      waitForFinalization,
      params,
    );
  }

  /**
   * Create transaction to add keys to an on-chain DID.
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param targetDid - The DID to which keys are being added
   * @param signerDid - The DID that is adding the keys by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createAddKeysTx(
    didKeys,
    targetDid,
    signerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [addKeys, signature] = await this.createSignedAddKeys(
      didKeys,
      targetHexDid,
      signerHexDid,
      signingKeyRef,
      nonce,
    );
    return this.module.addKeys(addKeys, signature);
  }

  /**
   * Add keys to an on-chain DID
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param targetDid - The DID to which keys are being added
   * @param signerDid - The DID that is adding the keys by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      await this.createAddKeysTx(
        didKeys,
        targetDid,
        signerDid,
        signingKeyRef,
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
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createAddControllersTx(
    controllers,
    targetDid,
    signerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [addControllers, signature] = await this.createSignedAddControllers(
      controllers,
      targetHexDid,
      signerHexDid,
      signingKeyRef,
      nonce,
    );
    return this.module.addControllers(addControllers, signature);
  }

  /**
   * Add controllers to an on-chain DID.
   * @param controllers - The DIDs that will control the `targetDid`
   * @param targetDid - The DID to which controllers are being added
   * @param signerDid - The DID that is adding the controllers by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createAddControllersTx(
      controllers,
      targetDid,
      signerDid,
      signingKeyRef,
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
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
    nonce = undefined,
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [addServiceEndpoint, signature] =
      await this.createSignedAddServiceEndpoint(
        endpointId,
        endpointType,
        origins,
        targetHexDid,
        signerHexDid,
        signingKeyRef,
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
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
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
      signingKeyRef,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create transaction to remove keys
   * @param keyIds - Key indices to remove
   * @param targetDid - The DID from which keys are being removed
   * @param signerDid - The DID that is removing the keys by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createRemoveKeysTx(
    keyIds,
    targetDid,
    signerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [removeKeys, signature] = await this.createSignedRemoveKeys(
      keyIds,
      targetHexDid,
      signerHexDid,
      signingKeyRef,
      nonce,
    );
    return this.module.removeKeys(removeKeys, signature);
  }

  /**
   * Remove keys from a DID
   * @param keyIds - Key indices to remove
   * @param targetDid - The DID from which keys are being removed
   * @param signerDid - The DID that is removing the keys by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemoveKeysTx(
      keyIds,
      targetDid,
      signerDid,
      signingKeyRef,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create transaction to remove controllers from a DID
   * @param controllers - Controller DIDs to remove.
   * @param targetDid - The DID from which controllers are being removed
   * @param signerDid - The DID that is removing the controllers by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async removeControllersTx(
    controllers,
    targetDid,
    signerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [removeControllers, signature] =
      await this.createSignedRemoveControllers(
        controllers,
        targetHexDid,
        signerHexDid,
        signingKeyRef,
        nonce,
      );
    return this.module.removeControllers(removeControllers, signature);
  }

  /**
   * Remove controllers from a DID
   * @param controllers - Controller DIDs to remove.
   * @param targetDid - The DID from which controllers are being removed
   * @param signerDid - The DID that is removing the controllers by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.removeControllersTx(
      controllers,
      targetDid,
      signerDid,
      signingKeyRef,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create transaction to remove a service endpoint from a DID
   * @param endpointId - The endpoint to remove
   * @param targetDid - The DID from which endpoint is being removed
   * @param signerDid - The DID that is removing the endpoint by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @returns {Promise<*>}
   */
  async createRemoveServiceEndpointTx(
    endpointId,
    targetDid,
    signerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    const targetHexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [removeServiceEndpoint, signature] =
      await this.createSignedRemoveServiceEndpoint(
        endpointId,
        targetHexDid,
        signerHexDid,
        signingKeyRef,
        nonce,
      );
    return this.module.removeServiceEndpoint(removeServiceEndpoint, signature);
  }

  /**
   * Remove a service endpoint from a DID
   * @param endpointId - The endpoint to remove
   * @param targetDid - The DID from which endpoint is being removed
   * @param signerDid - The DID that is removing the endpoint by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
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
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemoveServiceEndpointTx(
      endpointId,
      targetDid,
      signerDid,
      signingKeyRef,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   * Create a transaction to remove an on-chain DID
   * @param targetDid - The DID being removed
   * @param signerDid - The DID that is removing `targetDid` by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  async createRemoveTx(targetDid, signerDid, signingKeyRef, nonce = undefined) {
    const hexDid = DockDidOrDidMethodKey.from(targetDid).asDid;
    const signerHexDid = DockDidOrDidMethodKey.from(signerDid);
    const [didRemoval, signature] = await this.createSignedDidRemoval(
      hexDid,
      signerHexDid,
      signingKeyRef,
      nonce,
    );
    return this.module.removeOnchainDid(didRemoval, signature);
  }

  /**
   * Removes an on-chain DID.
   * @param targetDid - The DID being removed
   * @param signerDid - The DID that is removing `targetDid` by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @param nonce - The nonce to be used for sending this transaction. If not provided then an appropriate nonce will be
   * fetched from chain before creating the transaction
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async remove(
    targetDid,
    signerDid,
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const tx = await this.createRemoveTx(
      targetDid,
      signerDid,
      signingKeyRef,
      nonce,
    );
    return this.signAndSend(tx, waitForFinalization, params);
  }

  /**
   *
   * @param priority
   * @param iri
   * @param did
   * @param signingKeyRef
   * @param nonce
   * @returns {Promise<SubmittableExtrinsic<ApiType>>}
   */
  async createSetClaimTx(priority, iri, did, signingKeyRef, nonce = undefined) {
    const hexDid = DockDidOrDidMethodKey.from(did);
    const [setAttestation, signature] = await this.createSignedAttestation(
      priority,
      iri,
      hexDid,
      signingKeyRef,
      nonce,
    );
    return this.api.tx.attest.setClaim(setAttestation, signature);
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param priority
   * @param iri
   * @param did
   * @param signingKeyRef
   * @param nonce
   * @param waitForFinalization
   * @param params
   */
  async setClaim(
    priority,
    iri,
    did,
    signingKeyRef,
    nonce = undefined,
    waitForFinalization = true,
    params = {},
  ) {
    const attestTx = await this.createSetClaimTx(
      priority,
      iri,
      did,
      signingKeyRef,
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
   * Create the fully qualified DID like "did:dock:..."
   * @param {string} didMethodKey - DID
   * @return {string} The DID identifier.
   */
  getFullyQualifiedDIDMethodKey(didMethodKey) {
    return `${DidMethodKeyQualifier}${didMethodKey}`;
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
   * @param {string} did - The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
   * a 32 byte hex string
   * @param getOffchainSigKeys
   * @return {Promise<object>} The DID document.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async getDocument(did, { getOffchainSigKeys = true } = {}) {
    const typedDid = DockDidOrDidMethodKey.from(did);
    const hexDid = typedDid.asDid;
    let didDetails = await this.getOnchainDidDetail(hexDid);
    didDetails = didDetails.data || didDetails;

    // Get DIDs attestations
    const attests = await this.getAttests(typedDid);

    // If given DID was in hex, encode to SS58 and then construct fully qualified DID else the DID was already fully qualified
    const id =
      did === hexDid ? this.getFullyQualifiedDID(encodeAddress(hexDid)) : did;

    // Get controllers
    const controllers = [];
    if (didDetails.activeControllers > 0) {
      const cnts =
        await this.api.query.didModule.didControllers.entries(hexDid);
      cnts.forEach(([key, value]) => {
        if (value.isSome) {
          const [controlled, controller] = key.toHuman();
          if (controlled !== hexDid) {
            throw new Error(
              `Controlled DID ${controlled[0]} was found to be different than queried DID ${hexDid}`,
            );
          }
          controllers.push(controller);
        }
      });
    }

    // Get service endpoints
    const serviceEndpoints = [];
    const sps =
      await this.api.query.didModule.didServiceEndpoints.entries(hexDid);
    sps.forEach(([key, value]) => {
      if (value.isSome) {
        const sp = value.unwrap();
        // eslint-disable-next-line no-underscore-dangle
        const [d, spId] = key.args;
        // eslint-disable-next-line no-underscore-dangle
        const d_ = u8aToHex(d);
        if (d_ !== hexDid) {
          throw new Error(
            `DID ${d_} was found to be different than queried DID ${hexDid}`,
          );
        }
        serviceEndpoints.push([spId, sp]);
      }
    });

    // Get keys and categorize them by verification relationship type
    const keys = [];
    const assertion = [];
    const authn = [];
    const capInv = [];
    const keyAgr = [];
    if (didDetails.lastKeyId > 0) {
      const dks = await this.api.query.didModule.didKeys.entries(hexDid);
      dks.forEach(([key, value]) => {
        if (value.isSome) {
          const dk = value.unwrap();
          // eslint-disable-next-line no-underscore-dangle
          const [d, i] = key.args;
          // eslint-disable-next-line no-underscore-dangle
          const d_ = u8aToHex(d);
          if (d_ !== hexDid) {
            throw new Error(
              `DID ${d_} was found to be different than queried DID ${hexDid}`,
            );
          }
          const index = i.toNumber();
          const pk = dk.publicKey;
          let publicKeyRaw;
          let typ;
          if (pk.isSr25519) {
            typ = "Sr25519VerificationKey2020";
            publicKeyRaw = valuePropOrIdentity(pk.asSr25519);
          } else if (pk.isEd25519) {
            typ = "Ed25519VerificationKey2018";
            publicKeyRaw = valuePropOrIdentity(pk.asEd25519);
          } else if (pk.isSecp256k1) {
            typ = "EcdsaSecp256k1VerificationKey2019";
            publicKeyRaw = valuePropOrIdentity(pk.asSecp256k1);
          } else if (pk.isX25519) {
            typ = "X25519KeyAgreementKey2019";
            publicKeyRaw = valuePropOrIdentity(pk.asX25519);
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
        }
      });
    }

    if (getOffchainSigKeys === true) {
      const { lastKeyId } = didDetails;

      // If any keys should be fetched
      if (lastKeyId > keys.length) {
        // key id can be anything from 1 to `lastKeyId`
        const possibleKeyIds = new Set();
        for (let i = 1; i <= lastKeyId; i++) {
          possibleKeyIds.add(i);
        }
        // Remove key ids already seen as non-BBS+
        for (const [i] of keys) {
          possibleKeyIds.delete(i);
        }

        // Query all BBS+ keys in a single RPC call to the node.
        const queryKeys = [];
        for (const k of possibleKeyIds) {
          queryKeys.push([hexDid, k]);
        }
        if (this.api.query.offchainSignatures != null) {
          const resp =
            await this.api.query.offchainSignatures.publicKeys.multi(queryKeys);
          let currentIter = 0;
          for (let r of resp) {
            // The gaps in `keyId` might correspond to removed keys
            if (r.isSome) {
              let rawKey;
              let keyType;
              r = r.unwrap();

              if (r.isBbs) {
                keyType = "Bls12381BBSVerificationKeyDock2023";
                rawKey = r.asBbs;
              } else if (r.isBbsPlus) {
                keyType = "Bls12381G2VerificationKeyDock2022";
                rawKey = r.asBbsPlus;
              } else if (r.isPs) {
                keyType = "Bls12381PSVerificationKeyDock2023";
                rawKey = r.asPs;
              }
              // Don't care about signature params for now
              const pkObj =
                WithParamsAndPublicKeys.createPublicKeyObjFromChainResponse(
                  this.api,
                  rawKey,
                );
              if (pkObj.curveType !== "Bls12381") {
                throw new Error(
                  `Curve type should have been Bls12381 but was ${pkObj.curveType}`,
                );
              }
              const keyIndex = queryKeys[currentIter][1];
              keys.push([keyIndex, keyType, hexToU8a(pkObj.bytes)]);
              assertion.push(keyIndex);
            }
            currentIter++;
          }
        } else {
          const resp =
            await this.api.query.bbsPlus.bbsPlusKeys.multi(queryKeys);
          let currentIter = 0;
          for (const r of resp) {
            // The gaps in `keyId` might correspond to removed keys
            if (r.isSome) {
              const keyType = "Bls12381G2VerificationKeyDock2022";
              const rawKey = r.unwrap();

              // Don't care about signature params for now
              const pkObj =
                WithParamsAndPublicKeys.createPublicKeyObjFromChainResponse(
                  this.api,
                  rawKey,
                );
              if (pkObj.curveType !== "Bls12381") {
                throw new Error(
                  `Curve type should have been Bls12381 but was ${pkObj.curveType}`,
                );
              }
              const keyIndex = queryKeys[currentIter][1];
              keys.push([keyIndex, keyType, hexToU8a(pkObj.bytes)]);
              assertion.push(keyIndex);
            }
            currentIter++;
          }
        }
      }
    }

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
      "@context": ["https://www.w3.org/ns/did/v1"],
      id,
      controller: [...controllers].map((c) => {
        if (c.Did) {
          return this.getFullyQualifiedDID(encodeAddress(c.Did));
        } else if (c.DidMethodKey) {
          return this.getFullyQualifiedDIDMethodKey(
            encodeAddress(c.DidMethodKey),
          );
        } else {
          return this.getFullyQualifiedDID(encodeAddress(c));
        }
      }),
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
      const decoder = new TextDecoder();
      document.service = serviceEndpoints.map(([spId, sp]) => {
        const spType = sp.types.toNumber();
        if (spType !== 1) {
          throw new Error(
            `Only "LinkedDomains" supported as service endpoint type for now but found ${spType}`,
          );
        }
        return {
          id: decoder.decode(spId),
          type: "LinkedDomains",
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
      throw new NoDIDError(`did:dock:${didIdentifier}`);
    }

    resp = resp.unwrap();
    if (resp.isOffChain) {
      throw new NoOnchainDIDError(`did:dock:${didIdentifier}`);
    }
    const didDetail = resp.asOnChain;
    const data = didDetail.data || didDetail;
    return {
      nonce: didDetail.nonce.toNumber(),
      lastKeyId: data.lastKeyId.toNumber(),
      activeControllerKeys: data.activeControllerKeys.toNumber(),
      activeControllers: data.activeControllers.toNumber(),
    };
  }

  async getDidMethodKeyDetail(did) {
    let resp = await this.api.query.didModule.didMethodKeys(did);
    if (resp.isNone) {
      throw new NoDIDError(`did:key:dock:${did}`);
    }
    resp = resp.unwrap();

    return {
      nonce: resp.nonce.toNumber(),
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
      throw new NoDIDError(`did:dock:${didIdentifier}`);
    }
    resp = resp.unwrap();
    if (resp.isOnChain) {
      throw new NoOffchainDIDError(`did:dock:${didIdentifier}`);
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
   * @param {DockDidOrDidMethodKey} did - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<number>}
   */
  async getNonceForDid(did) {
    if (did.isDid) {
      return (await this.getOnchainDidDetail(did.asDid)).nonce;
    } else if (did.isDidMethodKey) {
      return (await this.getDidMethodKeyDetail(did.asDidMethodKey)).nonce;
    } else {
      return (await this.getOnchainDidDetail(did)).nonce;
    }
  }

  /**
   * Gets the nonce that should be used for sending the next transaction by this DID. Its 1 more than the current nonce.
   * @param {DockDidOrDidMethodKey} did
   * @returns {Promise<*>}
   */
  async getNextNonceForDid(did) {
    return (await this.getNonceForDid(did)) + 1;
  }

  /**
   * Get the `DidKey` for the DID with given key index. Key indices start from 1 and can have holes
   * @param did
   * @param {number} keyIndex
   * @returns {Promise<DidKey>}
   */
  async getDidKey(did, keyIndex) {
    const hexId = DockDidOrDidMethodKey.from(did).asDid;
    let resp = await this.api.query.didModule.didKeys(hexId, keyIndex);
    if (resp.isNone) {
      throw new Error(`No key for found did ${did} and key index ${keyIndex}`);
    }
    resp = resp.unwrap();

    const pk = resp.publicKey;

    let publicKey;
    if (pk.isSr25519) {
      publicKey = new PublicKeySr25519(
        u8aToHex(valuePropOrIdentity(pk.asSr25519)),
      );
    } else if (pk.isEd25519) {
      publicKey = new PublicKeyEd25519(
        u8aToHex(valuePropOrIdentity(pk.asEd25519)),
      );
    } else if (pk.isSecp256k1) {
      publicKey = new PublicKeySecp256k1(
        u8aToHex(valuePropOrIdentity(pk.asSecp256k1)),
      );
    } else if (pk.isX25519) {
      publicKey = new PublicKeyX25519(
        u8aToHex(valuePropOrIdentity(pk.asX25519)),
      );
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
    const controlledDid = DockDidOrDidMethodKey.from(controlled).asDid;
    const controllerDid = DockDidOrDidMethodKey.from(controller);
    const resp = await this.api.query.didModule.didControllers(
      controlledDid,
      controllerDid,
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
    const hexId = DockDidOrDidMethodKey.from(did).asDid;
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
    did,
    controllerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerDid);
    }

    const keys = didKeys.map((d) => d.toJSON());
    const addKeys = { did, keys, nonce };
    const serializedAddKeys = this.getSerializedAddKeys(addKeys);
    const signature = signingKeyRef.sign(serializedAddKeys);
    const didSig = createDidSig(controllerDid, signingKeyRef, signature);
    return [addKeys, didSig];
  }

  async createSignedAddControllers(
    controllers,
    hexDid,
    controllerHexDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerHexDid);
    }

    const cnts = new BTreeSet(this.api.registry, "Controller");
    controllers.forEach((c) => {
      cnts.add(DockDidOrDidMethodKey.from(c));
    });
    const addControllers = { did: hexDid, controllers: cnts, nonce };
    const serializedAddControllers =
      this.getSerializedAddControllers(addControllers);
    const signature = signingKeyRef.sign(serializedAddControllers);
    const didSig = createDidSig(controllerHexDid, signingKeyRef, signature);
    return [addControllers, didSig];
  }

  async createSignedAddServiceEndpoint(
    endpointId,
    endpointType,
    origins,
    hexDid,
    controllerHexDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerHexDid);
    }

    const endpoint = { types: endpointType.value, origins };
    const addServiceEndpoint = {
      did: hexDid,
      id: endpointId,
      endpoint,
      nonce,
    };
    const serializedServiceEndpoint =
      this.getSerializedAddServiceEndpoint(addServiceEndpoint);
    const signature = signingKeyRef.sign(serializedServiceEndpoint);
    const didSig = createDidSig(controllerHexDid, signingKeyRef, signature);
    return [addServiceEndpoint, didSig];
  }

  async createSignedRemoveKeys(
    keyIds,
    did,
    controllerHexDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerHexDid);
    }

    const keys = new BTreeSet(this.api.registry, "DidKey");
    keyIds.forEach((k) => {
      keys.add(k);
    });
    const removeKeys = { did, keys, nonce };
    const serializedRemoveKeys = this.getSerializedRemoveKeys(removeKeys);
    const signature = signingKeyRef.sign(serializedRemoveKeys);
    const didSig = createDidSig(controllerHexDid, signingKeyRef, signature);
    return [removeKeys, didSig];
  }

  async createSignedRemoveControllers(
    controllers,
    hexDid,
    controllerHexDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerHexDid);
    }

    const cnts = new BTreeSet(this.api.registry, "Controller");
    controllers.forEach((c) => {
      cnts.add(DockDidOrDidMethodKey.from(c));
    });

    const removeControllers = { did: hexDid, controllers: cnts, nonce };
    const serializedRemoveControllers =
      this.getSerializedRemoveControllers(removeControllers);
    const signature = signingKeyRef.sign(serializedRemoveControllers);
    const didSig = createDidSig(controllerHexDid, signingKeyRef, signature);
    return [removeControllers, didSig];
  }

  async createSignedRemoveServiceEndpoint(
    endpointId,
    hexDid,
    controllerHexDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerHexDid);
    }

    const removeServiceEndpoint = { did: hexDid, id: endpointId, nonce };
    const serializedRemoveServiceEndpoint =
      this.getSerializedRemoveServiceEndpoint(removeServiceEndpoint);
    const signature = signingKeyRef.sign(serializedRemoveServiceEndpoint);
    const didSig = createDidSig(controllerHexDid, signingKeyRef, signature);
    return [removeServiceEndpoint, didSig];
  }

  async createSignedDidRemoval(
    did,
    controllerDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(controllerDid);
    }

    const removal = { did, nonce };
    const serializedRemoval = this.getSerializedDidRemoval(removal);
    const signature = signingKeyRef.sign(serializedRemoval);
    const didSig = createDidSig(controllerDid, signingKeyRef, signature);
    return [removal, didSig];
  }

  async createSignedAttestation(
    priority,
    iri,
    hexDid,
    signingKeyRef,
    nonce = undefined,
  ) {
    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDid(hexDid);
    }
    const setAttestation = {
      attest: {
        priority,
        iri,
      },
      nonce,
    };
    const serializedAttestation = this.getSerializedAttestation(setAttestation);
    const signature = signingKeyRef.sign(serializedAttestation);
    const didSig = createDidSig(hexDid, signingKeyRef, signature);
    return [setAttestation, didSig];
  }

  /**
   * Serializes a `AddKeys` for signing.
   * @param {object} addKeys - `AddKeys` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedAddKeys(addKeys) {
    return getStateChange(this.api, "AddKeys", addKeys);
  }

  getSerializedAddControllers(addControllers) {
    return getStateChange(this.api, "AddControllers", addControllers);
  }

  getSerializedAddServiceEndpoint(addServiceEndpoint) {
    return getStateChange(this.api, "AddServiceEndpoint", addServiceEndpoint);
  }

  getSerializedRemoveKeys(removeKeys) {
    return getStateChange(this.api, "RemoveKeys", removeKeys);
  }

  getSerializedRemoveControllers(removeControllers) {
    return getStateChange(this.api, "RemoveControllers", removeControllers);
  }

  getSerializedRemoveServiceEndpoint(removeServiceEndpoint) {
    return getStateChange(
      this.api,
      "RemoveServiceEndpoint",
      removeServiceEndpoint,
    );
  }

  /**
   * Serializes a `DidRemoval` for signing.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedDidRemoval(didRemoval) {
    return getStateChange(this.api, "DidRemoval", didRemoval);
  }

  /**
   * Serializes an `Attestation` for signing.
   * @param {object} setAttestation - `SetAttestationClaim` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedAttestation(setAttestation) {
    return getStateChange(this.api, "SetAttestationClaim", setAttestation);
  }
}

export default DIDModule;
