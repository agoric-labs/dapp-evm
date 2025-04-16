//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AxelarExecutable } from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import { IERC20 } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import "@aave/core-v3/contracts/interfaces/IPool.sol";

/**
 * @title Deposit on Aave Lending Pool
 * @notice Send a token along with an Axelar GMP message between two blockchains
 */
contract DepositOnAaveLendingPool is AxelarExecutable {
    IAxelarGasService public immutable gasService;
    address public immutable aaveLendingPool; // Aave V3 Lending Pool Address


    event Executed(string sourceChain, string sourceAddress, bytes payload);
    event ExecutedWithToken(string sourceChain, string sourceAddress, bytes payload, string tokenSymbol, uint256 amount);
    event ExecutedWithTokenAddress(address tokenAddress, uint256 amount);

    /**
     *
     * @param _gateway address of axl gateway on deployed chain
     * @param _gasReceiver address of axl gas service on deployed chain
     */
    constructor(address _gateway, address _gasReceiver, address _aaveLendingPool) AxelarExecutable(_gateway) {
        gasService = IAxelarGasService(_gasReceiver);
        aaveLendingPool = _aaveLendingPool;

    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        emit Executed( sourceChain, sourceAddress, payload);
    }

    /**
     * @notice send token to Aave Lending Pool using token address
     * @param tokenAddress address of token sent from src chain
     * @param amount amount of tokens sent from src chain
     */
    function executeWithTokenAddress(
        address tokenAddress,
        uint256 amount
    ) public {
        require(amount > 0, "Deposit amount must be greater than zero");

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount); // Transfer tokens from user
        IERC20(tokenAddress).approve(aaveLendingPool, amount); // Approve Aave Pool

        IPool(aaveLendingPool).supply(tokenAddress, amount, msg.sender, 0); // Deposit into Aave

        emit ExecutedWithTokenAddress(tokenAddress, amount);
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
        address tokenAddress = gateway.tokenAddresses(tokenSymbol);

        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount); // Transfer tokens from user
        IERC20(tokenAddress).approve(aaveLendingPool, amount); // Approve Aave Pool

        IPool(aaveLendingPool).supply(tokenAddress, amount, msg.sender, 0); // Deposit into Aave

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
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        address recipient = abi.decode(payload, (address));
        address tokenAddress = gateway.tokenAddresses(tokenSymbol);

        require(amount > 0, "Deposit amount must be greater than zero");

        IERC20(tokenAddress).transfer(address(this), amount); // Transfer tokens from user
        IERC20(tokenAddress).approve(aaveLendingPool, amount); // Approve Aave Pool

        IPool(aaveLendingPool).supply(tokenAddress, amount, recipient, 0); // Deposit into Aave

        emit ExecutedWithToken(sourceChain, sourceAddress, payload, tokenSymbol, amount);
   
    }
}
