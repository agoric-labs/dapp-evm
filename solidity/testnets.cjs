const { PRIVATE_KEY } = process.env;
if (!PRIVATE_KEY) {
  throw Error('PRIVATE_KEY is not added as a secret');
}

const testnets = {
  fuji: {
    url: 'https://api.avax-test.network/ext/bc/C/rpc',
    gasPrice: 225000000000,
    chainId: 43113,
    accounts: [`0x${PRIVATE_KEY}`],
  },
  base: {
    url: 'https://sepolia.base.org/',
    gasPrice: 225000000000,
    chainId: 84532,
    accounts: [`0x${PRIVATE_KEY}`],
  },
};

module.exports = {
  testnets,
};
