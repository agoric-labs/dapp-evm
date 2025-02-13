import React, { useEffect } from 'react';
import './App.css';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import { create } from 'zustand';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { checkBalance } from './Utils';
import WalletStatus from './components/WalletStatus';
import { tokens } from './config';

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

interface OfferArgs {
  type: number;
  destAddr: string;
  destinationEVMChain: string;
  gasAmount?: number;
  contractInvocationPayload?: number[];
}
interface AppState {
  wallet?: Wallet;
  contractInstance?: unknown;
  brands?: Record<string, unknown>;
  balance: number;
  destinationEVMChain: string;
  evmAddress: string;
  amountToSend: number;
  loading: boolean;
  error?: string;
  type: number;
}
const useAppStore = create<AppState>((set) => ({
  contractInstance: null,
  balance: 0,
  evmAddress: '',
  destinationEVMChain: '',
  amountToSend: 0,
  loading: false,
  error: undefined,
  type: 0,
}));

const setup = async () => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    (instances) => {
      console.log('got instances', instances);
      useAppStore.setState({
        contractInstance: instances.find(([name]) => name === 'axelarGmp')?.[1],
      });
    }
  );

  const { fromEntries } = Object;

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    (brands) => {
      console.log('Got brands', brands);
      useAppStore.setState({
        brands: fromEntries(brands),
      });
    }
  );
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });
};

const makeOffer = ({ giveValue = 1000000 }) => {
  const {
    wallet,
    contractInstance,
    brands,
    destinationEVMChain,
    evmAddress,
    amountToSend,
    type,
  } = useAppStore.getState();
  if (!contractInstance) throw Error('No contract instance');

  console.log('Brands', brands);
  if (!(brands && brands.IST)) {
    throw Error('brands not available');
  }

  let offerArgs: OfferArgs;
  let give;

  if (type === 3) {
    offerArgs = {
      type,
      destAddr: evmAddress,
      destinationEVMChain,
    };

    give = { IST: { brand: brands.IST, value: amountToSend * 1000000 } };
  } else {
    throw new Error('Invalid type: expected a value of 1, 2, or 3.');
  }

  wallet?.makeOffer(
    {
      source: 'contract',
      instance: contractInstance,
      publicInvitationMaker: 'makeSendInvitation',
    },
    { give },
    offerArgs,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      } else if (update.status === 'accepted') {
        alert('Offer accepted');
      } else if (update.status === 'refunded') {
        alert('Offer rejected');
      }
    }
  );
};

function App() {
  useEffect(() => {
    setup();
  }, []);

  const { wallet, balance, evmAddress, amountToSend, loading, error } =
    useAppStore((state) => ({
      wallet: state.wallet,
      balance: state.balance,
      evmAddress: state.evmAddress,
      amountToSend: state.amountToSend,
      loading: state.loading,
      error: state.error,
    }));

  useEffect(() => {
    if (!wallet) return;

    const updateBalance = async () => {
      const newBalance = await checkBalance({
        walletAddress: wallet.address,
        rpcUrl: ENDPOINTS.RPC,
        tokenDenom: tokens.aUSDCAgoricDevnet,
      });
      useAppStore.setState({ balance: newBalance });
    };

    const interval = setInterval(updateBalance, 15000);
    return () => clearInterval(interval);
  }, [wallet]);

  return (
    <div className='container'>
      {error && <div className='error'>{error}</div>}

      {!wallet ? (
        <>
          <h1 className='title'>Agoric to EVM Bridge</h1>
          <button
            className='connect-button'
            onClick={connectWallet}
            disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </>
      ) : (
        <>
          <div className='dashboard-container'>
            <WalletStatus address={wallet?.address} />
            <div className='dashboard'>
              <div className='balance'>
                <span className='label'>aUSDC Balance:</span>
                <span className='value'>{balance.toLocaleString()}</span>
              </div>

              <div className='transfer-form'>
                <div className='form-group'>
                  <label className='input-label'>To (EVM Address):</label>
                  <input
                    className='input-field'
                    value={evmAddress}
                    onChange={(e) =>
                      useAppStore.setState({ evmAddress: e.target.value })
                    }
                    placeholder='0x...'
                  />
                </div>

                <div className='form-group'>
                  <label className='input-label'>Amount:</label>
                  <input
                    className='input-field'
                    type='number'
                    value={amountToSend}
                    onChange={(e) =>
                      useAppStore.setState({ amountToSend: e.target.value })
                    }
                    placeholder='0.00'
                    min='0'
                    step='0.01'
                  />
                </div>

                <button
                  className='send-button'
                  onClick={makeOffer}
                  disabled={loading || !evmAddress || !amountToSend}>
                  {loading ? 'Processing...' : 'Send Tokens'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
