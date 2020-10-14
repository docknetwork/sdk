# Claim Deduction

## Specifying Axioms

A Verifier has complete and low level control over the logical rules they deem valid. Rules may vary from use-case to use-case and from verifier to verifier.

Unwrapping of Explicit Ethos statements is expected to be a common first step when writing a ruleset. This tutorial will give some examples of that.

### Simple Unwrapping of Explicit Ethos

This ruleset names a specific issuer and states that any claims that issuer makes are true.

```js
const rules = [
  {
    if_all: [
      [
        { Bound: { Iri: 'did:example:issuer' } },
        { Bound: { Iri: 'https://www.dock.io/rdf2020#claimsV1' } },
        { Unbound: 'claim' },
      ],
      [
        { Unbound: 'claim' },
        { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject' } },
        { Unbound: 'subject' },
      ],
      [
        { Unbound: 'claim' },
        { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate' } },
        { Unbound: 'predicate' },
      ],
      [
        { Unbound: 'claim' },
        { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' } },
        { Unbound: 'object' },
      ],
    ],
    then: [
      [ { Unbound: 'subject' }, { Unbound: 'predicate' }, { Unbound: 'object' } ],
    ],
  }
];
```

That single rule is enough for some use-cases but it's not scalable. What if we want to allow more than one issuer? Instead of copying the same rule for each issuer we trust, let's define "trustworthiness":

### Unwrapping Explicit Ethos by Defining Trustworthiness

```js
const trustworthy =
  { Bound: { Iri: 'https://www.dock.io/rdf2020#Trustworthy' } };
const type =
  { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' } };
const claims =
  { Bound: { Iri: 'https://www.dock.io/rdf2020#claimsV1' } };
const subject =
  { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject' } };
const predicate =
  { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate' } };
const object =
  { Bound: { Iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' } };

const rules = [
  {
    if_all: [
      [
        { Unbound: 'issuer' },
        type,
        trustworthy,
      ],
      [
        { Unbound: 'issuer' },
        claims,
        { Unbound: 'claim' },
      ],
      [
        { Unbound: 'claim' },
        subject,
        { Unbound: 'subject' },
      ],
      [
        { Unbound: 'claim' },
        predicate,
        { Unbound: 'predicate' },
      ],
      [
        { Unbound: 'claim' },
        object,
        { Unbound: 'object' },
      ],
    ],
    then: [
      [ { Unbound: 'subject' }, { Unbound: 'predicate' }, { Unbound: 'object' } ],
    ],
  },
  {
    if_all: [],
    then: [
      [ { Bound: { Iri: 'did:example:issuer' } }, type, trustworthy ]
    ],
  }
];
```

You may ask "So what's the difference? There is still only one issuer."

By the primitive definition of "trustworthiness" written above, any claim made by a trustworthy issuer is true. did:example:issuer can claim whatever they want by issuing verifiable credentials. They can even claim that some other issuer is trustworthy. Together, the two rules defined in the above example implement a system analogous to TLS certificate chains with did:example:issuer as the single root authority.

## Proving Composite Claims

As a Holder of verifiable credentials, you'll want to prove specific claims to a Verifier. If those claims are composite, you'll need to provide a deductive proof in your verifiable credentials presentation. This should be done after the presentation has been assembled. If the presentation is going to be signed, sign it *after* including the deductive proof.

```js
import { proveCompositeClaims } from '@docknetwork/sdk/utils/cd';
import jsonld from 'jsonld';

// Check out the Issuance, Presentation, Verification tutorial for info on creating
// VCDM presentations.
const presentation = { ... };

// the claim we wish to prove
const compositeClaim = [
  { Iri: 'uuid:19e91192-210b-4b03-8e9c-8ded0a48d5bf' },
  { Iri: 'http://dbpedia.org/ontology/owner' },
  { Iri: 'did:example:bob' }
];

// SDK reasoning utilities take presentations in expanded form
// https://www.w3.org/TR/json-ld/#expanded-document-form
const expPres = await jsonld.expand(presentation);

let proof;
try {
  proof = await proveCompositeClaims(expPres, [compositeClaim], rules);
} catch (e) {
  console.error('couldn\'t prove bob is an owner');
  throw e;
}

// this is that standard property name of a Dock deductive proof in VCDM presentation
const logic = 'https://www.dock.io/rdf2020#logicV1';

presentation[logic] = proof;

// Now JSON.stringify(presentation) is ready to send to a verifier.
```

## Verifying Composite Claims

```js
import { acceptCompositeClaims } from '../src/utils/cd';
import jsonld from 'jsonld';
import deepEqual from 'deep-equal';

/// received from the presenter
const presentation = ...;

// Check out the Issuance, Presentation, Verification tutorial for info on verifying
// VCDM presentations.
let ver = await verify(presentation);
if (!ver.verified) {
  throw ver;
}

const expPres = await jsonld.expand(presentation);

// acceptCompositeClaims will verify and take into account any deductive proof provided
// via the logic property
const claims = await acceptCompositeClaims(expPres, rules);

if (claims.some(claim => deepEqual(claim, compositeClaim))) {
  console.log('the composite claim was shown to be true');
} else {
  console.error('veracity of the composite claim is unknown');
}
```

## Verifier-Side Reasoning

Some use-cases may require the verifier to perform inference in place of the presenter.

```js
import { proveCompositeClaims } from '../src/utils/cd';
import jsonld from 'jsonld';

/// received from the presenter
const presentation = ...;

// Check out the Issuance, Presentation, Verification tutorial for info on verifying
// VCDM presentations.
let ver = await verify(presentation);
if (!ver.verified) {
  throw ver;
}

const expPres = await jsonld.expand(presentation);

try {
  await proveCompositeClaims(expPres, [compositeClaim], rules);
  console.log('the composite claim was shown to be true');
} except (e) {
  console.error('veracity of the composite claim is unknown');
}
```

## We Need to Go Deeper

The SDK claim deduction module exposes lower level functionality for those who need it. `getImplications`, `proveh` and `validateh`, for example, operate on raw claimgraphs represented as adjacency lists. For even lower level access, check out our [inference engine](https://github.com/docknetwork/rify) which is written in Rust and exposed to javascript via wasm.
