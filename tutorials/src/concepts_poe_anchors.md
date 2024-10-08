The Dock Blockchain includes a module explicitly intended for proof of existence. Aside from being explicitly supported by the on-chain runtime, it works the same way you would expect. You post the hash of a document on-chain at a specific block. Later you can use that hash to prove the document existed at or before that block.

The PoE module accepts arbitrary bytes as an anchor but in order to keep anchor size constant the chain stores only the blake2b256 hash of those bytes.

Developers are free to use the anchoring module however they want, taloring their software to their own use case. An anchoring example can be found in the sdk examples directory. Dock provides a [fully functioning reference client](https://fe.dock.io/#/anchor/batch) for anchoring. The client even implements batching anchors into a merkle tree so you can anchor multiple documents in a single transaction.
