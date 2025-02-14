import React from 'react';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState, OfferArgs } from '../App';
import WalletStatus from './WalletStatus';
import { EVM_CHAINS, ONE_DAY_IN_SECONDS } from '../config';
import {
  AxelarQueryParams,
  getAxelarTxURL,
  getGasEstimate,
  getPayload,
  isValidEthereumAddress,
  showError,
  showSuccess,
  simulateContractCall,
  wait,
} from '../Utils';
import { toast } from 'react-toastify';
interface Props {
  useAppStore: UseBoundStore<StoreApi<AppState>>;
}

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

    let offerArgs: OfferArgs;
    // const give = { IST: { brand: brands.IST, value: amountToSend * 1000000 } };
    const contractPayload = getPayload({
      type,
      chain: destinationEVMChain,
    });

    if (!isValidEthereumAddress(evmAddress)) {
      showError({ content: 'Invalid Ethereum Address', duration: 3000 });
      return;
    }
    // if (!contractInstance) throw Error('No contract instance');

    // console.log('Brands', brands);
    // if (!(brands && brands.IST)) {
    //   throw Error('brands not available');
    // }

    if (type === 3) {
      offerArgs = {
        type,
        destAddr: evmAddress, // Wallet Address
        destinationEVMChain: EVM_CHAINS[destinationEVMChain],
        contractInvocationPayload: contractPayload,
        amountToSend: amountToSend * 1000000,
      };
    } else if (type === 1 || type === 2) {
      const gasAmount = await getGasEstimate({
        destinationChain: EVM_CHAINS[destinationEVMChain],
        gasLimit: 70000 + 200000 + 400000,
        gasMuliplier: 'auto',
      });

      offerArgs = {
        type,
        destAddr: evmAddress, // Contract Address
        destinationEVMChain: EVM_CHAINS[destinationEVMChain],
        contractInvocationPayload: contractPayload,
        gasAmount,
        amountToSend: gasAmount,
      };
    } else {
      throw new Error('Invalid type: expected a value of 1, 2, or 3.');
    }

    try {
      const transactionTime = Math.floor(Date.now() / 1000);
      await simulateContractCall(offerArgs);

      // wallet?.makeOffer(
      //   {
      //     source: 'contract',
      //     instance: contractInstance,
      //     publicInvitationMaker: 'makeSendInvitation',
      //   },
      //   { give },
      //   offerArgs,
      //   (update: { status: string; data?: unknown }) => {
      //     if (update.status === 'error') {
      //       alert(`Offer error: ${update.data}`);
      //     } else if (update.status === 'accepted') {
      //       alert('Offer accepted');
      //     } else if (update.status === 'refunded') {
      //       alert('Offer rejected');
      //     }
      //   }
      // );

      let params: AxelarQueryParams;
      if (type === 3) {
        params = {
          address: evmAddress,
          transfersType: 'transfers',
          // fromTime: transactionTime,
          fromTime: Math.floor(Date.now() / 1000) - ONE_DAY_IN_SECONDS,
          toTime: Math.floor(Date.now() / 1000),
        };
      } else {
        params = {
          address: '0x041FCDBDc2a3b87e765Eca96c3572A3AB8d2d173', // Axelar Proxy Contract
          transfersType: 'gmp',
          // fromTime: transactionTime,
          fromTime: Math.floor(Date.now() / 1000) - ONE_DAY_IN_SECONDS,
          toTime: Math.floor(Date.now() / 1000),
        };
      }

      // TODO: handle failure cases too
      // TODO: check for valid URL
      const txURL = await getAxelarTxURL(params);
      if (txURL) {
        toast.dismiss(toastId);
        showSuccess({
          content: 'Transaction Submitted Successfully',
          duration: 4000,
        });
        useAppStore.setState({
          transactionUrl: txURL,
        });
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
