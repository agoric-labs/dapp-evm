import { AppState } from './types';
import { create } from 'zustand';

export const useAppStore = create<AppState>((set) => ({
  contractInstance: null,
  evmAddress: '0x',
  destinationEVMChain: 'Avalanche',
  amountToSend: 0,
  loading: false,
  error: undefined,
  type: 3,
  transactionUrl: null,
  tab: 1,
  currentOffers: null,
  watcher: null,
  wallet: null,
  brands: null,
  network: 'localhost',
}));
