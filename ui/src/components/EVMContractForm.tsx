import React from 'react';
import { useAccount } from 'wagmi';
import { CounterForm } from './CounterForm';
import { ConnectMetaMask } from './ConnectMetaMask';
import { useEthersSigner } from '../Utils';
import { SafeForm } from './SafeForm';

export const EVMContractForm = ({ tab }) => {
  const { address, isConnected, chain } = useAccount();

  console.log(`Connected Address: ${address}`);
  console.log(`Connected Chain: ${chain?.name}`);
  console.log(`Chain ID: ${chain?.id}`);

  const signer = useEthersSigner({ chainId: chain?.id });

  let FormComponent;

  switch (tab) {
    case 3:
      FormComponent = <CounterForm signer={signer} />;
      break;
    case 4:
      FormComponent = <SafeForm signer={signer} />;
      break;
    default:
      throw Error('Invalid Tab');
  }

  return <>{!isConnected ? <ConnectMetaMask /> : FormComponent}</>;
};
