Cosmos-based blockchains can send tokens and do contract calls to EVM-based blockchains using Axelar’s General Message Passing (GMP). This is possible through the [IBC memo field](https://medium.com/the-interchain-foundation/moving-beyond-simple-token-transfers-d42b2b1dc29b), which carries instructions for the Axelar network to understand and forward the message. Here’s what the memo looks like in code:

```js
export enum GMPMessageType {
  ContractCall = 1,            // Call a contract
  ContractCallWithToken = 2,   // Call a contract with tokens
  TokenTransfer = 3,           // Just send tokens
}

export type AxelarFeeObject = {
  amount: string;               // How much to pay in fees
  recipient: Bech32Address;     // Who receives the fee
};

export type AxelarGmpOutgoingMemo = {
  destination_chain: string;     // Name of the target chain (like "Ethereum")
  destination_address: string;   // Address on the target chain
  payload: number[] | null;      // Data to be sent (e.g. for smart contract)
  type: GMPMessageType;          // Type of action
  fee?: AxelarFeeObject;         // Optional fee details
};

```

For `TokenTransfer`, you don’t need to include a `fee` in the memo. Axelar will deduct its fee from the tokens you’re sending.

For `ContractCall` or `ContractCallWithToken`, a fee must be included. This fee pays for Axelar to process, forward and execute the message on the destination chain. It must be estimated and added in advance. Read more about how transaction fees work in Axelar [over here](https://docs.axelar.dev/dev/gas-service/pricing/#transaction-pricing).
