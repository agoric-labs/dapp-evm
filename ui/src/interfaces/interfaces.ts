import { makeAgoricWalletConnection } from '@agoric/web-components';
import { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import {
  SupportedDestinationChains,
  EVM_CHAINS,
  GMPMessageType,
} from 'contract/types';

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

export type ToastMessageOptions = {
  content: string;
  duration?: number;
};

export type AppState = {
  wallet?: Wallet;
  contractInstance?: unknown;
  brands?: Record<string, unknown>;
  destinationEVMChain: keyof typeof EVM_CHAINS;
  evmAddress: `0x${string}`;
  amountToSend: number;
  loading: boolean;
  error?: string;
  type: GMPMessageType;
  gasAmount?: number;
  transactionUrl: string | null;
  tab: number;
  currentOffers: CurrentWalletRecord | null;
};

export type PayloadParams = {
  type: number;
  chain: keyof typeof EVM_CHAINS;
  address: string;
};

export type AxelarQueryParams = {
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
};

export type GasEstimateParams = {
  destinationChain: SupportedDestinationChains;
  gasLimit: number;
  gasMuliplier: number;
};
