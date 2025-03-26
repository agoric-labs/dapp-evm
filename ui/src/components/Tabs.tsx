import React from 'react';
import { useAppStore } from '../state';

export const Tabs = () => {
  const { tab } = useAppStore((state) => ({
    tab: state.tab,
  }));

  return (
    <div className='tabs'>
      <button
        className={`tab-button ${tab === 1 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            type: 3,
            evmAddress: '',
            destinationEVMChain: 'Ethereum',
            amountToSend: 0,
            loading: false,
            error: undefined,
            tab: 1,
          })
        }>
        Token Transfer
      </button>
      <button
        className={`tab-button ${tab === 2 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            type: 2,
            evmAddress: '',
            destinationEVMChain: 'Ethereum',
            amountToSend: 0,
            loading: false,
            error: undefined,
            tab: 2,
          })
        }>
        Contract Invocation
      </button>
      <button
        className={`tab-button ${tab === 4 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            tab: 3,
          })
        }>
        Make Account
      </button>
    </div>
  );
};
