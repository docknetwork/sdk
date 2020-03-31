class RevokeRegistry {
  constructor(policy, addOnly = false) {
    this.policy = policy;
    this.addOnly = addOnly;
  }

  toJSON() {
    return {
      policy: this.policy.toJSON(),
      add_only: this.addOnly,
    };
  }
}

class RevokePolicy {
  constructor(controllers) {
    this.controllers = controllers;
  }

  toJSON() {
    return {
      OneOf: this.controllers
    };
  }
}

export {
  RevokeRegistry,
  RevokePolicy,
};
