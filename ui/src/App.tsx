import React, { useEffect } from 'react';
import './App.css';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import { AgoricContractForm } from './components/AgoricContractForm';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Logo from './components/Logo';
import gituhbLogo from '/github.svg';
import WalletStatus from './components/WalletStatus';
import { useAppStore } from './state';
import { Tabs } from './components/Tabs';
import { MakeAccount } from './components/MakeAccount';

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

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

  const { wallet, loading, tab } = useAppStore((state) => ({
    wallet: state.wallet,
    balance: state.balance,
    destinationEVMChain: state.destinationEVMChain,
    evmAddress: state.evmAddress,
    amountToSend: state.amountToSend,
    loading: state.loading,
    error: state.error,
    tab: state.tab,
  }));

  return (
    <div className='container'>
      <div className='view-source'>
        <a href='https://github.com/agoric-labs/dapp-evm' target='_blank'>
          <img src={gituhbLogo} className='github-logo' alt='Source Code' />
          Fork me on GitHub
        </a>
      </div>

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

      <Logo />

      {!wallet ? (
        <>
          <button
            className='connect-button'
            onClick={connectWallet}
            disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </>
      ) : (
        <>
          <div className='main-container'>
            <Tabs />
            <div className='content'>
              <WalletStatus address={wallet?.address} />
              {(tab === 1 || tab === 2) && <AgoricContractForm />}
              {tab === 3 && <MakeAccount />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
