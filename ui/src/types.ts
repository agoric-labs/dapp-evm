import { makeAgoricWalletConnection } from '@agoric/web-components';
import { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import { GMPMessageType } from 'contract/types';
import { makeAgoricChainStorageWatcher } from '@agoric/rpc';
import { networkConfigs, EVM_CHAINS } from 'deploy/src/config';
import { Amount } from '@agoric/ertp';

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

export type SupportedDestinationChains = keyof typeof EVM_CHAINS;

export type ToastMessageOptions = {
  content: string;
  duration?: number;
};

export type AppState = {
  wallet: Wallet | null;
  contractInstance?: unknown;
  brands: Record<string, unknown> | null;
  destinationEVMChain: SupportedDestinationChains;
  evmAddress: `0x${string}`;
  amountToSend: number;
  loading: boolean;
  type: GMPMessageType;
  transactionUrl: string | null;
  tab: number;
  currentWalletRecord: CurrentWalletRecord | null;
  network: keyof typeof networkConfigs;
  watcher: ReturnType<typeof makeAgoricChainStorageWatcher> | null;
  error?: string;
  gasAmount?: number;
};

export type PayloadParams = {
  type: GMPMessageType;
  chain: SupportedDestinationChains;
  address: `0x${string}`;
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

export type OfferHandlerParams = {
  toastMessage: string;
  invitationSpec: any;
  proposal: any;
  offerArgs?: any;
  onSuccessMessage?: string;
};

export type OfferUpdate = {
  status: string;
  data?: unknown;
};

export type LatestInvitation =
  | [offerId: string, usedInvitation: Amount]
  | undefined;
