import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import type { EncodeObject } from '@cosmjs/proto-signing';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import type {
  TransferConfig,
  TransferResult,
  SendToEthereumParams,
} from './types';
import { AGORIC_COIN_TYPE } from './config';
import { stringToPath } from '@cosmjs/crypto';

export class CosmosToEthereumTransfer {
  private config: TransferConfig;
  private wallet: DirectSecp256k1HdWallet | null = null;
  private senderAddress: string | null = null;
  private client: SigningStargateClient | null = null;

  constructor(config: TransferConfig) {
    this.config = {
      ...config,
    };
  }

  /**
   * Initialize the Cosmos wallet and signing client
   */
  async initialize(mnemonic: string): Promise<void> {
    const hdPath = (coinType = 118, account = 0) =>
      stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

    this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: this.config.agoricPrefix,
      hdPaths: [hdPath(AGORIC_COIN_TYPE, 0), hdPath(AGORIC_COIN_TYPE, 1)],
    });

    const accounts = await this.wallet.getAccounts();
    this.senderAddress = accounts[0].address;

    console.log(`Initialized wallet with address: ${this.senderAddress}`);

    this.client = await SigningStargateClient.connectWithSigner(
      this.config.agoricRpcUrl,
      this.wallet,
      {
        gasPrice: GasPrice.fromString('0.025ubld'),
      },
    );

    console.log(`Connected to Agoric RPC: ${this.config.agoricRpcUrl}`);
  }

  /**
   * Send tokens from Agoric to Ethereum
   */
  async sendToEthereum({
    recipientEthAddress,
    recipientCosmosHub,
    sourceChannel,
    amount,
    timeoutTimestamp,
  }: SendToEthereumParams): Promise<TransferResult> {
    if (!this.client || !this.senderAddress) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    console.log(
      `Preparing to send ${amount} ${this.config.denom} to Ethereum address: ${recipientEthAddress}`,
    );

    // Create the ICS20 transfer packet data
    const transferData = {
      denom: this.config.denom,
      amount: String(amount),
      sender: this.senderAddress,
      receiver: recipientEthAddress,
      memo: '',
    };

    // Create the packet payload
    const payload = {
      sourcePort: this.config.transferPort,
      destinationPort: this.config.transferPort,
      version: 'ics20-1',
      encoding: 'application/x-solidity-abi',
      value: Buffer.from(JSON.stringify(transferData), 'utf8'),
    };

    // Create the MsgSendPacket message
    const msgSendPacket: EncodeObject = {
      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
      // typeUrl: '/ibc.core.channel.v2.MsgSendPacket',
      value: {
        sourceClient: this.config.sourceClientId,

        payloads: [payload],
        signer: this.senderAddress,
        sourceChannel,
        token: {
          denom: this.config.denom,
          amount: String(amount),
        },
        timeoutTimestamp,
        sourcePort: 'transfer',
        sender: this.senderAddress,
        receiver: recipientCosmosHub,
      },
    };

    try {
      const balance = await this.client.getBalance(
        this.senderAddress,
        this.config.denom,
      );
      console.log(`Current balance: ${balance.amount} ${balance.denom}`);

      if (parseInt(balance.amount) < parseInt(String(amount))) {
        throw new Error(
          `Insufficient balance. Have: ${balance.amount}, Need: ${amount}`,
        );
      }

      const result = await this.client.signAndBroadcast(
        this.senderAddress,
        [msgSendPacket],
        {
          amount: [{ denom: this.config.denom, amount: '5000' }], // Gas fee
          gas: '1000000',
        },
        `Transfer ${amount} ${this.config.denom} to Ethereum`,
      );

      if (result.code === 0) {
        console.log('Transaction successful!');
        console.log(`Transaction hash: ${result.transactionHash}`);
        console.log(`Gas used: ${result.gasUsed}/${result.gasWanted}`);

        const sendPacketEvent = result.events.find(
          (e) => e.type === 'send_packet',
        );
        if (sendPacketEvent) {
          const sequence = sendPacketEvent.attributes.find(
            (a) => a.key === 'packet_sequence',
          )?.value;
          console.log(`Packet sequence: ${sequence}`);
        }

        return {
          success: true,
          txHash: result.transactionHash,
          gasUsed: result.gasUsed,
          events: result.events as readonly any[],
        };
      } else {
        console.error('Transaction failed:', result.rawLog);
        return {
          success: false,
          error: result.rawLog,
          code: result.code,
        };
      }
    } catch (error) {
      console.error('Error sending transaction:', error.message);
      throw error;
    }
  }

  async getBalance(denom: string) {
    if (!this.senderAddress || !this.client) {
      throw new Error(
        'Sender address or client not set. Call initialize() first.',
      );
    }

    const balance = await this.client.getBalance(this.senderAddress, denom);
    return balance;
  }

  async getAccountInfo() {
    if (!this.senderAddress || !this.client) {
      throw new Error(
        'Sender address or client not set. Call initialize() first.',
      );
    }

    const account = await this.client.getAccount(this.senderAddress);
    return account;
  }
}
