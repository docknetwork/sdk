// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

interface FlagsInterface {
  function getFlag(address) external view returns (bool);
  function getFlags(address[] calldata) external view returns (bool[] memory);
  function raiseFlag(address) external;
  function raiseFlags(address[] calldata) external;
  function lowerFlags(address[] calldata) external;
  function setRaisingAccessController(address) external;
}



interface AggregatorValidatorInterface {
  function validate(
    uint256 previousRoundId,
    int256 previousAnswer,
    uint256 currentRoundId,
    int256 currentAnswer
  ) external returns (bool);
}



/**
 * @title The Owned contract
 * @notice A contract with helpers for basic contract ownership.
 */
contract Owned {

  address public owner;
  address private pendingOwner;

  event OwnershipTransferRequested(
    address indexed from,
    address indexed to
  );
  event OwnershipTransferred(
    address indexed from,
    address indexed to
  );

  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Allows an owner to begin transferring ownership to a new address,
   * pending.
   */
  function transferOwnership(address _to)
    external
    onlyOwner()
  {
    pendingOwner = _to;

    emit OwnershipTransferRequested(owner, _to);
  }

  /**
   * @dev Allows an ownership transfer to be completed by the recipient.
   */
  function acceptOwnership()
    external
  {
    require(msg.sender == pendingOwner, "Must be proposed owner");

    address oldOwner = owner;
    owner = msg.sender;
    pendingOwner = address(0);

    emit OwnershipTransferred(oldOwner, msg.sender);
  }

  /**
   * @dev Reverts if called by anyone other than the contract owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner, "Only callable by owner");
    _;
  }

}





// Adapted from https://github.com/OpenZeppelin/openzeppelin-contracts/blob/97894a140d2a698e5a0f913648a8f56d62277a70/contracts/math/SignedSafeMath.sol



library CheckedMath {

  int256 constant internal INT256_MIN = -2**255;

  /**
   * @dev Subtracts two signed integers, returns false 2nd param on overflow.
   */
  function add(
    int256 a,
    int256 b
  )
    internal
    pure
    returns (int256 result, bool ok)
  {
    int256 c = a + b;
    if ((b >= 0 && c < a) || (b < 0 && c >= a)) return (0, false);

    return (c, true);
  }

  /**
   * @dev Subtracts two signed integers, returns false 2nd param on overflow.
   */
  function sub(
    int256 a,
    int256 b
  )
    internal
    pure
    returns (int256 result, bool ok)
  {
    int256 c = a - b;
    if ((b < 0 && c <= a) || (b >= 0 && c > a)) return (0, false);

    return (c, true);
  }


  /**
   * @dev Multiplies two signed integers, returns false 2nd param on overflow.
   */
  function mul(
    int256 a,
    int256 b
  )
    internal
    pure
    returns (int256 result, bool ok)
  {
    // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
    if (a == 0) return (0, true);
    if (a == -1 && b == INT256_MIN) return (0, false);

    int256 c = a * b;
    if (!(c / a == b)) return (0, false);

    return (c, true);
  }

  /**
   * @dev Divides two signed integers, returns false 2nd param on overflow.
   */
  function div(
    int256 a,
    int256 b
  )
    internal
    pure
    returns (int256 result, bool ok)
  {
    if (b == 0) return (0, false);
    if (b == -1 && a == INT256_MIN) return (0, false);

    int256 c = a / b;

    return (c, true);
  }

}




/**
 * @title The Deviation Flagging Validator contract
 * @notice Checks the current value against the previous value, and makes sure
 * that it does not deviate outside of some relative range. If the deviation
 * threshold is passed then the validator raises a flag on the designated
 * flag contract.
 */
contract DeviationFlaggingValidator is Owned, AggregatorValidatorInterface {
  using CheckedMath for int256;

  uint32 constant public THRESHOLD_MULTIPLIER = 100000;

  uint32 public flaggingThreshold;
  FlagsInterface public flags;

  event FlaggingThresholdUpdated(
    uint24 indexed previous,
    uint24 indexed current
  );
  event FlagsAddressUpdated(
    address indexed previous,
    address indexed current
  );

  int256 constant private INT256_MIN = -2**255;

  /**
   * @notice sets up the validator with its threshold and flag address.
   * @param _flags sets the address of the flags contract
   * @param _flaggingThreshold sets the threshold that will trigger a flag to be
   * raised. Setting the value of 100,000 is equivalent to tolerating a 100%
   * change compared to the previous price.
   */
  constructor(
    address _flags,
    uint24 _flaggingThreshold
  )
    public
  {
    setFlagsAddress(_flags);
    setFlaggingThreshold(_flaggingThreshold);
  }

  /**
   * @notice checks whether the parameters count as valid by comparing the
   * difference change to the flagging threshold.
   * @param _previousRoundId is ignored.
   * @param _previousAnswer is used as the median of the difference with the
   * current answer to determine if the deviation threshold has been exceeded.
   * @param _roundId is ignored.
   * @param _answer is the latest answer which is compared for a ratio of change
   * to make sure it has not execeeded the flagging threshold.
   */
  function validate(
    uint256 _previousRoundId,
    int256 _previousAnswer,
    uint256 _roundId,
    int256 _answer
  )
    external
    override
    returns (bool)
  {
    if (!isValid(_previousRoundId, _previousAnswer, _roundId, _answer)) {
      flags.raiseFlag(msg.sender);
      return false;
    }

    return true;
  }

  /**
   * @notice checks whether the parameters count as valid by comparing the
   * difference change to the flagging threshold and raises a flag on the
   * flagging contract if so.
   * @param _previousAnswer is used as the median of the difference with the
   * current answer to determine if the deviation threshold has been exceeded.
   * @param _answer is the current answer which is compared for a ratio of
   * change * to make sure it has not execeeded the flagging threshold.
   */
  function isValid(
    uint256 ,
    int256 _previousAnswer,
    uint256 ,
    int256 _answer
  )
    public
    view
    returns (bool)
  {
    if (_previousAnswer == 0) return true;

    (int256 change, bool changeOk) = _previousAnswer.sub(_answer);
    (int256 ratioNumerator, bool numOk) = change.mul(THRESHOLD_MULTIPLIER);
    (int256 ratio, bool ratioOk) = ratioNumerator.div(_previousAnswer);
    (uint256 absRatio, bool absOk) = abs(ratio);

    return changeOk && numOk && ratioOk && absOk && absRatio <= flaggingThreshold;
  }

  /**
   * @notice updates the flagging threshold
   * @param _flaggingThreshold sets the threshold that will trigger a flag to be
   * raised. Setting the value of 100,000 is equivalent to tolerating a 100%
   * change compared to the previous price.
   */
  function setFlaggingThreshold(uint24 _flaggingThreshold)
    public
    onlyOwner()
  {
    uint24 previousFT = uint24(flaggingThreshold);

    if (previousFT != _flaggingThreshold) {
      flaggingThreshold = _flaggingThreshold;

      emit FlaggingThresholdUpdated(previousFT, _flaggingThreshold);
    }
  }

  /**
   * @notice updates the flagging contract address for raising flags
   * @param _flags sets the address of the flags contract
   */
  function setFlagsAddress(address _flags)
    public
    onlyOwner()
  {
    address previous = address(flags);

    if (previous != _flags) {
      flags = FlagsInterface(_flags);

      emit FlagsAddressUpdated(previous, _flags);
    }
  }


  // PRIVATE

  function abs(
    int256 value
  )
    private
    pure
    returns (uint256, bool)
  {
    if (value >= 0) return (uint256(value), true);
    if (value == CheckedMath.INT256_MIN) return (0, false);
    return (uint256(value * -1), true);
  }

}
