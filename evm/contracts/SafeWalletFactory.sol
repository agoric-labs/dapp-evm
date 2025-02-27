// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/ISafeProxyFactory.sol";
import "./interfaces/ISafe.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

/// @title Helper contract for deploying a new Safe and executing a Safe tx separately
/// @dev We split Safe creation and execution into two functions
contract SafeWalletFactory is IERC1271 {
    error UnsupportedChain(uint256);
    bytes4 internal constant ERC1271_MAGIC_VALUE = 0x1626ba7e;

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

    function isValidSignature(
        bytes32 _hash,
        bytes memory _signature
    ) external view override returns (bytes4) {
        // WARNING: This is still insecure without proper hash validation.
        bytes memory expected = getPreApprovedSignature();
        if (keccak256(_signature) == keccak256(expected)) {
            return ERC1271_MAGIC_VALUE;
        } else {
            return 0xffffffff;
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

    /// @notice Generates a valid signature for the Safe, allowing the contract to execute transactions
    function getPreApprovedSignature() public pure returns (bytes memory) {
        return abi.encodePacked(bytes32(0), bytes32(0), uint8(1));
    }

    /// @notice Executes a transaction on an existing Safe, auto-signing it
    function executeSafeTransaction(
        address safeAddress,
        SafeExecutionData memory _executionData
    ) public payable {
        ISafe createdSafe = ISafe(safeAddress);

        bytes memory preApprovedSig = getPreApprovedSignature();
        bytes memory signature = abi.encodePacked(
            bytes32(uint256(uint160(address(this)))),
            bytes32(uint256(65)),
            uint8(0),
            preApprovedSig
        );

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
            signature
        );

        emit SafeTransactionExecuted(
            safeAddress,
            _executionData.to,
            _executionData.value
        );
    }
}
