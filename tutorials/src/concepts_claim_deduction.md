# Claim Deduction

The [verifiable credentials data model](https://www.w3.org/TR/vc-data-model/) is based on a machine comprehensible language called [RDF](https://www.w3.org/TR/rdf-primer/). RDF represents arbitrary semantic knowlege as [graph](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics))s. Computers can perform automatic deductive reasoning over RDF, given assumptions (represnted as an RDF graph) and axioms (represented as logical rules), a computer can infer new conclusions and even prove them to other computers using deductive derivations (proofs).

So what does that have to do with verifiable credentials?

Every VCDM credential is an RDF claim graph. Computers can reason about them, deriving new conclusions that weren't explicitly stated by the issuer.

The dock javascript SDK exposes utilites for primitive deductive reasoning over verified credentials. The Verifier has a choice to perform deduction themself (expensive), or offload that responsibility to the Presenter of the credential[s] by accepting deductive proofs of composite claims.

In RDF, if graph A is true and graph B is true, then the [union](https://en.wikipedia.org/wiki/Union_(set_theory)) of those graphs, is also true `A∧B->A∪B` [^1]. Using this property we can combine multiple credentials and reason over their union.

### Terms

Composite Claims: Rdf triples which were infered, rather than stated explicitly in a credential.

Verifier: The party that accepts and checks credential[s].

Presenter: The party that sends credentail[s] to the verifier.

Issuer: The party that signed a credential.

VCDM: [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)

[^1]: with proper renaming of blank nodes
