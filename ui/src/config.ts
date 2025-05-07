export const tokenNameMap = {
  'ibc/F1E745756457E82C6D4A04A4D4BBB7296A210C5B7ABD331F8A26AB797AA6F8F2':
    'aUSDC',
  'ibc/1587E7B54FC9EFDA2350DC690EC2F9B9ECEB6FC31CF11884F9C0C5207ABE3921':
    'aUSDC',
  'ibc/BF12D4A433705DF7C9485CA8D2CCB4FEDB541F32B9323004DA7FC73D7B98FB7D':
    'aUSDC',
};

export const channels = {
  AGORIC_XNET_TO_OSMOSIS: 'channel-6',
  AGORIC_DEVNET_TO_OSMOSIS: 'channel-61',
  OSMOSIS_TO_AXELAR: 'channel-4118',
};

export const urls = {
  RPC_AGORIC_DEVNET: 'https://devnet.rpc.agoric.net/',
  RPC_AGORIC_XNET: 'https://xnet.rpc.agoric.net/',
  RPC_OSMOSIS: 'https://rpc.osmotest5.osmosis.zone',
};

export const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

export const tokens = {
  nativeTokenAgoric: 'ubld',
  nativeTokenOsmosis: 'uosmo',
  aUSDCAgoricDevnet:
    'ibc/BF12D4A433705DF7C9485CA8D2CCB4FEDB541F32B9323004DA7FC73D7B98FB7D',
  aUSDCOsmosis:
    'ibc/1587E7B54FC9EFDA2350DC690EC2F9B9ECEB6FC31CF11884F9C0C5207ABE3921',
  aUSDCAgoricXnet:
    'ibc/F1E745756457E82C6D4A04A4D4BBB7296A210C5B7ABD331F8A26AB797AA6F8F2',
};

export const evmAddresses = {
  Base: {
    1: '0x20E68F6c276AC6E297aC46c84Ab260928276691D', // Wallet address
    2: '0xeca2c14717F9E96445EA5BeAE3f686D0750F34b3', // Counter Contract
  },
  Avalanche: {
    1: '0x20E68F6c276AC6E297aC46c84Ab260928276691D', // Wallet address
    2: '0x6F3747783b6e6b5ff027c2a119FEA344Ab895060', // Counter Contract
  },
};

export const AGORIC_PROXY_CONTRACT = {
  Base: '0xE964445cfCf1013e296CC9f3297C7ed453a4f3b9',
  Avalanche: '0xA248B81d42639e12a9B120AE42AdB44512273f15',
  // TODO: temp value
  Ethereum: '0xA248B81d42639e12a9B120AE42AdB44512273f15',
};

export const COSMOS_CHAINS = {
  osmosis: 'osmosis-7',
};

export const ONE_DAY_IN_SECONDS = 24 * 60 * 60; // 24 hours in seconds

export const BRAND_CONFIG = {
  // TODO: decide what brand to use for type 1 calls
  1: {
    brandKey: 'AUSDC',
    decimals: 6,
    needsEVMCheck: true,
  },
  3: {
    brandKey: 'AUSDC',
    decimals: 6,
    needsEVMCheck: true,
  },
  2: {
    brandKey: 'WAVAX',
    decimals: 18,
    needsEVMCheck: false,
  },
};

export const TOAST_DURATION = {
  ERROR: 3000,
  SUCCESS: 4000,
} as const;
