export type TransferConfig = {
  agoricRpcUrl: string;
  agoricChainId: string;
  sourceClientId: string;
  transferPort: string;
  denom: string;
  agoricPrefix: string;
};

export type TransferResult = {
  success: boolean;
  txHash?: string;
  gasUsed?: bigint;
  events?: readonly any[];
  error?: string;
  code?: number;
};
