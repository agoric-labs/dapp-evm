// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract Counter {
    uint256 private _count;

    constructor(uint256 initialCount) {
        _count = initialCount;
    }

    function getCount() public view returns (uint256) {
        return _count;
    }

    function increment() public {
        _count += 1;
    }

    function decrement() public {
        _count -= 1;
    }

    function setCount(uint256 newCount) public {
        _count = newCount;
    }
}
