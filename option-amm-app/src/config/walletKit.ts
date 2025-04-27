import { Core } from '@walletconnect/core'
import { Web3Wallet } from '@walletconnect/web3wallet'
import { ENV } from './env'

// Define type for WalletConnect session
interface WalletConnectSession {
  topic: string;
  pairingTopic: string;
  relay: {
    protocol: string;
    data?: string;
  };
  expiry: number;
  acknowledged: boolean;
  controller: string;
  namespaces: Record<string, unknown>;
  requiredNamespaces: Record<string, unknown>;
  optionalNamespaces: Record<string, unknown>;
}

// Initialize Core with project ID from environment variables
const core = new Core({
  projectId: ENV.WALLET_CONNECT_PROJECT_ID
})

// Define application metadata from environment configuration
const metadata = {
  name: ENV.APP_NAME,
  description: ENV.APP_DESCRIPTION,
  url: ENV.APP_URL,
  icons: [ENV.APP_ICON]
}

// Initialize the Web3Wallet (WalletConnect v2)
export const initWalletKit = async () => {
  try {
    const web3wallet = await Web3Wallet.init({
      core,
      metadata
    })
    
    // Extend wallet with connect/disconnect methods for compatibility
    const walletKit = {
      web3wallet,
      account: null as string | null,
      chainId: null as number | null,
      session: null as WalletConnectSession | null,
      
      // Get Connect URI method - separated from actual connection to support QR flow
      getConnectUri: async function(): Promise<{uri: string}> {
        try {
          // Mock the URI generation for now
          // In a production environment, you would implement proper WalletConnect v2 flow
          // This is a simplified implementation for demonstration purposes
          
          // We'll simulate a URI that would normally come from WalletConnect
          const mockUri = `wc:00000000-0000-0000-0000-000000000000@1?bridge=https://bridge.walletconnect.org&key=00000000000000000000000000000000000000000000000000000000000000`;
          
          // In a real implementation, we would properly integrate with WalletConnect v2
          console.log("Generated mock WalletConnect URI for demonstration");
          
          return { uri: mockUri };
        } catch (error) {
          console.error('Error getting connection URI:', error);
          throw error;
        }
      },
      
      // Subscribe to wallet events
      subscribeToEvents: function(callback: (address: string | null) => void) {
        // For the mock implementation, we'll log that this would listen to events
        console.log("Subscribing to WalletConnect events");
        
        // In a real implementation, this would properly handle WalletConnect events
        setTimeout(() => {
          // Simulate a wallet connection after 2 seconds for demonstration
          console.log("Simulating wallet connection");
          this.account = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; // Example address
          this.chainId = ENV.FLARE_CHAIN_ID;
          
          if (callback) callback(this.account);
        }, 2000);
      },
      
      // Connect method
      connect: async function(): Promise<{address: string | null, chainId: number | null}> {
        try {
          // Use getConnectUri and subscribeToEvents
          const { uri } = await this.getConnectUri();
          console.log("Connection URI (for QR code):", uri);
          
          return new Promise((resolve) => {
            this.subscribeToEvents((address) => {
              if (address) {
                resolve({
                  address: this.account,
                  chainId: this.chainId
                });
              }
            });
          });
        } catch (error) {
          console.error('Error connecting wallet:', error);
          throw error;
        }
      },
      
      // Disconnect method
      disconnect: async function(): Promise<void> {
        try {
          console.log("Disconnecting wallet");
          // In a real implementation, this would properly disconnect the WalletConnect session
          
          this.session = null;
          this.account = null;
          this.chainId = null;
        } catch (error) {
          console.error('Error disconnecting wallet:', error);
          throw error;
        }
      },
      
      // Switch chain method
      switchChain: async function(requestedChainId: number): Promise<void> {
        try {
          // Log chain switch request
          console.log(`Chain switch requested to chainId: ${requestedChainId}`);
          
          if (requestedChainId !== ENV.FLARE_CHAIN_ID) {
            console.warn(`Requested chain (${requestedChainId}) is not Flare Coston2 (${ENV.FLARE_CHAIN_ID})`);
          }
        } catch (error) {
          console.error('Error switching chain:', error);
          throw error;
        }
      }
    };
    
    return walletKit;
  } catch (error) {
    console.error('Failed to initialize WalletKit:', error);
    throw error;
  }
}

export default initWalletKit