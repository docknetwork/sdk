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

export {
  OneOfPolicy,
};
