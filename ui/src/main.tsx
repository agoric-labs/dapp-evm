import './installSesLockdown.ts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from './wagmi-config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WagmiConfig config={wagmiConfig}>
    <App />
  </WagmiConfig>
);
