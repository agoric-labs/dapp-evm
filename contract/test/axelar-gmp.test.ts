import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { BridgeId } from '@agoric/internal';
import fetchedChainInfo from './utils/fetched-chain-info.js';
import { defaultAbiCoder } from '@ethersproject/abi';
import { utils } from 'ethers';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ExecutionContext, TestFn } from 'ava';
import { makeWalletFactoryContext } from './utils/walletFactory.js';

type WalletFactoryContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;

export type TestContext = WalletFactoryContext & {
  wallet: any;
  previousOfferId: string | null;
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

const makeTestContext = async (t: ExecutionContext) => {
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );

  const wallet =
    await ctx.walletFactoryDriver.provideSmartWallet('agoric1makeAccount');

  const fullCtx = {
    ...ctx,
    wallet,
    previousOfferId: null,
  };

  return fullCtx;
};

let evmTransactionCounter = 0;

/**
 * @typedef {object} MakeEVMTransactionParams
 * @property {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} wallet
 * @property {string} previousOffer
 * @property {string} methodName
 * @property {any} offerArgs
 * @property {any} proposal
 */

/**
 * Initiates an EVM transaction offer through the smart wallet.
 *
 * @param {MakeEVMTransactionParams} params
 * @returns {Promise<string>}
 */
const makeEVMTransaction = async ({
  wallet,
  previousOffer,
  methodName,
  offerArgs,
  proposal,
}) => {
  const id = `evmTransaction${evmTransactionCounter}`;

  /** @type {import('@agoric/smart-wallet/src/invitations.js').ContinuingInvitationSpec} */
  const proposeInvitationSpec = {
    source: 'continuing',
    previousOffer,
    invitationMakerName: 'makeEVMTransactionInvitation',
    invitationArgs: harden([methodName, offerArgs]),
  };

  evmTransactionCounter += 1;

  await wallet.executeOffer({
    id,
    invitationSpec: proposeInvitationSpec,
    proposal,
  });
  await eventLoopIteration();
  return id;
};

test.before(async t => {
  t.context = await makeTestContext(t);

  const { evalProposal, buildProposal } = t.context;
  // Registering AXL asset in issuers
  await evalProposal(
    buildProposal(
      "../test/asset-builder/register-interchain-bank-assets.builder.js",
      [
        "--assets",
        JSON.stringify([
          {
            denom:
              "ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0",
            issuerName: "AXL",
            decimalPlaces: 6,
          },
        ]),
      ]
    )
  );

  await evalProposal(
    buildProposal('../proposal/init-axelar-gmp.js', [
      '--chainInfo',
      JSON.stringify({
        agoric: fetchedChainInfo.agoric,
        axelar: fetchedChainInfo.axelar,
      }),
      '--assetInfo',
      JSON.stringify([
        [
          'ubld',
          {
            baseDenom: 'ubld',
            brandKey: 'BLD',
            baseName: 'agoric',
            chainName: 'agoric',
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
      ]),
    ]),
  );
});

test.serial('makeAccount via axelarGmp', async t => {
  const {
    storage,
    wallet,
    bridgeUtils: { runInbound },
  } = t.context;

  t.log('create an LCA');
  const { ATOM, BLD } = t.context.agoricNamesRemotes.brand;

  await wallet.sendOffer({
    id: 'axelarMakeAccountCall',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['createAndMonitorLCA']],
    },
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  t.deepEqual(getLogged(), [
    'Inside createAndMonitorLCA',
    'localAccount created successfully',
    'tap created successfully',
    'Monitoring transfers setup successfully',
  ]);

  t.log('Execute offers via the LCA');

  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
      memo: '{}'
    }),
  );

  const lcaAddress = 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht';
  const evmAddress = '0x20e68f6c276ac6e297ac46c84ab260928276691d';
  const {
    channelId: agoricToAxelarChannel,
    counterPartyChannelId: axelarToAgoricChannel,
  } = fetchedChainInfo.agoric.connections.axelar.transferChannel;

  const addressPayload = defaultAbiCoder.encode(
    ['address'],
    [evmAddress],
  );

  const base64AddressPayload = Buffer.from(addressPayload.slice(2), 'hex').toString('base64');

  // mock reply from ethereum
  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sequence: '1',
      amount: 1n,
      denom: 'uaxl',
      sender: makeTestAddress(),
      target: lcaAddress,
      receiver: lcaAddress,
      sourceChannel: axelarToAgoricChannel,
      destinationChannel: agoricToAxelarChannel,
      memo: JSON.stringify({
        source_chain: 'Ethereum',
        source_address: '0x19e71e7eE5c2b13eF6bd52b9E3b437bdCc7d43c8',
        destination_chain: 'agoric',
        destination_address: lcaAddress,
        payload: base64AddressPayload,
      }),
    }),
  );

  const previousOfferId =
    wallet.getCurrentWalletRecord().offerToUsedInvitation[0][0];

    t.log('checking if the EVM address has been properly stored')
    await makeEVMTransaction({
      wallet,
      previousOffer: previousOfferId,
      methodName: 'getEVMSmartWalletAddress',
      offerArgs: [],
      proposal: {},
    });
  
    // @ts-expect-error
    const evmSmartWalletAddress = wallet.getLatestUpdateRecord().status.result;
    t.deepEqual(evmAddress, evmSmartWalletAddress)
  
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        numWantsSatisfied: 1,
        result: evmAddress,
      },
    });

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'send',
    offerArgs: [
      {
        value: 'agoric1EOAAccAddress',
        chainId: 'agoriclocal',
        encoding: 'bech32',
      },
      { denom: 'ibc/1234', value: 10n },
    ],
    proposal: {},
  });

  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
    }),
  );

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: 'transfer success',
    },
  });

  t.log('send tokens via LCA');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: evmAddress,
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: null',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
    'sendGmp successful',
  ]);

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      result: 'sendGmp successful',
    },
  });

  t.log('make offer with 0 amount');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: evmAddress,
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 0n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error: 'Error: IBC transfer amount must be greater than zero',
      },
    });
  });

  t.log('make offer with unregistered vbank asset');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: evmAddress,
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { ATOM: { brand: ATOM, value: 1n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error:
          'Error: no denom detail for: "ibc/toyatom" on "agoric". ensure it is registered in chainHub.',
      },
    });
  });

  t.log('make contract calls via the LCA');
  t.context.storage.data.delete('published.axelarGmp.log');

  const newCountValue = 234;
  const encodedArgs = defaultAbiCoder.encode(['uint256'], [newCountValue]);

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: evmAddress,
        type: 1,
        gasAmount: 20000,
        destinationEVMChain: 'Ethereum',
        contractInvocationData: {
          functionSelector: utils.id('setCount(uint256)').slice(0, 10),
          deadline: 5000,
          nonce: 7,
          encodedArgs,
        },
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,136,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,160,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
    'Fee object {"amount":"20000","recipient":"axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd"}',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
    'sendGmp successful',
  ]);

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      result: 'sendGmp successful',
    },
  });

  t.log('make offer without contractInvocationData');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: evmAddress,
        type: 1,
        gasAmount: 20000,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error: 'Error: contractInvocationData is not defined',
      },
    });
  });

  t.log('make offer without passing gas amount');
  t.context.storage.data.delete('published.axelarGmp.log');

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: evmAddress,
        type: 1,
        destinationEVMChain: 'Ethereum',
        contractInvocationData: {
          functionSelector: utils.id('setCount(uint256)').slice(0, 10),
          deadline: 5000,
          nonce: 7,
          encodedArgs,
        },
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  }).catch(_err => {
    t.like(wallet.getLatestUpdateRecord(), {
      status: {
        id: `evmTransaction${evmTransactionCounter - 1}`,
        error: 'Error: gasAmount must be defined',
      },
    });
  });
});

test.skip('execute an arbitrary contract on agoric', async t => {
  const {
    wallet,
    bridgeUtils: { runInbound },
  } = t.context;

  const { BLD } = t.context.agoricNamesRemotes.brand;
  const previousOfferId =
    wallet.getCurrentWalletRecord().offerToUsedInvitation[0][0];

  await makeEVMTransaction({
    wallet,
    previousOffer: previousOfferId,
    methodName: 'callContract',
    offerArgs: [],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
      memo: '{}',
    }),
  );
});