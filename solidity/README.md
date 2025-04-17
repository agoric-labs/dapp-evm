## EVM Contracts

The `contracts/` folder includes two Ethereum Virtual Machine (EVM) contracts. The first, `Counter.sol`, does not extend either [AxelarExecutable.sol](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/executable/AxelarExecutable.sol) or [AxelarExecutableWithToken.sol](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/executable/AxelarExecutableWithToken.sol). It's important to note that an EVM contract needs to inherit from one of these two contracts to be callable via Axelar.

The second contract, `contracts/AxelarProxy.sol`, functions as a relayer and implements `AxelarExecutableWithToken.sol`. This setup allows it to invoke contracts on the EVM chain that do not extend `AxelarExecutable.sol`. For example, contract calls of type 1 (executed with `yarn t1`) typically call the `contracts/Counter.sol` contract through `contracts/AxelarProxy.sol`.

### Contract Addresses on Avalanche Fuji Testnet

- Counter Contract: `0x6F3747783b6e6b5ff027c2a119FEA344Ab895060`
- Proxy Contract : `0x041FCDBDc2a3b87e765Eca96c3572A3AB8d2d173`

### Contract Addresses on Base Testnet

- Counter Contract: `0xeca2c14717F9E96445EA5BeAE3f686D0750F34b3`
- Proxy Contract : `0xE964445cfCf1013e296CC9f3297C7ed453a4f3b9`

### Deployment

The repository utilizes [Hardhat](https://hardhat.org/hardhat-runner/docs/getting-started) for deployment and testing of the EVM contract. To deploy the contract, modifications can be made in the `hardhat.config.cjs` file. Currently, this configuration file is set up to deploy the contract to the Avalanche and Base testnets.

The `package.json` file contains scripts for deploying the contract on the specified testnets:

- **Avalanche Testnet**: Run the script `deploy-fuji` to deploy to the Fuji testnet.
- **Base Testnet**: Run the script `deploy-base` to deploy to the Base testnet.
