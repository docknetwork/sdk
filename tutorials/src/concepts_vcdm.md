# Verifiable Credentials
Credentials are a part of our daily lives: driver's licenses are used to assert that we are capable of operating a motor vehicle, university degrees can be used to assert our level of education, and government-issued passports enable us to travel between countries. These credentials provide benefits to us when used in the physical world, but their use on the Web continues to be elusive.

Currently it is difficult to express education qualifications, healthcare data, financial account details, and other sorts of third-party verified machine-readable personal information on the Web. The difficulty of expressing digital credentials on the Web makes it challenging to receive the same benefits through the Web that physical credentials provide us in the physical world.

The [Verifiable Credentials Data Model 1.0 (VCDM)](https://www.w3.org/TR/vc-data-model/) specification provides a standard way to express credentials on the Web in a way that is cryptographically secure, privacy respecting, and machine-verifiable.

## Participants and workflow
- Credentials are issued by an entity called the **issuer**.
- **Issuer** issues the credential about a **subject** by signing the credential with his key. If the credential is revocable,
the issuer must specify how and from where revocation status must be checked. It is not necessary that revocation is managed by
the issuer, the issuer might designate a different authority for revocation.
- **Issuer** gives the credential to the **holder**. The **holder** might be the same as the **subject**.
- A service provider or anyone willing to check if the **holder** possesses certain credentials requests a **presentation** about those
credentials. This entity requesting the **presentation** is called the **verifier**. To protect against replay attacks, (a
verifier receiving the presentation and replaying the same presentation at some other verifier), a verifier must supply a
challenge that must be embedded in the presentation.
- **Holder** creates a **presentation** for the required credentials. The **presentation** must indicate which
credentials it is about and must be signed by the **holder** of the credentials.
- **Verifier** on receiving the presentation verifies the validity of each credential in the **presentation**. This includes
checking correctness of the data model of the credential, the authenticity by verifying the issuer's signature and revocation
status if the credential is revocable. It then checks whether the presentation contains the signature from the
**holder** on the presentation which also includes his given challenge.

## Issuing
To issue a verifiable credential, the issuer needs to have a public key that is accessible by the holder and verifier to verify the
signature (in `proof`) in the credential. Though the VCDM spec does not mandate it, an issuer in Dock must have a DID on chain.
This DID is present in the credential in the `issuer` field.

## Revocation
If the credential is revocable, the issuer must specify how the revocation check must be done in the `credentialStatus` field.
On Dock, credential revocation is managed with a revocation registry. There can be multiple registries on chain and each
registry has a unique id. It is advised that the revocation authority creates a new registry for each credential type.
While issuing the credential, issuer embeds the revocation registry's id in the credential in the `credentialStatus` field.
To revoke a credential, the revocation authority (might be same as the issuer), puts a hash of the credential id in the revocation registry.
To check the revocation status of a credential, hash the credential id and query the registry id specified in the credential.

The revocation of a credential can be undone if the revocation registry supports undoing. Moreover, currently, each registry is
controlled by a single DID so that DID can revoke a credential or undo the revocation. In future, Dock will support controlling
the registry with mulitple DIDs and in different fashions, like any one of the controller DIDs could revoke or a threshold is needed,
etc. To learn more about revocation registries, refer the corresponding section of the documentation.

## Presentation
The holder while creating the presentation signs it with his private key. For the verifier to verify this signature, he
must know the holder's public key. One way to achieve this is to make the holder have a DID too so that the verifier can look
up the DID on chain and learn the public key.
