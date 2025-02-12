## Steps to run locally

### 1. Run Agoric Local Chain

Start the `agoriclocal` chain:

```bash
docker run -d -p 26657:26657 -p 1317:1317 -p 9090:9090 ghcr.io/agoric/agoric-3-proposals:latest
```

### 2. Setup Hermes Relayer

We will set up a Hermes relayer between two chains:

- Agoric Local Chain (`agoriclocal`)
- Osmosis Testnet (`osmo-test-5`)

The Hermes relayer will facilitate IBC transfers between these chains. To proceed, install Hermes on your computer by following [this installation guide](https://hermes.informal.systems/quick-start/installation.html#install-by-downloading).

#### Running the Relayer

Once Hermes is installed, navigate to the `hermes` folder at the root of your project and execute the following script:

```bash
bash run-relayer.sh
```

This will start the relayer, establishing a connection between the Agoric local chain and the Osmosis testnet.

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

### 3. Deploy the Contract

To deploy `contract/axelar-gmp.contract.js` on the Agoric Local Chain, run the following command from the root of your project:

```bash
yarn deploy:contract
```

#### Important Note

The contract deployment script is `contract/deploy.sh`. If you're making changes to the contract and redeploying to see the updates, you may sometimes encounter an issue where the script deploys an older version of the contract instead of the latest changes.

If the expected changes don’t appear after deployment, try running the command again:

```bash
yarn deploy:contract

```

### 4. Start the UI

To launch the contract UI, run:

```bash
yarn start:ui
```

Once the UI is up, connect your wallet. You’ll see two input fields—one for an EVM address and another for the amount. You don’t need to enter these values for now; simply click `Send Tokens` to submit an offer of 1 IST to the contract offer handler. This is a temporary setup.

If the transaction is successful, you can verify it on the **Osmosis testnet block explorer** for the wallet `osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj`, where the funds are sent:

🔗 [Osmosis Testnet Explorer](https://www.mintscan.io/osmosis-testnet/address/osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj)

Similarly, you can check the transaction on **Axelar Scan** for the GMP wallet `axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5`:

🔗 [Axelar Testnet Explorer](https://testnet.axelarscan.io/account/axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5)
