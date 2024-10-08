import bs58 from 'bs58';
import { AbstractDIDModule } from '@docknetwork/credential-sdk/modules/did';
import {
  DockDid,
  DockDidOrDidMethodKey,
} from '@docknetwork/credential-sdk/types';
import {
  DIDDocument,
  Service,
  CONTEXT_URI,
} from '@docknetwork/credential-sdk/types/did/document';
import { DockDIDModuleInternal } from './internal';
import injectDock from '../common/inject-dock';
import DockAttestModule from '../attest/module';
import DockOffchainSignaturesModule from '../offchain-signatures/module';

export default class DockDIDModule extends injectDock(AbstractDIDModule) {
  static DockOnly = DockDIDModuleInternal;

  constructor(apiProvider) {
    super(apiProvider);

    this.attest = new DockAttestModule(apiProvider);
    this.offchainSignatures = new DockOffchainSignaturesModule(apiProvider);
  }

  async createDocumentTx(didDocument, _didSigners) {
    const document = DIDDocument.from(didDocument);

    const keys = didDocument.didKeys();
    const {
      controller, service, id, '@context': context,
    } = document;
    if (service?.length) {
      throw new Error(
        '`service` is not supported in the `createDocument` transaction. Use `updateDocument` to add `service` to the existing document.',
      );
    }
    if (context.length !== 1 || context[0].value !== CONTEXT_URI) {
      throw new Error(
        `Context must be equal to \`${[CONTEXT_URI]}\`, received: \`${context}\``,
      );
    }

    return await this.dockOnly.tx.newOnchain(id, keys.values(), controller);
  }

  async updateDocumentTx(didDocument, didKeypair) {
    const nextDocument = DIDDocument.from(didDocument);
    const signerDid = DockDidOrDidMethodKey.from(didKeypair.did);

    const currentDocument = await this.getDocument(String(didDocument.id));

    const {
      added: newMethods,
      removed: removedMethods,
      modified,
    } = nextDocument.didKeys().diff(currentDocument.didKeys());
    const { added: newControllers, removed: removedControllers } = nextDocument.controller.diff(currentDocument.controller);
    const { added: newServices, removed: removedServices } = nextDocument.service.diff(currentDocument.service);

    if (modified.size) {
      throw new Error("Can't have modified verificationMethods");
    }

    if (
      [...newMethods.keys()].find((method) => !method.did.eq(didDocument.id))
      || [...removedMethods.keys()].find(
        (method) => !method.did.eq(didDocument.id),
      )
    ) {
      throw new Error('Can change controller keys');
    }

    let nonce = +(await this.dockOnly.nonce(signerDid));

    const { id: did, '@context': context } = nextDocument;

    if (context.length !== 1 || context[0].value !== CONTEXT_URI) {
      throw new Error(
        `Context must be equal to \`${[CONTEXT_URI]}\`, received: \`${context}\``,
      );
    }

    const txs = await Promise.all(
      [
        newMethods.size
          && this.dockOnly.tx.addKeys(
            [...newMethods.values()],
            did,
            didKeypair,
            ++nonce,
          ),
        newControllers.length
          && this.dockOnly.tx.addControllers(
            newControllers,
            did,
            didKeypair,
            ++nonce,
          ),
        ...[...newServices].map(({ id, type, serviceEndpoint }) => this.dockOnly.tx.addServiceEndpoint(
          id,
          type,
          serviceEndpoint,
          did,
          didKeypair,
          ++nonce,
        )),
        ...[...removedServices].map(({ id }) => this.dockOnly.tx.removeServiceEndpoint(id, did, didKeypair, ++nonce)),
        removedControllers.length
          && this.dockOnly.tx.removeControllers(
            removedControllers,
            did,
            didKeypair,
            ++nonce,
          ),
        removedMethods.size
          && this.dockOnly.tx.removeKeys(
            [...removedMethods.keys()].map((method) => method.index),
            did,
            didKeypair,
            ++nonce,
          ),
      ].filter(Boolean),
    );

    return await this.dockOnly.apiProvider.api.tx.utility.batchAll(txs);
  }

  async removeDocumentTx(did, didKeypair) {
    return await this.dockOnly.tx.removeOnchainDid(did, didKeypair);
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
  async getDocument(did) {
    const typedDid = DockDid.from(did);
    const hexDid = typedDid.asDid;

    const { data: didDetails } = await this.dockOnly.getOnchainDidDetail(hexDid);

    // Get DIDs attestations
    const attests = await this.attest.getAttests(typedDid);

    // If given DID was in hex, encode to SS58 and then construct fully qualified DID else the DID was already fully qualified
    const id = String(typedDid);

    // Get controllers
    const controllers = didDetails.activeControllers > 0
      ? await this.dockOnly.controllers(typedDid)
      : [];

    // Get service endpoints
    const serviceEndpoints = await this.dockOnly.serviceEndpoints(hexDid);

    // Get keys and categorize them by verification relationship type
    const keys = [];
    const assert = [];
    const authn = [];
    const capInv = [];
    const keyAgr = [];

    if (didDetails.lastKeyId > 0) {
      const dks = await this.dockOnly.keys(hexDid);

      [...dks.entries()].forEach(([index, { publicKey, verRels }]) => {
        keys.push([
          index,
          publicKey.constructor.Class.VerKeyType,
          publicKey.value.bytes,
        ]);

        if (verRels.isAuthentication()) {
          authn.push(index);
        }
        if (verRels.isAssertion()) {
          assert.push(index);
        }
        if (verRels.isCapabilityInvocation()) {
          capInv.push(index);
        }
        if (verRels.isKeyAgreement()) {
          keyAgr.push(index);
        }
      });
    }

    for (const [
      keyId,
      key,
    ] of await this.offchainSignatures.getAllPublicKeysByDid(hexDid)) {
      // The gaps in `keyId` might correspond to removed keys
      keys.push([keyId, key.constructor.VerKeyType, key.value.bytes]);

      assert.push(keyId);
    }

    keys.sort((a, b) => a[0] - b[0]);
    assert.sort();
    authn.sort();
    capInv.sort();
    keyAgr.sort();

    const verificationMethod = keys.map(([index, type, pk]) => ({
      id: `${id}#keys-${index}`,
      type,
      controller: id,
      publicKeyBase58: bs58.encode(pk),
    }));
    const assertion = assert.map((i) => `${id}#keys-${i}`);
    const authentication = authn.map((i) => `${id}#keys-${i}`);
    const capabilityInvocation = capInv.map((i) => `${id}#keys-${i}`);
    const keyAgreement = keyAgr.map((i) => `${id}#keys-${i}`);

    const service = [...serviceEndpoints].map(([spId, sp]) => Service.fromServiceEndpoint(spId, sp));

    // Construct document
    return new DIDDocument(
      [CONTEXT_URI],
      id,
      [],
      controllers,
      verificationMethod,
      service,
      authentication,
      assertion,
      keyAgreement,
      capabilityInvocation,
      [],
      attests,
    );
  }
}
