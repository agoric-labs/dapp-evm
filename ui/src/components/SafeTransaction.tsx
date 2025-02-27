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

  const executeSafeTransaction = async () => {
    // Set Up the Safe Contract Instance
    const SafeABI = [
      // Minimal ABI for critical functions
      'function getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256) view returns (bytes32)',
      'function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes) payable returns (bool)',
      'function nonce() view returns (uint256)',
    ];

    const safeAddress = '0xeab9959dEbb456be27A0A0A095FB780B6a0645Cc';
    const safeContract = new ethers.Contract(safeAddress, SafeABI, signer);

    //  Prepare the Target Contract Call
    const targetAddress = '0x76e1b76A6643aCac6Cce34692Cc9F7c9Aa63D911';
    const targetABI = ['function increment() public'];
    const targetInterface = new ethers.utils.Interface(targetABI);
    const data = targetInterface.encodeFunctionData('increment');

    // Build the Safe Transaction
    const transaction = {
      to: targetAddress,
      value: 0, // ETH value to send (in wei)
      data: data, // Encoded target contract call
      operation: 0, // 0 = CALL, 1 = DELEGATECALL
      safeTxGas: 1000000, // Adjust gas limits as needed
      baseGas: 0,
      gasPrice: ethers.utils.parseUnits('5000', 'gwei'), // Set to 0 for current network price
      gasToken: ethers.constants.AddressZero, // Use native token for gas
      refundReceiver: ethers.constants.AddressZero,
      nonce: await safeContract.nonce(), // Get current Safe nonce
    };

    // Generate Transaction Hash and Sign
    const txHash = await safeContract.getTransactionHash(
      transaction.to,
      transaction.value,
      transaction.data,
      transaction.operation,
      transaction.safeTxGas,
      transaction.baseGas,
      transaction.gasPrice,
      transaction.gasToken,
      transaction.refundReceiver,
      transaction.nonce
    );

    const signature = await signer.signMessage(ethers.utils.arrayify(txHash));

    //  Execute the Transaction
    const txResponse = await safeContract.execTransaction(
      transaction.to,
      transaction.value,
      transaction.data,
      transaction.operation,
      transaction.safeTxGas,
      transaction.baseGas,
      transaction.gasPrice,
      transaction.gasToken,
      transaction.refundReceiver,
      signature
    );

    const receipt = await txResponse.wait();
    console.log('Transaction executed:', receipt);
  };

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
          <button className='invoke-button' onClick={executeSafeTransaction}>
            Make Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
