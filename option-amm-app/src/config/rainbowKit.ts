import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { Chain } from 'wagmi/chains';
import { ENV } from './env';
import { 
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  braveWallet,
  rabbyWallet
} from '@rainbow-me/rainbowkit/wallets';

// Define Flare Coston2 testnet as a custom chain for wagmi
const flareCoston2 = {
  id: 114,
  name: 'Flare Coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare Coston2',
    symbol: 'FLR',
  },
  rpcUrls: {
    default: { http: [ENV.FLARE_RPC_URL] },
    public: { http: [ENV.FLARE_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
} as const satisfies Chain;

// Configure wagmi with RainbowKit
export const config = getDefaultConfig({
  appName: ENV.APP_NAME,
  projectId: ENV.WALLET_CONNECT_PROJECT_ID,
  chains: [flareCoston2],
  transports: {
    [flareCoston2.id]: http(ENV.FLARE_RPC_URL)
  },
  ssr: true, // Enable server-side rendering support
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        injectedWallet,
        braveWallet,
        rabbyWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
});

export default config;