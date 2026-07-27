---
"@docknetwork/ap2": minor
---

Re-export `parseSdJwtPresentation` from `@docknetwork/crypto-utils/vc` at
the package root, alongside the existing `computeSdHash` re-export.
`mandates.js` already depends on it internally to decode Open/Closed
mandate presentations; consumers doing the same (e.g. to inspect a
presentation's disclosed claims) previously had to add
`@docknetwork/crypto-utils` as a second direct dependency just for this
one function.
