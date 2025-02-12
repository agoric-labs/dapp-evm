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

type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

interface OfferArgs {
  destAddr: string;
  type: number;
  destinationEVMChain: string;
  gasAmount?: number;
  contractInvocationPayload?: number[];
}
interface AppState {
  wallet?: Wallet;
  contractInstance?: unknown;
  brands?: Record<string, unknown>;
}

const useAppStore = create<AppState>(() => ({ contractInstance: null }));
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
  const { wallet, contractInstance, brands } = useAppStore.getState();
  if (!contractInstance) throw Error('No contract instance');

  console.log('Brands', brands);
  if (!(brands && brands.IST)) {
    throw Error('brands not available');
  }

  const offerArgs: OfferArgs = {
    type: 3,
    destAddr: '',
    destinationEVMChain: '',
  };

  const give = { IST: { brand: brands.IST, value: 1000000n } };

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

  const { wallet } = useAppStore(({ wallet }) => ({
    wallet,
  }));

  const tryConnectWallet = () => {
    connectWallet().catch((err) => {
      switch (err.message) {
        case 'KEPLR_CONNECTION_ERROR_NO_SMART_WALLET':
          alert('No smart wallet at that address');
          break;
        default:
          alert(err.message);
      }
    });
  };

  return (
    <>
      <h1 className='big-h1'>Orchestration</h1>
      <div className='card'>
        <button onClick={makeOffer}>Make Offer</button>
        {!wallet && <button onClick={tryConnectWallet}>Connect Wallet</button>}
      </div>
    </>
  );
}

export default App;
