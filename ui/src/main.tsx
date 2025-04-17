import './installSesLockdown.ts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig, queryClient } from './wagmi-config';
import { QueryClientProvider } from '@tanstack/react-query';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </WagmiProvider>,
);
