import { configureChains, createConfig } from 'wagmi';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { publicProvider } from 'wagmi/providers/public';
import { avalancheFuji, baseSepolia, sepolia } from 'viem/chains';

const { chains, publicClient } = configureChains(
  [avalancheFuji, baseSepolia, sepolia],
  [
    jsonRpcProvider({
      rpc: (chain) => ({ http: chain.rpcUrls.default.http[0] }),
    }),
    publicProvider(),
  ],
  {
    pollingInterval: 10_000,
  }
);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({
      chains,
      options: {
        shimDisconnect: false,
      },
    }),
  ],
  publicClient,
});
