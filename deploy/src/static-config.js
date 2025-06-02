/**
 * @import {Brand} from '@agoric/ertp';
 * @import {Denom, CosmosChainInfo} from '@agoric/orchestration';
 */

const agoricData = {
  channelId: 'channel-0',
  clientId: '07-tendermint-0',
  connectionId: 'connection-0',
  chainId: 'agoriclocal',
};

/** @type {Record<string, CosmosChainInfo>} */
export const chainInfo = {
  agoric: {
    bech32Prefix: 'agoric',
    chainId: agoricData.chainId,
    icqEnabled: false,
    namespace: 'cosmos',
    reference: agoricData.chainId,
    stakingTokens: [{ denom: 'ubld' }],
    connections: {
      axelar: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  noble: {
    bech32Prefix: 'noble',
    cctpDestinationDomain: 4,
    chainId: 'grand-1',
    icaEnabled: true,
    icqEnabled: false,
    namespace: 'cosmos',
    pfmEnabled: true,
    reference: 'grand-1',
  },
  axelar: {
    bech32Prefix: 'axelar',
    chainId: 'axelar',
    icqEnabled: true,
    namespace: 'cosmos',
    reference: 'axelar',
    stakingTokens: [{ denom: 'uaxl' }],
    connections: {
      agoriclocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  ethereum: {
    cctpDestinationDomain: 0,
    // @ts-ignore
    namespace: 'eip155',
    reference: '1',
  },

  avalanche: {
    cctpDestinationDomain: 1,
    // @ts-ignore
    namespace: 'eip155',
    reference: '43114',
  },
};

/**
 * @typedef {object} DenomDetail
 * @property {string} baseName - name of issuing chain; e.g. cosmoshub
 * @property {Denom} baseDenom - e.g. uatom
 * @property {string} chainName - name of holding chain; e.g. agoric
 * @property {Brand<'nat'>} [brand] - vbank brand, if registered
 * @see {ChainHub} `registerAsset` method
 */

export const assetInfo = JSON.stringify([
  [
    'uist',
    {
      baseDenom: 'uist',
      baseName: 'agoric',
      chainName: 'agoric',
    },
  ],
  [
    'ubld',
    {
      baseDenom: 'ubld',
      baseName: 'agoric',
      chainName: 'agoric',
    },
  ],
  [
    'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
    {
      baseDenom: 'uusd',
      baseName: 'noble',
      chainName: 'agoric',
      brandKey: 'NUSDC',
    },
  ],
  // [
  //   'ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0',
  //   {
  //     baseDenom: 'uaxl',
  //     baseName: 'axelar',
  //     chainName: 'agoric',
  //     brandKey: 'AXL',
  //   },
  // ],
]);
