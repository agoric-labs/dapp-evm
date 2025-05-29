export type TransferConfig = {
  rpcUrl: string;
  chainId: string;
  sourceClientId: string;
  transferPort: string;
  denom: string;
  prefix: string;
};

export type TransferResult = {
  success: boolean;
  txHash?: string;
  gasUsed?: bigint;
  events?: readonly any[];
  error?: string;
  code?: number;
};

export type SendToEthereumParams = {
  recipientEthAddress: string;
  recipientCosmosHub: string;
  sourceChannel: string;
  amount: number;
  timeoutTimestamp: number;
};
