'use client'

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { OPTION_AMM_ABI, OPTION_AMM_ADDRESS } from '@/constants/contractInfo';
import Link from 'next/link';

// Define the structure of an Option
interface Option {
  id: number;
  strikePrice: bigint;
  lotSize: bigint;
  premium: bigint;
  k: bigint;
  expiry: bigint;
  isCall: boolean;
  creator: string;
}

// Define the return type from the contract for options
interface OptionData {
  0: bigint; // strikePrice
  1: bigint; // lotSize
  2: bigint; // premium
  3: bigint; // k
  4: bigint; // expiry
  5: boolean; // isCall
  6: string; // creator
  length: 7;
}

export default function OptionList() {
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Get the public client from wagmi
  const publicClient = usePublicClient();
  
  // Fetch all options from the contract
  const fetchOptions = useCallback(async () => {
    if (!publicClient) {
      setErrorMessage('Public client not available');
      return;
    }
    
    setIsLoading(true);
    setOptions([]);
    
    try {
      console.log('Fetching options from contract...');
      
      // First try to get the most recent option to determine the length
      let currentIndex = 0;
      let hasMoreOptions = true;
      const fetchedOptions: Option[] = [];
      
      while (hasMoreOptions && currentIndex < 100) { // Reduced safety limit for clarity
        try {
          console.log(`Fetching option at index ${currentIndex}...`);
          
          const option = await publicClient.readContract({
            address: OPTION_AMM_ADDRESS as `0x${string}`,
            abi: OPTION_AMM_ABI,
            functionName: 'options',
            args: [BigInt(currentIndex)],
          }) as OptionData;
          
          console.log(`Result for index ${currentIndex}:`, option);
          
          // Check if we got a valid result
          if (option) {
            // Convert to expected structure - the returned object should have named properties
            const typedOption = {
              id: currentIndex,
              strikePrice: option[0], // Accessing by index in case properties aren't named
              lotSize: option[1],
              premium: option[2],
              k: option[3],
              expiry: option[4],
              isCall: option[5],
              creator: option[6]
            };
            
            console.log(`Typed option for index ${currentIndex}:`, typedOption);
            
            // Only add options that appear valid (have a non-zero strike price)
            if (typedOption.strikePrice && typedOption.strikePrice > BigInt(0)) {
              console.log(`Adding valid option at index ${currentIndex}`);
              fetchedOptions.push(typedOption);
            } else {
              console.log(`Option at index ${currentIndex} has zero strike price, skipping`);
            }
          }
          
          currentIndex++;
        } catch (error) {
          console.log(`Error fetching option at index ${currentIndex}:`, error);
          hasMoreOptions = false;
        }
      }
      
      console.log(`Fetched a total of ${fetchedOptions.length} options:`, fetchedOptions);
      
      // Sort options by newest first (highest ID)
      fetchedOptions.sort((a, b) => b.id - a.id);
      
      // Update state with the fetched options
      setOptions(fetchedOptions);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error in fetchOptions function:", error);
      setErrorMessage('Failed to fetch options. Please try refreshing.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [publicClient]);
  
  // Fetch options when component mounts or publicClient changes
  useEffect(() => {
    if (publicClient) {
      fetchOptions();
    }
  }, [publicClient, fetchOptions]);

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOptions();
  };

  // Format price from wei to a readable value - adjust formatter based on contract decimals
  const formatPrice = (price: bigint): string => {
    // Check the magnitude of the value to determine which scaling factor to use
    // Values from the contract appear to be in wei (1e18) format rather than USDC (1e6)
    const divisor = price.toString().length > 12 ? 1e18 : 1e6;
    
    // Format all values consistently with 2 decimal places
    return (Number(price) / divisor).toFixed(2);
  };

  // Format date from unix timestamp
  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Available Options</h2>
        <button 
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className={`px-4 py-2 rounded ${(isLoading || isRefreshing)
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {isLoading || isRefreshing ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : options.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-900 font-medium">No options available</p>
          <p className="text-gray-500 mt-2">Create an option to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">ID</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Type</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Strike Price</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Premium</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Lot Size</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Expiry</th>
                <th className="py-3 px-4 border-b text-center text-gray-900 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {options.map((option) => (
                <tr key={option.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-gray-900">{option.id}</td>
                  <td className="py-2 px-4 border-b">
                    <span className={option.isCall ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                      {option.isCall ? "CALL" : "PUT"}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">${formatPrice(option.strikePrice)}</td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">${formatPrice(option.premium)}</td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">{formatPrice(option.lotSize)}</td>
                  <td className="py-2 px-4 border-b text-gray-900">{formatDate(option.expiry)}</td>
                  <td className="py-2 px-4 border-b text-center">
                    <Link href={`/option/${option.id}`}>
                      <span className="text-blue-700 hover:text-blue-900 font-medium cursor-pointer">
                        View Details
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}