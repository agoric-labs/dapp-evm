import React from 'react';
import { useAccount, useConnect } from 'wagmi';

export const ConnectMetaMask = () => {
  const { connect, connectors } = useConnect();
  const { address, isConnected, chain } = useAccount();

  console.log(`Connected Address: ${address}`);
  console.log(`Connected Chain: ${chain?.name}`);
  console.log(`Chain ID: ${chain?.id}`);

  return (
    <div className='container'>
      {!isConnected && (
        <button
          className='connect-button'
          onClick={() => connect({ connector: connectors[0] })}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};
