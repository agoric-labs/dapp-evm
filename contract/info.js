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
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-4420',
          connection_id: 'connection-3861',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-10143',
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
        id: 'connection-3861',
        client_id: '07-tendermint-4420',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-10143',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      // 'axelar-testnet-lisbon-3': {
      //   state: 3,
      //   id: 'connection-1153',
      //   client_id: '07-tendermint-4418',
      //   counterparty: {
      //     client_id: '07-tendermint-664',
      //     connection_id: 'connection-521',
      //   },
      //   transferChannel: {
      //     channelId: 'channel-4118',
      //     portId: 'transfer',
      //     counterPartyChannelId: 'channel-338',
      //     counterPartyPortId: 'transfer',
      //     ordering: 0,
      //     state: 3,
      //     version: 'ics20-1',
      //   },
      // },
    },
  },

  // axelar: {
  //   chainId: 'axelar-testnet-lisbon-3',
  //   connections: {
  //     'osmo-test-5': {
  //       state: 3,
  //       id: 'connection-521',
  //       client_id: '07-tendermint-664',
  //       counterparty: {
  //         client_id: '07-tendermint-4418',
  //         connection_id: 'connection-1153',
  //       },
  //       transferChannel: {
  //         channelId: 'channel-338',
  //         portId: 'transfer',
  //         counterPartyChannelId: 'channel-4118',
  //         counterPartyPortId: 'transfer',
  //         ordering: 0,
  //         state: 3,
  //         version: 'ics20-1',
  //       },
  //     },
  //   },
  // },
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
    'ibc/94EB1E9A676004E74ECF47F8E4BF183F4017CE0630A4D1AC7C7D9EB9CD6A3D53',
    {
      baseDenom: 'uausdc',
      baseName: 'osmosis',
      chainName: 'agoric',
      brandKey: 'AUSDC',
    },
  ],
]);
