
const osmosisData = {
  channelId: 'channel-10170',
  clientId: '07-tendermint-4441',
  connectionId: 'connection-3881',
}

const agoricData = {
  channelId: 'channel-0',
  clientId: '07-tendermint-0',
  connectionId: 'connection-0',
}

export const chainInfo = JSON.stringify({
  agoric: {
    chainId: 'agoriclocal',
    stakingTokens: [
      {
        denom: 'ubld',
      },
    ],
    connections: {
      'osmo-test-5': {
        id: agoricData.connectionId,
        client_id: agoricData.clientId,
        counterparty: {
          client_id: osmosisData.clientId,
          connection_id: osmosisData.connectionId,
        },
        state: 3,
        transferChannel: {
          channelId: agoricData.channelId,
          portId: 'transfer',
          counterPartyChannelId: osmosisData.channelId,
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
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

  osmosis: {
    chainId: 'osmo-test-5',
    stakingTokens: [
      {
        denom: 'uosmo',
      },
    ],
    connections: {
      agoriclocal: {
        id: osmosisData.connectionId,
        client_id: osmosisData.clientId,
        counterparty: {
          client_id: agoricData.clientId,
          connection_id: agoricData.connectionId,
        },
        state: 3,
        transferChannel: {
          channelId: osmosisData.channelId,
          portId: 'transfer',
          counterPartyChannelId: agoricData.channelId,
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },

  axelar: {
    chainId: 'axelar',
    stakingTokens: [
      {
        denom: 'uaxl',
      },
    ],
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
    }
  }
});

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
    'uosmo',
    {
      baseDenom: 'uosmo',
      baseName: 'osmosis',
      chainName: 'osmosis',
    },
  ],
  [
    'ibc/94EB1E9A676004E74ECF47F8E4BF183F4017CE0630A4D1AC7C7D9EB9CD6A3D53',
    {
      baseDenom: 'uausdc',
      baseName: 'osmosis',
      chainName: 'agoric',
      brandKey: 'AUSDC',
    },
  ],
  [
    'ibc/3C870A71004EAD01A29709B779FECBB9F150559B1276825584E149596BD450DE',
    {
      baseDenom: 'wavax-wei',
      baseName: 'osmosis',
      chainName: 'agoric',
      brandKey: 'WAVAX',
    },
  ],
  [
    'ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0',
    {
      baseDenom: 'uaxl',
      baseName: 'axelar',
      chainName: 'agoric',
      brandKey: 'AXL',
    },
  ],
]);
