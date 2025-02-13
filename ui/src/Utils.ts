import {
  assertIsDeliverTxSuccess,
  SigningStargateClient,
  StargateClient,
} from '@cosmjs/stargate';
import {
  addresses,
  channels,
  COSMOS_CHAINS,
  EVM_CHAINS,
  evmAddresses,
  tokens,
  urls,
} from './config';
import { ethers } from 'ethers';
import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { OfferArgs } from './App';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { toast } from 'react-toastify';

interface BalanceCheckParams {
  walletAddress: string;
  rpcUrl: string;
  tokenDenom: string;
}

export const getSigner = async () => {
  const mnemonic = import.meta.env.VITE_MNEMONIC;

  if (!mnemonic) {
    console.error('Mnemonic not found in environment variables.');
    process.exit(1);
  }
  const Agoric = {
    Bech32MainPrefix: 'agoric',
    CoinType: 564,
  };
  const hdPath = (coinType = 118, account = 0) =>
    stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: Agoric.Bech32MainPrefix,
    hdPaths: [hdPath(Agoric.CoinType, 0), hdPath(Agoric.CoinType, 1)],
  });
};

export const checkBalance = async ({
  walletAddress,
  rpcUrl,
  tokenDenom,
}: BalanceCheckParams): Promise<number> => {
  try {
    const client = await StargateClient.connect(rpcUrl);
    const balances = await client.getAllBalances(walletAddress);

    console.log(`Balance for ${walletAddress}:`);
    if (balances.length === 0) {
      console.log('Account does not exist.');
      return 0;
    }

    for (let balance of balances) {
      if (tokenDenom == balance.denom) {
        return parseFloat(balance.amount) / 1_000_000;
      }
    }

    client.disconnect();
    return 0;
  } catch (error) {
    console.error(`Failed to fetch balance: ${error.message}`);
    return 0;
  }
};

export const isValidEthereumAddress = (address) => {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  return true;
};

const getType1Payload = ({ chain }) => {
  const LOGIC_CALL_MSG_ID = 0;
  const targetContractAddress = evmAddresses[chain]['4'];
  const nonce = 7; // TODO: update nonce logic
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const functionSelector = ethers.utils.id('setCount(uint256)').slice(0, 10);

  const abiCoder = new ethers.utils.AbiCoder();

  const newCountValue = 234;
  const encodedArgs = abiCoder.encode(['uint256'], [newCountValue]);

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      targetContractAddress,
      nonce,
      deadline,
      ethers.utils.hexlify(
        ethers.utils.concat([functionSelector, encodedArgs])
      ),
    ]
  );

  return Array.from(ethers.utils.arrayify(payload));
};

interface PayloadParams {
  type: number;
  chain: keyof typeof EVM_CHAINS;
}

export const getPayload = (params: PayloadParams) => {
  const { type, chain } = params;
  const abiCoder = new ethers.utils.AbiCoder();

  switch (type) {
    case 1:
      return getType1Payload({ chain });
    case 2:
      return Array.from(
        ethers.utils.arrayify(
          abiCoder.encode(
            ['address'],
            ['0x20E68F6c276AC6E297aC46c84Ab260928276691D']
          )
        )
      );
    case 3:
      return null;
    default:
      throw new Error('Invalid payload type');
  }
};

export const convertToAtomicUnits = (amount, decimals) => {
  return Math.ceil(amount * Math.pow(10, decimals));
};

export const getGasEstimate = async ({
  destinationChain,
  gasLimit,
  gasMuliplier,
}) => {
  const multiplier = gasMuliplier || 'auto';
  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
  const gasAmount = await api.estimateGasFee(
    COSMOS_CHAINS.osmosis,
    destinationChain,
    gasLimit,
    multiplier,
    'aUSDC'
  );
  const gasAmountUSDC = parseInt(gasAmount as string) / 1e6;
  console.log(`Estimated gas fee aUSDC: ${gasAmountUSDC}`);

  const usdcAtomic = convertToAtomicUnits(gasAmountUSDC, 6);
  console.log(`Estimated gas fee aUSDC: ${usdcAtomic} ATOMIC value`);

  return usdcAtomic;
};

interface AxelarFeeObject {
  amount: string;
  recipient: string;
}
interface AxelarMemo {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: number;
  fee?: AxelarFeeObject;
}

// Off-chain implementation for cross-chain EVM transactions.
// This is intended for development purposes only and will not be used in production.
export const simulateContractCall = async (offerArgs: OfferArgs) => {
  const {
    destAddr,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationPayload,
    amountToSend,
  } = offerArgs;

  console.log({
    destAddr,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationPayload,
  });

  const payload = type === 1 || type === 2 ? contractInvocationPayload : null;

  const memoToAxelar: AxelarMemo = {
    destination_chain: destinationEVMChain,
    destination_address: destAddr,
    payload,
    type,
  };

  if (type === 1 || type === 2) {
    memoToAxelar.fee = {
      amount: String(gasAmount),
      recipient: addresses.AXELAR_GAS,
    };
  }

  const memo = {
    forward: {
      receiver: addresses.AXELAR_GMP,
      port: 'transfer',
      channel: channels.OSMOSIS_TO_AXELAR,
      timeout: '10m',
      retries: 2,
      next: JSON.stringify(memoToAxelar),
    },
  };

  const signer = await getSigner();
  const accounts = await signer.getAccounts();
  const senderAddress = accounts[0].address;
  console.log('Sender Address:', senderAddress);

  const ibcMessage = [
    {
      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
      value: {
        sender: senderAddress,
        receiver: addresses.OSMOSIS,
        token: {
          denom: tokens.aUSDCAgoricDevnet,
          amount: String(amountToSend),
        },
        timeoutTimestamp: (Math.floor(Date.now() / 1000) + 600) * 1e9,
        sourceChannel: channels.AGORIC_DEVNET_TO_OSMOSIS,
        sourcePort: 'transfer',
        memo: JSON.stringify(memo),
      },
    },
  ];

  console.log('Connecting with Signer...');
  // TODO: sign transaction via Keplr
  const signingClient = await SigningStargateClient.connectWithSigner(
    urls.RPC_AGORIC_DEVNET,
    signer
  );

  console.log('Sign and Broadcast transaction...');

  const fee = {
    gas: '1000000',
    amount: [{ denom: tokens.nativeTokenAgoric, amount: '1000000' }],
  };

  const response = await signingClient.signAndBroadcast(
    senderAddress,
    ibcMessage,
    fee
  );

  assertIsDeliverTxSuccess(response);
  console.log('Transaction sent successfully. Response:', response);
};

export const showSuccess = ({ content, duration }) => {
  toast.success(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const showError = ({ content, duration }) => {
  toast.error(content, {
    position: 'top-right',
    // autoClose: duration,
  });
};

export const showWarning = ({ content, duration }) => {
  toast.warn(content, {
    position: 'top-right',
    autoClose: duration,
  });
};
