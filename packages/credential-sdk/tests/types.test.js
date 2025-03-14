import {
  TypedArray,
  TypedBytes,
  TypedEnum,
  TypedMap,
  TypedNumber,
  TypedSet,
  TypedString,
  TypedStruct,
  TypedTuple,
  TypedUUID,
  option,
  sized,
} from "../src/types/generic";

describe("TypedString", () => {
  test("should create a typed string for credential ID", () => {
    const str = new TypedString("cred_1234567890abcdef");
    expect(str.value).toBe("cred_1234567890abcdef");
    expect(str.toString()).toBe("cred_1234567890abcdef");
  });

  test("should convert to JSON for transaction ID", () => {
    const str = new TypedString("tx_cheqd123");
    expect(str.toJSON()).toBe("tx_cheqd123");
  });

  test("should check equality for block hashes", () => {
    const hash1 = new TypedString("block_cheqd_1234567890");
    const hash2 = new TypedString("block_cheqd_1234567890");
    const hash3 = new TypedString("block_cheqd_abcdefgh");
    expect(hash1.eq(hash2)).toBe(true);
    expect(hash1.eq(hash3)).toBe(false);
  });
});

describe("TypedNumber", () => {
  test("should create a typed number for reputation score", () => {
    const score = new TypedNumber(85);
    expect(score.value).toBe(85);
  });

  test("should increment/decrement for stake amounts", () => {
    const stake = new TypedNumber(1000);
    const inc = stake.inc();
    expect(+inc).toEqual(1001);
    expect(+inc.inc()).toEqual(1002);
    expect(+stake).toEqual(1001);
    const dec = stake.dec();
    expect(+stake).toEqual(1000);
    expect(+dec.dec()).toEqual(999);
  });

  test("should convert to JSON for balance", () => {
    const amount = new TypedNumber(420);
    expect(amount.toJSON()).toBe(420);
  });
});

describe("TypedBytes", () => {
  test("should create from array for signature bytes", () => {
    const sigBytes = new TypedBytes([1, 2, 3, 4]);
    expect(Array.from(sigBytes)).toEqual([1, 2, 3, 4]);
  });

  test("should create from hex string for credential data", () => {
    const hexStr = "0xdeadbeef";
    const bytes = new TypedBytes(hexStr);
    expect(Array.from(bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });
});

class CredentialAttributes extends TypedArray {
  static Class = TypedString;
}

describe("TypedArray", () => {
  test("should create array of credential attributes", () => {
    const attrs = new CredentialAttributes(
      "name=johndoe",
      "age=30",
      "score=85"
    );
    expect(attrs.length).toBe(3);
    expect(attrs[0].value).toBe("name=johndoe");
  });

  test("should handle operations on transaction IDs", () => {
    const txIds = new (class extends TypedArray {
      static Class = TypedString;
    })();
    txIds.push("tx_cheqd1");
    txIds.push("tx_cheqd2");
    expect(txIds.length).toBe(2);
    expect(String(txIds[0])).toEqual("tx_cheqd1");
    expect(String(txIds[1])).toEqual("tx_cheqd2");
  });
});

describe("TypedStruct", () => {
  class Credential extends TypedStruct {
    static Classes = {
      owner: TypedString,
      type: TypedString,
      attributes: CredentialAttributes,
    };
  }

  test("should create a struct for credential", () => {
    const cred = new Credential("cheqd12345", "identity", [
      "name=johndoe",
      "age=30",
    ]);
    expect(cred.owner.value).toBe("cheqd12345");
    expect(cred.type.value).toBe("identity");
  });

  test("should convert to/JSON for blockchain data", () => {
    const cred = new Credential("cheqd12345", "identity", [
      "name=johndoe",
      "age=30",
    ]);
    expect(cred.toJSON()).toEqual({
      owner: "cheqd12345",
      type: "identity",
      attributes: ["name=johndoe", "age=30"],
    });
  });
});

describe("TypedTuple", () => {
  class BlockHeader extends TypedTuple {
    static Classes = [TypedNumber, TypedString, TypedNumber]; // height, time, proposer
  }

  test("should create a tuple for block header", () => {
    const header = new BlockHeader(123456, "cheqd-block-123", 890);
    expect(header.length).toBe(3);
    expect(header[0].value).toBe(123456);
  });

  test("should handle block operations", () => {
    const header = new BlockHeader(789, "cheqd-block-abc", 123);
    expect(+header[2]).toBe(123);
  });
});

describe("TypedEnum", () => {
  class CredentialType extends TypedEnum {}

  class PersonalCredential extends CredentialType {
    static Type = "personal";
    static Class = class extends TypedStruct {
      static Classes = { name: TypedString, age: TypedNumber };
    };
  }

  class CorporateCredential extends CredentialType {
    static Type = "corporate";
    static Class = class extends TypedStruct {
      static Classes = { company: TypedString, registrationId: TypedString };
    };
  }

  class ServiceCredential extends CredentialType {
    static Type = "service";
    static Class = class extends TypedStruct {
      static Classes = { serviceId: TypedString, level: TypedNumber };
    };
  }

  CredentialType.bindVariants(
    PersonalCredential,
    CorporateCredential,
    ServiceCredential
  );

  test("should create an enum for credential type", () => {
    const personalCred = CredentialType.from(
      new PersonalCredential.Class("Alice", 30)
    );
    expect(personalCred.isPersonal).toBe(true);
    expect(personalCred.asPersonal.age.value).toBe(30);
  });

  test("should handle different credential types", () => {
    const corpCred = CredentialType.from(
      new CorporateCredential.Class("Cheqd Corp", "REG-123456")
    );
    expect(corpCred.isCorporate).toBe(true);
    expect(corpCred.asCorporate.registrationId.value).toBe("REG-123456");
  });
});

describe("TypedMap", () => {
  class AddressBalance extends TypedMap {
    static KeyClass = TypedString; // address
    static ValueClass = TypedNumber; // balance
  }

  test("should store key-value pairs for balances", () => {
    const balances = new AddressBalance([
      ["cheqd12345", 100],
      ["cheqd67890", 200],
    ]);
    expect(balances.size).toBe(2);
    expect(balances.get("cheqd12345").value).toBe(100);
  });

  test("should handle balance updates", () => {
    const balances = new AddressBalance();
    balances.set("cheqd98765", 500);
    expect(balances.has("cheqd98765")).toBe(true);
    expect(balances.get("cheqd98765").value).toBe(500);
  });
});

describe("TypedSet", () => {
  class CredentialHashes extends TypedSet {
    static Class = TypedString; // credential hashes
  }

  test("should store unique hashes", () => {
    const hashes = new CredentialHashes([
      "cred_hash_123",
      "cred_hash_456",
      "cred_hash_789",
    ]);
    expect(hashes.size).toBe(3);
    expect(hashes.has("cred_hash_123")).toBe(true);
  });

  test("should handle credential operations", () => {
    const hashes = new CredentialHashes();
    hashes.add("cred_hash_xyz");
    expect(hashes.has("cred_hash_xyz")).toBe(true);
  });
});

describe("TypedUUID", () => {
  test("should create a UUID for cheqd resource", () => {
    const uuid = new TypedUUID("d6b79da3-1526-4a23-9bc7-8cd57a566a29");
    expect(uuid.value).toBe("d6b79da3-1526-4a23-9bc7-8cd57a566a29");
  });

  test("should convert to/from bytes for cryptographic operations", () => {
    const uuid = TypedUUID.fromBytesAdapt([0x12, 0x34]);
    expect(uuid.value).toMatch(/\b\w{8}-\w{4}-4\w{3}-[89ab]\w{3}\b/);
  });
});

describe("Sized<_>", () => {
  test("should handle size properly", () => {
    class OneChar extends sized(TypedString) {
      static Size = 1;
    }

    expect(OneChar.from("a").value).toEqual("a");
    expect(() => OneChar.from("ab")).toThrow(
      /Received `2` items while expected `1`/
    );
  });
});

describe("Option<_>", () => {
  test("should handle `null` properly", () => {
    expect(+option(TypedNumber).from(5)).toBe(5);
    expect(option(TypedNumber).from(null)).toBe(null);
  });
});
