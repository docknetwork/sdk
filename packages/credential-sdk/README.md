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

- **TypedBytes**: Represents binary data as `Uint8Array`. It provides methods for conversion between base58, base64, and hexadecimal formats, facilitating seamless handling of raw bytes across different encodings.

- **TypedString**: Represents string data. Internally managed as a UTF-8 encoded byte array to handle string manipulation efficiently. Provides methods for serialization, encoding conversions (base58, base64), and equality checks.

- **TypedNumber**: Ensures reliable numerical handling by enforcing strict type checks during instantiation. It supports conversion from different input formats, including strings, and provides consistent JSON integration.

- **TypedEnum**: Facilitates the representation of enumeration types with extensible variants. This class ensures strict type conformity when dealing with multiple possible representations of a single conceptual state, making it ideal for state management in applications.

- **TypedArray**: Provides an abstraction over JavaScript arrays, allowing uniform handling of a single item type. It includes methods for array operations like `push`, `unshift`, and equality checks, ensuring that type integrity is maintained throughout all operations.

- **TypedMap**: Extends the native `Map` structure to provide consistent key/value type management and conversion capabilities. This class supports serialization to JSON and deserialization from API responses, making it suitable for handling complex data structures in networked applications.

- **TypedSet**: Extends the native `Set` structure to provide consistent unique values management and conversion capabilities. This class supports serialization to JSON and deserialization from API responses, making it suitable for handling complex data structures in networked applications.

- **TypedUUID**: Tailored specifically for handling UUIDs, this class includes validation checks, parsing methods, and generation of random UUIDs. It ensures that any UUID operations within the application are robust and compliant with UUID standards.

- **TypedStruct**: Represents structured, dictionary-like data with predefined keys and types. This class facilitates robust data manipulation by enforcing type constraints on each key and provides seamless JSON integration for serialization/deserialization.

- **TypedTuple**: Enforces a fixed-size collection of elements, where each element has a specified type. This is essential for maintaining order and type checks in tuple-based data structures, ensuring that the data remains consistent across different parts of an application.

- **TypedNull**: Placeholder type that can be used when an empty value is expected.

### Utility Mixins

- **anyOf**: Creates a type that can be constructed from any of the provided types by attempting them in sequence until one succeeds or all fail, ensuring flexible and ordered type construction.

- **option**: Extends a class to handle optional values by allowing `null` instead of throwing errors when encountering `null` or `None`, enabling graceful handling of missing data.

- **sized**: Enforces that instances of a class maintain a specific size, as defined by the `Size` property, ensuring consistent and valid data structures through size validation checks during construction and method calls.

- **withBase**: A foundational mixin that adds basic methods like `from`, `toJSON`, and equality checks to a class.

- **withCatchNull**: Ensures that `from` and `to` methods gracefully handle `null` or undefined values, safeguarding against unexpected errors.

- **withEq**: Provides enhanced equality checking, allowing deep comparison among complex objects.

- **withFrom**: Facilitates custom instantiation logic for classes, particularly useful when dealing with various input forms that require specialized initialization.

- **option**: Allows to pass `null` to `from` method returning `null` in this case.

- **withNullIfNotAVariant**: A class decorator for types extending `TypedEnum`. It ensures that instantiation from JSON or API data returns `null` if the provided value doesn't match any defined variant type. This mixin helps enforce strict type conformity.

- **withProp**: Extends classes derived from `TypedStruct` or `TypedEnum` by adding or overriding properties. It facilitates dynamic property management, allowing for seamless integration of new fields or modifications without altering base classes.

- **withProps**: Extends classes derived from `TypedStruct` or `TypedEnum` by adding or overriding properties. It facilitates dynamic property management, allowing for seamless integration of new fields or modifications without altering base classes.

- **withQualifier**: Adds functionality for dealing with qualified strings, such as those used in decentralized identifiers (DIDs). This mixin supports operations involving strings with specific prefixes or encoding requirements.

- **withoutProp**: Complements `withProp` by removing properties from classes that extend `TypedStruct` or `TypedEnum`. It is useful for deprecating or cleaning up obsolete properties.

## License

This SDK is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.

For any questions or issues, please refer to our [GitHub repository](https://github.com/docknetwork/credential-sdk).
