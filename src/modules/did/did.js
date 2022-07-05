import { encodeAddress } from '@polkadot/util-crypto';
import { u8aToString, hexToU8a, u8aToHex } from '@polkadot/util';
import { BTreeSet } from '@polkadot/types';
import * as b58 from 'multiformats/bases/base58';
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

import Signature from '../../signatures/signature'; // eslint-disable-line
import OffChainDidDocRef from './offchain-did-doc-ref';
import {
  PublicKeyEd25519, PublicKeySecp256k1, PublicKeySr25519, PublicKeyX25519, DidKey, VerificationRelationship,
} from '../../public-keys';
import { ServiceEndpointType } from '../../service-endpoint';
import dock from '../../index';

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
   * @param {OffChainDidDocRef} didDocRef -
   * @returns {*}
   */
  createNewOffchainTx(did, didDocRef) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.newOffchain(hexId, didDocRef);
  }

  async newOffchain(did, didDocRef, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createNewOffchainTx(did, didDocRef), waitForFinalization, params);
  }

  createSetOffchainDidRefTx(did, didDocRef) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.setOffchainDidDocRef(hexId, didDocRef);
  }

  async setOffchainDidRef(did, didDocRef, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createSetOffchainDidRefTx(did, didDocRef), waitForFinalization, params);
  }

  createRemoveOffchainDidTx(did) {
    const hexId = getHexIdentifierFromDID(did);
    return this.module.removeOffchainDid(hexId);
  }

  async removeOffchainDid(did, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createRemoveOffchainDidTx(did), waitForFinalization, params);
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
        cnts.add(c);
      });
    }
    const hexId = getHexIdentifierFromDID(did);
    return this.module.newOnchain(hexId, didKeys.map((d) => d.toJSON()), cnts);
  }

  /**
   * Creates a new DID on the Dock chain.
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param {array} controllers - Array of `Did`s as expected by the Substrate node
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async new(did, didKeys, controllers, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createNewOnchainTx(did, didKeys, controllers), waitForFinalization, params);
  }

  createAddKeysTx(addKeys, signature) {
    return this.module.addKeys(addKeys, signature);
  }

  async addKeys(addKeys, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createAddKeysTx(addKeys, signature), waitForFinalization, params);
  }

  createAddControllersTx(addControllers, signature) {
    return this.module.addControllers(addControllers, signature);
  }

  async addControllers(addControllers, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createAddControllersTx(addControllers, signature), waitForFinalization, params);
  }

  createAddServiceEndpointTx(addServiceEndpoint, signature) {
    return this.module.addServiceEndpoint(addServiceEndpoint, signature);
  }

  async addServiceEndpoint(addServiceEndpoint, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createAddServiceEndpointTx(addServiceEndpoint, signature), waitForFinalization, params);
  }

  createRemoveKeysTx(removeKeys, signature) {
    return this.module.removeKeys(removeKeys, signature);
  }

  async removeKeys(removeKeys, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createRemoveKeysTx(removeKeys, signature), waitForFinalization, params);
  }

  removeControllersTx(removeControllers, signature) {
    return this.module.removeControllers(removeControllers, signature);
  }

  async removeControllers(removeControllers, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.removeControllersTx(removeControllers, signature), waitForFinalization, params);
  }

  createRemoveServiceEndpointTx(removeServiceEndpoint, signature) {
    return this.module.removeServiceEndpoint(removeServiceEndpoint, signature);
  }

  async removeServiceEndpoint(removeServiceEndpoint, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createRemoveServiceEndpointTx(removeServiceEndpoint, signature), waitForFinalization, params);
  }

  /**
   * Removes an already registered DID on the Dock chain.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @param {Signature} signature - Signature from existing key
   * @return {Promise<object>} The extrinsic to sign and send.
   */
  createRemoveTx(didRemoval, signature) {
    return this.module.removeOnchainDid(didRemoval, signature);
  }

  /**
   * Removes an already registered DID on the Dock chain.
   * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
   * @param {Signature} signature - Signature from existing key
   * @param waitForFinalization
   * @param params
   * @return {Promise<object>} Promise to the pending transaction
   */
  async remove(didRemoval, signature, waitForFinalization = true, params = {}) {
    return await this.signAndSend(this.createRemoveTx(didRemoval, signature), waitForFinalization, params);
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param {object} setAttestation - `SetAttestationClaim` object with priority and iri
   * @param {object} signature - signature from DID
   * @param waitForFinalization
   * @param params
   */
  async setClaim(setAttestation, signature, waitForFinalization = true, params = {}) {
    const attestTx = this.api.tx.attest.setClaim(setAttestation, signature);
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
    return attests.iri.isSome ? u8aToString(hexToU8a(attests.iri.toString())) : null;
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

    // const allDetails0 = await this.api.rpc.core_mods.didDetails(hexId, 0);
    // const allDetails0 = await this.api.rpc.core_mods.didDetails(hexId);
    // const allDetails = await this.api.rpc.core_mods.didDetails({0: hexId}, 0);

    const detail = await this.getOnchainDidDetail(hexId);

    // Get DIDs attestations
    const attests = await this.getAttests(hexId);

    // If given DID was in hex, encode to SS58 and then construct fully qualified DID else the DID was already fully qualified
    const id = (did === hexId) ? this.getFullyQualifiedDID(encodeAddress(hexId)) : did;

    // Get controllers
    const controllers = [];
    if (detail.activeControllers > 0) {
      const cnts = await this.api.query.didModule.didControllers.entries(hexId);
      cnts.forEach(([key, value]) => {
        if (value.isSome) {
          const [controlled, controller] = key.toHuman();
          if (controlled[0] !== hexId) {
            throw new Error(`Controlled DID ${controlled[0]} was found to be different than queried DID ${hexId}`);
          }
          controllers.push(controller[0][0]);
        }
      });
    }

    const serviceEndpoints = [];
    const sps = await this.api.query.didModule.didServiceEndpoints.entries(hexId);
    sps.forEach(([key, value]) => {
      if (value.isSome) {
        const sp = value.unwrap();
        // eslint-disable-next-line no-underscore-dangle
        const [d, spId] = key._args;
        // eslint-disable-next-line no-underscore-dangle
        const d_ = u8aToHex(d[0]);
        if (d_ !== hexId) {
          throw new Error(`DID ${d_} was found to be different than queried DID ${hexId}`);
        }
        serviceEndpoints.push([spId[0], sp]);
      }
    });

    const keys = [];
    const assertion = [];
    const authn = [];
    const capInv = [];
    const keyAgr = [];
    if (detail.lastKeyId > 0) {
      const dks = await this.api.query.didModule.didKeys.entries(hexId);
      dks.forEach(([key, value]) => {
        if (value.isSome) {
          const dk = value.unwrap();
          // eslint-disable-next-line no-underscore-dangle
          const [d, i] = key._args;
          // eslint-disable-next-line no-underscore-dangle
          const d_ = u8aToHex(d[0]);
          if (d_ !== hexId) {
            throw new Error(`DID ${d_} was found to be different than queried DID ${hexId}`);
          }
          const index = i[0].toNumber();
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
        }
      });
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
      publicKeyMultibase: b58.base58btc.encode(publicKeyRaw),
    }));
    const assertionMethod = assertion.map((i) => `${id}#keys-${i}`);
    const authentication = authn.map((i) => `${id}#keys-${i}`);
    const capabilityInvocation = capInv.map((i) => `${id}#keys-${i}`);
    const keyAgreement = keyAgr.map((i) => `${id}#keys-${i}`);

    // Construct document
    const document = {
      '@context': 'https://www.w3.org/ns/did/v1',
      id,
      controller: controllers.map((c) => this.getFullyQualifiedDID(encodeAddress(c))),
      verificationMethod,
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
          throw new Error(`Only "LinkedDomains" supported as service endpoint type for now but found ${spType}`);
        }
        return {
          id: decoder.decode(spId),
          type: 'LinkedDomains',
          serviceEndpoint: sp.origins.map((o) => decoder.decode(o[0])),
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
      lastKeyId: didDetail.lastKeyId[0].toNumber(),
      activeControllerKeys: didDetail.activeControllerKeys.toNumber(),
      activeControllers: didDetail.activeControllers.toNumber(),
    };
  }

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
      detail.docRef = OffChainDidDocRef.cid(u8aToHex(resp.docRef.asCid[0]));
    } else if (resp.docRef.isUrl) {
      detail.docRef = OffChainDidDocRef.url(u8aToHex(resp.docRef.asUrl[0]));
    } else if (resp.docRef.isCustom) {
      detail.docRef = OffChainDidDocRef.custom(u8aToHex(resp.docRef.asCustom[0]));
    } else {
      throw new Error(`Cannot parse DIDDoc ref ${resp.docRef}`);
    }
    return detail;
  }

  /**
   * Gets the block number in which the DID was last modified in
   * the chain and return it. It will throw error if the DID does not exist on
   * chain or chain returns null response.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<array>} A 2 element array with first
   */
  async getNonceForDID(didIdentifier) {
    return (await this.getOnchainDidDetail(didIdentifier)).nonce;
  }

  async getNextNonceForDID(didIdentifier) {
    return (await this.getNonceForDID(didIdentifier)) + 1;
  }

  async getDidKey(did, keyIndex) {
    const hexId = getHexIdentifierFromDID(did);
    let resp = await this.api.query.didModule.didKeys(hexId, { 0: keyIndex });
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
    return new DidKey(publicKey, new VerificationRelationship(resp.verRels.toNumber()));
  }

  async isController(controlled, controller) {
    const controlledHexId = getHexIdentifierFromDID(controlled);
    const controllerHexId = getHexIdentifierFromDID(controller);
    const resp = await this.api.query.didModule.didControllers(controlledHexId, controllerHexId);
    return resp.isSome;
  }

  async getServiceEndpoint(did, endpointId) {
    const hexId = getHexIdentifierFromDID(did);
    let resp = await this.api.query.didModule.didServiceEndpoints(hexId, { 0: endpointId });
    if (resp.isNone) {
      throw new Error(`No service endpoint found for did ${did} and with id ${endpointId}`);
    }
    resp = resp.unwrap();
    return {
      type: new ServiceEndpointType(resp.types.toNumber()),
      origins: resp.origins.map((o) => u8aToHex(o[0])),
    };
  }

  async createSignedAddKeys(didKeys, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

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

  async createSignedAddControllers(controllers, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const cnts = new BTreeSet();
    controllers.forEach((c) => {
      cnts.add(c);
    });
    const addControllers = { did: hexDid, controllers: cnts, nonce };
    const serializedAddControllers = this.getSerializedAddControllers(addControllers);
    const signature = getSignatureFromKeyringPair(keyPair, serializedAddControllers);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [addControllers, didSig];
  }

  async createSignedAddServiceEndpoint(endpointId, endpointType, origins, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const endpoint = { types: endpointType.value, origins: origins.map((o) => ({ 0: o })) };
    const addServiceEndpoint = {
      did: hexDid, id: { 0: endpointId }, endpoint, nonce,
    };
    const serializedServiceEndpoint = this.getSerializedAddServiceEndpoint(addServiceEndpoint);
    const signature = getSignatureFromKeyringPair(keyPair, serializedServiceEndpoint);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [addServiceEndpoint, didSig];
  }

  async createSignedRemoveKeys(keyIds, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const keys = new BTreeSet();
    keyIds.forEach((k) => {
      keys.add({ 0: k });
    });
    const removeKeys = { did: hexDid, keys, nonce };
    const serializedRemoveKeys = this.getSerializedRemoveKeys(removeKeys);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRemoveKeys);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removeKeys, didSig];
  }

  async createSignedRemoveControllers(controllers, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const cnts = new BTreeSet();
    controllers.forEach((c) => {
      cnts.add(c);
    });

    const removeControllers = { did: hexDid, controllers: cnts, nonce };
    const serializedRemoveControllers = this.getSerializedRemoveControllers(removeControllers);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRemoveControllers);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removeControllers, didSig];
  }

  async createSignedRemoveServiceEndpoint(endpointId, did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

    if (nonce === undefined) {
      // eslint-disable-next-line no-param-reassign
      nonce = await this.getNextNonceForDID(controllerHexDid);
    }

    const removeServiceEndpoint = { did: hexDid, id: { 0: endpointId }, nonce };
    const serializedRemoveServiceEndpoint = this.getSerializedRemoveServiceEndpoint(removeServiceEndpoint);
    const signature = getSignatureFromKeyringPair(keyPair, serializedRemoveServiceEndpoint);
    const didSig = createDidSig(controllerHexDid, keyId, signature);
    return [removeServiceEndpoint, didSig];
  }

  async createSignedDidRemoval(did, controllerDid, keyPair, keyId, nonce = undefined) {
    const hexDid = getHexIdentifierFromDID(did);
    const controllerHexDid = getHexIdentifierFromDID(controllerDid);

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
    return getStateChange(this.api, 'RemoveServiceEndpoint', removeServiceEndpoint);
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
