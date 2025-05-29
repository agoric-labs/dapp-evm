import { stringToPath } from '@cosmjs/crypto';

export const AGORIC_COIN_TYPE = 564;

export const channels = {
  AGORIC_TO_COSMOS_HUB: 'channel-25',
  // alternative: channel-9157, channel-9166, channel-9164
  OSMOSIS_TO_COSMOS_HUB: 'channel-9165',
  // alternative: channel-220, channel-229, channel-227
  COSMOS_HUB_TO_OSMOSIS: 'channel-228',
};

export const urls = {
  RPC_AGORIC_DEVNET: 'https://devnet.rpc.agoric.net/',
  RPC_OSMOSIS: 'https://rpc.osmotest5.osmosis.zone',
};

export const chains = {
  CHAINID_AGORIC_DEVNET: 'agoricdev-25',
  CHAINID_OSMOSIS: 'osmo-test-5',
};

export const denoms = {
  AGORIC: 'ubld',
  OSMOSIS: 'uosmo',
};

export const prefix = {
  AGORIC: 'agoric',
  OSMOSIS: 'osmo',
};

export const hdPath = (coinType = 118, account = 0) =>
  stringToPath(`m/44'/${coinType}'/${account}'/0/0`);
