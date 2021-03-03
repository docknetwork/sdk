// @prefix dockalpha: <https://rdf.dock.io/alpha/2021#> .
// @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

// id: dockalpha:mayClaim
// type: rdf:Property
// domain: rdf:Resource
// range: dockalpha:ClaimFilter
//
// An entity that attests to a dockalpha:mayClaim statement grant the subject of that statement
// authority to make any claims statisfying the object of the statment on the entities behalf.
export const MAYCLAIM = 'https://rdf.dock.io/alpha/2021#mayClaim';

// id: dockalpha:ANYCLAIM
// type: dockalpha:ClaimFilter
//
// The "allow all" filter. dockalpha:ANYCLAIM accepts all triples.
// All triples satisfy dockalpha:ANYCLAIM.
export const ANYCLAIM = 'https://rdf.dock.io/alpha/2021#ANYCLAIM';

// id: dockalpha:ClaimFilter
// type: rdf:Class
//
// Filter over rdf claims.
export const CLAIM_FILTER = 'https://rdf.dock.io/alpha/2021#ClaimFilter';

// This ruleset defines dockalpha:MayClaim specifically only when used with dockalpha:ANYCLAIM.
//
// This is not a complete definition of dockalpha:MayClaim, but any complete definition of
// dockalpha:MayClaim will imply this ruleset.
//
// This ruleset is generic over graph name. The genericity of the rule allows it to prove composite
// claims where graph != the default graph, but at some potential reasoning cost. See
// MAYCLAIM_DEF_2 for a lighter-weight partial definition.
export const MAYCLAIM_DEF_1 = [
  {
    if_all: [
      [
        { Unbound: 'b' },
        { Bound: { Iri: MAYCLAIM } },
        { Bound: { Iri: ANYCLAIM } },
        { Unbound: 'a' },
      ],
      [
        { Unbound: 's' },
        { Unbound: 'p' },
        { Unbound: 'o' },
        { Unbound: 'b' },
      ],
    ],
    then: [
      [
        { Unbound: 's' },
        { Unbound: 'p' },
        { Unbound: 'o' },
        { Unbound: 'a' },
      ],
    ],
  },
];

// This ruleset defines dockalpha:MayClaim specifically only when used with dockalpha:ANYCLAIM.
//
// During reasoning this ruleset is more efficient than its predecessor in terms of space used.
// This rule generates fewer tuples becuse claims are only ever copied into the default graph.
// When using this rule tuples need not propagate from graph to graph all the way up the delegation
// chain. Rather, when it's determined that a specific issuer is authorized, claims will be copied
// directly from their named graph into the default graph.
//
// `MAYCLAIM_DEF_2` is more specific than `MAYCLAIM_DEF_1` as it binds the default graph.
//
// `MAYCLAIM_DEF_1` implies `MAYCLAIM_DEF_2`
// `MAYCLAIM_DEF_1 -> MAYCLAIM_DEF_2`
//
// The `MAYCLAIM_DEF_2` ruleset can be used to prove claims that are not expressed as explicit
// ethos. Only claims where graph == "Default Graph" can be proved using this ruleset.
//
// `[?s ?p ?o { DefaultGraph: true }]`
//
// If the claim you need to prove is in explicit ethos form,
//
// `[?s ?p ?o { Iri: 'did:example:somedid' }]`
//
// consider using `MAYCLAIM_DEF_1` instead.
export const MAYCLAIM_DEF_2 = [
  {
    if_all: [
      [
        { Unbound: 'b' },
        { Bound: { Iri: MAYCLAIM } },
        { Bound: { Iri: ANYCLAIM } },
        { Bound: { DefaultGraph: true } },
      ],
      [
        { Unbound: 's' },
        { Unbound: 'p' },
        { Unbound: 'o' },
        { Unbound: 'b' },
      ],
    ],
    then: [
      [
        { Unbound: 's' },
        { Unbound: 'p' },
        { Unbound: 'o' },
        { Bound: { DefaultGraph: true } },
      ],
    ],
  },
];

// This is how `dockalpha:mayClaim` is expected to relate to `dockalpha:attestsDocumentContents`.
// export const ATTESTS = 'https://rdf.dock.io/alpha/2021#attestsDocumentContents';
// export const ATTESTS_DEF_1 = [
//   {
//     if_all: [
//       [
//         { Unbound: 'a' },
//         { Bound: { Iri: ATTESTS } },
//         { Unbound: 'b' },
//         { Unbound: 'a' },
//       ],
//     ],
//     then: [
//       [
//         { Unbound: 'b' },
//         { Bound: { Iri: MAYCLAIM } },
//         { Bound: { Iri: ANYCLAIM } },
//         { Unbound: 'a' },
//       ],
//     ],
//   }
// ];

// # The following considerations, and more, are why these definitions (e.g. dockalpha:mayClaim) are marked as alpha.
//
// ## New semantics assigned to presence of triples in a named graph
//
// These rules assign semantic meaning to triples stored in named graph.
//
// If [?s ?p ?o ?g] then ?g attests to the triple [?s ?p ?o].
//
// This allows rules to be nice an terse, the above semantics may not be
// considered universally true by current users of rdf.
//
// ## Provenance Tracking
//
// Should we add indirection to track provenance of information with more detail? For example,
// instead of saying
//
// ```
// graph = did:example
// ```
//
// we would say
//
// ```
// graph = _:bxx
// did:example dereferenced to _:bxx at <date>
// ```
//
// In the context of rdf datasets provenance tracking in not a new idea.
//
// ## Meaning of dockalpha:attestsDocumentContents
//
// Recently I've been assumning dockalpha:attestsDocumentContents always points to a turtle
// document on ipfs, but what if a DID wants to attest to another did document? What if an
// dockalpha:attestsDocumentContents tricks a crawler into thinking a non-turtle document is
// actually a turtle document? Perhaps provenance tracking can solve this.
//
// - Can we prove that this interpretation of dockalpha:attestsDocumentContents is unsound.
// - Can we prove that this interpretation of dockalpha:attestsDocumentContents is sound.
