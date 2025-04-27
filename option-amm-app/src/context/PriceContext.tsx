'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';

interface PriceContextType {
  ethUsdPrice: string;
  isLoading: boolean;
  error: string | null;
  fetchPrice: () => Promise<void>;
}

const PriceContext = createContext<PriceContextType>({
  ethUsdPrice: '0.00',
  isLoading: false,
  error: null,
  fetchPrice: async () => {},
});

export const usePriceContext = () => useContext(PriceContext);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [ethUsdPrice, setEthUsdPrice] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Format from wei to readable value
  const formatPrice = useCallback((value: bigint): string => {
    // Price is coming in at 1/100 of its actual value, so we need to divide by 1e3 (not 1e5)
    // This will correctly show 1799.xx instead of 17.99
    return (Number(value) / 1e3).toFixed(2);
  }, []);

  // Function to fetch the latest price via a transaction
  const fetchPrice = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching ETH/USD price from blockchain...');
      
      // Call the payable function with a small amount of native token
      const result = await writeContractAsync({
        abi: CONTRACTS.OPTION_AMM.abi,
        address: CONTRACTS.OPTION_AMM.address,
        functionName: 'getLatestPrice',
        value: BigInt(1), // Small amount to satisfy payable function requirement
      });
      
      console.log('Transaction sent, hash:', result);
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: result,
      });
      
      console.log('Transaction confirmed:', receipt);
      
      // After transaction is confirmed, we need to manually get the price
      // since the transaction receipt doesn't include return values
      const latestPrice = await publicClient.readContract({
        address: CONTRACTS.OPTION_AMM.address,
        abi: CONTRACTS.OPTION_AMM.abi,
        functionName: 'getLatestPrice',
      });
      
      console.log('Latest ETH/USD price:', latestPrice);
      
      // Update the price state with the formatted value
      if (latestPrice) {
        setEthUsdPrice(formatPrice(latestPrice as bigint));
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching ETH/USD price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      setIsLoading(false);
    }
  }, [isConnected, address, publicClient, writeContractAsync, setEthUsdPrice, setError, setIsLoading, formatPrice]);

  // Fetch price when user connects wallet (only once)
  useEffect(() => {
    if (isConnected && address && !hasAttemptedFetch) {
      setHasAttemptedFetch(true);
      fetchPrice();
    }
  }, [isConnected, address, hasAttemptedFetch, fetchPrice]);

  // Removed the automatic interval update - price will only update on wallet connection
  // or when fetchPrice is explicitly called through the refresh button

  return (
    <PriceContext.Provider value={{ ethUsdPrice, isLoading, error, fetchPrice }}>
      {children}
    </PriceContext.Provider>
  );
}