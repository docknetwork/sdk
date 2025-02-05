import { AbstractDIDModule } from '@docknetwork/credential-sdk/modules/abstract/did';
import {
  DockDid,
  DockDidOrDidMethodKey,
  DidKey,
} from '@docknetwork/credential-sdk/types';
import {
  DIDDocument,
  CONTEXT_URI,
} from '@docknetwork/credential-sdk/types/did';
import DockDIDModuleInternal from './internal';
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
    if (
      [...keys.values()].some((key) => key.verRels.isAuthentication())
      && !document.controller.some((ctrl) => ctrl.eq(document.id))
    ) {
      document.addController(document.id);
    }

    const {
      controller,
      service,
      id,
      '@context': context,
      capabilityDelegation,
      attests,
    } = document;
    if (service?.length) {
      throw new Error(
        '`service` is not supported in the `createDocument` transaction. Use `updateDocument` to add `service` to the existing document.',
      );
    } else if (capabilityDelegation?.length) {
      throw new Error('Capability delegation is not supported');
    } else if (attests != null) {
      throw new Error(
        '`attests` are not supported in the `createDocument` transaction. Use `attest` module to attach `attests` to the existing document.',
      );
    } else if (context.length !== 1 || context[0].value !== CONTEXT_URI) {
      throw new Error(
        `Context must be equal to \`${[
          CONTEXT_URI,
        ]}\`, received: \`${context}\``,
      );
    }
    const nonSelfRef = [...keys.keys()].find(
      (ref) => !ref[0].eq(didDocument.id),
    );
    if (nonSelfRef) {
      throw new Error(
        `Can't have keys that don't reference \`${didDocument.id}\`, received: \`${nonSelfRef}\``,
      );
    }

    return await this.dockOnly.tx.newOnchain(id, keys.values(), controller);
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
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
    const newOnChainKeys = [...newMethods].filter(
      ([_, key]) => !key.isOffchain(),
    );
    const newOffchainKeys = [...newMethods].filter(([_, key]) => key.isOffchain());
    const removedOnChainKeys = [...removedMethods].filter(
      ([_, key]) => !key.isOffchain(),
    );
    const removedOffchainKeys = [...removedMethods].filter(([_, key]) => key.isOffchain());

    if (modified.size) {
      throw new Error("Can't have modified verificationMethods");
    } else if (
      nextDocument.attests
      && !nextDocument.attests.eq(currentDocument.attests)
    ) {
      throw new Error(
        '`attests` modifications are not supported in the `updateDocument` transaction. Use `attest` module to attach `attests` to the existing document.',
      );
    }

    if (
      [...newMethods.keys()].find(
        (method) => !method.did.eq(currentDocument.id),
      )
      || [...removedMethods.keys()].find(
        (method) => !method.did.eq(currentDocument.id),
      )
    ) {
      throw new Error("Can't change controller keys");
    }

    const hasControllerKey = [...currentDocument.didKeys().values()].some(
      (key) => key.verRels.isAuthentication(),
    );
    const selfControlled = currentDocument.controller.some((ctrl) => ctrl.eq(currentDocument.id));

    if (hasControllerKey && !selfControlled) {
      currentDocument.addController(currentDocument.id);
    } else if (!hasControllerKey && selfControlled) {
      currentDocument.removeController(currentDocument.id);
    }

    const { id: docId, '@context': context } = nextDocument;
    const did = DockDidOrDidMethodKey.from(docId);

    if (context.length !== 1 || context[0].value !== CONTEXT_URI) {
      throw new Error(
        `Context must be equal to \`${[
          CONTEXT_URI,
        ]}\`, received: \`${context}\``,
      );
    }

    const txs = await this.dockOnly.apiProvider.withDidNonce(
      signerDid,
      (nonce) => Promise.all(
        [
          newOnChainKeys.length
              && this.dockOnly.tx.addKeys(
                [...newOnChainKeys].map(([_, key]) => key),
                did,
                didKeypair,
                nonce.inc(),
              ),
          newControllers.length
              && this.dockOnly.tx.addControllers(
                newControllers,
                did,
                didKeypair,
                nonce.inc(),
              ),
          ...newOffchainKeys.map(([_, key]) => this.offchainSignatures.dockOnly.tx.addPublicKey(
            key.publicKey,
            did,
            didKeypair,
            nonce.inc(),
          )),
          ...[...newServices].map(({ id, type, serviceEndpoint }) => this.dockOnly.tx.addServiceEndpoint(
            id,
            type,
            serviceEndpoint,
            did,
            didKeypair,
            nonce.inc(),
          )),
          ...[...removedServices].map(({ id }) => this.dockOnly.tx.removeServiceEndpoint(
            id,
            didKeypair,
            nonce.inc(),
          )),
          ...removedOffchainKeys.map(([{ index }]) => this.offchainSignatures.dockOnly.tx.removePublicKey(
            index,
            did,
            didKeypair,
            nonce.inc(),
          )),
          removedControllers.length
              && this.dockOnly.tx.removeControllers(
                removedControllers,
                did,
                didKeypair,
                nonce.inc(),
              ),
          removedOnChainKeys.length
              && this.dockOnly.tx.removeKeys(
                [...removedOnChainKeys].map(([{ index }]) => index),
                did,
                didKeypair,
                nonce.inc(),
              ),
        ].filter(Boolean),
      ),
    );

    if (!txs.length) {
      throw new Error(`No changes for ${did}`);
    }

    return await this.dockOnly.apiProvider.batchAll(txs);
  }

  async removeDocumentTx(did, didKeypair) {
    return await this.dockOnly.tx.removeOnchainDid(did, didKeypair);
  }

  async getDocument(rawDid) {
    const did = DockDid.from(rawDid);

    const [keys, controllers, serviceEndpoints, attests, offchainKeys] = await Promise.all([
      this.dockOnly.keys(did.asDid),
      this.dockOnly.controllers(did.asDid),
      this.dockOnly.serviceEndpoints(did.asDid),
      this.attest.getAttests(did),
      this.offchainSignatures.dockOnly.getAllPublicKeysByDid(did),
    ]);

    const doc = DIDDocument.create(
      did,
      [],
      controllers,
      {},
      {
        context: [CONTEXT_URI],
        attests,
      },
    );

    for (const [ref, key] of keys) {
      doc.addKey(ref, key);
    }
    for (const [keyId, key] of offchainKeys) {
      doc.addKey([did, keyId], new DidKey(key));
    }
    for (const [id, endpoint] of serviceEndpoints) {
      doc.addServiceEndpoint(id, endpoint);
    }

    return doc;
  }
}
