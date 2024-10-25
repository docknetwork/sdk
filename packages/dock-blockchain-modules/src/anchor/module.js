/* eslint-disable camelcase */
import { AnchorHash, Anchor } from "@docknetwork/credential-sdk/types/anchor";
import { TypedNumber, option } from "@docknetwork/credential-sdk/types/generic";
import {
  NoAnchorError,
  AbstractAnchorModule,
} from "@docknetwork/credential-sdk/modules/abstract/anchor";
import { injectDock } from "../common";
import DockInternalAnchorModule from "./internal";

/** Class to create and query anchors from chain. */
export default class DockAnchorModule extends injectDock(AbstractAnchorModule) {
  static DockOnly = DockInternalAnchorModule;

  /**
   * Write anchor on chain
   * @param anchor
   * @returns {Promise<*>}
   */
  async deployTx(anchor) {
    return await this.dockOnly.tx.deploy(anchor);
  }

  /**
   * Query anchor from chain
   * @param anchor
   * @param {Boolean} preHashed - If the anchor has already been hashed.
   * @returns {Promise<*>} - The promise will either successfully resolve to the block number where anchor was created
   * or reject with an error.
   */
  async get(anchorKey, preHashed = false) {
    const key = preHashed ? AnchorHash.from(anchorKey) : Anchor.hash(anchorKey);

    const anchor = option(TypedNumber).from(
      await this.dockOnly.query.anchors(key)
    );

    if (anchor == null) {
      throw new NoAnchorError(key);
    }

    return anchor;
  }
}
