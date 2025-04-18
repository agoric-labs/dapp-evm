import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { BridgeId } from '@agoric/internal';
import fetchedChainInfo from './utils/fetched-chain-info.js';
import { defaultAbiCoder } from '@ethersproject/abi';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { ContinuingInvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import type { ExecutionContext, TestFn } from 'ava';
import { makeWalletFactoryContext } from './utils/walletFactory.js';
import type { SmartWalletDriver } from './utils/drivers.js';

type MakeEVMTransactionParams = {
  wallet: SmartWalletDriver;
  previousOffer: string;
  methodName: string;
  offerArgs: any;
  proposal: any;
};

type AxelarGmpMemo = {
  source_chain: string;
  source_address: string;
  payload: string;
  type: 1 | 2 | 3;
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
  };

  return fullCtx;
};

let evmTransactionCounter = 0;
let previousOffer = '';
let lcaAddress = '';

const makeEVMTransaction = async ({
  wallet,
  methodName,
  offerArgs,
  proposal,
}: MakeEVMTransactionParams) => {
  const id = `evmTransaction${evmTransactionCounter}`;

  const proposeInvitationSpec: ContinuingInvitationSpec = {
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

test.before(async (t) => {
  t.context = await makeTestContext(t);

  const { evalProposal, buildProposal } = t.context;
  // Register AXL in vbankAssets
  await evalProposal(
    buildProposal(
      '../test/asset-builder/register-interchain-bank-assets.builder.js',
      [
        '--assets',
        JSON.stringify([
          {
            denom:
              'ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0',
            issuerName: 'AXL',
            decimalPlaces: 6,
          },
        ]),
      ],
    ),
  );

  await evalProposal(
    buildProposal('../src/init-axelar-gmp.js', [
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

test.beforeEach((t) => {
  t.context.storage.data.delete('published.axelarGmp.log');
});

test.serial('makeAccount via axelarGmp', async (t) => {
  const {
    storage,
    wallet,
    bridgeUtils: { runInbound },
  } = t.context;

  t.log('execute makeAccount');
  const { BLD } = t.context.agoricNamesRemotes.brand;

  await wallet.sendOffer({
    id: 'axelarMakeAccountCall',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['createAndMonitorLCA']],
    },
    proposal: {
      // @ts-ignore
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
    'Initiating IBC transfer',
  ]);

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

  t.deepEqual(getLogged(), [
    'Inside createAndMonitorLCA',
    'localAccount created successfully',
    'tap created successfully',
    'Monitoring transfers setup successfully',
    'Initiating IBC transfer',
    'Done',
  ]);

  previousOffer = wallet.getCurrentWalletRecord().offerToUsedInvitation[0][0];
});

test.serial('get lca address', async (t) => {
  const { wallet } = t.context;

  await makeEVMTransaction({
    wallet,
    previousOffer,
    methodName: 'getLocalAddress',
    offerArgs: [],
    proposal: {},
  });

  // @ts-expect-error
  lcaAddress = wallet.getLatestUpdateRecord().status.result;
  t.truthy(lcaAddress);
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: lcaAddress,
    },
  });
});

test.serial('receiveUpCall test', async (t) => {
  const {
    wallet,
    bridgeUtils: { runInbound },
  } = t.context;

  const {
    channelId: agoricToAxelarChannel,
    counterPartyChannelId: axelarToAgoricChannel,
  } = fetchedChainInfo.agoric.connections.axelar.transferChannel;

  const payload = defaultAbiCoder.encode(
    ['address'],
    ['0x20E68F6c276AC6E297aC46c84Ab260928276691D'],
  );

  const base64Payload = Buffer.from(payload.slice(2), 'hex').toString('base64');

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
        payload: base64Payload,
        type: 1,
      } satisfies AxelarGmpMemo),
    }),
  );

  await makeEVMTransaction({
    wallet,
    previousOffer,
    methodName: 'getAddress',
    offerArgs: [],
    proposal: {},
  });

  // @ts-expect-error
  const evmSmartWalletAddress = wallet.getLatestUpdateRecord().status.result;
  t.truthy(evmSmartWalletAddress);

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: evmSmartWalletAddress,
    },
  });
});

test.serial('make offers using the lca', async (t) => {
  const { wallet } = t.context;

  await makeEVMTransaction({
    wallet,
    previousOffer,
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

  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: `evmTransaction${evmTransactionCounter - 1}`,
      numWantsSatisfied: 1,
      result: 'transfer success',
    },
  });
});

test.serial('token transfers using lca', async (t) => {
  const { storage, wallet } = t.context;
  const { BLD } = t.context.agoricNamesRemotes.brand;

  await makeEVMTransaction({
    wallet,
    previousOffer,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 3,
        destinationEVMChain: 'Ethereum',
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

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

  await t.throwsAsync(
    makeEVMTransaction({
      wallet,
      previousOffer,
      methodName: 'sendGmp',
      offerArgs: [
        {
          destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
          type: 3,
          destinationEVMChain: 'Ethereum',
        },
      ],
      proposal: {
        give: { BLD: { brand: BLD, value: 0n } },
      },
    }),
    { message: /IBC transfer amount must be greater than zero/ },
  );
});

test.serial('make contract calls using lca', async (t) => {
  const { wallet, storage } = t.context;
  const { BLD } = t.context.agoricNamesRemotes.brand;

  await makeEVMTransaction({
    wallet,
    previousOffer,
    methodName: 'sendGmp',
    offerArgs: [
      {
        destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        type: 1,
        gasAmount: 20000,
        destinationEVMChain: 'Ethereum',
        contractInvocationData: {
          functionSelector: 'setCount(uint256)',
          argType: 'uint256',
          argValue: 234,
        },
      },
    ],
    proposal: {
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Payload: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,32,230,143,108,39,106,198,226,151,172,70,200,74,178,96,146,130,118,105,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,209,78,98,184,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
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

  await t.throwsAsync(
    makeEVMTransaction({
      wallet,
      previousOffer,
      methodName: 'sendGmp',
      offerArgs: [
        {
          destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
          type: 1,
          gasAmount: 20000,
          destinationEVMChain: 'Ethereum',
        },
      ],
      proposal: {
        give: { BLD: { brand: BLD, value: 1n } },
      },
    }),
    {
      message: /contractInvocationData is not defined/,
    },
  );

  t.log('make offer without passing gas amount');

  await t.throwsAsync(
    makeEVMTransaction({
      wallet,
      previousOffer,
      methodName: 'sendGmp',
      offerArgs: [
        {
          destinationAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
          type: 1,
          destinationEVMChain: 'Ethereum',
          contractInvocationData: {
            functionSelector: 'setCount(uint256)',
            argType: 'uint256',
            argValue: 234,
          },
        },
      ],
      proposal: {
        give: { BLD: { brand: BLD, value: 1n } },
      },
    }),
    {
      message: /gasAmount must be defined/,
    },
  );
});
