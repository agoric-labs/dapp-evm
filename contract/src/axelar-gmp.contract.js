import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import * as evmFlows from './evm.flows.js';
import { prepareEvmAccountKit } from './evm-account-kit.js';
import { makeTracer } from '@agoric/internal';
import {
  makeLocalAccount,
  makeNobleAccount as makeNobleAccountFlow,
  sendUSDC,
} from './token-transfer.flows.js';

/**
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {Amount} from '@agoric/ertp';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller, StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {ZCF} from '@agoric/zoe';
 */

const trace = makeTracer('AxelarGmp');

/** @type {TypedPattern<Amount<'nat'>>} */
const AnyNatAmountShape = {
  brand: M.remotable('Brand'),
  value: M.nat(),
};
harden(AnyNatAmountShape);

const SingleNatAmountRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);
harden(SingleNatAmountRecord);

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo: Record<string, CosmosChainInfo>;
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 *   storageNode: Remote<StorageNode>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (
  zcf,
  privateArgs,
  zone,
  { chainHub, orchestrateAll, vowTools, orchestrate, zoeTools },
) => {
  trace('Inside Contract');

  trace('Channel Info Agoric:');
  trace(privateArgs.chainInfo.agoric.connections);

  trace('Registering Chain and Assets....');
  const brands = zcf.getTerms().brands;
  registerChainsAndAssets(
    chainHub,
    brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );
  const makeLocalAccountFlow = orchestrate(
    'makeLocalAccount',
    {},
    makeLocalAccount,
  );
  /**
   * Set up a shared local account for use in async-flow functions. Typically,
   * exo initState functions need to resolve synchronously, but `makeOnce`
   * allows us to provide a Promise. When using this inside a flow, we must
   * await it to ensure the account is available for use.
   *
   * @type {any} sharedLocalAccountP expects a Promise but this is a vow UNTIL
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccountP = zone.makeOnce('localAccount', () =>
    makeLocalAccountFlow(),
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9066
  const logNode = E(privateArgs.storageNode).makeChildNode('log');
  /** @type {(msg: string) => Vow<void>} */
  const log = (msg) => vowTools.watch(E(logNode).setValue(msg));

  const makeEvmAccountKit = prepareEvmAccountKit(zone.subZone('evmTap'), {
    zcf,
    vowTools,
    log,
    zoeTools,
  });

  const { localTransfer, withdrawToSeat } = zoeTools;
  const { createAndMonitorLCA } = orchestrateAll(evmFlows, {
    makeEvmAccountKit,
    log,
    chainHub,
    localTransfer,
    withdrawToSeat,
  });

  const makeNobleAccount = orchestrate(
    'makeNobleAccountFlow',
    {},
    makeNobleAccountFlow,
  );

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9822.
  /** @type {any} nobleAccountP */
  const nobleAccountP = zone.makeOnce('nobleAccount', () => makeNobleAccount());
  // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
  const sendUSDCFlow = orchestrate(
    'sendUSDC',
    {
      chainHub,
      sharedLocalAccountP,
      nobleAccountP,
      NUSDC: brands.NUSDC,
      zoeTools,
    },
    sendUSDC,
  );

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      createAndMonitorLCA: M.callWhen().returns(M.any()),
      sendUSDC: M.callWhen().returns(M.any()),
    }),
    {
      createAndMonitorLCA() {
        return zcf.makeInvitation(
          createAndMonitorLCA,
          'makeAccount',
          undefined,
        );
      },
      sendUSDC() {
        return zcf.makeInvitation(
          sendUSDCFlow,
          'send',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
