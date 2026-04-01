# Revocation

This guide provides instructions for managing credential revocation using `StatusList2021Credential`.

## Prerequisites

- Ensure you have access to Truvera's Credential SDK and Blockchain API.
- The Truvera API is initialized and connected to the blockchain.
- You have a valid issuer DID registered on the Dock network.

## Steps to Manage Revocation

### Create a Status List Credential

1. **Generate a Random Status List ID:**
   Create a unique identifier for tracking revocation status.

   ```javascript
   import { DockStatusListCredentialId } from "@docknetwork/credential-sdk/types";

   const statusListCredentialId = DockStatusListCredentialId.random();
   ```

2. **Create Status List Credential:**
   Use the issuer's key to create a new status list credential with a specified purpose (e.g., "suspension").

   ```javascript
   import { StatusList2021Credential } from '@docknetwork/credential-sdk/types';

   const issuerKey = /* Obtain issuer key document */;
   const statusListCred = await StatusList2021Credential.create(
     issuerKey,
     statusListCredentialId,
     { statusPurpose: "suspension" },
   );

   await modules.statusListCredential.createStatusListCredential(
     statusListCredentialId,
     statusListCred,
     issuerDID,
     issuerKeyPair,
   );
   ```

### Issue a Credential with Revocation Data

1. **Add Revocation Entry:**
   Include a status list entry in the credential for potential revocation.

   ```javascript
   import { addStatusList21EntryToCredential } from '@docknetwork/credential-sdk/vc';

   let unsignedCred = /* Obtain unsigned credential */;
   unsignedCred = addStatusList21EntryToCredential(
     unsignedCred,
     statusListCredentialId,
     statusListCredentialIndex, // Unique index for the credential
     "suspension", // Purpose matching the status list credential
   );
   ```

2. **Issue Credential:**
   Sign and issue the credential with the added status list entry.

   ```javascript
   import { addStatusList21EntryToCredential } from "@docknetwork/credential-sdk/vc";

   const credential = await issueCredential(
     issuerKey,
     unsignedCred,
     void 0,
     defaultDocumentLoader(resolver)
   );
   ```

### Revoke the Credential

1. **Fetch and Update Status List:**
   Retrieve the existing status list credential and update it to revoke the issued credential by its index.

   ```javascript
   const fetchedCred =
     await modules.statusListCredential.getStatusListCredential(
       statusListCredentialId
     );
   await fetchedCred.update(issuerKey, {
     revokeIndices: [statusListCredentialIndex], // Index of the credential to revoke
   });

   await modules.statusListCredential.updateStatusListCredential(
     statusListCredentialId,
     fetchedCred,
     issuerDID,
     issuerKeyPair
   );
   ```

### Verify the Revoked Credential

1. **Verify Credential Status:**
   Check the validity of the credential post-revocation. Verification should indicate the credential is no longer valid.

   ```javascript
   const result = await verifyCredential(credential, {
     resolver,
     compactProof: true,
   });
   if (!result.verified) {
     console.error("Credential is revoked or suspended.");
   }
   ```
