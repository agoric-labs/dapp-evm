import React, { useState, useEffect } from 'react';
import contractABI from '../abi/counter.json';
import { ethers } from 'ethers';

interface Props {
  signer: any;
}

export const CounterForm = (props: Props) => {
  const [counter, setCounter] = useState(0);
  const [contractInstance, setContractInstance] = useState(null);
  const { signer } = props;

  useEffect(() => {
    if (!signer) return;

    const fetchContract = async () => {
      try {
        const contractAddress = '0x78158e3B07C499aABaB55C0fe8Ba0Af5d7746CaB';
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

  useEffect(() => {
    if (!contractInstance) return;

    const getCount = async () => {
      try {
        console.log('Fetching new count ...');
        const count = await contractInstance.getCount();
        console.log('New count:', count.toString());
        setCounter(count.toString());
      } catch (error) {
        console.error('Failed to get counter:', error);
      }
    };

    getCount();
  }, [contractInstance]);

  const getCount = async () => {
    try {
      console.log('Fetching new count ...');
      const count = await contractInstance.getCount();
      console.log('New count:', count.toString());
      setCounter(count.toString());
    } catch (error) {
      console.error('Failed to get counter:', error);
    }
  };

  const increment = async () => {
    try {
      console.log('Incrementing counter...');
      const txResponse = await contractInstance.increment();
      await txResponse.wait();
      console.log('Counter incremented, fetching new count...');
      await getCount();
    } catch (error) {
      console.error('Failed to increment counter:', error);
    }
  };

  const decrement = async () => {
    try {
      console.log('Decrementing counter...');
      const txResponse = await contractInstance.decrement();
      await txResponse.wait();
      console.log('Counter decremented, fetching new count...');
      await getCount();
    } catch (error) {
      console.error('Failed to decrement counter:', error);
    }
  };

  return (
    <div className='dashboard-container'>
      <div className='dashboard'>
        <div className='transfer-form'>
          <button className='invoke-button' onClick={increment}>
            Increment
          </button>

          <p className='counter'>{counter}</p>

          <button className='invoke-button' onClick={decrement}>
            Decrement
          </button>
        </div>
      </div>
    </div>
  );
};
