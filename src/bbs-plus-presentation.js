import { BBSPlusPublicKeyG2, initializeWasm } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import {
  CredentialSchema,
  PresentationBuilder,
  Credential,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import { ensureArray } from './utils/type-helpers';

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
   * Add jsonld credentials to be presented.
   * @param credentialLD
   * @param revealAttributes
   * @param publicKey
   * @returns {Promise<number>}
   */
  async addCredentialsToPresent(credentialLD, revealAttributes = [], publicKey) {
    ensureArray(revealAttributes);
    await initializeWasm();
    const json = typeof credentialLD === 'string' ? JSON.parse(credentialLD) : credentialLD;

    const pkRaw = b58.decode(publicKey);
    const pk = new BBSPlusPublicKeyG2(pkRaw);

    const { credentialSchema } = json;
    const credSchema = credentialSchema ? CredentialSchema.fromJSON(
      typeof credentialSchema === 'string'
        ? JSON.parse(credentialSchema)
        : credentialSchema,
    ) : new CredentialSchema(CredentialSchema.essential(), DEFAULT_PARSING_OPTS);

    const credential = Credential.fromJSON({
      credentialSchema: credSchema.toJSON(),
      ...json,
    });
    return this.presBuilder.addCredential(credential, pk);
  }
}
