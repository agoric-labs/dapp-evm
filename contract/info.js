export const chainInfo = JSON.stringify({
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoriclocal',
    stakingTokens: [
      {
        denom: 'ubld',
      },
    ],
    icqEnabled: false,
    connections: {
      'osmo-test-5': {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-4391',
          connection_id: 'connection-3833',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-10102',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },

  osmosis: {
    bech32Prefix: 'osmo',
    chainId: 'osmo-test-5',
    stakingTokens: [
      {
        denom: 'uosmo',
      },
    ],
    icqEnabled: true,
    connections: {
      agoriclocal: {
        id: 'connection-3833',
        client_id: '07-tendermint-4391',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-10102',
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
});

export const assetInfo = JSON.stringify([
  [
    'uist',
    {
      baseDenom: 'uist',
      baseName: 'agoric',
      chainName: 'agoriclocal',
    },
    'uosmo',
    {
      baseDenom: 'uosmo',
      baseName: 'osmosis',
      chainName: 'osmo-test-5',
    },
  ],
]);
