import { M, mustMatch } from '@endo/patterns';
import { Fail } from "@endo/errors";
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob, decodeBase64 } from '@endo/base64';
import { decode, encode } from "@findeth/abi";
import { ChainAddressShape } from '@agoric/orchestration';
import { gmpAddresses, encodeCallData, GMPMessageType } from './utils/gmp';

const trace = makeTracer('EvmTap');

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {ChainAddress, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools';
 */

/**
 * @typedef {{
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   localChainAddress: ChainAddress;
 *   sourceChannel: IBCChannelID;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 * }} EvmTapState
 */

const EVMI = M.interface('holder', {
  getAddress: M.call().returns(M.any()),
  getEVMSmartWalletAddress: M.call().returns(M.any()),
  send: M.call(M.any(), M.any()).returns(M.any()),
  callContractWithFunctionCalls: M.call().returns(VowShape),
  fundLCA: M.call(M.any(), M.any()).returns(VowShape), // TODO: give proper types to args
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
  CallContractWithFunctionCalls: M.callWhen().returns(M.any()),
});

const EvmKitStateShape = {
  localChainAddress: ChainAddressShape,
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
  localAccount: M.remotable('OrchestrationAccount<{chainId:"agoric-3"}>'),
};
harden(EvmKitStateShape);

/**
 * @param {Zone} zone
 * @param {{ vowTools: VowTools; zcf: ZCF; zoeTools: ZoeTools }} powers
 */
export const prepareEvmAccountKit = (zone, { zcf, zoeTools, vowTools }) => {
  return zone.exoClassKit(
    'EvmTapKit',
    {
      tap: M.interface('EvmTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined())
        ),
      }),
      transferWatcher: M.interface('TransferWatcher', {
        onFulfilled: M.call(M.undefined())
          .optional(M.bigint())
          .returns(VowShape),
      }),
      holder: EVMI,
      invitationMakers: InvitationMakerI,
    },
    /** @param {EvmTapState} initialState */
    (initialState) => {
      mustMatch(initialState, EvmKitStateShape);
      return harden({
        evmAccountAddress: /** @type {string | undefined} */ (undefined),
        ...initialState,
      });
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
            const payloadBytes = decodeBase64(memo.payload);
            const decoded = decode(['address'], payloadBytes);
            trace(decoded);
            this.state.evmAccountAddress = decoded[0];
          }

          trace('receiveUpcall completed');
        },
      },
      transferWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} value the qty of uatom to delegate
         */
        onFulfilled(_result, value) {
          trace('onFulfilled _result:', JSON.stringify(_result));
          trace('onFulfilled value:', JSON.stringify(value));
          trace('onFulfilled state:', JSON.stringify(this.state));
        },
      },
      holder: {
        async getAddress() {
          // @ts-expect-error
          const localChainAddress = await this.state.localAccount.getAddress();
          return localChainAddress.value;
        },
        async getEVMSmartWalletAddress() {
          return this.state.evmAccountAddress;
        },

        /**
         * Sends tokens from the local account to a specified Cosmos chain
         * address.
         *
         * @param {import('@agoric/orchestration').ChainAddress} toAccount
         * @param {import('@agoric/orchestration').AmountArg} amount
         * @returns {Promise<string>} A success message upon completion.
         */
        async send(toAccount, amount) {
          // @ts-expect-error
          await this.state.localAccount.send(toAccount, amount);
          return 'transfer success';
        },
        callContractWithFunctionCalls() {
          const targets = ["0x5B34876FFB1656710fb963ecD199C6f173c29267"];
          const data = [
            encodeCallData("createVendor(string)", ["string"], ["ownerAddress"]),
          ];
          const payload = Array.from(
            encode(["address[]", "bytes[]"], [targets, data])
          );

          return this.state.localAccount.transfer(
            {
              value: gmpAddresses.AXELAR_GMP,
              encoding: "bech32",
              chainId: "axelar",
            },
            {
              denom: 'ubld',
              value: BigInt(1000000),
            },
            {
              memo: JSON.stringify({
                destination_chain: "Ethereum",
                destination_address: this.state.evmAccountAddress,
                payload,
                type: GMPMessageType.MESSAGE_ONLY,
                fee: {
                  amount: "1",
                  recipient: gmpAddresses.AXELAR_GAS,
                },
              }),
            }
          );
        },

        /**
         * @param {ZCFSeat} seat
         * @param {any} give
         */
        fundLCA(seat, give) {
          seat.hasExited() && Fail`The seat cannot have exited.`;
          return zoeTools.localTransfer(seat, this.state.localAccount, give);
        },
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeEVMTransactionInvitation(method, args) {
          const continuingEVMTransactionHandler = async (seat) => {
            const { holder } = this.facets;
            seat.exit();
            switch (method) {
              case 'getAddress':
                return holder.getAddress();
              case 'getEVMSmartWalletAddress':
                return holder.getEVMSmartWalletAddress();
              case 'send':
                return holder.send(args[0], args[1]);
              default:
                return 'Invalid method';
            }
          };

          return zcf.makeInvitation(
            continuingEVMTransactionHandler,
            'evmTransaction'
          );
        },
        CallContractWithFunctionCalls() {
          return zcf.makeInvitation((seat, _offerArgs) => {
            const { give } = seat.getProposal();
            const vow = this.facets.holder.fundLCA(seat, give);
            return vowTools.when(vow, () => {
              seat.exit();
              return this.facets.holder.callContractWithFunctionCalls();
            });
          }, "CallContractWithFunctionCalls");
        },
      },
    }
  );
};

/** @typedef {ReturnType<typeof prepareEvmAccountKit>} MakeEvmAccountKit */
/** @typedef {ReturnType<MakeEvmAccountKit>} EvmAccountKit */
