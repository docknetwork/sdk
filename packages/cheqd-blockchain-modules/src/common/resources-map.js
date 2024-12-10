export default class ResourcesMap extends Map {
  static fromItems(items) {
    return new this([...items].map((item) => [item.id, item]));
  }

  [Symbol.iterator]() {
    return this.iterBy((item) => [item.id, item]);
  }

  keys() {
    return this.iterBy((item) => item.id);
  }

  values() {
    return this.iterBy((item) => item);
  }

  iterBy(makeValue) {
    if (!this.size) {
      return {
        next: () => ({ done: true, value: undefined }),
      }; // Empty iterator for an empty map
    }

    // Find the first item in the sequence (it has no prevVersionId)
    let firstItem = null;
    for (const item of super.values()) {
      if (!item.prevVersionId) {
        firstItem = item;
        break;
      }
    }

    if (!firstItem) {
      throw new Error(
        "No starting point found (missing item without `prevVersionId`)"
      );
    }

    let currentItem = firstItem;

    return {
      next() {
        if (!currentItem) {
          return { done: true, value: undefined };
        }
        const value = makeValue(currentItem);
        currentItem = this.get(currentItem.nextVersionId) ?? null;

        return { done: false, value };
      },
    };
  }
}
