import type {
  OrchestrationAccount,
  ChainAddress,
  Denom,
  Bech32Address,
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
  recipient: Bech32Address;
};

export type AxelarGmpOutgoingMemo = {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: number;
  fee?: AxelarFeeObject;
};

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
  target: `0x${string}`;
  functionSignature: string;
  args: Array<unknown>;
};

export type AbiEncodedContractCall = {
  target: `0x${string}`;
  data: `0x${string}`;
};

export const EVM_CHAINS = {
  Avalanche: 'Avalanche',
  Base: 'base-sepolia',
  Ethereum: 'ethereum-sepolia',
};

export type SupportedDestinationChains = keyof typeof EVM_CHAINS;

export type OfferArgs = {
  destinationAddress: `0x${string}`;
  type: GMPMessageType;
  destinationEVMChain: SupportedDestinationChains;
  gasAmount: number;
  contractInvocationData: ContractCall[];
};
