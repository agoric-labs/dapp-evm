import React from 'react';
import { useAccount } from 'wagmi';
import { CounterForm } from './CounterForm';
import { ConnectMetaMask } from './ConnectMetaMask';
import { useEthersSigner } from '../Utils';

export const EVMContractForm = ({ tab }) => {
  const { address, isConnected, chain } = useAccount();

  console.log(`Connected Address: ${address}`);
  console.log(`Connected Chain: ${chain?.name}`);
  console.log(`Chain ID: ${chain?.id}`);

  const signer = useEthersSigner({ chainId: chain?.id });

  return (
    <>{isConnected ? <CounterForm signer={signer} /> : <ConnectMetaMask />}</>
  );
};
