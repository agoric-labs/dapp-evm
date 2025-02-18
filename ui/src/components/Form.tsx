import React from 'react';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState, OfferArgs } from '../App';
import WalletStatus from './WalletStatus';
import { AGORIC_PROXY_CONTRACT, EVM_CHAINS } from '../config';
import {
  AxelarQueryParams,
  getAxelarTxURL,
  getGasEstimate,
  getPayload,
  isValidEthereumAddress,
  showError,
  showSuccess,
} from '../Utils';
import { toast } from 'react-toastify';
interface Props {
  useAppStore: UseBoundStore<StoreApi<AppState>>;
}

const prepareOfferArguments = async (
  type: number,
  chain: keyof typeof EVM_CHAINS,
  address: string,
  amount: number
): Promise<OfferArgs> => {
  const contractPayload = getPayload({ type, chain });

  switch (type) {
    case 3:
      return {
        type,
        destAddr: address,
        destinationEVMChain: EVM_CHAINS[chain],
        contractInvocationPayload: contractPayload,
        amountToSend: amount * 1_000_000,
      };

    case 1:
    case 2: // Contract interaction transactions
      const gasAmount = await getGasEstimate({
        destinationChain: EVM_CHAINS[chain],
        gasLimit: 8000000000000000,
        gasMuliplier: 'auto',
      });

      return {
        type,
        destAddr: AGORIC_PROXY_CONTRACT[chain],
        destinationEVMChain: EVM_CHAINS[chain],
        contractInvocationPayload: contractPayload,
        gasAmount,
        amountToSend: gasAmount,
      };

    default:
      throw new Error(`Invalid transaction type: ${type}. Must be 1, 2, or 3.`);
  }
};

const createQueryParameters = (
  type: number,
  timestamp: number,
  address: string,
  chain: string
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

export const TokenForm = (props: Props) => {
  const { useAppStore } = props;

  const {
    wallet,
    destinationEVMChain,
    evmAddress,
    amountToSend,
    loading,
    balance,
    contractInstance,
    brands,
    type,
    transactionUrl,
  } = useAppStore.getState();

  const makeOffer = async () => {
    const toastId = toast.info('Submitting transaction...', {
      isLoading: true,
    });

    useAppStore.setState({
      transactionUrl: null,
    });

    console.log('Brands', brands);
    if (!(brands && brands.AUSDC)) {
      throw Error('brands not available');
    }

    const give = {
      AUSDC: {
        brand: brands.AUSDC,
        value: BigInt(amountToSend * 1000000),
      },
    };

    if (!isValidEthereumAddress(evmAddress)) {
      showError({ content: 'Invalid Ethereum Address', duration: 3000 });
      return;
    }
    if (!contractInstance) throw Error('No contract instance');

    const offerArgs = await prepareOfferArguments(
      type,
      destinationEVMChain,
      evmAddress,
      amountToSend
    );

    try {
      const transactionTime = Math.floor(Date.now() / 1000);

      // await simulateContractCall(offerArgs);

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
            toast.dismiss(toastId);
            alert(`Offer error: ${update.data}`);
          } else if (update.status === 'accepted') {
            alert('Offer accepted');
          } else if (update.status === 'refunded') {
            alert('Offer rejected');
            toast.dismiss(toastId);
          }
        }
      );

      const queryParams = createQueryParameters(
        type,
        transactionTime,
        evmAddress,
        destinationEVMChain
      );

      // TODO: handle failure cases too
      // TODO: check for valid URL
      const txURL = await getAxelarTxURL(queryParams);
      if (txURL) {
        toast.dismiss(toastId);
        showSuccess({
          content: 'Transaction Submitted Successfully',
          duration: 4000,
        });
        useAppStore.setState({ transactionUrl: txURL });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error(error);
      showError({ content: error.message, duration: 3000 });
    } finally {
      toast.dismiss(toastId);
    }
  };

  const buttonText = type === 3 ? 'Send Tokens' : 'Invoke Contract';
  let disableButton = true;
  if (type === 3) {
    disableButton = !evmAddress || !amountToSend || !destinationEVMChain;
  } else {
    disableButton = !evmAddress || !destinationEVMChain;
  }

  const viewTransaction = () => {
    if (transactionUrl) {
      window.open(transactionUrl as string, '_blank');
    } else {
      throw new Error('Transaction url is not defined');
    }
  };

  return (
    <div className='dashboard-container'>
      <WalletStatus address={wallet?.address} />
      <div className='dashboard'>
        <div className='balance'>
          <span className='label'>aUSDC Balance:</span>
          <span className='value'>{balance.toLocaleString()}</span>
        </div>

        <div className='transfer-form'>
          <div className='form-group'>
            <label className='input-label'>Select EVM Chain:</label>
            <select
              className='select-field'
              value={destinationEVMChain}
              onChange={(e) =>
                useAppStore.setState({
                  destinationEVMChain: e.target.value,
                })
              }>
              <option value='' disabled>
                Select a chain
              </option>
              <option value='Avalanche'>Avalanche</option>
              <option value='Ethereum'>Ethereum</option>
              <option value='Base'>Base</option>
            </select>
          </div>

          <div className='form-group'>
            {type === 3 ? (
              <label className='input-label'>To (EVM Address):</label>
            ) : (
              <label className='input-label'>EVM Contract Address:</label>
            )}
            <input
              className='input-field'
              value={evmAddress}
              onChange={(e) =>
                useAppStore.setState({ evmAddress: e.target.value })
              }
              placeholder='0x...'
            />
          </div>

          {type === 3 ? (
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
          ) : null}

          <button
            className='send-button'
            onClick={makeOffer}
            disabled={loading || disableButton}>
            {loading ? 'Processing...' : buttonText}
          </button>
        </div>
      </div>

      {transactionUrl && (
        <button className='view-transaction-button' onClick={viewTransaction}>
          View Transaction
        </button>
      )}
    </div>
  );
};
