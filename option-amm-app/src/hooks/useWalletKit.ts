import { useState, useEffect } from 'react'
import initWalletKit from '../config/walletKit'

// Define more specific types to avoid ESLint "any" warnings
interface WalletKitSession {
  topic: string;
  namespaces: {
    eip155: {
      accounts: string[];
    }
  }
}

// Define Web3Wallet type
interface Web3WalletType {
  core: {
    pairing: {
      getPairings: () => unknown[];
    };
  };
  engine: {
    signClient: {
      proposal: unknown;
      session: unknown;
    };
  };
}

// Define the WalletKit type more precisely
interface WalletKitType {
  web3wallet: Web3WalletType; 
  account: string | null;
  chainId: number | null;
  session: WalletKitSession | null;
  pendingApproval?: Promise<unknown> | null; // Make the property optional
  getConnectUri: () => Promise<{uri: string}>;
  subscribeToEvents: (callback: (address: string | null) => void) => void;
  connect: () => Promise<{address: string | null, chainId: number | null}>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
}

export function useWalletKit() {
  const [walletKit, setWalletKit] = useState<WalletKitType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function setupWalletKit() {
      try {
        setLoading(true)
        const kit = await initWalletKit()
        setWalletKit(kit as WalletKitType)
      } catch (err) {
        console.error('Failed to initialize WalletKit:', err)
        setError(err instanceof Error ? err : new Error('Unknown error initializing WalletKit'))
      } finally {
        setLoading(false)
      }
    }

    setupWalletKit()
  }, [])

  return { walletKit, loading, error }
}

export default useWalletKit