import { toIterable } from '../types';

/**
 * Merges objects obtained from an iterable of promises sequentially. Each promise is expected to resolve to an object.
 * The properties are merged into an accumulated object, with later ones overwriting earlier duplicates if keys conflict.
 *
 * @template T
 * @param {Iterable<Promise<Object<string, T>>>} objectPromises - An iterable of promises where each promise resolves to an object.
 * @returns {Promise<Object<string, T>>} The accumulated merged object containing properties from all resolved objects. If duplicate keys exist,
 *                    later values overwrite earlier ones.
 * @throws {Error} If any promise does not resolve to an object or rejects, this function will throw an error.
 */
export const mergeAwait = async (objectPromises) => {
  const res = {};

  for await (const obj of toIterable(objectPromises)) {
    Object.assign(res, obj);
  }

  return res;
};
