'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { formatUnits } from 'viem';
import { usePriceContext } from '@/context/PriceContext';
import { FiRefreshCw } from 'react-icons/fi';

export default function MarketInfo() {
  const [mounted, setMounted] = useState(false);
  const [totalLiquidity, setTotalLiquidity] = useState<bigint>(BigInt(0));
  const [userLiquidity, setUserLiquidity] = useState<bigint>(BigInt(0));
  const [isLoadingLiquidity, setIsLoadingLiquidity] = useState(true);
  const [isLoadingUserLiquidity, setIsLoadingUserLiquidity] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { ethUsdPrice, isLoading: isPriceFetching, error: priceError, fetchPrice } = usePriceContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Format from wei to readable value with USDC's 6 decimals
  const formatAmount = (value: bigint): string => {
    return formatUnits(value, 6);
  };
  
  // Direct fetch using wagmi's publicClient - ONLY for liquidity data
  const fetchLiquidityData = useCallback(async () => {
    if (!publicClient) {
      setErrorMessage('Public client not available');
      return;
    }
    
    setIsLoadingLiquidity(true);
    if (isConnected) {
      setIsLoadingUserLiquidity(true);
    }
    
    try {
      // Fetch total liquidity directly using properly formatted address
      const totalLiquidityResult = await publicClient.readContract({
        address: CONTRACTS.OPTION_AMM.address,
        abi: CONTRACTS.OPTION_AMM.abi,
        functionName: 'totalLiquidity',
      });
      
      console.log('Total liquidity wei:', totalLiquidityResult?.toString());
      
      // Store as bigint for accurate calculations
      setTotalLiquidity(totalLiquidityResult as bigint);
      setIsLoadingLiquidity(false);
      
      // If user is connected, fetch their liquidity contribution
      if (isConnected && address) {
        try {
          const userLiquidityResult = await publicClient.readContract({
            address: CONTRACTS.OPTION_AMM.address,
            abi: CONTRACTS.OPTION_AMM.abi,
            functionName: 'liquidityContributions',
            args: [address],
          });
          
          console.log('User liquidity wei:', userLiquidityResult?.toString());
          
          // Store as bigint for accurate calculations
          setUserLiquidity(userLiquidityResult as bigint);
        } catch (error) {
          console.error('Error fetching user liquidity:', error);
          setUserLiquidity(BigInt(0)); // Reset to zero
        }
        
        setIsLoadingUserLiquidity(false);
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setErrorMessage('Failed to fetch data from contract. Please try refreshing the page.');
      setTotalLiquidity(BigInt(0)); // Reset to zero
      
      if (isConnected) {
        setUserLiquidity(BigInt(0));
      }
      
      setIsLoadingLiquidity(false);
      setIsLoadingUserLiquidity(false);
    }
  }, [publicClient, isConnected, address]);
  
  // Set mounted to true after client-side hydration and fetch data
  useEffect(() => {
    setMounted(true);
    
    // Only fetch data after mounting to avoid hydration issues
    if (mounted && publicClient) {
      // Initial fetch of liquidity data
      fetchLiquidityData();
      
      // Set up interval to refresh ONLY liquidity data every 30 seconds
      // Price will be updated only when user connects or manually refreshes
      const intervalId = setInterval(() => {
        fetchLiquidityData(); // Only update liquidity data, not price
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [mounted, address, isConnected, publicClient, fetchLiquidityData]);
  
  // Calculate percentage of the pool
  const calculateSharePercentage = (): string => {
    if (!userLiquidity || !totalLiquidity || totalLiquidity === BigInt(0)) {
      return '0.00';
    }
    
    // Use the same calculation as in the LiquidityPanel component
    return ((Number(userLiquidity) / Number(totalLiquidity)) * 100).toFixed(2);
  };
  
  // Handle refresh of ETH/USD price only
  const handleRefreshPrice = async () => {
    setIsRefreshing(true);
    await fetchPrice();
    setIsRefreshing(false);
  };
  
  // Handle refresh of both liquidity and price data
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    fetchLiquidityData();
    await fetchPrice();
    setIsRefreshing(false);
  };

  // Don't render anything during server-side rendering to avoid hydration issues
  if (!mounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-around items-center">
          <div className="py-2 text-center">
            <h3 className="text-lg font-medium text-black">Loading market data...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col md:flex-row justify-around items-center">
        <div className="py-2 text-center">
          <h3 className="text-lg font-semibold text-black">Total Liquidity</h3>
          {isLoadingLiquidity ? (
            <div className="animate-pulse bg-gray-200 h-8 w-24 mx-auto rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-blue-700">USD {formatAmount(totalLiquidity)}</p>
          )}
        </div>
        
        <div className="py-2 text-center">
          <h3 className="text-lg font-semibold text-black">ETH/USD Price</h3>
          {isPriceFetching ? (
            <div className="animate-pulse bg-gray-200 h-8 w-24 mx-auto rounded mt-1"></div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-blue-700">${ethUsdPrice}</p>
              <button 
                onClick={handleRefreshPrice}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center mx-auto"
                disabled={isPriceFetching || isRefreshing}
              >
                <FiRefreshCw className={`mr-1 ${isRefreshing && isPriceFetching ? 'animate-spin' : ''}`} size={12} />
                Refresh Price
              </button>
            </div>
          )}
        </div>

        {isConnected && (
          <div className="py-2 text-center">
            <h3 className="text-lg font-semibold text-black">Your Liquidity</h3>
            {isLoadingUserLiquidity ? (
              <div className="animate-pulse bg-gray-200 h-8 w-24 mx-auto rounded mt-1"></div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-blue-700">USD {formatAmount(userLiquidity)}</p>
                <p className="text-sm font-medium text-black">{calculateSharePercentage()}% of pool</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {(errorMessage || priceError) && (
        <div className="mt-2 text-red-600 font-medium text-center">
          {errorMessage || priceError}
        </div>
      )}
      
      <div className="mt-3 text-center">
        <button 
          onClick={handleRefreshAll}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <div className="flex items-center">
              <FiRefreshCw className="animate-spin mr-2" />
              Refreshing...
            </div>
          ) : 'Refresh All Data'}
        </button>
      </div>
    </div>
  );
}