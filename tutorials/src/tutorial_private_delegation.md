# Private Delegation

This tutorial follows the lifecycle of a delegated credential. It builds builds on previous turorials [Issuance, Presentation, Verification](./tutorial_ipv.md) and [Claim Deduction](./tutorial_claim_deduction.md).

## Create a Delegation

Let's assume some root authority, `did:ex:a`, wants grant `did:ex:b` full authority to make claims on behalf of `did:ex:a`. To do this `did:ex:a` will issue a delegation credential to `did:ex:b`.

<details>
<summary>Boilerplate</summary>

```js
const { v4: uuidv4 } = require('uuid');

function uuid() {
  return `uuid:${uuidv4()}`;
}

// Check out the Issuance, Presentation, Verification tutorial for info on signing
// credentials.
function signCredential(cred, issuer_secret) { ... }

// Check out the Issuance, Presentation, Verification tutorial for info on verifying
// VCDM presentations.
async function verifyPresentation(presentation) { ... }
```

</details>

```js
const delegation = {
  '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
  id: uuid(),
  type: [ 'VerifiableCredential' ],
  issuer: 'did:ex:a',
  credentialSubject: {
    id: 'did:ex:b',
    'https://rdf.dock.io/alpha/2021#mayClaim':
      'https://rdf.dock.io/alpha/2021#ANYCLAIM'
  },
  issuanceDate: new Date().toISOString(),
};
const signed_delegation = signCredential(delegation, dida_secret);
```

Next `did:ex:a` sends the signed credential to `did:ex:b`.

## Issue a Credential as a Delegate

`did:ex:b` accepts the delegation credential from `did:ex:a`. Now `did:ex:b` can use the delegation to make arbitrary attestations on behalf of `did:ex:a`.

```js
const newcred = {
  '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
  id: uuid(),
  type: [ 'VerifiableCredential' ],
  issuer: 'did:ex:b',
  credentialSubject: {
    id: 'did:ex:c',
    'https://example.com/score': 100,
  },
  issuanceDate: new Date().toISOString(),
};
const signed_newcred = signCredential(newcred, didb_secret);
```

So far we have two credentials, `signed_delegation` and `signed_newcred`. `signed_delegation` proves that any claim made by `did:ex:b` is effectively a claim made by `did:ex:a`. `signed_newcred` proves tha `did:ex:b` claims that `did:ex:c` has a score of 100. By applying one of the logical rules provided by the sdk, we can infer that `did:ex:a` claims `did:ex:c` has a score of 100. The logical rule named `MAYCLAIM_DEF_1` will work for this use-case. `MAYCLAIM_DEF_1` will be used by the verifier.

Now `did:ex:b` has both signed credentials. `did:ex:b` may now pass both credentials to the *holder*. In this case the holder is `did:ex:c`. `did:ex:c` also happens to be the *subject* of one of the credentials.

## Present a Delegated Credential

`did:ex:c` now holds two credentials, `signed_delegation` and `signed_newcred`. Together they prove that `did:ex:a` indirectly claims `did:ex:c` to have a score of 100. `did:ex:c` wants to prove this statement to another party, a *verifier*. `did:ex:c` must bundle the two credentials into a VCDM *presentation*.

```js
let presentation = {
  '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
  type: [ 'VerifiablePresentation' ],
  id: uuid(),
  holder: `did:ex:c`,
  verifiableCredential: [ signed_delegation, signed_newcred ],
};
```

`presentation` is sent to the verifier.

## Accept a Delegated Credential

The verifier receives `presentation`, *verifies the enclosed credentials*, then reasons over the union of all the credentials in the bundle using the rule `MAYCLAIM_DEF_1`. The process is the one outlined in [Verifier-Side Reasoning](./tutorial_claim_deduction.md#verifier-side-reasoning) but using a different composite claim and a different rule list.

```js
import { MAYCLAIM_DEF_1 } from '../src/rdf-defs';
import { proveCompositeClaims } from '../src/utils/cd';
import jsonld from 'jsonld';

const compositeClaim = [
  { Iri: 'did:ex:c' },
  { Iri: 'https://example.com/score' },
  { Literal: { datatype: 'http://www.w3.org/2001/XMLSchema#integer', value: '100' } }
  { Iri: 'did:ex:a' },
];

let ver = await verifyPresentation(presentation);
if (!ver.verified) {
  throw ver;
}

const expPres = await jsonld.expand(presentation);

try {
  await proveCompositeClaims(expPres, [compositeClaim], MAYCLAIM_DEF_1);
  console.log('the composite claim was shown to be true');
} except (e) {
  console.error('veracity of the composite claim is unknown');
}
```
