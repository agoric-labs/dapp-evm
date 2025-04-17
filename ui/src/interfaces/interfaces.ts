import { makeAgoricWalletConnection } from '@agoric/web-components';
import { EVM_CHAINS } from '../config';

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

export interface CurrentOffer {
  liveOffers: Array<unknown>;
  offerToPublicSubscriberPaths: Array<unknown>;
  offerToUsedInvitation: Array<
    [
      string,
      {
        brand: unknown;
        value: Array<{
          description: string;
          handle: unknown;
          instance: unknown;
          installation: unknown;
        }>;
      },
    ]
  >;
  purses: Array<unknown>;
}

export interface OfferArgs {
  type: number;
  destinationEVMChain: (typeof EVM_CHAINS)[keyof typeof EVM_CHAINS];
  contractInvocationPayload: number[] | null;
  destAddr: string;
  amountToSend: number;
  gasAmount?: number;
}
export interface AppState {
  wallet?: Wallet;
  contractInstance?: unknown;
  brands?: Record<string, unknown>;
  balance: number;
  destinationEVMChain: keyof typeof EVM_CHAINS;
  evmAddress: string;
  amountToSend: number;
  loading: boolean;
  error?: string;
  type: number;
  gasAmount?: number;
  contractInvocationPayload?: number[];
  transactionUrl: string | null;
  tab: number;
  currentOffers: CurrentOffer | null;
}

export interface BalanceCheckParams {
  walletAddress: string;
  rpcUrl: string;
  tokenDenom: string;
}

export interface PayloadParams {
  type: number;
  chain: keyof typeof EVM_CHAINS;
  address: string;
}

export interface AxelarFeeObject {
  amount: string;
  recipient: string;
}

export interface AxelarMemo {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: number;
  fee?: AxelarFeeObject;
}

export interface AxelarQueryParams {
  transfersType: 'gmp' | 'transfers';
  searchParams: {
    address: string;
    sourceChain: string;
    destinationChain: string;
    fromTime: number;
    toTime?: number;
    asset?: string;
    senderAddress?: string;
    size?: number;
  };
}
