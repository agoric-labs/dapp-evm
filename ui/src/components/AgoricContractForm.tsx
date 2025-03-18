import React, { useState, useEffect } from 'react';
import { AxelarQueryParams, OfferArgs } from '../interfaces/interfaces';
import {
  AGORIC_PROXY_CONTRACT,
  BRAND_CONFIG,
  EVM_CHAINS,
  TOAST_DURATION,
} from '../config';
import {
  getAxelarTxURL,
  getGasEstimate,
  getPayload,
  isValidEthereumAddress,
  showError,
  showSuccess,
} from '../Utils';
import { toast } from 'react-toastify';
import { useAccount, useConnect } from 'wagmi';
import metamaskLogo from '/metamask.svg';
import { useAppStore } from '../state';

const prepareOfferArguments = async (
  type: number,
  chain: keyof typeof EVM_CHAINS,
  address: string,
  amount: number,
  decimalPlaces: number
): Promise<OfferArgs> => {
  const contractPayload = getPayload({ type, chain, address });

  switch (type) {
    case 3:
      return {
        type,
        destAddr: address,
        destinationEVMChain: EVM_CHAINS[chain],
        contractInvocationPayload: contractPayload,
        amountToSend: amount * 1_000_000,
      };

    case 1:
    case 2: // Contract interaction transactions
      // const gasAmount = await getGasEstimate({
      //   destinationChain: EVM_CHAINS[chain],
      //   gasLimit: 8000000000000000,
      //   gasMuliplier: 'auto',
      // });
      // TODO: This needs refinement
      // It should be "destAddr: AGORIC_PROXY_CONTRACT[chain]"
      // address should be part of contractInvocationPayload
      return {
        type: 1,
        destAddr: '0x5B34876FFB1656710fb963ecD199C6f173c29267',
        destinationEVMChain: EVM_CHAINS[chain],
        contractInvocationPayload: [],
        gasAmount: 0.008 * 10 ** decimalPlaces,
        amountToSend: amount * 10 ** decimalPlaces,
      };

    default:
      throw new Error(`Invalid transaction type: ${type}. Must be 1, 2, or 3.`);
  }
};

const createQueryParameters = (
  type: number,
  timestamp: number,
  address: string,
  chain: string
): AxelarQueryParams => {
  const commonParams = {
    fromTime: timestamp,
    sourceChain: 'osmosis',
    destinationChain: chain,
  };

  return type === 3
    ? {
        transfersType: 'transfers',
        searchParams: {
          ...commonParams,
          address,
          asset: 'aUSDC',
        },
      }
    : {
        transfersType: 'gmp',
        searchParams: {
          ...commonParams,
          address: AGORIC_PROXY_CONTRACT[chain],
        },
      };
};

export const AgoricContractForm = () => {
  const [gasInfo, setGasInfo] = useState('');
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();

  const {
    wallet,
    destinationEVMChain,
    evmAddress,
    amountToSend,
    loading,
    contractInstance,
    brands,
    type,
    transactionUrl,
  } = useAppStore.getState();

  const makeOffer = async () => {
    let toastId: string | number | null = null;

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      useAppStore.setState({
        loading: true,
        transactionUrl: null,
      });

      const config = BRAND_CONFIG[type];
      if (!config) throw new Error(`Invalid offer type: ${type}`);

      const requiredBrand = brands[config.brandKey];
      if (!requiredBrand)
        throw new Error(`Brand ${config.brandKey} not available`);

      if (config.needsEVMCheck && !isValidEthereumAddress(evmAddress)) {
        showError({
          content: 'Invalid Ethereum Address',
          duration: TOAST_DURATION.ERROR,
        });
        return;
      }

      const offerArgs = await prepareOfferArguments(
        type,
        destinationEVMChain,
        evmAddress,
        amountToSend,
        config.decimals
      );

      const amountValue = BigInt(Number(amountToSend) * 10 ** config.decimals);

      const give = {
        [config.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      toastId = toast.info('Submitting transaction...', { isLoading: true });
      const transactionTime = Math.floor(Date.now() / 1000);

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          {
            source: 'contract',
            instance: contractInstance,
            publicInvitationMaker: 'gmpInvitation',
          },
          { give },
          offerArgs,
          (update: { status: string; data?: unknown }) => {
            switch (update.status) {
              case 'error':
                reject(new Error(`Offer error: ${update.data}`));
                break;
              case 'accepted':
                toast.success('Offer accepted!');
                resolve();
                break;
              case 'refunded':
                reject(new Error('Offer was rejected'));
                break;
            }
          }
        );
      });

      const queryParams = createQueryParameters(
        type,
        transactionTime,
        evmAddress,
        destinationEVMChain
      );

      const txURL = await getAxelarTxURL(queryParams);
      if (!txURL) throw new Error('Failed to retrieve transaction URL');

      useAppStore.setState({ transactionUrl: txURL });
      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      showError({ content: error.message, duration: TOAST_DURATION.ERROR });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
  };

  const buttonText = type === 3 ? 'Send Tokens' : 'Invoke Contract';

  const viewTransaction = () => {
    if (transactionUrl) {
      window.open(transactionUrl as string, '_blank');
    } else {
      throw new Error('Transaction url is not defined');
    }
  };

  const handleAmountToSend = (e) => {
    if (type === 3) {
      useAppStore.setState({
        amountToSend: Number(e.target.value),
      });
    } else {
      useAppStore.setState({
        amountToSend: Number(e.target.value),
      });
    }
  };

  useEffect(() => {
    // TODO: Compute gas amount and then deduct it from amount to send
    if (type !== 3 && amountToSend !== 0) {
      const value = amountToSend * 1_000_000_000_000_000_000;
      const gas = 8000000000000000; // Temporarily hard-coded

      if (gas > value) {
        setGasInfo('Your amount after gas deduction is very low');
      } else {
        setGasInfo(
          `Net amount after gas fee: ${
            (value - gas) / 1_000_000_000_000_000_000
          }`
        );
      }
    }
  });

  const handleConnect = () => {
    if (!isConnected) {
      connect({ connector: connectors[0] });
    } else {
      useAppStore.setState({ evmAddress: address });
    }
  };

  const metaMaskButtonText = isConnected ? 'Fill With' : 'Connect';

  return (
    <div className='dashboard-container'>
      <div className='dashboard'>
        <div className='transfer-form'>
          <div className='form-group'>
            <label className='input-label'>Select EVM Chain:</label>
            <select
              className='select-field'
              value={destinationEVMChain}
              onChange={(e) =>
                useAppStore.setState({
                  destinationEVMChain: e.target.value,
                })
              }>
              <option value='' disabled>
                Select a chain
              </option>
              <option value='Ethereum'>Ethereum</option>
              <option value='Base'>Base</option>
            </select>
          </div>

          <div className='form-group'>
            {type === 3 ? null : (
              <>
                <label className='input-label'>EVM Contract:</label>
                <select
                  className='select-field'
                  value={destinationEVMChain}
                  onChange={(e) =>
                    useAppStore.setState({
                      evmAddress: e.target.value,
                    })
                  }>
                  <option value='' disabled>
                    Select contract
                  </option>
                  <option value='0x479d5B0115dCf2259C4e613E6D5C4fc14A5Dce95'>
                    Aave
                  </option>
                  <option value='0x479d5B0115dCf2259C4e613E6D5C4fc14A5Dce95'>
                    Compound
                  </option>
                  <option value='0x479d5B0115dCf2259C4e613E6D5C4fc14A5Dce95'>
                    Morpho
                  </option>
                </select>
              </>
            )}
          </div>

          <div className='form-group'>
            <label className='input-label'>To (EVM Address):</label>
            <div className='form-group-evm-address'>
              <input
                className='input-field'
                value={evmAddress}
                onChange={(e) =>
                  useAppStore.setState({ evmAddress: e.target.value })
                }
                placeholder='0x...'
              />
              <button onClick={handleConnect} className='metamask-button'>
                <span>{metaMaskButtonText}</span>
                <img
                  src={metamaskLogo}
                  className='metamask-logo'
                  alt='Metamask logo'
                />
              </button>
            </div>
          </div>

          <div className='form-group'>
            <label className='input-label'>Amount:</label>
            <input
              className='input-field'
              type='number'
              value={amountToSend}
              onChange={handleAmountToSend}
              placeholder='0.00'
              min='0'
              step='0.01'
            />
            {gasInfo !== '' && <p className='gas-message'>{gasInfo}</p>}
          </div>

          <button
            className='send-button'
            onClick={makeOffer}
            disabled={
              loading || !evmAddress || !amountToSend || !destinationEVMChain
            }>
            {loading ? 'Processing...' : buttonText}
          </button>
        </div>
      </div>

      {transactionUrl && (
        <button className='view-transaction-button' onClick={viewTransaction}>
          View Transaction
        </button>
      )}
    </div>
  );
};
