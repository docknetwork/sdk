# @docknetwork/credential-sdk

An API-agnostic Javascript library for working with Verifiable Credentials, DIDs, Claim Deduction and more.

## Features

- **Flexible Credential Issuance**: Issue verifiable credentials with customizable and embeddable JSON schema validators.

- **DID Management**: Manage DIDs with support for various key types and update operations, including adding/removing keys, controllers, and service endpoints.

- **Credential Verification**: Verify credentials using predefined or custom DID resolvers.

- **Extensible DID Resolvers**: Support for universal, key, and network-specific DID resolvers, including Ethereum and Dock.

- **Blockchain Interaction**: Seamlessly interact with the Dock blockchain for DID and credential management.

## Installation

You can install the `@docknetwork/credential-sdk` via npm:

```bash
npm install @docknetwork/credential-sdk
```

Or via yarn:

```bash
yarn add @docknetwork/credential-sdk
```

## Documentation

Detailed documentation and API reference are provided at the [Dock Network Documentation](https://docs.dock.io) website. Please refer to this comprehensive resource for a deeper understanding of each module, its methods, and additional example codes.

## Contribution

Contributions to the @docknetwork/credential-sdk are welcome. Please feel free to open issues or submit pull requests to improve the SDK or add new features.

## Types Overview

The Credential SDK provides a flexible and extensible set of typed structures that facilitate working with complex data types. These types are designed to provide enhanced type safety, ensure consistent data handling, and simplify JSON and API integration. This includes support for versatile data representations such as Enums, Tuples, Strings, and Arrays, all of which come with utility methods for manipulation and comparison.

### Available Types

- **TypedString**: Represents string data. Internally managed as `Array` to handle binary data conversion seamlessly. Provides various methods for equality check and conversion between hexadecimal and string representations.

- **TypedNumber**: Ensures reliable number handling by enforcing numerical checks during instantiation. Supports conversion from different inputs and API structures, offering consistent JSON integration.

- **TypedEnum**: Facilitates the representation of enumeration types with extensible variants. Ensures strict type conformity when dealing with potential multiple representations of a single conceptual state.

- **TypedArray**: Provides abstraction over JavaScript arrays, allowing for uniform handling of a single item type. Equipped with methods that maintain type integrity while offering array operations like `push`, `unshift`, and `equality check`.

- **TypedMap**: Extends the Map structure, offering consistent key/value type management and conversion capabilities. Includes support for serialization to JSON and deserialization from API responses.

- **TypedUUID**: Specially tailored for handling UUIDs, including validation, parsing, and generation of random UUIDs.

- **TypedStruct**: Represents structured, dictionary-like data with predefined keys and types, facilitating robust data manipulation and JSON compatibility.

- **TypedTuple**: Enforces a fixed-size collection of elements, each having a specified type. Essential for maintaining order and type checks in tuple-based data structures.

- **Any**: Acts as a catch-all, capable of holding any value or object. It is useful in scenarios where type flexibility is essential, such as interfacing with dynamic data sources or when type restrictions are not suitable.

- **Null**: Acts as a `null` allowing to have some field initialized to `null`.

### Utility Mixins

- **withBase**: A foundational mixin that adds basic methods like `from`, `toJSON`, and equality checks to a class.

- **withCatchNull**: Ensures that `from` and `to` methods gracefully handle `null` or undefined values, safeguarding against unexpected errors.

- **withEq**: Provides enhanced equality checking, allowing deep comparison among complex objects.

- **withFrom**: Facilitates custom instantiation logic for classes, particularly useful when dealing with various input forms that require specialized initialization.

- **withQualifier**: Extends classes to handle prefixed string identifiers and encoding, suitable for scenarios involving qualified identifiers (e.g., DID systems).

- **option**: Allows to pass `null` to `from` method returning `null` in this case.

- **withNullIfNotAVariant**: A class decorator for types extending `TypedEnum`. It ensures that instantiation from JSON or API data returns `null` if the provided value doesn't match any defined variant type. This mixin helps enforce strict type conformity.

- **withProp**: Extends classes derived from `TypedStruct` or `TypedEnum` by adding or overriding properties. It facilitates dynamic property management, allowing for seamless integration of new fields or modifications without altering base classes.

- **withQualifier**: Adds functionality for dealing with qualified strings, such as those used in decentralized identifiers (DIDs). This mixin supports operations involving strings with specific prefixes or encoding requirements.

- **withoutProp**: Complements `withProp` by removing properties from classes that extend `TypedStruct` or `TypedEnum`. It is useful for deprecating or cleaning up obsolete properties.

## License

This SDK is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.

For any questions or issues, please refer to our [GitHub repository](https://github.com/docknetwork/credential-sdk).
