// @ts-check
import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { makeTracer, NonNullish } from '@agoric/internal';
import { atob, decodeBase64 } from '@endo/base64';
import { encode, decode } from '@findeth/abi';
import { Fail } from '@endo/errors';
import { ChainAddressShape } from '@agoric/orchestration';
import {
  buildGMPPayload,
  gmpAddresses,
  encodeCallData,
  GMPMessageType,
} from './utils/gmp.js';

const trace = makeTracer('EvmTap');
const { entries } = Object;

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {ChainAddress, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 */

/**
 * @typedef {{
 *   localAccount: OrchestrationAccount<{ chainId: 'agoric' }>;
 *   localChainAddress: ChainAddress;
 *   sourceChannel: IBCChannelID;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 *   assets: any;
 *   remoteChainInfo: any;
 * }} EvmTapState
 */

/**
 * @typedef {object} ContractInvocationData
 * @property {string} functionSelector - Function selector (4 bytes)
 * @property {string} encodedArgs - ABI encoded arguments
 * @property {number} deadline
 * @property {number} nonce
 */

const EVMI = M.interface('holder', {
  getAddress: M.call().returns(M.any()),
  getEVMSmartWalletAddress: M.call().returns(M.any()),
  send: M.call(M.any(), M.any()).returns(M.any()),
  sendGmp: M.call(M.any(), M.any()).returns(M.any()),
  fundLCA: M.call(M.any(), M.any()).returns(VowShape),
  callContractWithFunctionCalls: M.call().returns(VowShape),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
});

const EvmKitStateShape = {
  localChainAddress: ChainAddressShape,
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
  localAccount: M.remotable('OrchestrationAccount<{chainId:"agoric-3"}>'),
  assets: M.any(),
  remoteChainInfo: M.any(),
};
harden(EvmKitStateShape);

/**
 * @param {Zone} zone
 * @param {{
 *   zcf: ZCF;
 *   vowTools: VowTools;
 *   log: (msg: string) => Vow<void>;
 *   zoeTools: ZoeTools;
 * }} powers
 */
export const prepareEvmAccountKit = (
  zone,
  { zcf, vowTools, log, zoeTools }
) => {
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
          await this.state.localAccount.send(toAccount, amount);
          return 'transfer success';
        },

        /**
         * @param {ZCFSeat} seat
         * @param {{
         *   destinationAddress: string;
         *   type: number;
         *   destinationEVMChain: string;
         *   gasAmount: number;
         *   contractInvocationData: ContractInvocationData;
         * }} offerArgs
         */
        async sendGmp(seat, offerArgs) {
          void log('Inside sendGmp');
          const {
            destinationAddress,
            type,
            destinationEVMChain,
            gasAmount,
            contractInvocationData,
          } = offerArgs;

          destinationAddress != null ||
            Fail`Destination address must be defined`;
          destinationEVMChain != null ||
            Fail`Destination evm address must be defined`;

          const isContractInvocation = [1, 2].includes(type);
          if (isContractInvocation) {
            gasAmount != null || Fail`gasAmount must be defined`;
            contractInvocationData != null ||
              Fail`contractInvocationData is not defined`;

            ['functionSelector', 'encodedArgs', 'deadline', 'nonce'].every(
              (field) => contractInvocationData[field] != null
            ) ||
              Fail`Contract invocation payload is invalid or missing required fields`;
          }

          const { give } = seat.getProposal();

          const [[_kw, amt]] = entries(give);
          amt.value > 0n || Fail`IBC transfer amount must be greater than zero`;
          console.log('_kw, amt', _kw, amt);

          const payload = buildGMPPayload({
            type,
            evmContractAddress: destinationAddress,
            ...contractInvocationData,
          });
          void log(`Payload: ${JSON.stringify(payload)}`);

          const { denom } = NonNullish(
            this.state.assets.find((a) => a.brand === amt.brand),
            `${amt.brand} not registered in vbank`
          );

          console.log('amt and brand', amt.brand);

          const { chainId } = this.state.remoteChainInfo;

          const memo = {
            destination_chain: destinationEVMChain,
            destination_address: destinationAddress,
            payload,
            type,
          };

          if (type === 1 || type === 2) {
            memo.fee = {
              amount: String(gasAmount),
              recipient: gmpAddresses.AXELAR_GAS,
            };
            void log(`Fee object ${JSON.stringify(memo.fee)}`);
          }

          void log(`Initiating IBC Transfer...`);
          void log(`DENOM of token:${denom}`);

          await this.state.localAccount.transfer(
            {
              value: gmpAddresses.AXELAR_GMP,
              encoding: 'bech32',
              chainId,
            },
            {
              denom,
              value: amt.value,
            },
            { memo: JSON.stringify(memo) }
          );

          seat.exit();
          void log('sendGmp successful');
          return 'sendGmp successful';
        },
        /**
         * @param {ZCFSeat} seat
         * @param {any} give
         */
        fundLCA(seat, give) {
          seat.hasExited() && Fail`The seat cannot be exited.`;
          return zoeTools.localTransfer(seat, this.state.localAccount, give);
        },
        callContractWithFunctionCalls() {
          const targets = ['0x5B34876FFB1656710fb963ecD199C6f173c29267'];
          const data = [
            encodeCallData(
              'createVendor(string)',
              ['string'],
              ['ownerAddress']
            ),
          ];
          const payload = Array.from(
            encode(['address[]', 'bytes[]'], [targets, data])
          );

          return this.state.localAccount.transfer(
            {
              value: gmpAddresses.AXELAR_GMP,
              encoding: 'bech32',
              chainId: 'axelar',
            },
            {
              denom: 'ubld',
              value: BigInt(1000000),
            },
            {
              memo: JSON.stringify({
                destination_chain: 'Ethereum',
                destination_address: this.state.evmAccountAddress,
                payload,
                type: GMPMessageType.MESSAGE_ONLY,
                fee: {
                  amount: '1',
                  recipient: gmpAddresses.AXELAR_GAS,
                },
              }),
            }
          );
        },
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeEVMTransactionInvitation(method, args) {
          const continuingEVMTransactionHandler = async (seat) => {
            const { holder } = this.facets;
            switch (method) {
              case 'sendGmp': {
                return holder.sendGmp(seat, args[0]);
              }
              case 'getAddress': {
                const vow = holder.getAddress();
                return vowTools.when(vow, (res) => {
                  seat.exit();
                  return res;
                });
              }
              case 'getEVMSmartWalletAddress': {
                const vow = holder.getEVMSmartWalletAddress();
                return vowTools.when(vow, (res) => {
                  seat.exit();
                  return res;
                });
              }
              case 'send': {
                const vow = holder.send(args[0], args[1]);
                return vowTools.when(vow, (res) => {
                  seat.exit();
                  return res;
                });
              }
              case 'fundLCA': {
                const { give } = seat.getProposal();
                const vow = holder.fundLCA(seat, give);
                return vowTools.when(vow, (res) => {
                  seat.exit();
                  return res;
                });
              }
              case 'callContract': {
                const { give } = seat.getProposal();
                const vow = holder.fundLCA(seat, give);
                return vowTools.when(vow, async () => {
                  seat.exit();
                  return holder.callContractWithFunctionCalls();
                });
              }
              default:
                return 'Invalid method';
            }
          };

          return zcf.makeInvitation(
            continuingEVMTransactionHandler,
            'evmTransaction'
          );
        },
      },
    }
  );
};

/** @typedef {ReturnType<typeof prepareEvmAccountKit>} MakeEvmAccountKit */
/** @typedef {ReturnType<MakeEvmAccountKit>} EvmAccountKit */
