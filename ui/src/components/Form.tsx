import React from 'react';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState, OfferArgs } from '../App';
import WalletStatus from './WalletStatus';
import { EVM_CHAINS } from '../config';

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
  } = useAppStore.getState();

  const makeOffer = () => {
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
        destinationEVMChain: EVM_CHAINS[destinationEVMChain],
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

  const buttonText = type === 3 ? 'Send Tokens' : 'Invoke Contract';

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
            disabled={
              loading || !evmAddress || !amountToSend || !destinationEVMChain
            }>
            {loading ? 'Processing...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};
