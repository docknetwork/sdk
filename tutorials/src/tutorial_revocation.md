# Revocation

## Overview
Credential revocation is managed with on-chain revocation registries. To revoke a credential, its id (or hash of its id) must be
added to the credential. It is advised to have one revocation registry per credential type. Each registry has a unique id and
an associated policy. The policy determines who can update the revocation registry. The registry also has an "add-only" flag specifying
whether an id once added to the registry can be removed (leading to undoing the revocation) or not.
Similar to the replay protection mechanism for DIDs, for each registry, the last modified block number is kept which is updated
each time a credential is revoked or unrevoked.
For now, only one policy is supported which is that each registry is owned by a single DID. Also, neither the policy
nor the "add-only" flag can be updated post the creation of the registry for now.

## Registry creation
To create a registry, first a `Policy` object needs to be created for which a DID is needed. It is advised that the DID
is registered on chain first (else someone can look at the registry a register the DID, thus controlling the registry).
```js
import {OneOfPolicy} from '@docknetwork/sdk/utils/revocation';
const policy = new OneOfPolicy();
policy.addOwner(ownerDID);

// Or in a single step
const policy = new OneOfPolicy([ownerDID]);
```

Now create a random registry id. The registry id supposed to be unique among all registries on chain.
```js
import {createRandomRegistryId} from '@docknetwork/sdk/utils/revocation';
const registryId = createRandomRegistryId();
```

Now send the transaction to create a registry on-chain using `dock.revocation.newRegistry`. This method accepts the registry id,
the policy object and a boolean that specifies whether the registry is add-only or not meaning that whether undoing revocations
is allowed or not. Ifs `true`, it makes the registry add-only meaning that undoing revocations is not allowed, if `false`,
undoing is allowed.
```js
// Setting the last argument to false to allow unrevoking the credential (undoing revocation)
await dock.revocation.newRegistry(registryId, policy, false);
```

## Revoking a credential
Revoking a credential requires a signature from the owner of the registry.
Now get the registry id, `registryId` and the revocation id (the hash of credential id), `revokeId` and send the transaction on chain.
Revoking an already revoked credential has no effect.

```js
await dock.revocation.revokeCredentialWithOneOfPolicy(didKeys, registryId, revokeId);
```
Revoking multiple ids in a single transaction is possible but with a lower level method `dock.revocation.revoke`.

## Undoing a revocation
Similar to revocation, undoing the revocation also requires a signature from the owner of the registry. As before, fetch
the owner's DID and pair and create a map
```js
const didKeys = new KeyringPairDidKeys();
didKeys.set(ownerDID, ownerKeypair);
```

Now get the registry id, `registryId` and the revocation id to undo, `revokeId` and send the transaction on chain.
Unrevoking an unrevoked credential has no effect.

```js
await dock.revocation.unrevokeCredentialWithOneOfPolicy(didKeys, registryId, revokeId);
```
Undoing revocation for multiple ids in a single transaction is possible but with a lower level method `dock.revocation.unrevoke`.

## Checking the revocation status
To check an id is revoked or not, call `dock.revocation.getIsRevoked` with the registry id and revocation id. Returns `true`
if revoked else `false`.
```js
const isRevoked = await dock.revocation.getIsRevoked(registryId, revokeId);
```

## Fetching the registry details
To get the details of the registry like policy, add-only status and block number when it was last updated, use `dock.revocation.getRegistryDetail`

## Removing the registry
A registry can be deleted leading to all the corresponding revocation ids being deleted as well. This requires the signature
from owner like other updates. Use the `dock.revocation.removeRegistry` method to remove a registry.
```js
const lastModified = await dock.revocation.getBlockNoForLastChangeToRegistry(registryId);
await dock.revocation.removeRegistry(registryId, lastModified, didKeys);
```
