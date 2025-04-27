import { http, createConfig } from 'wagmi'
// Removed walletConnect import to avoid conflicts with WalletKit

// Define the Flare Coston2 Testnet chain
const flareCoston2 = {
  id: 114,
  name: 'Flare Coston2 Testnet',
  network: 'flare-coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
    public: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
}

// Export the chain configuration for use in other parts of the app
export const flareChain = flareCoston2

// Modified config to not include conflicting wallet connectors
export const wagmiConfig = createConfig({
  chains: [flareCoston2],
  // Removed connectors that conflict with WalletKit
  transports: {
    [flareCoston2.id]: http('https://coston2-api.flare.network/ext/C/rpc'),
  },
})