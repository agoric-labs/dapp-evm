import React, { useState, useEffect } from 'react';
import contractABI from '../abi/safe.json';
import Safe, {
  SigningMethod,
  buildContractSignature,
} from '@safe-global/protocol-kit';
import { constants, ethers } from 'ethers';
import { showSuccess } from '../Utils';
import {
  DEMO_OWNER,
  DEMO_SAFE_ADDRESS,
  SAFE_FACTORY,
  TOAST_DURATION,
} from '../config';

interface Props {
  signer: any;
}

export const SafeTransaction = (props: Props) => {
  const [contractInstance, setContractInstance] = useState(null);
  const { signer } = props;

  const executeSafeTransaction = async () => {
    const rpcUrl = 'https://sepolia.drpc.org';

    console.log('Before Init...');
    // @ts-ignore
    const sdk = await Safe.init({
      safeAddress: DEMO_SAFE_ADDRESS,
      provider: rpcUrl,
      signer,
    });

    console.log('Preparing target contract call');
    const targetAddress = '0x78158e3B07C499aABaB55C0fe8Ba0Af5d7746CaB';
    const targetABI = ['function increment()'];
    const targetInterface = new ethers.utils.Interface(targetABI);
    const data = targetInterface.encodeFunctionData('increment');

    const transactionData = {
      to: targetAddress,
      data,
      value: '0',
    };

    try {
      console.log('Creating Safe transaction...');

      const nonce = await sdk.getNonce();
      console.log('Current nonce:', nonce);
      const safeTransaction = await sdk.createTransaction({
        transactions: [transactionData],
        options: {
          nonce,
          safeTxGas: '9543',
          baseGas: '50000',
          gasPrice: '150000',
          refundReceiver: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        },
      });
      console.log('Safe transaction created.');

      // Build Contract Signature
      const contractSignature = await buildContractSignature(
        Array.from(safeTransaction.signatures.values()),
        DEMO_OWNER
      );

      safeTransaction.addSignature(contractSignature);

      console.log('Signing Safe transaction...');
      const signedSafeTransaction = await sdk.signTransaction(
        safeTransaction,
        SigningMethod.ETH_SIGN
      );
      console.log('Signed Safe transaction.');

      console.log(
        'Executing Safe transaction...',
        JSON.stringify(signedSafeTransaction)
      );

      // https://github.com/safe-global/safe-core-sdk/blob/e86d0f32765083d5230442f683525b4d66236942/packages/testing-kit/contracts/safe_V1_2_0/GnosisSafe.sol#L114
      const result = await sdk.executeTransaction(signedSafeTransaction);
      console.log('Safe transaction executed.', result);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!signer) return;

    const fetchContract = async () => {
      try {
        const contract = new ethers.Contract(SAFE_FACTORY, contractABI, signer);
        setContractInstance(contract);
      } catch (error) {
        console.error('Failed to load contract:', error);
      }
    };

    fetchContract();
  }, [signer]);

  const handleTransaction = async () => {
    const rpcUrl = 'https://sepolia.drpc.org';

    console.log('Before Init...');
    // @ts-ignore
    const sdk = await Safe.init({
      safeAddress: DEMO_SAFE_ADDRESS,
      provider: rpcUrl,
      signer:
        '9fb35c872c756a8363bd5ec39c573157d5540490174684b94af1cbd36fa9c7c8',
    });

    console.log('Preparing target contract call');
    const targetAddress = '0x78158e3B07C499aABaB55C0fe8Ba0Af5d7746CaB';
    const targetABI = ['function increment()'];
    const targetInterface = new ethers.utils.Interface(targetABI);
    const data = targetInterface.encodeFunctionData('increment');

    const transactionData = {
      to: targetAddress,
      data,
      value: '0',
    };

    try {
      console.log('Creating Safe transaction...');

      const nonce = await sdk.getNonce();
      console.log('Current nonce:', nonce);
      const safeTransaction = await sdk.createTransaction({
        transactions: [transactionData],
        options: {
          nonce,
          safeTxGas: '9543',
          baseGas: '50000',
          gasPrice: '150000',
          refundReceiver: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        },
      });
      console.log('Safe transaction created.');

      // Build Contract Signature
      console.log('Building contract signature...');
      const contractSignature = await buildContractSignature(
        Array.from(safeTransaction.signatures.values()),
        DEMO_OWNER
      );
      safeTransaction.addSignature(contractSignature);
      console.log('Contract signature built.');

      console.log('Transaction Data:', JSON.stringify(safeTransaction));
      const tx = await contractInstance.executeSafeTransaction(
        DEMO_SAFE_ADDRESS,
        {
          ...safeTransaction.data,
          signatures: safeTransaction.signatures,
        }
      );
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Receipt:', JSON.stringify(receipt));
    } catch (error) {
      console.error(error);
    }
  };

  const makeTransaction = async () => {
    try {
      console.log('Making transaction...');

      const ZERO_ADDRESS = constants.AddressZero;
      const counterContractAddress =
        '0x76e1b76A6643aCac6Cce34692Cc9F7c9Aa63D911';

      const iface = new ethers.utils.Interface(['function increment() public']);
      const encodedData = iface.encodeFunctionData('increment', []);

      const executionData = {
        to: counterContractAddress,
        value: 0,
        data: encodedData,
        operation: 0,
        safeTxGas: 500000,
        baseGas: 50000,
        gasPrice: ethers.utils.parseUnits('20', 'gwei'), // Adjusted to a reasonable gas price
        gasToken: ZERO_ADDRESS,
        refundReceiver: ZERO_ADDRESS,
      };

      const tx = await contractInstance.executeSafeTransaction(
        '0xeab9959dEbb456be27A0A0A095FB780B6a0645Cc',
        executionData
      );
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Receipt:', JSON.stringify(receipt));

      showSuccess({
        content: 'Transaction Successful',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      console.error('Failed to execute transaction:', error);
    }
  };

  return (
    <div className='dashboard-container'>
      <div className='dashboard'>
        <div className='transfer-form'>
          <button className='invoke-button' onClick={handleTransaction}>
            Make Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
