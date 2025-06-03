import { useEffect } from 'react';
import { SupportedDestinationChains } from '../types';
import { TOAST_DURATION } from '../config';
import { showError } from '../Utils';
import { toast } from 'react-toastify';
import { useAccount, useConnect } from 'wagmi';
import metamaskLogo from '/metamask.svg';
import { useAppStore } from '../state';
import './GMPForm.css';
import { EVM_CHAINS } from 'deploy/src/config';

export const GMPForm = () => {
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();

  const {
    wallet,
    destinationEVMChain,
    evmAddress,
    amountToSend,
    loading,
    contractInstance,
    brands,
  } = useAppStore.getState();

  const makeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    let toastId: string | number | null = null;

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      useAppStore.setState({
        loading: true,
        transactionUrl: null,
      });

      const brandKey = 'NUSDC';
      if (!brands[brandKey]) throw new Error(`Brand ${brandKey} not available`);

      const offerArgs = {
        chainName: 'ethereum',
        destAddr: evmAddress,
      };

      const give = {
        [brandKey]: {
          brand: brands[brandKey],
          value: 1000_000,
        },
      };

      toastId = toast.info('Submitting transaction...', { isLoading: true });

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          {
            source: 'contract',
            instance: contractInstance,
            publicInvitationMaker: 'sendUSDC',
          },
          { give },
          offerArgs,
          (update: { status: string; data?: unknown }) => {
            switch (update.status) {
              case 'error':
                reject(new Error(`Offer error: ${update.data}`));
                break;
              case 'accepted':
                toast.success('Offer accepted!');
                resolve();
                break;
              case 'refunded':
                reject(new Error('Offer was rejected'));
                break;
            }
          },
        );
      });
    } catch (error) {
      showError({
        content: error instanceof Error ? error.message : String(error),
        duration: TOAST_DURATION.ERROR,
      });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      connect({ connector: connectors[0] });
    } else {
      useAppStore.setState({ evmAddress: address });
    }
  };

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    useAppStore.setState({
      amountToSend: Number(e.target.value),
    });
  };

  const handleAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
    useAppStore.setState({
      evmAddress: e.target.value as `0x${string}`,
    });
  };

  useEffect(() => {
    useAppStore.setState({
      amountToSend: 0,
      evmAddress: '0x',
    });
  }, []);

  const metaMaskButtonText = isConnected ? 'Fill With' : 'Connect';

  return (
    <form className="dark-form-container">
      <h2 className="dark-title">Send Tokens</h2>

      <select
        className="dark-dropdown"
        value={destinationEVMChain}
        onChange={(e) =>
          useAppStore.setState({
            destinationEVMChain: e.target.value as SupportedDestinationChains,
          })
        }
      >
        <option value="">Select Chain</option>
        {Object.keys(EVM_CHAINS).map((chain) => (
          <option key={chain} value={chain}>
            {chain}
          </option>
        ))}
      </select>

      <div className="form-group">
        <label className="input-label">EVM Address:</label>
        <div className="form-group-evm-address">
          <input
            className="input-field"
            value={evmAddress}
            onChange={handleAddress}
            placeholder="0x..."
          />
          <button onClick={handleConnect} className="metamask-button">
            <span>{metaMaskButtonText}</span>
            <img
              src={metamaskLogo}
              className="metamask-logo"
              alt="Metamask logo"
            />
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="input-label">Amount:</label>
        <input
          className="input-field"
          type="number"
          value={amountToSend}
          onChange={handleAmount}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      <button
        className="submit-button"
        onClick={makeOffer}
        disabled={
          loading || !evmAddress || !amountToSend || !destinationEVMChain
        }
      >
        {loading ? 'Processing...' : 'Send Tokens'}
      </button>
    </form>
  );
};
