## Graphical Anchoring Utility

You can also anchor without touching any code. Visit [https://fe.dock.io/#/anchor/batch](https://fe.dock.io/#/anchor/batch) for creation of anchors and [https://fe.dock.io/#/anchor/check](https://fe.dock.io/#/anchor/check) for anchor verification.

### To Batch, or not to Batch

Batching (combining multiple anchors into one) can be used to save on transaction costs by anchoring multiple documents in a single transaction as a merkle tree root.

Batching does have a drawback. In order to verify a document that was anchored as part of the batch, you must provde the merkle proof that was generated when batching said file. Merkle proofs are expressed as `.proof.json` files and can be downloaded before posting the anchor. No merkle proof is required for batches containing only one document.

## Programatic Usage

The on-chain anchoring module allows to developers the flexibility talor anchors to their own use-case, but the sdk does provide a reference example for batching and anchoring documents.

The anchoring module is hashing algorithm and hash length agnostic. You can post a [multihash](https://github.com/multiformats/multihash), or even use the identity hash; the chain doesn't care.

One thing to note is that rather than storing your anchor directly, the anchoring module will store the blake2b256 hash of the anchor. This means as a developer you'll need to perform an additional hashing step when looking up anchors:

```
// pseudocode

function postAnchor(file) {
  anchor = myHash(file)
  deploy(anchor)
}

fuction checkAnchor(file) {
  anchor = myHash(file)
  anchorblake = blake2b256(anchor)
  return lookup(anchorblake)
}
```

See the `example/anchor.js` in the sdk repository for more info.
