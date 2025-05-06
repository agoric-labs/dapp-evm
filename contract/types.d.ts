import type {
  OrchestrationAccount,
  ChainAddress,
  Denom,
} from '@agoric/orchestration';
import { IBCChannelID } from '@agoric/vats';

export enum GMPMessageType {
  ContractCall = 1,
  ContractCallWithToken = 2,
  TokenTransfer = 3,
}

export type AxelarGmpIncomingMemo = {
  source_chain: string;
  source_address: string;
  payload: string;
  type: GMPMessageType;
};

export type AxelarFeeObject = {
  amount: string;
  recipient: string;
};

export interface AxelarGmpOutgoingMemo {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: number;
  fee?: AxelarFeeObject;
}

export type EvmTapState = {
  localAccount: OrchestrationAccount<{ chainId: 'agoric' }>;
  localChainAddress: ChainAddress;
  sourceChannel: IBCChannelID;
  remoteDenom: Denom;
  localDenom: Denom;
  assets: any;
  remoteChainInfo: any;
};

export type ContractCall = {
  target: string;
  functionSignature: string;
  args: Array<unknown>;
};

export type AbiEncodedContractCall = {
  target: string;
  data: string;
};
