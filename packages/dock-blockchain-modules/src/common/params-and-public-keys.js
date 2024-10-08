import { createInternalDockModule } from './builders';

const didMethods = {
  addPublicKey(publicKey, targetDid, _, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.AddPublicKey(
      this.constructor.PublicKey.from(publicKey),
      targetDid,
      nonce,
    );
  },
  removePublicKey(keyId, targetDid, _, nonce) {
    const did = this.constructor.PublicKeyOwner.from(targetDid);

    return new this.constructor.PublicKeyAndParamsActions.RemovePublicKey(
      [did, keyId],
      did,
      nonce,
    );
  },
  addParams(params, _, __, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.AddParams(
      this.constructor.Params.from(params),
      nonce,
    );
  },
  removeParams(paramsId, did, __, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.RemoveParams(
      [did, paramsId],
      nonce,
    );
  },
};

export default createInternalDockModule(
  { didMethods },
  class ParamsAndPublicKeys {},
);
