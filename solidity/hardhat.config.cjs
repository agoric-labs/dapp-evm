require('@nomicfoundation/hardhat-toolbox');
const { config } = require('dotenv');
config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: 'hardhat',
  etherscan: {
    apiKey: {
      fuji: 'snowtrace', // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: 'fuji',
        chainId: 43113,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/43113/etherscan',
          browserURL: 'https://avalanche.testnet.localhost:8080',
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    ...(process.env.CI ? {} : testnets),
  },
  mocha: {
    timeout: 20000,
  },
};
