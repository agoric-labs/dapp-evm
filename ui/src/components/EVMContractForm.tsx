import React from 'react';
import { useAccount } from 'wagmi';
import { CounterForm } from './CounterForm';
import { ConnectMetaMask } from './ConnectMetaMask';
import { useEthersSigner } from '../Utils';
import { SafeForm } from './SafeForm';
import { SafeTransaction } from './SafeTransaction';

export const EVMContractForm = ({ tab }) => {
  const { address, isConnected, chain } = useAccount();

  console.log(`Connected Address: ${address}`);
  console.log(`Connected Chain: ${chain?.name}`);
  console.log(`Chain ID: ${chain?.id}`);
  console.log(`RPC: ${JSON.stringify(chain?.rpcUrls.default.http[0])}`);

  const signer = useEthersSigner({ chainId: chain?.id });

  let FormComponent;

  switch (tab) {
    case 3:
      FormComponent = <CounterForm signer={signer} />;
      break;
    case 4:
      FormComponent = <SafeForm signer={signer} />;
      break;
    case 5:
      FormComponent = <SafeTransaction signer={signer} />;
      break;
    default:
      throw Error('Invalid Tab');
  }

  return <>{!isConnected ? <ConnectMetaMask /> : FormComponent}</>;
};
