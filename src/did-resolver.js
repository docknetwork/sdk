import { parse } from 'did-resolver';

export default class DIDResolver {
  constructor() {
    this.parseDid = parse;
  }

  async resolve() {
    throw new Error(`Resolving not implemented in base class, please extend. ${this.constructor.name}`);
  }
}
