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
        id: 'connection-1',
        client_id: '07-tendermint-1',
        counterparty: {
          client_id: '07-tendermint-4428',
          connection_id: 'connection-3869',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-1',
          portId: 'transfer',
          counterPartyChannelId: 'channel-10151',
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
        id: 'connection-3869',
        client_id: '07-tendermint-4428',
        counterparty: {
          client_id: '07-tendermint-1',
          connection_id: 'connection-1',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-10151',
          portId: 'transfer',
          counterPartyChannelId: 'channel-1',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
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
  [
    'ibc/1B53A5A004CFB26111D79E0A4ED46518E276B92E12EA754906855A4E99364372',
    {
      baseDenom: 'wavax-wei',
      baseName: 'osmosis',
      chainName: 'agoric',
      brandKey: 'WAVAX',
    },
  ],
]);
