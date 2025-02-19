// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {AxelarExecutableWithToken} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutableWithToken.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Owned} from "solmate/src/auth/Owned.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IERC20} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol";

/**
 * @title Axelar Proxy
 * @notice Allows for Cellars deployed on L2s to be controlled by the Agoric Chain using Axelar messages.
 * @dev This contract will be deployed on some L2, then to run a Cellar on that L2,
 *      deploy the Cellar, and make this contract the owner.
 * @author crispymangoes, 0xEinCodes
 * NOTE: AxelarProxy accepts different types of msgIds. logicCalls && transferrance of ownership calls. This is where the cellars on a target chain would have to have their owners changed to the new AxelarProxy during an upgrade.
 */
contract AxelarProxy is AxelarExecutableWithToken {
    IAxelarGasService public immutable gasService;
    using Address for address;

    event LogicCallEvent(address indexed target, uint256 nonce, bytes callData);

    error AxelarProxy__WrongSource();
    error AxelarProxy__NoTokens();
    error AxelarProxy__WrongSender();
    error AxelarProxy__WrongMsgId();
    error AxelarProxy__NonceTooOld();
    error AxelarProxy__PastDeadline();

    mapping(address => uint256) public lastRecordedNonce;

    /**
     * @notice Identifier for the expected msg type from the source chain to execute logicCalls on target chains.
     * NOTE: contract calls are the first type, thus starting at 0.
     */
    uint256 public constant LOGIC_CALL_MSG_ID = 0;

    /**
     * @notice Identifier for the expected msg type from the source chain to upgrade ownership of target chain cellars to new AxelarProxy.
     */
    uint256 public constant UPGRADE_MSG_ID = 1;

    /**
     * @notice Constant ensuring that the source chain is Osmosis chain.
     * NOTE: string literal comes from Axelar.
     */
    bytes32 public constant OSMOSIS_CHAIN_HASH = keccak256(bytes("osmosis-7"));

    constructor(
        address gateway_,
        address gasReceiver_
    ) AxelarExecutableWithToken(gateway_) {
        gasService = IAxelarGasService(gasReceiver_);
    }

    /**
     * @notice Execution logic.
     * @dev Verifies message is from Osmosis, otherwise reverts.
     * @dev Verifies message is a valid Axelar message, otherwise reverts.
     *      See `AxelarExecutable.sol`.
     */
    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        // Validate Source Chain
        if (keccak256(bytes(sourceChain)) != OSMOSIS_CHAIN_HASH)
            revert AxelarProxy__WrongSource();

        uint256 msgId = abi.decode(payload, (uint256));

        if (msgId == UPGRADE_MSG_ID) {
            (, address newAxelarProxy, address[] memory targets) = abi.decode(
                payload,
                (uint256, address, address[])
            );
            for (uint256 i = 0; i < targets.length; i++) {
                Owned(targets[i]).transferOwnership(newAxelarProxy); // owner transference emits events to track.
            }
        } else if (msgId == LOGIC_CALL_MSG_ID) {
            (
                ,
                address target,
                uint256 nonce,
                uint256 deadline,
                bytes memory callData
            ) = abi.decode(
                    payload,
                    (uint256, address, uint256, uint256, bytes)
                );
            if (nonce <= lastRecordedNonce[target])
                revert AxelarProxy__NonceTooOld();
            if (block.timestamp > deadline) revert AxelarProxy__PastDeadline();
            lastRecordedNonce[target] = nonce;
            target.functionCall(callData);
            emit LogicCallEvent(target, nonce, callData);
        } else {
            revert AxelarProxy__WrongMsgId();
        }
    }

    /**
     * @notice This contract is not setup to handle ERC20 tokens, so execution with token calls will revert.
     */
    function _executeWithToken(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        address destinationAddress = abi.decode(payload, (address));
        address tokenAddress = gatewayWithToken().tokenAddresses(tokenSymbol);

        IERC20(tokenAddress).transfer(destinationAddress, amount);
    }
}
