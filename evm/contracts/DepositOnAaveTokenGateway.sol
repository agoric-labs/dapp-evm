//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { AxelarExecutableWithToken } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutableWithToken.sol';
import { IERC20 } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IWrappedTokenGatewayV3} from "@aave/periphery-v3/contracts/misc/interfaces/IWrappedTokenGatewayV3.sol";
import {IWETH} from "@aave/periphery-v3/contracts/misc/interfaces/IWETH.sol";

/**
 * @title Deposit on Aave Token Gateway V3
 * @notice Send a token along with an Axelar GMP message between two blockchains
 */
contract DepositOnAaveTokenGateway is AxelarExecutableWithToken {
    IAxelarGasService public immutable gasService;
    address public immutable aavePool; // Aave Token Gateway V3 Lending Address


    event Executed(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload);
    event ExecutedWithToken(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload, string tokenSymbol, uint256 amount);
    event ExecutedWithTokenAddress(address tokenAddress, uint256 amount);

    /**
     *
     * @param _gateway address of axl gateway on deployed chain
     * @param _gasReceiver address of axl gas service on deployed chain
     */
    constructor(address _gateway, address _gasReceiver, address _aavePool) AxelarExecutableWithToken(_gateway) {
        gasService = IAxelarGasService(_gasReceiver);
        aavePool = _aavePool;

    }

    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        emit Executed(commandId, sourceChain, sourceAddress, payload);
    }

    /**
     * @notice send token to Aave Lending Pool using token symbol
     * @param tokenSymbol address of token sent from src chain
     * @param amount amount of tokens sent from src chain
     */
    function executeWithTokenSymbol(
        string calldata tokenSymbol,
        uint256 amount
    ) public {
        require(amount > 0, "Deposit amount must be greater than zero");
        address tokenAddress = gatewayWithToken().tokenAddresses(tokenSymbol);

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount); // Transfer tokens from user

        IWETH(tokenAddress).withdraw(amount); // Withdraw to AVAX

        IWrappedTokenGatewayV3(aavePool).depositETH{ value: amount }(tokenAddress, msg.sender, 0); // Deposit into Aave

        emit ExecutedWithTokenAddress(tokenAddress, amount);
    }

    /**
     * @notice logic to be executed on dest chain
     * @dev this is triggered automatically by relayer
     * @param payload encoded gmp message sent from src chain
     * @param tokenSymbol symbol of token sent from src chain
     * @param amount amount of tokens sent from src chain
     */
    function _executeWithToken(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        address recipient = abi.decode(payload, (address));
        address tokenAddress = gatewayWithToken().tokenAddresses(tokenSymbol);

        require(amount > 0, "Deposit amount must be greater than zero");

        IERC20(tokenAddress).transfer(address(this), amount); // Transfer tokens from user

        IWETH(tokenAddress).withdraw(amount); // Withdraw to AVAX

        IWrappedTokenGatewayV3(aavePool).depositETH{ value: amount }(tokenAddress, recipient, 0); // Deposit into Aave

        emit ExecutedWithToken(commandId, sourceChain, sourceAddress, payload, tokenSymbol, amount);
   
    }

    // Accepts plain AVAX transfers (without data)
    receive() external payable {}

    // Accepts calls with data or when no function matches
    fallback() external payable {}
}
