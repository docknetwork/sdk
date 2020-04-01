import {
  getSignatureFromKeyringPair
} from './misc';

class OneOfPolicy {
  constructor(controllers) {
    this.controllers = controllers;
  }

  toJSON() {
    return {
      OneOf: this.controllers
    };
  }
}

class Proof {
  constructor(map) {
    this.map = map || new Map();
  }

  set(key, value) {
    this.map.set(key, value);
  }

  toMap() {
    return this.map;
  }

  sign() {
    throw new Error('Sign method must be implemented in child class!');
  }
}

class KeyPairProof extends Proof {
  constructor(map) {
    super(map);
  }

  sign(message) {
    const signedProofs = new Map();
    this.map.forEach((pair, did) => {
      const sig = getSignatureFromKeyringPair(pair, message);
      signedProofs.set(did, sig.toJSON());
    });
    return signedProofs;
  }
}

export {
  OneOfPolicy,
  Proof,
  KeyPairProof,
};
