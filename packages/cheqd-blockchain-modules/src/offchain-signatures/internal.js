import injectParams from "../common/inject-params";

export default class CheqdOffchainSignaturesInternalModule extends injectParams(
  class {}
) {
  static ParamsName = "OffchainParams";

  static ParamsType = "offchain-signature-params";
}
