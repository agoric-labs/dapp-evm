import React, { useState, useEffect } from 'react';
import contractABI from '../abi/safe.json';
import { ethers, constants } from 'ethers';
import { showSuccess } from '../Utils';
import { TOAST_DURATION } from '../config';

interface Props {
  signer: any;
}

export const SafeTransaction = (props: Props) => {
  const [contractInstance, setContractInstance] = useState(null);
  const { signer } = props;

  useEffect(() => {
    if (!signer) return;

    const fetchContract = async () => {
      try {
        const contractAddress = '0xD02b28E85F1484D82535ce1f556DFbDc8a3B8332';
        const contract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        setContractInstance(contract);
      } catch (error) {
        console.error('Failed to load contract:', error);
      }
    };

    fetchContract();
  }, [signer]);

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
        '0x5Eef9Dd00f5D5A4136370D9051Ef5fC5f72263ea',
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
          <button className='invoke-button' onClick={makeTransaction}>
            Make Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
