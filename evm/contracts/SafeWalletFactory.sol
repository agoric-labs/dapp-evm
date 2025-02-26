// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/ISafeProxyFactory.sol";
import "./interfaces/ISafe.sol";

/// @title Helper contract for deploying a new Safe and executing a Safe tx separately
/// @dev We split Safe creation and execution into two functions
contract SafeWalletFactory {
    error UnsupportedChain(uint256);

    struct SafeCreationData {
        address singleton;
        bytes initializer;
        uint256 saltNonce;
    }

    struct SafeExecutionData {
        address to;
        uint256 value;
        bytes data;
        uint8 operation;
        uint256 safeTxGas;
        uint256 baseGas;
        uint256 gasPrice;
        address gasToken;
        address payable refundReceiver;
        bytes signatures;
    }

    ISafeProxyFactory public safeFactory;
    event SafeCreated(address indexed safeAddress);
    event SafeTransactionExecuted(
        address indexed safeAddress,
        address indexed to,
        uint256 value
    );

    constructor() {
        uint256 chainId = block.chainid;

        // https://sepolia.etherscan.io/address/0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67#code
        if (chainId == 11155111) {
            safeFactory = ISafeProxyFactory(
                0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67
            );
        } else {
            revert UnsupportedChain(chainId);
        }
    }

    /// @notice Creates a new Safe and returns its address
    function createSafe(
        SafeCreationData memory _creationData
    ) public returns (address) {
        address safeAddress = safeFactory.createProxyWithNonce(
            _creationData.singleton,
            _creationData.initializer,
            _creationData.saltNonce
        );

        emit SafeCreated(safeAddress);
        return safeAddress;
    }

    /// @notice Executes a transaction on an existing Safe
    function executeSafeTransaction(
        address safeAddress,
        SafeExecutionData memory _executionData
    ) public payable {
        ISafe createdSafe = ISafe(safeAddress);
        createdSafe.execTransaction{value: msg.value}(
            _executionData.to,
            _executionData.value,
            _executionData.data,
            ISafe.Operation(_executionData.operation),
            _executionData.safeTxGas,
            _executionData.baseGas,
            _executionData.gasPrice,
            _executionData.gasToken,
            _executionData.refundReceiver,
            _executionData.signatures
        );

        emit SafeTransactionExecuted(
            safeAddress,
            _executionData.to,
            _executionData.value
        );
    }
}
