// @ts-check
import { Fail } from "@endo/errors";
import { denomHash } from "@agoric/orchestration/src/utils/denomHash.js";
import { NonNullish } from '@agoric/internal';

const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeEvmTap} from './evm-tap-kit.js';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {MakePortfolioHolder} from '@agoric/orchestration/src/exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '@agoric/orchestration/src/exos/chain-hub.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeEvmTap: MakeEvmTap;
 *   makePortfolioHolder: MakePortfolioHolder;
 *   chainHub: GuestInterface<ChainHub>;
 *  zoeTools: GuestInterface<ZoeTools>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   chainName: string;
 * }} offerArgs
 */
export const createAndMonitorLCA = async (
  orch,
  { makeEvmTap, chainHub, zoeTools },
  seat,
  { chainName }
) => {
  seat.exit(); // no funds exchanged
  const [agoric, remoteChain] = await Promise.all([
    orch.getChain("agoric"),
    orch.getChain("axelar"),
  ]);
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom ||
    Fail`${chainId || chainName} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  const localChainAddress = await localAccount.getAddress();
  console.log("Local Chain Address:", localChainAddress);

  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const { transferChannel } = await chainHub.getConnectionInfo(
    agoricChainId,
    chainId
  );
  assert(transferChannel.counterPartyChannelId, "unable to find sourceChannel");

  const localDenom = `ibc/${denomHash({
    denom: remoteDenom,
    channelId: transferChannel.channelId,
  })}`;

  // Every time the `localAccount` receives `remoteDenom` over IBC, delegate it.
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

  
  const { give } = seat.getProposal();
  const [[_kw, amt]] = Object.entries(give);
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find((a) => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`
  );
  console.log('fraz 1');
  console.log( seat, localAccount, give);
  await zoeTools.localTransfer(seat, localAccount, give);
  console.log('fraz 2');
  
  const memoToAxelar = {
    destination_chain: 'Ethereum',
    destination_address: '0x5B34876FFB1656710fb963ecD199C6f173c29267',
    payload: [],
    type: 1,
    fee: {
      amount: '8000',
      recipient: addresses.AXELAR_GAS,
    }
  };
  
  console.log('fraz 3');
  
  await localAccount.transfer(
    {
      value: addresses.AXELAR_GMP,
      encoding: 'bech32',
      chainId,
    },
    {
      denom,
      value: amt.value,
    },
    { memo: JSON.stringify(memoToAxelar) }
  );
  
  console.log('fraz 4');

  return localChainAddress.value;
};
harden(createAndMonitorLCA);
