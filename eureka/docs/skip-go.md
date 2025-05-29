## Skip:Go

Skip:Go is a set of tools and services that help users send tokens between Ethereum and Cosmos more easily.

It includes:

- **APIs** → So apps can create transactions easily.
- **Smart Contracts** → To handle fees and routing.
- **Smart Relayers** → To send messages between blockchains.
- **A fast-swap network (Go Fast)** → To give users instant tokens using liquidity pools.

### 1. Simplifies the Process

Normally, sending tokens from Ethereum to Cosmos (or vice versa) is complicated. It involves:

- Figuring out how to construct the transaction.
- Paying the right gas fees.
- Knowing which routes or channels to take.

Skip:Go hides all this complexity. It gives users:

- An API to generate the transaction they need.
- A status tracker so users can see where their transaction is in the process.

### 2. Handles Gas Fees in a Smart Way

Skip:Go uses smart contracts on both Ethereum and Cosmos to manage fee payments. It makes the user pay a relay fee in the same token being transferred

> If you're sending **ATOM** to Ethereum, part of your ATOM will be used to pay for the Ethereum gas fee.

**Why this matters:** Users don’t need to hold extra ETH just to pay Ethereum gas — Skip:Go takes care of it.

### 3. Powers the Smart Relay

Skip:Go includes a smart relay. In IBC classic, relayers are off-chain and hard to coordinate.

With Skip:Go, the relay is on-chain, more efficient, and doesn’t rely on third-party agreements.

## 4. Enables Fast Transfers with “Go Fast”

Ethereum finality takes 15–20 minutes. But users don’t always want to wait.

**Skip:Go** includes:

- A **Go Fast solver network**, like a **DEX-integrated liquidity pool**.
- If there’s liquidity available, users can get their tokens in **30 seconds or less** by swapping them on Cosmos right away.

This way you get **fast access** to your tokens without waiting for Ethereum to confirm.
