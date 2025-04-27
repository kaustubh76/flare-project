'use client'

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { OPTION_AMM_ABI, OPTION_AMM_ADDRESS } from '@/constants/contractInfo';
import { formatUnits } from 'viem';
import { usePriceContext } from '@/context/PriceContext';

// Define option types from contract
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

// Define the structure of an Option with user's ownership data
interface UserOption {
  id: number;
  strikePrice: bigint;
  premium: bigint;
  lotSize: bigint;
  expiry: bigint;
  isCall: boolean;
  userLots: bigint;
  isExpired: boolean;
  isInTheMoney: boolean;
}

export default function MyOptions() {
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settlingOptionId, setSettlingOptionId] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { ethUsdPrice } = usePriceContext();

  // Write contract hooks for settling options
  const { writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  // Track if any transaction is pending
  const isTransactionPending = isWritePending || isConfirming;
  
  // Check if option is in the money based on current ETH/USD price
  const checkIfInTheMoney = useCallback((strikePrice: bigint, isCall: boolean): boolean => {
    if (!ethUsdPrice) return false;
    
    // Convert current ETH price to a BigInt for comparison (assuming 18 decimals)
    const currentPriceValue = parseFloat(ethUsdPrice);
    let currentPriceBigInt: bigint;
    
    // Convert price to same scale as option strikePrice for comparison
    if (strikePrice > BigInt(10000000000000)) {
      // Strike price likely using 18 decimals
      currentPriceBigInt = BigInt(Math.floor(currentPriceValue * 1e18));
    } else {
      // Strike price likely using 6 decimals (USDC)
      currentPriceBigInt = BigInt(Math.floor(currentPriceValue * 1e6));
    }
    
    if (isCall) {
      return currentPriceBigInt > strikePrice;
    } else {
      return currentPriceBigInt < strikePrice;
    }
  }, [ethUsdPrice]);

  // Fetch user's options (those they have purchased)
  const fetchUserOptions = useCallback(async () => {
    if (!publicClient || !address) {
      setErrorMessage('Wallet not connected');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setUserOptions([]);
    const currentTime = Math.floor(Date.now() / 1000);
    
    try {
      console.log('Fetching options from contract...');
      
      // First try to get all options to determine which ones the user owns
      let currentIndex = 0;
      let hasMoreOptions = true;
      const fetchedOptions: UserOption[] = [];
      
      while (hasMoreOptions && currentIndex < 100) {
        try {
          // Fetch option data
          const option = await publicClient.readContract({
            address: OPTION_AMM_ADDRESS as `0x${string}`,
            abi: OPTION_AMM_ABI,
            functionName: 'options',
            args: [BigInt(currentIndex)],
          });
          
          if (option) {
            // For debugging purposes, try to directly read the ownership mapping
            // Using a direct contract call instead of the missing optionOwnership function
            // For public mappings in Solidity, we need to call the mapping with both keys
            try {
              console.log(`Checking ownership for option ${currentIndex}...`);
              const ownership = await publicClient.readContract({
                address: OPTION_AMM_ADDRESS as `0x${string}`,
                abi: [
                  {
                    "inputs": [
                      { "internalType": "uint256", "name": "", "type": "uint256" },
                      { "internalType": "address", "name": "", "type": "address" }
                    ],
                    "name": "optionOwnership",
                    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
                    "stateMutability": "view",
                    "type": "function"
                  }
                ],
                functionName: 'optionOwnership',
                args: [BigInt(currentIndex), address],
              });
              
              console.log(`Option ${currentIndex} - User lots: ${ownership?.toString()}`);
              
              // Only include options where user owns some lots
              if (ownership && BigInt(ownership.toString()) > BigInt(0)) {
                const optionData = option as OptionData;
                const typedOption: UserOption = {
                  id: currentIndex,
                  strikePrice: optionData[0],
                  premium: optionData[2],
                  lotSize: optionData[1],
                  expiry: optionData[4],
                  isCall: optionData[5],
                  userLots: BigInt(ownership.toString()),
                  isExpired: BigInt(optionData[4]) < BigInt(currentTime),
                  isInTheMoney: checkIfInTheMoney(optionData[0], optionData[5])
                };
                
                console.log(`Adding option ${currentIndex} to user options list with ${ownership} lots`);
                fetchedOptions.push(typedOption);
              }
            } catch (error) {
              console.error(`Error reading ownership for option ${currentIndex}:`, error);
            }
          }
          
          currentIndex++;
        } catch (error) {
          console.log(`Error fetching option at index ${currentIndex}:`, error);
          hasMoreOptions = false;
        }
      }
      
      console.log(`Fetched ${fetchedOptions.length} options owned by the user`);
      
      // Sort options by expiry (nearest first)
      fetchedOptions.sort((a, b) => Number(a.expiry - b.expiry));
      
      setUserOptions(fetchedOptions);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error in fetchUserOptions function:", error);
      setErrorMessage('Failed to fetch your options. Please try refreshing.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [publicClient, address, checkIfInTheMoney]);

  // Format price from wei to a readable value
  const formatPrice = (price: bigint): string => {
    // Check magnitude to determine decimals
    if (price > BigInt(10000000000000)) {
      return formatUnits(price, 18);
    } else {
      return formatUnits(price, 6);
    }
  };

  // Format date from unix timestamp
  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Add additional debug information for the option status
  const getDetailedOptionStatus = (option: UserOption): string => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const isExpired = Number(option.expiry) < currentTimestamp;
    
    if (!isExpired) {
      return "Not yet expired";
    }
    
    // For debugging purposes, calculate if it would be in the money
    // with the current price from context
    const currentPrice = parseFloat(ethUsdPrice || "0");
    const strikePrice = parseFloat(formatPrice(option.strikePrice));
    
    let inTheMoney = false;
    if (option.isCall) {
      inTheMoney = currentPrice > strikePrice;
    } else {
      inTheMoney = currentPrice < strikePrice;
    }
    
    // Make sure the in/out of money text is consistent with the badge above
    return `Expired: Strike=$${strikePrice}, Current=$${currentPrice}, ${inTheMoney ? "In the money" : "Out of the money"}`;
  };

  // Add a specialized console logger for debugging
  const debugLog = (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔍 ${message}`, data || '');
  };

  // Settle an option with improved error handling and transaction tracking
  const handleSettle = (optionId: number) => {
    if (!address) return;
    
    try {
      setSettlingOptionId(optionId);
      setErrorMessage(null); // Clear any previous error messages
      
      debugLog(`Attempting to settle option #${optionId}`, {
        chainId: publicClient?.chain?.id,
        userAddress: address
      });
      
      // Call the contract's settleOption function
      writeContract({
        address: OPTION_AMM_ADDRESS as `0x${string}`,
        abi: OPTION_AMM_ABI,
        functionName: 'settleOption',
        args: [BigInt(optionId)],
      }, {
        onSuccess(data: `0x${string}`) {
          debugLog(`Settlement transaction submitted with hash: ${data}`);
          setTxHash(data);
        },
        onError(error: Error) {
          debugLog(`Settlement transaction failed: ${error.message}`, error);
          
          // Parse the error to provide a more user-friendly message
          let errorMsg = "Failed to settle option: ";
          const errorMessage = error?.message || "";

          if (errorMessage.includes("user rejected")) {
            errorMsg = "Transaction was rejected by the wallet.";
          } else if (errorMessage.includes("execution reverted")) {
            // Check for specific revert reasons from the contract
            if (errorMessage.includes("Option has not yet expired")) {
              errorMsg += "Option hasn't expired yet.";
            } else if (errorMessage.includes("No option holdings")) {
              errorMsg += "You don't own this option.";
            } else if (errorMessage.includes("Insufficient liquidity")) {
              errorMsg += "Contract doesn't have enough USDC to pay out this option.";
            } else if (errorMessage.includes("Payout failed")) {
              errorMsg += "USDC transfer failed. Contract may not have enough funds.";
            } else {
              errorMsg += "Contract execution failed. See console for details.";
            }
          } else {
            errorMsg += errorMessage || "Unknown error occurred";
          }
          
          setErrorMessage(errorMsg);
          setSettlingOptionId(null);
        }
      });
    } catch (error) {
      debugLog("Unexpected error in handleSettle", error);
      
      let errorMsg = "Failed to settle option: ";
      if (error instanceof Error) {
        errorMsg += error.message;
      } else {
        errorMsg += String(error);
      }
      
      setErrorMessage(errorMsg);
      setSettlingOptionId(null);
    }
  };

  // Add more detail to transaction status messages
  const getTransactionStatusMessage = (optionId: number) => {
    if (settlingOptionId === optionId) {
      if (txHash) {
        return "Transaction submitted, waiting for confirmation...";
      }
      return "Preparing transaction...";
    }
    return "Settle";
  };

  // Refresh list on mount and when dependencies change
  useEffect(() => {
    if (publicClient && address) {
      fetchUserOptions();
    }
  }, [publicClient, address, fetchUserOptions]);
  
  // Modified useEffect for transaction success handling
  useEffect(() => {
    if (isSuccess && txHash) {
      debugLog(`Transaction ${txHash} was successful`, {
        optionId: settlingOptionId
      });
      
      // Show success message
      setErrorMessage(null);
      setSuccessMessage(`Option #${settlingOptionId} was successfully settled.`);
      
      // Reset states
      setSettlingOptionId(null);
      setTxHash(undefined);
      
      // Wait a moment before refreshing to allow blockchain to update
      setTimeout(() => {
        fetchUserOptions();
        
        // Auto-hide success message after 8 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 8000);
      }, 2000);
    }
  }, [isSuccess, txHash, settlingOptionId, fetchUserOptions]);

  // Display error messages from write errors
  useEffect(() => {
    if (writeError) {
      console.error("Write contract error:", writeError);
      let errorMsg = "Failed to settle option: ";
      if (writeError.message) {
        if (writeError.message.includes("Option has not expired yet")) {
          errorMsg += "Option has not expired yet.";
        } else if (writeError.message.includes("You don't own this option")) {
          errorMsg += "You don't own this option.";
        } else if (writeError.message.includes("execution reverted")) {
          errorMsg += "Contract execution failed. The contract may not have enough USDC to pay out this option.";
        } else {
          errorMsg += writeError.message;
        }
      } else {
        errorMsg += "Unknown error occurred";
      }
      setErrorMessage(errorMsg);
      setSettlingOptionId(null);
    }
  }, [writeError]);

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUserOptions();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">My Purchased Options</h2>
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
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : userOptions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-black">You don&apos;t have any options yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">ID</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Type</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Strike Price</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Your Lots</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Expiry</th>
                <th className="py-3 px-4 border-b text-center text-gray-900 font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-center text-gray-900 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userOptions.map((option) => (
                <tr key={option.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-gray-900">{option.id}</td>
                  <td className="py-2 px-4 border-b">
                    <span className={option.isCall ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                      {option.isCall ? "CALL" : "PUT"}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">${formatPrice(option.strikePrice)}</td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">{formatUnits(option.userLots, 18)}</td>
                  <td className="py-2 px-4 border-b text-gray-900">{formatDate(option.expiry)}</td>
                  <td className="py-2 px-4 border-b text-center">
                    {option.isExpired ? (
                      <div>
                        <span className={option.isInTheMoney 
                          ? "bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs font-medium"
                          : "bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs font-medium"}>
                          {option.isInTheMoney ? "Expired (In the money)" : "Expired (Out of money)"}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">{getDetailedOptionStatus(option)}</div>
                      </div>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-full text-xs font-medium">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-center">
                    {option.isExpired ? (
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleSettle(option.id)}
                          disabled={settlingOptionId === option.id || isTransactionPending}
                          className={`py-1 px-3 rounded text-sm ${
                            settlingOptionId === option.id || isTransactionPending
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {getTransactionStatusMessage(option.id)}
                        </button>
                        
                        {settlingOptionId === option.id && txHash && (
                          <a 
                            href={`https://coston2-explorer.flare.network/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1"
                          >
                            View on Explorer
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
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