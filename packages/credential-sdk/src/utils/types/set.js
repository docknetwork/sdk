import { ensureSet } from './ensure-type';

/**
 * Ensures that there is no intersection between two sets
 * @param {Set} set1 - The first set to compare
 * @param {Set} set2 - The second set to compare
 * @throws {Error} - If there is an intersection between set1 and set2
 */
export const ensureNoIntersection = (set1, set2) => {
  const [min, max] = [set1, set2]
    .map(ensureSet)
    .sort((a, b) => a.size - b.size);

  for (const item of min) {
    if (max.has(item)) {
      throw new Error(`Item \`${item}\` exists in both sets`);
    }
  }
};
