import { Fail, makeError, q } from '@endo/errors';
import { makeTracer, NonNullish } from '@agoric/internal';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow, ChainInfo, ChainHub} from '@agoric/orchestration';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {CosmosOrchestrationAccountKit} from '@agoric/orchestration/src/exos/cosmos-orchestration-account.js'
 * @import {LocalOrchestrationAccountKit} from '@agoric/orchestration/src/exos/local-orchestration-account.js';
 * @import {ZCFSeat} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ertp';
 */

const trace = makeTracer('TokenTransferFlow');
const { entries } = Object;

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 */
export const makeLocalAccount = async (orch) => {
  const agoricChain = await orch.getChain('agoric');
  return agoricChain.makeAccount();
};
harden(makeLocalAccount);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 */
export const makeNobleAccount = async (orch) => {
  const nobleChain = await orch.getChain('noble');
  return nobleChain.makeAccount();
};
harden(makeNobleAccount);

const denomForBrand = async (orch, brand) => {
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find((a) => a.brand === brand),
    `${brand} not registered in ChainHub`,
  );
  return denom;
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<ChainHub>} ctx.chainHub
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {Promise<GuestInterface<CosmosOrchestrationAccountKit['holder']>>} ctx.nobleAccountP
 * @param {Brand} ctx.NUSDC
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; destAddr: string }} offerArgs
 */
export const sendUSDC = async (
  orch,
  {
    chainHub,
    sharedLocalAccountP,
    nobleAccountP,
    NUSDC,
    zoeTools: { withdrawToSeat },
  },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;

  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);

  amt.brand != NUSDC || Fail`Brand is not NUSDC`;
  trace(`sending {${amt.value}} from ${chainName} to ${destAddr}`);
  const denom = await denomForBrand(orch, amt.brand);

  /** @type {ChainInfo} */
  const info = await chainHub.getChainInfo(chainName);

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  /**
   * Helper function to recover if IBC Transfer fails
   *
   * @param {Error} e
   */
  const recoverFailedTransfer = async (e) => {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    trace(`ERROR: ${errorMsg}`);
    seat.fail(errorMsg);
    throw makeError(errorMsg);
  };

  const nobleAccount = await nobleAccountP;
  const nobleAddr = nobleAccount.getAddress();
  const denomAmt = { denom, value: amt.value };
  try {
    await sharedLocalAccount.transfer(nobleAddr, denomAmt);
  } catch (e) {
    return recoverFailedTransfer(e);
  }
  trace('assets are now on noble');

  try {
    const destAccountId = /** @type {const} */ (
      `${info.namespace}:${info.reference}:${destAddr}`
    );
    await nobleAccount.depositForBurn(destAccountId, denomAmt);
  } catch (e) {
    try {
      // transfer back to agoric contract account if depositForBurn is not accepted by noble chain
      const lcaAddress = await sharedLocalAccount.getAddress();
      await nobleAccount.transfer(lcaAddress, denomAmt);
    } catch (err) {
      const errorMsg = `IBC Transfer from Noble back to LocalAccount failed: ${q(err)}`;
      trace(`🚨 contract upgrade required to recover funds: ${errorMsg}`);
      seat.fail(errorMsg);
      throw makeError(errorMsg);
    }
    return recoverFailedTransfer(e);
  }

  seat.exit();
  trace(`transfer complete, seat exited`);
};
harden(sendUSDC);
