## Steps to run locally

### 1. Run Agoric Local Chain

Start the `agoriclocal` chain:

```bash
docker run -d -p 26657:26657 -p 1317:1317 -p 9090:9090 ghcr.io/agoric/agoric-3-proposals:latest
```

### 2. Setup Hermes Relayer

We will set up Hermes relayer between:

- Agoric Local Chain (`agoriclocal`)
- Osmosis Testnet (`osmo-test-5`)

The Hermes relayer will facilitate IBC transfers between these chains. To proceed, install Hermes on your computer by following [this installation guide](https://hermes.informal.systems/quick-start/installation.html#install-by-downloading).

#### Running the Relayer

Once Hermes is installed, start the relayer:

```bash
yarn start:relayer
```

#### Verifying the Connection

Wait for a success message similar to the one below:

```bash
SUCCESS Channel {
    ordering: Unordered,
    a_side: ChannelSide {
        chain: BaseChainHandle {
            chain_id: ChainId {
                id: "agoriclocal",
                version: 0,
            },
            ...
        },
        client_id: ClientId("07-tendermint-0"),
        connection_id: ConnectionId("connection-0"),
        port_id: PortId("transfer"),
        channel_id: Some(ChannelId("channel-0")),
        version: None,
    },
    b_side: ChannelSide {
        chain: BaseChainHandle {
            chain_id: ChainId {
                id: "osmo-test-5",
                version: 5,
            },
            ...
        },
        client_id: ClientId("07-tendermint-4393"),
        connection_id: ConnectionId("connection-3835"),
        port_id: PortId("transfer"),
        channel_id: Some(ChannelId("channel-10104")),
        version: None,
    },
    connection_delay: 0ns,
}
```

#### Updating the Contract Configuration

Copy the following values from the success message for both Agoric Local Chain (`agoriclocal`) and Osmosis Testnet (`osmo-test-5`):

- `connection_id`
- `channel_id`
- `client_id`

Then, update these values in `contract/info.js`. This file stores the chain and channel details required for the contract proposal, ensuring the connection is properly registered with ChainHub.

### 3. Register Tokens: AUSDC and WAVAX

Navigate to [Agoric SDK](https://github.com/Agoric/agoric-sdk) directory and run:

```bash
agoric run multichain-testing/src/register-interchain-bank-assets.builder.js --assets='[{"denom":"ibc/<IBC-DENOM-FOR-TOKEN>","issuerName":"<NAME>","decimalPlaces":6}]'
```

Replace:

- `<IBC-DENOM-FOR-TOKEN>` → Use the correct IBC denomination of `AUSDC` and `WAVAX` on the local chain. You can use `getDenom.js` to check the IBC denomination on the local chain for reference.
- `<NAME>` → Set the proper issuer name.
- `decimalPlaces` → Make sure it's correct for each token.

Run this command once for `AUSDC` and again for `WAVAX`.

If the channel ID for Agoric's local chain is `channel-0`, use the following commands:

```bash
agoric run multichain-testing/src/register-interchain-bank-assets.builder.js --assets='[{"denom":"ibc/94EB1E9A676004E74ECF47F8E4BF183F4017CE0630A4D1AC7C7D9EB9CD6A3D53","issuerName":"AUSDC","decimalPlaces":6}]'
```

```bash
agoric run multichain-testing/src/register-interchain-bank-assets.builder.js --assets='[{"denom":"ibc/3C870A71004EAD01A29709B779FECBB9F150559B1276825584E149596BD450DE","issuerName":"WAVAX","decimalPlaces":18}]'
```

#### 1. Copy the Generated Files

This command will create some bundle files. Copy them to this project’s root folder.

#### 2. Register Token

After copying the files, run:

```bash
yarn register:token
```

#### 3. Verification

To verify if registration was successful, go to [VStorage](https://toliaqat.github.io/vstorage/?path=published.agoricNames.brand&endpoint=http%3A%2F%2Flocalhost%3A26657&height=null) and check if `AUSDC` and `WAVAX` is present under `published.agoricNames.brand` and `published.agoricNames.vbankAsset`.

You can also inspect local chain logs if something went wrong.

### 4. Deploy Axelar GMP Contract

Next, to deploy `contract/axelar-gmp.contract.js` on the Agoric Local Chain, make sure to generate the bundles:

```bash
agoric run contract/proposal/init-axelar-gmp.js
```

And then run the following command from the project root directory:

```bash
yarn deploy:contract
```

#### Important Note

The contract deployment script is `contract/deploy.sh`. If you're making changes to the contract and redeploying to see the updates, you may sometimes encounter an issue where the script deploys an older version of the contract instead of the latest changes.

If the expected changes don’t appear after deployment, try running `yarn deploy:contract` again.

### 5. Start the UI

To launch the contract UI, run:

```bash
yarn start:ui
```

Once the UI is live, connect your wallet and use it to send tokens and invoke EVM contracts.

If the transactions are successful, you can verify them on the respective block explorers:

🔹 **Osmosis Testnet Explorer** – Check the transaction for the recipient wallet:  
**`osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj`**  
🔗 [View on Mintscan](https://www.mintscan.io/osmosis-testnet/address/osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj)

🔹 **Axelar Scan** – Verify the transaction for the GMP wallet:  
**`axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5`**
🔗 [View on AxelarScan](https://testnet.axelarscan.io/account/axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5)
