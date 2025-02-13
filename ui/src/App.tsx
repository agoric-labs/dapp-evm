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
import { EVM_CHAINS, tokens } from './config';
import { TokenForm } from './components/Form';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

export interface OfferArgs {
  type: number;
  destinationEVMChain: (typeof EVM_CHAINS)[keyof typeof EVM_CHAINS];
  contractInvocationPayload: number[] | null;
  destAddr: string;
  amountToSend: number;
  gasAmount?: number;
}
export interface AppState {
  wallet?: Wallet;
  contractInstance?: unknown;
  brands?: Record<string, unknown>;
  balance: number;
  destinationEVMChain: keyof typeof EVM_CHAINS;
  evmAddress: string;
  amountToSend: number;
  loading: boolean;
  error?: string;
  type: number;
  gasAmount?: number;
  contractInvocationPayload?: number[];
  transactionUrl: string | null;
}
const useAppStore = create<AppState>((set) => ({
  contractInstance: null,
  balance: 0,
  evmAddress: '',
  destinationEVMChain: 'Avalanche',
  amountToSend: 0,
  loading: false,
  error: undefined,
  type: 3,
  transactionUrl: null,
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

function App() {
  useEffect(() => {
    setup();
  }, []);

  const { wallet, loading, type } = useAppStore((state) => ({
    wallet: state.wallet,
    balance: state.balance,
    destinationEVMChain: state.destinationEVMChain,
    evmAddress: state.evmAddress,
    amountToSend: state.amountToSend,
    loading: state.loading,
    error: state.error,
    type: state.type,
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
      <ToastContainer
        aria-label
        position='bottom-right'
        hideProgressBar={false}
        newestOnTop={false}
        closeButton={false}
        closeOnClick
        autoClose={5000}
        rtl={false}
        pauseOnFocusLoss
        pauseOnHover
        theme='colored'></ToastContainer>

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
          <div className='tabs'>
            <button
              className={`tab-button ${type === 3 ? 'active' : ''}`}
              onClick={() =>
                useAppStore.setState({
                  type: 3,
                  evmAddress: '',
                  destinationEVMChain: 'Avalanche',
                  amountToSend: 0,
                  loading: false,
                  error: undefined,
                })
              }>
              Token Transfer
            </button>
            <button
              className={`tab-button ${type === 1 ? 'active' : ''}`}
              onClick={() =>
                useAppStore.setState({
                  type: 1,
                  evmAddress: '',
                  destinationEVMChain: 'Avalanche',
                  amountToSend: 0,
                  loading: false,
                  error: undefined,
                })
              }>
              Contract Invocation
            </button>
          </div>

          <TokenForm useAppStore={useAppStore} />
        </>
      )}
    </div>
  );
}

export default App;
