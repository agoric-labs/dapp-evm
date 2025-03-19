// @ts-check
import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { Fail } from '@endo/errors';
import { denomHash } from '@agoric/orchestration/src/utils/denomHash.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, Chain, ChainHub, OrchestrationAccount, CosmosChainInfo} from '@agoric/orchestration/src/types.js';
 */

const { entries } = Object;

const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

const channels = {
  AGORIC_XNET_TO_OSMOSIS: 'channel-6',
  AGORIC_DEVNET_TO_OSMOSIS: 'channel-61',
  OSMOSIS_TO_AXELAR: 'channel-4118',
};

/**
 * Creates a Local Chain Account (LCA)
 *
 * @param {Object} params - The parameters object.
 * @param {Chain<{ chainId: "agoric" }>} params.agoricChain - Agoric chain object.
 * @param {Chain<any>} params.remoteChain - Remote chain object.
 * @param {GuestInterface<ChainHub>} params.chainHub - The ChainHub interface for retrieving connection info.
 * @param {string} params.chainName - The name of the remote chain.
 * @param {import('./evm-tap-kit').MakeEvmTap} params.makeEvmTap - Function to create an EVM tap.
 * @returns {Promise<OrchestrationAccount<{ chainId: "agoric" }>>} A promise that resolves to the created OrchestrationAccount.
 */
const createLCA = async ({
  agoricChain: agoric,
  remoteChain,
  chainHub,
  chainName,
  makeEvmTap,
}) => {
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom ||
    Fail`${chainId || chainName} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  const localChainAddress = await localAccount.getAddress();
  console.log('Local Chain Address:', localChainAddress);

  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const { transferChannel } = await chainHub.getConnectionInfo(
    agoricChainId,
    chainId
  );

  assert(transferChannel.counterPartyChannelId, 'unable to find sourceChannel');

  const localDenom = `ibc/${denomHash({
    denom: remoteDenom,
    channelId: transferChannel.channelId,
  })}`;

  const tap = makeEvmTap({
    localAccount,
    localChainAddress,
    sourceChannel: transferChannel.counterPartyChannelId,
    remoteDenom,
    localDenom,
  });

  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);

  return localAccount;
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 *  @param {{
 *   zoeTools: GuestInterface<ZoeTools>
 *   makeEvmTap: import('./evm-tap-kit').MakeEvmTap;
 *   chainHub: GuestInterface<ChainHub>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   destinationAddress: string;
 *   type: number;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 *   contractInvocationPayload: number[];
 *   chainName: string
 * }} offerArgs
 */
export const makeAccountAndSendGMP = async (
  orch,
  { makeEvmTap, chainHub, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs
) => {
  const {
    destinationAddress,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationPayload,
    chainName,
  } = offerArgs;
  console.log('Inside sendIt');
  console.log(
    'Offer Args',
    JSON.stringify({
      destinationAddress,
      type,
      destinationEVMChain,
      gasAmount,
      contractInvocationPayload,
    })
  );

  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  console.log('_kw, amt', _kw, amt);

  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain(chainName),
  ]);

  console.log('Agoric Chain ID:', (await agoric.getChainInfo()).chainId);

  const assets = await agoric.getVBankAssetInfo();
  console.log(`Denoms: ${assets.map((a) => a.denom).join(', ')}`);

  const { denom } = NonNullish(
    assets.find((a) => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`
  );

  const osmosisChain = await orch.getChain('osmosis');
  console.log('Osmosis Chain ID:', (await osmosisChain.getChainInfo()).chainId);

  const info = await osmosisChain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  const localAccount = await createLCA({
    // @ts-ignore
    agoricChain: agoric,
    remoteChain,
    chainHub,
    chainName,
    makeEvmTap,
  });

  await localTransfer(seat, localAccount, give);
  console.log('After local transfer');

  const payload = type === 1 || type === 2 ? contractInvocationPayload : null;

  const memoToAxelar = {
    destination_chain: destinationEVMChain,
    destination_address: destinationAddress,
    payload,
    type,
  };

  if (type === 1 || type === 2) {
    memoToAxelar.fee = {
      amount: String(gasAmount),
      recipient: addresses.AXELAR_GAS,
    };
  }

  const memo = {
    forward: {
      receiver: addresses.AXELAR_GMP,
      port: 'transfer',
      channel: channels.OSMOSIS_TO_AXELAR,
      timeout: '10m',
      retries: 2,
      next: JSON.stringify(memoToAxelar),
    },
  };

  try {
    console.log(`Initiating IBC Transfer...`);
    console.log(`DENOM of token:${denom}`);

    await localAccount.transfer(
      {
        value: addresses.OSMOSIS_RECEIVER,
        encoding: 'bech32',
        chainId,
      },
      {
        denom,
        value: amt.value,
      },
      { memo: JSON.stringify(memo) }
    );

    console.log(`Completed transfer to ${destinationAddress}`);
  } catch (e) {
    await withdrawToSeat(localAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
};
harden(makeAccountAndSendGMP);
