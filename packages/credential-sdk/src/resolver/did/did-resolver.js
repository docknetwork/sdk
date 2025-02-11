import { AbstractDIDModule } from '../../modules/abstract/did';
import { ensureInstanceOf, parseDIDUrl } from '../../utils';
import { Resolver } from '../generic';

class DIDResolver extends Resolver {
  prefix = 'did';

  get method() {
    return this.didModule.methods();
  }

  /**
   * @param {AbstractDIDModule}
   * @constructor
   */
  constructor(didModule) {
    super();

    /**
     * @type {AbstractDIDModule}
     */
    this.didModule = ensureInstanceOf(didModule, AbstractDIDModule);
  }

  async resolve(didURL) {
    const { did } = parseDIDUrl(didURL);
    const document = await this.didModule.getDocument(did);

    return document.toJSON();
  }
}

/**
 * Resolves `DID`s with identifier `did:dock:*`.
 * @type {DIDResolver}
 */
export default DIDResolver;
