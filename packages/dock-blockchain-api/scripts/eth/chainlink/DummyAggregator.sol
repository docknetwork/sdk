// Aggregator contract used for unit testing in Substrate's price_feed pallet.

pragma solidity >=0.6.0;

contract DummyAggregator {

  uint80 public roundId;
  int256 public answer;
  uint256 public startedAt;
  uint256 public updatedAt;
  uint80 public answeredInRound;

  constructor(
    uint80 _roundId,
    int256 _answer,
    uint256 _startedAt,
    uint256 _updatedAt,
    uint80 _answeredInRound
  ) public {
    setData(_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
  }

  function setData(
    uint80 _roundId,
    int256 _answer,
    uint256 _startedAt,
    uint256 _updatedAt,
    uint80 _answeredInRound
  ) public {
    roundId = _roundId;
    answer = _answer;
    startedAt = _startedAt;
    updatedAt = _updatedAt;
    answeredInRound = _answeredInRound;
  }

  function latestRoundData()
    public
    view
    returns (
      uint80 _roundId,
      int256 _answer,
      uint256 _startedAt,
      uint256 _updatedAt,
      uint80 _answeredInRound
    )
  {
    return (
      roundId,
      answer,
      startedAt,
      updatedAt,
      answeredInRound
    );
  }
}

// Proxy over the DummyAggregator.
contract DummyAggregatorProxy {
  address private aggr;

  constructor(address _aggregator) public {
    aggr = _aggregator;
  }

  function aggregator() external view returns (address)
  {
    return aggr;
  }

  function setAggregator(address _aggregator) external
  {
    aggr = _aggregator;
  }
}
