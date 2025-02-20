import React, { useState, useEffect } from 'react';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState, OfferArgs } from '../App';
import WalletStatus from './WalletStatus';
import { AGORIC_PROXY_CONTRACT, EVM_CHAINS } from '../config';
import {
  AxelarQueryParams,
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
interface Props {
  useAppStore: UseBoundStore<StoreApi<AppState>>;
}

const prepareOfferArguments = async (
  type: number,
  chain: keyof typeof EVM_CHAINS,
  address: string,
  amount: number
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
        type,
        destAddr: AGORIC_PROXY_CONTRACT[chain],
        destinationEVMChain: EVM_CHAINS[chain],
        contractInvocationPayload: contractPayload,
        gasAmount: 0.008 * 10 ** 18,
        amountToSend: amount * 10 ** 18,
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

export const TokenForm = (props: Props) => {
  const [gasInfo, setGasInfo] = useState('');
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { useAppStore } = props;

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
    let toastId;

    useAppStore.setState({
      transactionUrl: null,
    });

    console.log('Brands', brands);
    const requiredBrand = type === 3 ? 'AUSDC' : type === 2 ? 'WAVAX' : null;
    if (!(requiredBrand && brands && brands[requiredBrand])) {
      throw Error(`brand ${requiredBrand} not available`);
    }

    let give;

    if (type === 3) {
      give = {
        AUSDC: {
          brand: brands.AUSDC,
          value: BigInt(amountToSend * 1000000),
        },
      };
    } else {
      give = {
        WAVAX: {
          brand: brands.WAVAX,
          value: BigInt(amountToSend * 1000_000_000_000_000_000),
        },
      };
    }

    if (type === 3 && !isValidEthereumAddress(evmAddress)) {
      showError({ content: 'Invalid Ethereum Address', duration: 3000 });
      return;
    }
    if (!contractInstance) throw Error('No contract instance');

    const offerArgs = await prepareOfferArguments(
      type,
      destinationEVMChain,
      evmAddress,
      amountToSend
    );

    try {
      const transactionTime = Math.floor(Date.now() / 1000);

      toastId = toast.info('Submitting transaction...', {
        isLoading: true,
      });
      wallet?.makeOffer(
        {
          source: 'contract',
          instance: contractInstance,
          publicInvitationMaker: 'makeSendInvitation',
        },
        { give },
        offerArgs,
        (update: { status: string; data?: unknown }) => {
          if (update.status === 'error') {
            toast.dismiss(toastId);
            alert(`Offer error: ${update.data}`);
          } else if (update.status === 'accepted') {
            alert('Offer accepted');
          } else if (update.status === 'refunded') {
            alert('Offer rejected');
            toast.dismiss(toastId);
          }
        }
      );

      const queryParams = createQueryParameters(
        type,
        transactionTime,
        evmAddress,
        destinationEVMChain
      );

      // TODO: handle failure cases too
      // TODO: check for valid URL
      const txURL = await getAxelarTxURL(queryParams);
      if (txURL) {
        toast.dismiss(toastId);
        showSuccess({
          content: 'Transaction Submitted Successfully',
          duration: 4000,
        });
        useAppStore.setState({ transactionUrl: txURL });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error(error);
      showError({ content: error.message, duration: 3000 });
    } finally {
      toast.dismiss(toastId);
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
      <WalletStatus address={wallet?.address} />
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
              <option value='Avalanche'>Avalanche</option>
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
