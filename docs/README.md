# Cross-Chain Messaging with Axelar GMP from Agoric to EVM

Cosmos-based blockchains can send tokens and do contract calls to EVM-based blockchains using Axelar’s General Message Passing (GMP). This is possible through the [IBC memo field](https://medium.com/the-interchain-foundation/moving-beyond-simple-token-transfers-d42b2b1dc29b), which carries instructions for the Axelar network to understand and forward the message.

## Memo Format for Axelar GMP

Here’s what the `memo` looks like in code:

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

### Fee Rules

- TokenTransfer(`type: 3`)
  For `TokenTransfer`, you don’t need to include a `fee` in the `memo`. Axelar will deduct its fee from the tokens you’re sending.

- ContractCall or ContractCallWithToken(`type: 1 | 2`)
  For `ContractCall` or `ContractCallWithToken`, a `fee` must be included. This `fee` pays for Axelar to process, forward and execute the message on the destination chain. It must be estimated and added in advance. Read more about how transaction fees work in Axelar [over here](https://docs.axelar.dev/dev/gas-service/pricing/#transaction-pricing).

## Message Flow

Once the memo is included in an IBC transaction, the message follows this flow:

### 1. **IBC Packet Handling**

The transaction begins on Agoric and includes a `memo` formatted with Axelar GMP instructions as described above. When submitted, the chain’s IBC module wraps the transaction data into an IBC packet. This packet is then emitted by the IBC module and picked up by the IBC Relayer. The relayer forwards the packet to the Axelar network, which itself is a Cosmos chain capable of understanding and processing the embedded GMP message.

---

### 2. **Axelar Processing**

Upon receiving the IBC packet, the Axelar blockchain validates its contents. This validation process checks details like the target chain, the destination contract address, the payload data, and any included fee information. If the packet passes validation, Axelar emits an internal event signaling that a message is ready for delivery to an EVM chain.

---

### 3. **EVM Relayer**

The off-chain Axelar EVM relayer monitors the Axelar chain for these internal events. When one is detected, the relayer prepares a cross-chain call and invokes the `callContract()` or `callContractWithToken` function on the [**Axelar Gateway**](https://github.com/axelarnetwork/axelar-cgp-solidity/blob/main/contracts/AxelarGateway.sol/) smart contract deployed on the destination EVM chain. It passes along the target address, the original payload (which contains the encoded smart contract call), and metadata about the originating chain and transaction. This step bridges the message from the Cosmos ecosystem into the EVM environment.

---

### 4. **Smart Contract Execution on Ethereum**

After the `callContract()` function is executed, the `Axelar Gateway` smart contract emits a `CallContract` event. This triggers the final leg of the journey: the target Ethereum smart contract is invoked with the decoded payload. The contract then executes the specified logic, completing the intended cross-chain operation.

---
