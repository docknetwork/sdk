import { parse } from 'did-resolver';

export default class DIDResolver {
  parseDid(did) {
    return parse(did);
  }

  async resolve() {
    throw new Error(`Resolving not implemented in base class, please extend. ${this.constructor.name}`);
  }
}
