/**
 * Anchor wasn't found on chain
 */
export class NoAnchorError extends Error {
  constructor(anchor) {
    super(`Anchor (${anchor}) does not exist`);
    this.name = 'NoAnchorError';
    this.anchor = anchor;
  }
}
