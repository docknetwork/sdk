import { maybeFrom } from '../../utils';
import StatusListCredentialValue from './status-list-credential-value';
import { TypedEnum } from '../generic';

export class StatusListOrRevocationListCredential extends TypedEnum {}

export class StatusList2021Credential extends StatusListOrRevocationListCredential {
  static Class = StatusListCredentialValue;

  static Type = 'statusList2021Credential';

  constructor(value) {
    super(maybeFrom(StatusListCredentialValue, value));
  }

  /**
   * Fail if the given verifiable credential id isn't a valid `StatusList2021Credential` id.
   * @param {*} id
   */
  static verifyID(id) {
    return this.Class.verifyID(id);
  }

  /**
   * Creates new `StatusList2021Credential` with supplied `id` and option `statusPurpose` = `revocation` by default,
   * `length` and `revokeIndices`. Note that credential with `statusPurpose` = `revocation` can't unsuspend its indices.
   * To allow unrevoking indices in the future, use `statusPurpose` = `suspension`.
   * The proof will be generated immediately using supplied `keyDoc`.
   *
   * @param {KeyDoc} keyDoc
   * @param {string} id - on-chain hex identifier for the `StatusList2021Credential`.
   * @param {object} [params={}]
   * @param {'revocation'|'suspension'} [params.statusPurpose=revocation] - `statusPurpose` of the `StatusList2021Credential`.
   * Can be either `revocation` or `suspension`.
   * @param {number} [params.length=1e4] - length of the underlying `StatusList`.
   * @param {Iterable<number>} [params.revokeIndices=[]] - iterable producing indices to be revoked or suspended initially
   * @returns {Promise<StatusList2021Credential>}
   */
  static async create(
    keyDoc,
    id,
    { statusPurpose = 'revocation', length = 1e4, revokeIndices = [] } = {},
  ) {
    return new this(
      await this.Class.create(keyDoc, id, {
        statusPurpose,
        length,
        revokeIndices,
      }),
    );
  }

  /**
   * Revokes indices and unsuspends other indices in the underlying status list, regenerating the proof.
   * If `statusPurpose` = `revocation`, indices can't be unsuspended.
   * The status list revoked (suspended)/unsuspended indices will be set atomically and in case of an error,
   * the underlying value won't be modified.
   * Throws an error if the underlying status list can't be decoded or any of the supplied indices is out of range.
   *
   * @param {KeyDoc} keyDoc
   * @param {object} [update={}]
   * @param {Iterable<number>} update.revokeIndices - indices to be revoked or suspended
   * @param {Iterable<number>} update.unsuspendIndices - indices to be unsuspended
   * @returns {Promise<this>}
   */
  async update(keyDoc, { revokeIndices = [], unsuspendIndices = [] }) {
    await this.value.update(keyDoc, { revokeIndices, unsuspendIndices });

    return this;
  }

  /**
   * Returns a `Promise` resolving to the decoded `StatusList`.
   *
   * @returns {Promise<StatusList>}
   */
  async decodedStatusList() {
    return await this.value.decodedStatusList();
  }

  /**
   * Returns `true` if given index is revoked or suspended, `false` otherwise.
   * Throws an error if the underlying status list can't be decoded or supplied index is out of range.
   *
   * @param {number} index
   * @returns {Promise<boolean>}
   */
  async revoked(index) {
    return await this.value.revoked(index);
  }

  /**
   * Accepts an iterable of indices to be checked and returns an array containing `true` in the positions
   * of revoked (suspended) indices and `false` for non-revoked (non-suspended) indices.
   * Throws an error if the underlying status list can't be decoded or any of supplied indices is out of range.
   *
   * @param {Iterable<number>} indices
   * @returns {Promise<Array<boolean>>}
   */
  async revokedBatch(indices) {
    return await this.value.revokedBatch(indices);
  }

  /**
   * Validates underlying `StatusList2021Credential`.
   */
  validate() {
    this.value.validate();
  }
}

StatusListOrRevocationListCredential.bindVariants(StatusList2021Credential);

export * from './id';
