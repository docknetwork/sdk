import {
  getSignatureFromKeyringPair
} from './misc';

export class OneOfPolicy {
  constructor(controllers) {
    this.controllers = controllers;
  }

  toJSON() {
    return {
      OneOf: this.controllers
    };
  }
}

export class DidKeys {
  constructor(map) {
    this.map = map || new Map();
  }

  set(key, value) {
    this.map.set(key, value);
  }

  toMap() {
    return this.map;
  }

  getSignatures() {
    throw new Error('getSignatures method must be implemented in child class!');
  }
}

export class KeyringPairDidKeys extends DidKeys {
  constructor(map) {
    super(map);
  }

  getSignatures(message) {
    const signedProofs = new Map();
    this.map.forEach((pair, did) => {
      const sig = getSignatureFromKeyringPair(pair, message);
      signedProofs.set(did, sig.toJSON());
    });
    return signedProofs;
  }
}
