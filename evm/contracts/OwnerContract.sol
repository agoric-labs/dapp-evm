// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract OwnerContract is IERC1271 {
    mapping(bytes32 => bool) public approvedHashes;

    function approveHash(bytes32 hash) external {
        approvedHashes[hash] = true;
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory
    ) external view override returns (bytes4) {}
}
