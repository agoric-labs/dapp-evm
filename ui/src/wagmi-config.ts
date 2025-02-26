import { createConfig, http } from 'wagmi';
import { QueryClient } from '@tanstack/react-query';
import { sepolia, baseSepolia, avalancheFuji } from '@wagmi/core/chains';

export const wagmiConfig = createConfig({
  chains: [
    { ...avalancheFuji, network: 'avalancheFuji' },
    { ...sepolia, network: 'sepolia' },
    { ...baseSepolia, network: 'baseSepolia' },
  ],
  transports: {
    [avalancheFuji.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export const queryClient = new QueryClient();
