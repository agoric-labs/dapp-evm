import React, { useState, useEffect } from 'react';
import contractABI from '../abi/safe.json';
import { ethers, constants } from 'ethers';
import { showSuccess } from '../Utils';
import { TOAST_DURATION } from '../config';

interface Props {
  signer: any;
}

export const SafeForm = (props: Props) => {
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

  const createSafe = async () => {
    try {
      console.log('Creating Safe...');

      const addresses = ['0x20E68F6c276AC6E297aC46c84Ab260928276691D'];
      const threshold = 1;
      const ZERO_ADDRESS = constants.AddressZero;
      const fallbackHandler = '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99';

      const safeInterface = new ethers.utils.Interface([
        'function setup(address[],uint256,address,bytes,address,address,uint256,address)',
      ]);

      const initializer = safeInterface.encodeFunctionData('setup', [
        addresses,
        threshold,
        ZERO_ADDRESS, // to
        '0x', // data
        fallbackHandler,
        ZERO_ADDRESS, // paymentToken
        0, // payment
        ZERO_ADDRESS, // paymentReceiver
      ]);

      const creationData = {
        singleton: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
        initializer,
        saltNonce: Date.now(),
      };

      const txResponse = await contractInstance.createSafe(creationData);
      const receipt = await txResponse.wait();

      const event = receipt.events.find((e) => e.event === 'SafeCreated');
      if (event && event.args) {
        console.log('Event ARGS:', event.args);
        const safeAddress = event.args[0];
        console.log('New Safe Created at:', safeAddress);

        showSuccess({
          content: 'Safe Created Successfully',
          duration: TOAST_DURATION.SUCCESS,
        });
      } else {
        console.error('SafeCreated event not found in transaction logs.');
      }
    } catch (error) {
      console.error('Failed to create safe:', error);
    }
  };

  return (
    <div className='dashboard-container'>
      <div className='dashboard'>
        <div className='transfer-form'>
          <button className='invoke-button' onClick={createSafe}>
            Create Safe
          </button>
        </div>
      </div>
    </div>
  );
};
