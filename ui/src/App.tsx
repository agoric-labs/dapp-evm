import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { useAppStore } from './state';
import { ContentContainer } from './components/ContentContainer';
import { TopBar } from './components/Topbar';

const App = () => {
  useAppStore((state) => ({
    contractInstance: state.contractInstance,
    evmAddress: state.evmAddress,
    destinationEVMChain: state.destinationEVMChain,
    amountToSend: state.amountToSend,
    loading: state.loading,
    error: state.error,
    type: state.type,
    transactionUrl: state.transactionUrl,
    tab: state.tab,
    currentOffers: state.currentOffers,
    watcher: state.watcher,
    wallet: state.wallet,
    brands: state.brands,
    network: state.network,
  }));

  return (
    <>
      <TopBar />
      <div className="container">
        <ToastContainer
          position="bottom-right"
          hideProgressBar={false}
          newestOnTop={false}
          closeButton={false}
          closeOnClick
          autoClose={5000}
          rtl={false}
          pauseOnFocusLoss
          pauseOnHover
          theme="colored"
        ></ToastContainer>

        <ContentContainer />
      </div>
    </>
  );
};

export default App;
