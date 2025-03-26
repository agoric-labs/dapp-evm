//@ts-check
import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { makeTracer, NonNullish } from '@agoric/internal';
import { atob, decodeBase64 } from '@endo/base64';
import { ChainAddressShape } from '@agoric/orchestration';
import { decode } from '@findeth/abi';
// import { InvitationShape } from '@agoric/zoe/src/typeGuards';

const trace = makeTracer('EvmTap');

const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {AccountId, ChainAddress, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @typedef {{
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   localChainAddress: ChainAddress;
 *   sourceChannel: IBCChannelID;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 *   evmAccountAddress: AccountId | undefined;
 *   sendValue: any;
 * }} EvmTapState
 */

/** @type {TypedPattern<Omit<EvmTapState, 'evmAccountAddress'>>} */
const EvmTapInitStateShape = {
  localAccount: M.remotable('LocalOrchestrationAccount'),
  localChainAddress: ChainAddressShape,
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
  sendValue: M.any(),
  // updateAddress: M.call(M.string()).returns(M.undefined()),
};
harden(EvmTapInitStateShape);

/**
 * @param {Zone} zone
 * @param {{ vowTools: VowTools; zcf: ZCF }} powers
 */
export const prepareEvmAccountKit = (zone, { zcf }) => {
  return zone.exoClassKit(
    'EvmTapKit',
    {
      tap: M.interface('EvmTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      holder: M.interface('Holder', {
        asContinuingOffer: M.call().returns(),
        getPublicTopics: M.call().returns(),
        getAddress: M.call().returns(M.string()),
        callContract: M.call().returns(VowShape),
      }),
      invitationMakers: M.interface('invitationMakers', {
        CallContract: M.callWhen().returns(M.any()),
      }),
    },
    /**
     * @param {Omit<EvmTapState, 'evmAccountAddress'>} initialState
     * @returns {EvmTapState}
     */
    initialState => {
      mustMatch(initialState, EvmTapInitStateShape);
      return harden({ evmAccountAddress: undefined, ...initialState });
    },
    {
      tap: {
        /**
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );
          trace('receiveUpcall packet data', tx);
          const memo = JSON.parse(tx.memo);
          if (memo.source_chain === 'Ethereum') {
            const payload = decodeBase64(memo.payload);
            const decodedPayload = decode(['address'], payload);
            console.log('decoded:', decodedPayload);
            // todo: prepend with `eip155:${1,8453}:`
            this.state.evmAccountAddress = decodedPayload[0];
          }

          trace('receiveUpcall completed');

          // TODO: we will need more robust logic here to associate an evm call that expects a response to an outgoing request.
          // This isn't something we need to prioritize immediately. `packet-tools.js` and `ibc-packet.js` have good patterns
          // we can look at for inspiration
        },
      },
      holder: {
        // convention that returns { publicSubscribers, invitationMakers }
        // in the original makeAccount() invitation, we can use this for the return
        asContinuingOffer() {},
        // returns storage path the vstorage writer uses for this exo (once it exists)
        getPublicTopics() {},
        /**
         * Returns the Smart Contract Account address on the EVM Chain
         *
         * @returns {AccountId}
         * @throws {Error} if not initialized
         */
        getAddress() {
          return NonNullish(this.state.evmAccountAddress);
        },
        callContract() {
          // logic for voting, aka this.state.localAccount.transfer(...)
          // we cannot use async/await in this context, but we could reference
          // orchFns/flows to simplify the code. see `staking-combinations.contract.js`
          // as an example

          return this.state.localAccount.transfer(
            {
              value: addresses.AXELAR_GMP,
              encoding: 'bech32',
              chainId: 'axelar',
            },
            this.state.sendValue,
            {
              memo: JSON.stringify({
                destination_chain: 'Ethereum',
                destination_address: this.state.evmAccountAddress,
                payload: [],
                type: 1,
                fee: {
                  amount: '1',
                  recipient: addresses.AXELAR_GAS,
                },
              }),
            },
          );
        },
      },
      invitationMakers: {
        CallContract() {
          return zcf.makeInvitation((seat, _offerArgs) => {
            seat.exit(); // assuming no offer / exchange of funds
            return this.facets.holder.callContract();
          }, 'CallContract');
        },

      },
    },
  );
};

/** @typedef {ReturnType<typeof prepareEvmAccountKit>} MakeEvmAccountKit */
/** @typedef {ReturnType<MakeEvmAccountKit>} EvmAccountKit */
