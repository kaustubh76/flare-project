'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useAccount
} from 'wagmi';
import { OPTION_AMM_ABI, OPTION_AMM_ADDRESS, USDC_ABI, USDC_ADDRESS } from '@/constants/contractInfo';
import { usePriceContext } from '@/context/PriceContext';
import { formatUnits, parseUnits } from 'viem';

interface OptionDetailProps {
  optionId: number;
}

enum TransactionType {
  NONE,
  APPROVE,
  PURCHASE,
  SETTLE
}

// Define the structure of an option as returned from the contract
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

export default function OptionDetail({ optionId }: OptionDetailProps) {
  const [lotAmount, setLotAmount] = useState('1');
  const [userPosition, setUserPosition] = useState('0'); 
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.NONE);
  const [errorMessage, setErrorMessage] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals
  const [hasEnoughBalance, setHasEnoughBalance] = useState(false);
  const { address } = useAccount();
  const { ethUsdPrice } = usePriceContext(); 
  
  // Get USDC address from contract
  const { data: usdcAddress } = useReadContract({
    abi: OPTION_AMM_ABI,
    address: OPTION_AMM_ADDRESS as `0x${string}`,
    functionName: 'usdc',
  });

  // Get USDC balance
  const { data: usdcBalance } = useReadContract({
    abi: USDC_ABI,
    address: USDC_ADDRESS as `0x${string}`,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  // Get USDC decimals
  const { data: decimals } = useReadContract({
    abi: USDC_ABI,
    address: USDC_ADDRESS as `0x${string}`,
    functionName: 'decimals',
    query: {
      enabled: !!USDC_ADDRESS,
    }
  });

  // Update decimals when available
  useEffect(() => {
    if (decimals !== undefined) {
      setUsdcDecimals(Number(decimals));
    }
  }, [decimals]);

  // Fetch option details
  const { data: option, isLoading: isLoadingOption } = useReadContract({
    abi: OPTION_AMM_ABI,
    address: OPTION_AMM_ADDRESS as `0x${string}`,
    functionName: 'options',
    args: [BigInt(optionId)],
  });

  // Debug option data
  useEffect(() => {
    if (option) {
      console.log(`Raw option data for ID ${optionId}:`, option);
    }
  }, [option, optionId]);

  // Convert the returned option data to the expected Option type
  const typedOption = useMemo(() => {
    if (!option) return undefined;
    
    return {
      strikePrice: (option as OptionData)[0],
      lotSize: (option as OptionData)[1],
      premium: (option as OptionData)[2],
      k: (option as OptionData)[3],
      expiry: (option as OptionData)[4],
      isCall: (option as OptionData)[5],
      creator: (option as OptionData)[6]
    };
  }, [option]);
  
  // Write contract hooks
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Calculate cost based on current premium with the exact same logic as the contract
  const getCost = useCallback(() => {
    if (!typedOption || !typedOption.premium) return BigInt(0);
    
    // Parse lot amount with improved precision
    const lotAmountValue = parseFloat(lotAmount);
    if (isNaN(lotAmountValue) || lotAmountValue <= 0) return BigInt(0);
    
    // Use parseUnits to get lot amount with 18 decimals, matching the contract's expectation
    const lotAmountWei = parseUnits(lotAmount, 18);
    
    // Calculate cost exactly as the contract would:
    // Current premium = option.k / option.lotSize
    // cost = currentPremium * _lotAmount / 1e30 (adjustment in contract)
    const currentPremium = typedOption.lotSize > BigInt(0) ? typedOption.k / typedOption.lotSize : BigInt(0);
    return (BigInt(currentPremium.toString()) * lotAmountWei) / BigInt(10**30);
  }, [lotAmount, typedOption]);

  // Get lot amount as BigInt
  const getLotAmountWei = (): bigint => {
    const lotAmountValue = parseFloat(lotAmount);
    if (isNaN(lotAmountValue) || lotAmountValue <= 0) return BigInt(0);
    // Pass the lot amount multiplied by 10^18 to the contract to match solidity's decimal handling
    return parseUnits(lotAmount, 18);
  };

  // Format from wei to readable value with proper decimal handling based on the detected decimal precision
  const formatAmount = (value: bigint | undefined): string => {
    if (!value) return '0';
    
    // Check if value is likely using 18 decimals or 6 decimals
    if (value > BigInt(10000000000000)) { // Large number likely using 18 decimals
      return formatUnits(value, 18);
    } else { // Smaller number likely using 6 decimals
      return formatUnits(value, usdcDecimals);
    }
  };
  
  // Format the total cost with proper decimal handling
  const formatTotalCost = (): string => {
    if (!typedOption) return '0.00';
    
    const exactCost = getCost();
    
    // Detect if cost is likely in 18 decimals or 6 decimals
    let formattedCost: string;
    if (exactCost > BigInt(10000000000000)) {
      formattedCost = formatUnits(exactCost, 18);
    } else {
      formattedCost = formatUnits(exactCost, usdcDecimals);
    }
    
    // Format with 2 decimal places for display
    const numericCost = parseFloat(formattedCost);
    console.log('Calculated cost:', exactCost.toString(), 'Formatted cost:', formattedCost);
    
    return numericCost.toFixed(2);
  };

  // Format date from unix timestamp
  const formatDate = (timestamp: bigint | undefined): string => {
    if (!timestamp) return '';
    
    const date = new Date(Number(timestamp) * 1000);
    
    // Format date with explicit hours, minutes, and seconds
    const formattedDate = date.toLocaleDateString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${formattedDate} ${hours}:${minutes}:${seconds}`;
  };

  // Check if option is expired
  const isExpired = (): boolean => {
    if (!typedOption || !typedOption.expiry) return false;
    return Date.now() / 1000 > Number(typedOption.expiry);
  };

  // Check if option is in the money (profitable)
  const isInTheMoney = (): boolean => {
    if (!typedOption || !ethUsdPrice) return false;
    
    // Convert price from string to number for comparison
    const currentPriceNormalized = parseFloat(ethUsdPrice);
    let strikePriceNormalized: number;
    
    // Detect decimal precision by magnitude
    if (typedOption.strikePrice > BigInt(10000000000000)) { // If large number, likely 18 decimals
      strikePriceNormalized = Number(formatUnits(typedOption.strikePrice, 18));
    } else { // If smaller number, likely 6 decimals
      strikePriceNormalized = Number(formatUnits(typedOption.strikePrice, usdcDecimals));
    }
    
    if (typedOption.isCall) {
      return currentPriceNormalized > strikePriceNormalized;
    } else {
      return currentPriceNormalized < strikePriceNormalized;
    }
  };

  // Check if user has enough balance for purchase
  useEffect(() => {
    if (usdcBalance && typedOption) {
      try {
        const cost = getCost();
        setHasEnoughBalance(BigInt(usdcBalance.toString()) >= cost);
      } catch (error) {
        console.error("Error checking balance:", error);
      }
    }
  }, [usdcBalance, typedOption, lotAmount, getCost]);

  // Function to check if USDC is already approved
  const checkAllowance = useCallback(async () => {
    if (!address || !usdcAddress) return;
    
    try {
      const allowance = await fetch(`https://coston2-api.flare.network/ext/C/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{
            to: usdcAddress,
            data: `0xdd62ed3e000000000000000000000000${address.substring(2)}000000000000000000000000${OPTION_AMM_ADDRESS.substring(2)}`
          }, "latest"]
        })
      }).then(res => res.json());
      
      if (allowance?.result) {
        const allowanceBigInt = BigInt(allowance.result);
        const costBigInt = getCost();
        setIsApproved(allowanceBigInt >= costBigInt);
        console.log(`USDC allowance: ${allowanceBigInt.toString()}, Required: ${costBigInt.toString()}`);
      }
    } catch (error) {
      console.error("Error checking allowance:", error);
    }
  }, [address, usdcAddress, getCost]);
  
  // Check allowance when option or address changes
  useEffect(() => {
    if (address && usdcAddress && typedOption) {
      checkAllowance();
    }
  }, [address, usdcAddress, typedOption, lotAmount, checkAllowance]);

  // First step: Approve USDC transfer
  const handleApproveUSDC = () => {
    if (!usdcAddress || !address) {
      setErrorMessage('USDC address not available or wallet not connected');
      return;
    }
    
    try {
      setErrorMessage('');
      setTransactionType(TransactionType.APPROVE);
      
      const exactCost = getCost();
      
      if (exactCost <= BigInt(0)) {
        setErrorMessage('Invalid purchase amount');
        setTransactionType(TransactionType.NONE);
        return;
      }
      
      // Adding 50% buffer to approval amount
      const approvalWithBuffer = exactCost + (exactCost * BigInt(50) / BigInt(100));
      console.log(`Approving ${approvalWithBuffer.toString()} USDC tokens`);
      
      // Approve USDC transfer with the exact amount needed plus buffer
      writeContract({
        abi: USDC_ABI,
        address: usdcAddress as `0x${string}`,
        functionName: 'approve',
        args: [OPTION_AMM_ADDRESS, approvalWithBuffer],
      });
    } catch (error) {
      setErrorMessage(`Failed to approve USDC: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionType(TransactionType.NONE);
    }
  };

  // Second step: Purchase option after approval succeeds
  const handlePurchaseOption = () => {
    try {
      setErrorMessage('');
      setTransactionType(TransactionType.PURCHASE);
      
      // Get lot amount in wei
      const lotAmountWei = getLotAmountWei();
      
      if (lotAmountWei <= BigInt(0)) {
        setErrorMessage('Invalid lot amount');
        setTransactionType(TransactionType.NONE);
        return;
      }
      
      if (!typedOption) {
        setErrorMessage('Option data not available');
        setTransactionType(TransactionType.NONE);
        return;
      }
      
      if (!hasEnoughBalance) {
        setErrorMessage('Insufficient USDC balance for this purchase');
        setTransactionType(TransactionType.NONE);
        return;
      }
      
      console.log(`Purchasing option #${optionId} with lot amount: ${lotAmountWei.toString()}`);
      console.log(`Expected cost: ${getCost().toString()}`);
      
      // Purchase option with correct argument types
      writeContract({
        abi: OPTION_AMM_ABI,
        address: OPTION_AMM_ADDRESS as `0x${string}`,
        functionName: 'purchaseOption',
        args: [BigInt(optionId), lotAmountWei],
      });
    } catch (error) {
      setErrorMessage(`Failed to purchase option: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionType(TransactionType.NONE);
    }
  };

  // Effect to handle transaction completion
  useEffect(() => {
    if (isSuccess && hash) {
      if (transactionType === TransactionType.APPROVE) {
        // After approval success, set approval state
        setIsApproved(true);
        setTransactionType(TransactionType.NONE);
      } else if (transactionType === TransactionType.PURCHASE) {
        // After purchase success, update user position
        const newPosition = parseFloat(userPosition) + parseFloat(lotAmount);
        setUserPosition(newPosition.toString());
        setTransactionType(TransactionType.NONE);
      } else if (transactionType === TransactionType.SETTLE) {
        // After settlement, reset user position
        setUserPosition('0');
        setTransactionType(TransactionType.NONE);
      }
    }
  }, [isSuccess, hash, transactionType, userPosition, lotAmount]);

  const handleSettle = () => {
    try {
      setErrorMessage('');
      setTransactionType(TransactionType.SETTLE);
      
      writeContract({
        abi: OPTION_AMM_ABI,
        address: OPTION_AMM_ADDRESS as `0x${string}`,
        functionName: 'settleOption',
        args: [BigInt(optionId)],
      });
    } catch (error) {
      setErrorMessage(`Failed to settle option: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionType(TransactionType.NONE);
    }
  };

  // Calculate transaction status message
  const getTransactionStatusMessage = () => {
    if (isPending) {
      switch (transactionType) {
        case TransactionType.APPROVE:
          return "Approving USDC...";
        case TransactionType.PURCHASE:
          return "Purchasing option...";
        case TransactionType.SETTLE:
          return "Settling option...";
        default:
          return "Processing...";
      }
    } else if (isConfirming) {
      return "Confirming transaction...";
    } else if (isSuccess && transactionType === TransactionType.PURCHASE) {
      return "Option purchased successfully!";
    } else if (isSuccess && transactionType === TransactionType.SETTLE) {
      return "Option settled successfully!";
    }
    return "";
  };

  // Loading state
  if (isLoadingOption) {
    return (
      <div className="flex justify-center my-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Option not found
  if (!typedOption) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Option #{optionId}</h2>
        <p className="text-red-600">Option not found</p>
      </div>
    );
  }

  // Check if option cost is too high (beyond reasonable balance)
  const cost = getCost();
  const isCostTooHigh = cost > BigInt(1000000000000000); // 1 million USDC equivalent
  
  // Default view with option details
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-4 text-black">
        {typedOption.isCall ? 'Call' : 'Put'} Option #{optionId}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium mb-4 text-black">Option Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-black">Type:</span>
              <span className={typedOption.isCall ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {typedOption.isCall ? "CALL" : "PUT"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Strike Price:</span>
              <span className="text-black">${formatAmount(typedOption.strikePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Current Premium:</span>
              <span className="text-black">${formatAmount(typedOption.premium)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Available Lot Size:</span>
              <span className="text-black">{formatAmount(typedOption.lotSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Expiry Date:</span>
              <span className="text-black">{formatDate(typedOption.expiry)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Status:</span>
              <span className={isExpired() ? "text-red-600" : "text-green-600"}>
                {isExpired() ? "Expired" : "Active"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">Current ETH Price:</span>
              <span className="text-black">${ethUsdPrice || "Loading..."}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4 text-black">Your Position</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-black">Your Options:</span>
              <span className="text-black">{userPosition}</span>
            </div>
            {typeof usdcBalance !== 'undefined' && usdcBalance !== null && (
              <div className="flex justify-between">
                <span className="text-black">Your USDC Balance:</span>
                <span className="text-black">{formatUnits(BigInt(usdcBalance.toString()), usdcDecimals)}</span>
              </div>
            )}
            {isInTheMoney() && (
              <div className="flex justify-between">
                <span className="text-black">Status:</span>
                <span className="text-green-600 font-bold">In the money!</span>
              </div>
            )}
            {parseFloat(userPosition) > 0 && isExpired() && (
              <div className="mt-4">
                <button
                  onClick={handleSettle}
                  disabled={isPending || isConfirming}
                  className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  {isPending || isConfirming ? 'Processing...' : 'Settle Option'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {!isExpired() && Number(typedOption.lotSize) > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-4 text-black">Purchase Options</h3>
          
          {/* Add info box about in-the-money extra penalty */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Pricing Model Information</p>
            <p className="text-sm mt-1">Options that are already &quot;in the money&quot; will include an additional premium penalty. This is calculated as the difference between the current price and strike price when:</p>
            <ul className="list-disc ml-5 mt-1 text-sm">
              <li>For call options: current price &gt; strike price</li>
              <li>For put options: current price &lt; strike price</li>
            </ul>
          </div>
          
          {isCostTooHigh ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p><strong>Warning:</strong> This option&apos;s cost is extremely high (more than 1M USDC). 
              You may not have enough USDC to purchase it. Consider creating a new option with lower values.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Amount to Purchase
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={formatAmount(typedOption.lotSize)}
                    value={lotAmount}
                    onChange={(e) => setLotAmount(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <div>
                    <p className="text-sm text-black">Total Cost:</p>
                    <p className="text-lg font-medium text-black">${formatTotalCost()}</p>
                    <p className="text-xs text-gray-500">
                      (Raw value: {getCost().toString()})
                    </p>
                  </div>
                </div>
                
                <div className="flex items-end flex-col space-y-2">
                  {!hasEnoughBalance ? (
                    <div className="w-full py-2 px-4 bg-red-100 text-red-700 rounded-md text-center">
                      Insufficient balance
                    </div>
                  ) : !isApproved ? (
                    <button
                      onClick={handleApproveUSDC}
                      disabled={isPending || isConfirming || parseFloat(lotAmount) <= 0}
                      className={`w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
                        (isPending || isConfirming || parseFloat(lotAmount) <= 0) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isPending && transactionType === TransactionType.APPROVE ? 'Approving...' : 'Approve USDC'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePurchaseOption}
                      disabled={isPending || isConfirming || parseFloat(lotAmount) <= 0 || !hasEnoughBalance}
                      className={`w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                        (isPending || isConfirming || parseFloat(lotAmount) <= 0 || !hasEnoughBalance) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isPending && transactionType === TransactionType.PURCHASE ? 'Purchasing...' : 'Purchase'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          
          {(error || errorMessage) && (
            <div className="text-red-600 mt-2">
              Error: {error?.message || "Failed to approve USDC. Please try again."}
            </div>
          )}
          
          {isPending && (
            <div className="text-blue-600 mt-2">
              {getTransactionStatusMessage()}
            </div>
          )}
          
          {isSuccess && transactionType === TransactionType.APPROVE && (
            <div className="text-green-600 mt-2">
              USDC approved successfully! Click &apos;Purchase&apos; to continue.
            </div>
          )}
          
          {isSuccess && transactionType === TransactionType.PURCHASE && (
            <div className="text-green-600 mt-2">
              Transaction successful! You purchased {lotAmount} options.
            </div>
          )}
        </div>
      )}
    </div>
  );
}