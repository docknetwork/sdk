import { BBSPlusPublicKeyG2, initializeWasm } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import {
  CredentialSchema,
  PresentationBuilder,
  Credential,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import dock from './index';
import { ensureArray, isObject, isString } from './utils/type-helpers';

const DEFAULT_PARSING_OPTS = {
  useDefaults: true,
};

export default class BbsPlusPresentation {
  /**
   * Create a new BbsPlusPresentation instance.
   * @constructor
   */
  constructor() {
    this.presBuilder = new PresentationBuilder();
  }

  /**
   * Species attributes to be revealed in the credential
   * @param {number} credentialIndex
   * @param {Array.<string>} attributes
   */
  addAttributeToReveal(credentialIndex, attributes = []) {
    ensureArray(attributes);
    this.presBuilder.markAttributesRevealed(credentialIndex, new Set(attributes));
  }

  /**
   * Creates a presentation from the added credentials
   * @returns {object}
   */
  createPresentation() {
    const pres = this.presBuilder.finalize();
    return pres.toJSON();
  }

  /**
   * Gets issuer DID from credential, throws an exception if non is found
   * @param credential
   * @returns {string}
   */
  getCredentialIssuerDID(credential) {
    if (isString(credential.issuer) && credential.issuer.trim().startsWith('did:')) {
      return credential.issuer;
    }
    if (isObject(credential.issuer) && isString(credential.issuer.id) && credential.issuer.id.trim().startsWith('did:')) {
      return credential.issuer.id;
    }
    throw new Error('Unable to retrieve issuer DID');
  }

  /**
   * Add jsonld credentials to be presented.
   * @param j
   * @param revealAttributes
   * @returns {Promise<number>}
   */
  async addCredentialsToPresent(j, revealAttributes = []) {
    ensureArray(revealAttributes);
    await initializeWasm();
    const json = typeof j === 'string' ? JSON.parse(j) : j;

    const didDocument = await dock.did.getDocument(this.getCredentialIssuerDID(json));

    const pkRaw = b58.decode(didDocument.publicKey[1].publicKeyBase58);
    const pk = new BBSPlusPublicKeyG2(pkRaw);

    const { credentialSchema } = json;
    const credSchema = credentialSchema ? CredentialSchema.fromJSON(
      typeof credentialSchema === 'string'
        ? JSON.parse(credentialSchema)
        : credentialSchema,
    ) : new CredentialSchema({
      ...CredentialSchema.essential(),
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      },
    }, DEFAULT_PARSING_OPTS);

    const credential = Credential.fromJSON({
      credentialSchema: credSchema.toJSON(),
      ...json,
    });
    return this.presBuilder.addCredential(credential, pk);
  }
}
