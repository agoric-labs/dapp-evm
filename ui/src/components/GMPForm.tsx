import { useState, useEffect } from 'react';
import { AxelarQueryParams } from '../types';
import { AGORIC_PROXY_CONTRACT, BRAND_CONFIG, TOAST_DURATION } from '../config';
import {
  getAxelarTxURL,
  isValidEthereumAddress,
  showError,
  showSuccess,
} from '../Utils';
import { toast } from 'react-toastify';
import { useAccount, useConnect } from 'wagmi';
import metamaskLogo from '/metamask.svg';
import { useAppStore } from '../state';
import {
  SupportedDestinationChains,
  OfferArgs,
  ContractCall,
  GMPMessageType,
} from 'contract/types';
import './GMPForm.css';

export const EVM_CHAINS = ['Avalanche', 'Base', 'Ethereum'];

const prepareOfferArguments = async (
  type: number,
  destinationEVMChain: SupportedDestinationChains,
  destinationAddress: `0x${string}`,
  gasAmount: number,
): Promise<OfferArgs> => {
  console.log(
    'TODO: ensure prepareOfferArguments returns object conforming to (contract/types).OfferArgs',
  );

  const factoryContractAddress = '0xef8651dD30cF990A1e831224f2E0996023163A81';
  const contractInvocationData: Array<ContractCall> = [
    {
      functionSignature: 'createVendor(string)',
      args: ['ownerAddress'],
      target: factoryContractAddress,
    },
  ];

  return {
    type,
    destinationAddress,
    destinationEVMChain,
    contractInvocationData,
    gasAmount,
  };
};

const createQueryParameters = (
  type: GMPMessageType,
  timestamp: number,
  address: `0x${string}`,
  chain: SupportedDestinationChains,
): AxelarQueryParams => {
  const commonParams = {
    fromTime: timestamp,
    sourceChain: 'osmosis',
    destinationChain: chain,
  };

  return type === 3
    ? {
        transfersType: 'transfers',
        searchParams: {
          ...commonParams,
          address,
          asset: 'aUSDC',
        },
      }
    : {
        transfersType: 'gmp',
        searchParams: {
          ...commonParams,
          address: AGORIC_PROXY_CONTRACT[chain],
        },
      };
};

export const GMPForm = () => {
  const [gasInfo, setGasInfo] = useState('');
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
    type,
    transactionUrl,
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

      const config = BRAND_CONFIG[type];
      if (!config) throw new Error(`Invalid offer type: ${type}`);

      const requiredBrand = brands[config.brandKey];
      if (!requiredBrand)
        throw new Error(`Brand ${config.brandKey} not available`);

      if (config.needsEVMCheck && !isValidEthereumAddress(evmAddress)) {
        showError({
          content: 'Invalid Ethereum Address',
          duration: TOAST_DURATION.ERROR,
        });
        return;
      }

      const offerArgs = await prepareOfferArguments(
        type,
        destinationEVMChain,
        evmAddress,
        amountToSend,
      );

      const amountValue = BigInt(Number(amountToSend) * 10 ** config.decimals);

      const give = {
        [config.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      toastId = toast.info('Submitting transaction...', { isLoading: true });
      const transactionTime = Math.floor(Date.now() / 1000);

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          {
            source: 'contract',
            instance: contractInstance,
            publicInvitationMaker: 'makeSendInvitation',
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

      const queryParams = createQueryParameters(
        type,
        transactionTime,
        evmAddress,
        destinationEVMChain,
      );

      const txURL = await getAxelarTxURL(queryParams);
      if (!txURL) throw new Error('Failed to retrieve transaction URL');

      useAppStore.setState({ transactionUrl: txURL });
      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
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

  const viewTransaction = () => {
    if (transactionUrl) {
      window.open(transactionUrl as string, '_blank');
    } else {
      throw new Error('Transaction url is not defined');
    }
  };

  useEffect(() => {
    // TODO: Compute gas amount and then deduct it from amount to send
    if (type !== 3 && amountToSend !== 0) {
      const value = amountToSend * 1_000_000_000_000_000_000;
      const gas = 8000000000000000; // Temporarily hard-coded

      if (gas > value) {
        setGasInfo('Your amount after gas deduction is very low');
      } else {
        setGasInfo(
          `Net amount after gas fee: ${
            (value - gas) / 1_000_000_000_000_000_000
          }`,
        );
      }
    }
  });

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

  // Reset the global state when the component mounts
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
        {EVM_CHAINS.map((chain) => (
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
        {gasInfo !== '' && <p className="gas-message">{gasInfo}</p>}
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

      {transactionUrl && (
        <button className="view-transaction-button" onClick={viewTransaction}>
          View Transaction
        </button>
      )}
    </form>
  );
};
