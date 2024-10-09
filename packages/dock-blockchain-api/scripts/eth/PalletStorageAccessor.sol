pragma solidity ^0.8.2;

contract PalletStorageAccessor {
  enum KeyType {
    NoKey,
    MapKey,
    DoubleMapKey
  }

  enum Params {
    None,
    Offset,
    Length,
    OffsetAndLength
  }

  function getStorageRaw(bytes calldata key) public returns (bool, bytes memory) {
    address palletStorageReaderAddress = address(0x000000000000000000000000000000000000000F);
    
    return palletStorageReaderAddress.call(
      abi.encodePacked(
        compact(key.length),
        key,
        Params.None
      )
    );
  }

  function getStorage(string calldata pallet, string calldata member, KeyType keyType, bytes calldata firstKey, bytes calldata secondKey) public returns (bool, bytes memory) {
    address palletStorageReaderAddress = address(0x000000000000000000000000000000000000000E);
    bytes memory encodedKey = encodeKey(keyType, firstKey, secondKey);
    bytes memory palletBytes = bytes(pallet);
    bytes memory memberBytes = bytes(member);

    return palletStorageReaderAddress.call(
      abi.encodePacked(
        compact(palletBytes.length),
        palletBytes,
        compact(memberBytes.length),
        memberBytes,
        encodedKey,
        Params.None
      )
    );
  }

  function getStorageWithOffset(string calldata pallet, string calldata member, KeyType keyType, bytes calldata firstKey, bytes calldata secondKey, uint32 offset) public returns (bool, bytes memory) {
    address palletStorageReaderAddress = address(0x000000000000000000000000000000000000000E);
    bytes memory encodedKey = encodeKey(keyType, firstKey, secondKey);
    bytes memory palletBytes = bytes(pallet);
    bytes memory memberBytes = bytes(member);

    return palletStorageReaderAddress.call(
      abi.encodePacked(
        compact(palletBytes.length),
        palletBytes,
        compact(memberBytes.length),
        memberBytes,
        encodedKey,
        Params.Offset,
        compact(uint256(offset))
      )
    );
  }

  function getStorageWithLen(string calldata pallet, string calldata member, KeyType keyType, bytes calldata firstKey, bytes calldata secondKey, uint32 len) public returns (bool, bytes memory) {
    address palletStorageReaderAddress = address(0x000000000000000000000000000000000000000E);
    bytes memory encodedKey = encodeKey(keyType, firstKey, secondKey);
    bytes memory palletBytes = bytes(pallet);
    bytes memory memberBytes = bytes(member);

    return palletStorageReaderAddress.call(
      abi.encodePacked(
        compact(palletBytes.length),
        palletBytes,
        compact(memberBytes.length),
        memberBytes,
        encodedKey,
        Params.Length,
        compact(uint256(len))
      )
    );
  }

  function getStorageWithOffsetLen(string calldata pallet, string calldata member, KeyType keyType, bytes calldata firstKey, bytes calldata secondKey, uint32 offset, uint32 len) public returns (bool, bytes memory) {
    address palletStorageReaderAddress = address(0x000000000000000000000000000000000000000E);
    bytes memory encodedKey = encodeKey(keyType, firstKey, secondKey);
    bytes memory palletBytes = bytes(pallet);
    bytes memory memberBytes = bytes(member);

    return palletStorageReaderAddress.call(
      abi.encodePacked(
        compact(palletBytes.length),
        palletBytes,
        compact(memberBytes.length),
        memberBytes,
        encodedKey,
        Params.OffsetAndLength,
        compact(uint256(offset)),
        compact(uint256(len))
      )
    );
  }

  function encodeKey(KeyType keyType, bytes calldata firstKey, bytes calldata secondKey) private pure returns (bytes memory) {
    bytes memory encodedKey;
    if (keyType == KeyType.NoKey) {
      encodedKey = abi.encodePacked(keyType);
      require(firstKey.length == 0, "First key must be empty");
      require(secondKey.length == 0, "Second key must be empty");
    } else if (keyType == KeyType.MapKey) {
      encodedKey = abi.encodePacked(keyType, compact(firstKey.length), firstKey);
      require(secondKey.length == 0, "Second key must be empty");
    } else {
      encodedKey = abi.encodePacked(
        keyType,
        compact(firstKey.length),
        firstKey,
        compact(secondKey.length),
        secondKey
      );
    }

    return encodedKey;
  }

  function compact(uint256 len) private pure returns (bytes memory) {
    if (len < 64) {
      return abi.encodePacked(uint8(len) << 2);
    } else if (len < 16384) {
      return abi.encodePacked(uint8(len) << 2 | 1, uint8(len >> 6));
    } else if (len < 1073741824) {
      return abi.encodePacked(uint8(len) << 2 | 2, uint8(len >> 6), uint8(len >> 14), uint8(len >> 22));
    } else {
      revert("Unimplemented");
    }
  }
}