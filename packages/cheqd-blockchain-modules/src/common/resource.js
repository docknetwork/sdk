import { maybeToJSONString } from '@docknetwork/credential-sdk/utils';

/**
 * Stores sorted versions of a single resource.
 * In case there's a version with no `previousVersionId`, it will be used as the initial.
 * Otherwise, the version whose `previousVersionId` points to the non-existing node, will be used.
 */
export class SortedResourceVersions {
  constructor(items) {
    const { resourceId, resourceNextVersionId } = this.constructor;

    let map;
    if (items instanceof Map) {
      map = items;
    } else {
      map = new Map([...items].map((item) => [resourceId(item), item]));
    }
    if (!map.size) {
      this.items = [];

      return;
    }

    // Find starting point
    let currentItem = this.constructor.findStartingPoint(map);
    if (!currentItem) {
      throw new Error(
        `No starting point found for ${maybeToJSONString([
          ...items,
        ])} (missing item without \`previousVersionId\`)`,
      );
    }

    // Validate items and create sorted sequence
    const sortedItems = [];
    const visited = new Set();

    while (currentItem) {
      if (visited.has(resourceId(currentItem))) {
        throw new Error('Cycle detected in the version sequence');
      }

      visited.add(resourceId(currentItem));
      sortedItems.push(currentItem);

      currentItem = map.get(resourceNextVersionId(currentItem)) ?? null;
    }

    if (visited.size !== map.size) {
      throw new Error('Disconnected sequence detected');
    }

    this.items = sortedItems;
  }

  static findStartingPoint(map) {
    const { resourcePreviousVersionId, resourceId } = this;

    let firstItem = null;
    for (const item of map.values()) {
      // Find the starting point
      if (
        !resourcePreviousVersionId(item)
        || !map.has(resourcePreviousVersionId(item))
      ) {
        if (firstItem == null) {
          firstItem = item;
        } else if (
          !resourcePreviousVersionId(firstItem)
          && !resourcePreviousVersionId(item)
        ) {
          throw new Error(
            `Two items with nullish \`previousVersionId\` found: ${resourceId(
              firstItem,
            )} and ${resourceId(item)}`,
          );
        } else if (
          resourcePreviousVersionId(firstItem)
          && resourcePreviousVersionId(item)
        ) {
          throw new Error(
            `Missing previous items for both: ${resourceId(
              firstItem,
            )} and ${resourceId(item)}`,
          );
        } else {
          throw new Error(
            `Can't have both element with no \`previousVersionId\` and no previous version for the element with \`previousVersionId\`: ${resourceId(
              firstItem,
            )} and ${resourceId(item)}`,
          );
        }
      }
    }

    return firstItem;
  }

  ids() {
    return this.items.map(this.constructor.resourceId);
  }

  toMap() {
    return new Map(
      this.items.map((item) => [this.constructor.resourceId(item), item]),
    );
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  static resourceId(resource) {
    return resource.metadata?.id ?? resource.id;
  }

  static resourcePreviousVersionId(resource) {
    return resource.metadata?.previousVersionId ?? resource.previousVersionId;
  }

  static resourceNextVersionId(resource) {
    return resource.metadata?.nextVersionId ?? resource.nextVersionId;
  }
}

export class NoResourceError extends Error {
  constructor() {
    super('Resource not found');
  }
}

/**
 * Validates provided resource against required name and type.
 * Returns `resource.resource.data` on successful validation, throws an error otherwise.
 *
 * @param {*} resource
 * @param {string} name
 * @param {string} type
 * @returns
 */
export const validateResource = (resource, name, type) => {
  if (resource == null) {
    throw new NoResourceError();
  } else if (resource.metadata.resourceType !== type) {
    throw new Error(
      `Invalid resource type for resource \`${resource.metadata.id}\`: \`${resource.metadata.resourceType}\`, expected \`${type}\``,
    );
  } else if (resource.metadata.name !== name) {
    throw new Error(
      `Invalid name for resource \`${resource.id}\`: \`${resource.metadata.name}\`, expected \`${name}\``,
    );
  }

  return resource.resource.data;
};
