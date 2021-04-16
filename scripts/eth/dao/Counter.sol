// For testing execution through voting 

pragma solidity ^0.4.24;

contract Counter {
    int public counter = 0;

    function increment() public returns (int) {
        counter += 1;
        return counter;
    }
    function decrement() public returns (int) {
        counter -= 1;
        return counter;
    }
}
