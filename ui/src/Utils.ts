import {
  assertIsDeliverTxSuccess,
  SigningStargateClient,
  StargateClient,
} from '@cosmjs/stargate';
import {
  addresses,
  channels,
  COSMOS_CHAINS,
  evmAddresses,
  tokens,
  urls,
} from './config';
import { ethers } from 'ethers';
import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { toast } from 'react-toastify';
import {
  BalanceCheckParams,
  PayloadParams,
  OfferArgs,
  AxelarMemo,
  AxelarQueryParams,
} from './interfaces/interfaces';

export const getSigner = async () => {
  const mnemonic = import.meta.env.VITE_MNEMONIC;

  if (!mnemonic) {
    throw new Error('Mnemonic not found in environment variables.');
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

    console.log(`Balance for ${walletAddress}: ${JSON.stringify(balances)}`);

    if (balances.length === 0) {
      console.log('Balances array is empty');
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
  const targetContractAddress = evmAddresses[chain]['2']; // TODO: Hardcoded for now
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

export const getPayload = (params: PayloadParams) => {
  const { type, chain, address } = params;
  const abiCoder = new ethers.utils.AbiCoder();

  switch (type) {
    case 1:
      return getType1Payload({ chain });
    case 2:
      return Array.from(
        ethers.utils.arrayify(abiCoder.encode(['address'], [address]))
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

export const wait = async (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

// Helpful for experimenting with different parameters:
// Visit https://docs.axelarscan.io/axelarscan
export const getAxelarTxURL = async ({
  transfersType,
  searchParams,
}: AxelarQueryParams) => {
  const isGmpQuery = transfersType === 'gmp' ? true : false;
  const url = isGmpQuery
    ? 'https://testnet.api.axelarscan.io/gmp/searchGMP'
    : 'https://testnet.api.axelarscan.io/token/searchTransfers';

  console.log(`Fetching from URL: ${url}`);
  console.log(`Query Params: ${JSON.stringify(searchParams)}`);

  const body = JSON.stringify(searchParams);
  const headers = {
    accept: '*/*',
    'content-type': 'application/json',
  };

  const startTime = Date.now();
  const pollingDurationMs = 3 * 60 * 1000; // 3 minutes
  let data: any = [];

  while (Date.now() - startTime < pollingDurationMs) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Axelar API Error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    data = result.data;
    console.log('Received Data:', data);

    if (Array.isArray(data) && data.length > 0) {
      break;
    }

    console.log('Data is empty, retrying...');
    await wait(10); // 10 seconds delay between retries
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      'Invalid response: Data is not an array or is empty after 3 minutes'
    );
  }

  // Sort the array by height in descending order (to get the transfer with the highest block height first)
  // We sort by height because the highest block number represents the most recent transfer.
  data.sort((a, b) =>
    isGmpQuery
      ? Number(b.call.blockNumber) - Number(a.call.blockNumber)
      : Number(b.send.height) - Number(a.send.height)
  );

  const urlSuffix = isGmpQuery ? data[0]?.call?._id : data[0]?.send?.txhash;

  if (!urlSuffix) {
    throw new Error('URL suffix is not defined');
  }

  const transactionUrl = isGmpQuery
    ? 'https://testnet.axelarscan.io/gmp/' + urlSuffix
    : 'https://testnet.axelarscan.io/transfer/' + urlSuffix;

  console.log('Transaction URL:', transactionUrl);
  return transactionUrl;
};
