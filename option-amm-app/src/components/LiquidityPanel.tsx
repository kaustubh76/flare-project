import { useState, useEffect, useCallback } from 'react';
import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient
} from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { formatUnits, parseUnits } from 'viem';

// Transaction types to track transaction state
enum TransactionType {
  NONE,
  APPROVE,
  ADD_LIQUIDITY,
  REMOVE_LIQUIDITY
}

export default function LiquidityPanel() {
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const { address } = useAccount();
  const [userLiquidity, setUserLiquidity] = useState<bigint | undefined>(undefined);
  const [totalPoolLiquidity, setTotalPoolLiquidity] = useState<bigint | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.NONE);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();
  const [userBalance, setUserBalance] = useState<bigint | undefined>(undefined);

  // Get USDC address from contract
  const { data: usdcAddress } = useReadContract({
    abi: CONTRACTS.OPTION_AMM.abi,
    address: CONTRACTS.OPTION_AMM.address,
    functionName: 'usdc',
  });

  // Manual fetch function for contract data
  const fetchContractData = useCallback(async () => {
    if (!publicClient) {
      setErrorMessage('Public client not available');
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch total liquidity directly
      const totalLiquidityResult = await publicClient.readContract({
        address: CONTRACTS.OPTION_AMM.address,
        abi: CONTRACTS.OPTION_AMM.abi,
        functionName: 'totalLiquidity',
      });
      
      setTotalPoolLiquidity(totalLiquidityResult as bigint);
      
      // Fetch user liquidity if address exists
      if (address && usdcAddress) {
        const userLiquidityResult = await publicClient.readContract({
          address: CONTRACTS.OPTION_AMM.address,
          abi: CONTRACTS.OPTION_AMM.abi,
          functionName: 'liquidityContributions',
          args: [address],
        });
        
        // Also fetch user USDC balance
        try {
          const userBalanceResult = await publicClient.readContract({
            address: usdcAddress as `0x${string}`,
            abi: CONTRACTS.USDC.abi,
            functionName: 'balanceOf',
            args: [address],
          });
          
          setUserBalance(userBalanceResult as bigint);
        } catch (error) {
          console.error('Error fetching USDC balance:', error);
        }
        
        setUserLiquidity(userLiquidityResult as bigint);
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setErrorMessage(`Failed to fetch blockchain data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, usdcAddress]);

  // Fetch initial contract data
  useEffect(() => {
    if (publicClient && address) {
      fetchContractData();
    }
  }, [publicClient, address, fetchContractData]);

  const { data: hash, isPending, error, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Convert amount string to USDC wei amount (with 6 decimals)
  const parseAmountToUsdcWei = useCallback((amountStr: string): bigint => {
    try {
      // USDC uses 6 decimals
      return parseUnits(amountStr as `${number}`, 6);
    } catch (error) {
      console.error('Error parsing amount:', error);
      return BigInt(0);
    }
  }, []);

  // First step for adding liquidity: approve USDC
  const handleApproveUSDC = () => {
    if (!usdcAddress || !address) {
      setErrorMessage('USDC address not available or wallet not connected');
      return;
    }
    
    try {
      setErrorMessage('');
      setTransactionType(TransactionType.APPROVE);
      
      // Convert to USDC wei amount (6 decimals)
      const amountWei = parseAmountToUsdcWei(amount);
      
      if (userBalance && amountWei > userBalance) {
        setErrorMessage(`Insufficient USDC balance. You have ${formatAmount(userBalance)} USDC.`);
        setTransactionType(TransactionType.NONE);
        return;
      }
      
      // Approve USDC transfer
      writeContract({
        abi: CONTRACTS.USDC.abi,
        address: usdcAddress as `0x${string}`,
        functionName: 'approve',
        args: [CONTRACTS.OPTION_AMM.address, amountWei],
      });
    } catch (error) {
      setErrorMessage(`Failed to approve USDC: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionType(TransactionType.NONE);
    }
  };
  
  // Second step: add liquidity after approval
  const handleAddLiquidity = useCallback(() => {
    try {
      setErrorMessage('');
      setTransactionType(TransactionType.ADD_LIQUIDITY);
      
      // Convert to USDC wei amount (6 decimals)
      const amountWei = parseAmountToUsdcWei(amount);
      
      writeContract({
        abi: CONTRACTS.OPTION_AMM.abi,
        address: CONTRACTS.OPTION_AMM.address,
        functionName: 'addLiquidity',
        args: [amountWei],
      });
    } catch (error) {
      setErrorMessage(`Failed to add liquidity: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionType(TransactionType.NONE);
    }
  }, [amount, writeContract, setErrorMessage, setTransactionType, parseAmountToUsdcWei]);
  
  // Handle remove liquidity
  const handleRemoveLiquidity = () => {
    try {
      setErrorMessage('');
      setTransactionType(TransactionType.REMOVE_LIQUIDITY);
      
      // Convert to USDC wei amount (6 decimals)
      const amountWei = parseAmountToUsdcWei(amount);
      
      writeContract({
        abi: CONTRACTS.OPTION_AMM.abi,
        address: CONTRACTS.OPTION_AMM.address,
        functionName: 'removeLiquidity',
        args: [amountWei],
      });
    } catch (error) {
      setErrorMessage(`Failed to remove liquidity: ${error instanceof Error ? error.message : String(error)}`);
      setTransactionType(TransactionType.NONE);
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setErrorMessage('Wallet not connected');
      return;
    }
    
    if (parseFloat(amount) <= 0) {
      setErrorMessage('Amount must be greater than 0');
      return;
    }
    
    if (activeTab === 'add') {
      handleApproveUSDC();
    } else {
      // For removing liquidity, ensure user doesn't try to remove more than they have
      const amountWei = parseAmountToUsdcWei(amount);
      if (userLiquidity && amountWei > userLiquidity) {
        setErrorMessage(`Cannot remove more liquidity than you have contributed. Maximum: ${formatAmount(userLiquidity)} USDC`);
        return;
      }
      handleRemoveLiquidity();
    }
  };
  
  // Effect to track transaction status and trigger next steps
  useEffect(() => {
    if (isSuccess && hash) {
      // Reset transaction states
      setAmount('');
      
      // First transaction (approve) completed successfully
      if (transactionType === TransactionType.APPROVE) {
        // Wait a moment for the approval to be fully processed
        setTimeout(() => {
          handleAddLiquidity();
        }, 2000);
      } 
      // Final transaction completed
      else if (transactionType === TransactionType.ADD_LIQUIDITY || 
               transactionType === TransactionType.REMOVE_LIQUIDITY) {
        // Reset form and states after successful transaction
        setAmount('');
        setTransactionType(TransactionType.NONE);
      }
      
      // Wait a moment for the blockchain to update then refresh data
      setTimeout(() => {
        fetchContractData();
      }, 2000); // Give some time for the blockchain to update
    }
  }, [isSuccess, hash, transactionType, fetchContractData, handleAddLiquidity]);

  // Get status message based on transaction type and state
  const getTransactionStatusMessage = () => {
    if (isPending) {
      switch (transactionType) {
        case TransactionType.APPROVE:
          return "Approving USDC...";
        case TransactionType.ADD_LIQUIDITY:
          return "Adding liquidity...";
        case TransactionType.REMOVE_LIQUIDITY:
          return "Removing liquidity...";
        default:
          return "Processing...";
      }
    } else if (isConfirming) {
      return "Confirming transaction...";
    }
    
    return activeTab === 'add' ? "Add Liquidity" : "Remove Liquidity";
  };

  // Format from wei to readable value with proper USDC decimals
  const formatAmount = (value: bigint | undefined): string => {
    if (!value) return '0.00';
    return formatUnits(value, 6);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Liquidity Pool Info */}
      <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Liquidity Pool Info</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-900 font-medium">Total Liquidity:</span>
            {isLoading ? (
              <span className="font-medium text-gray-900">Loading...</span>
            ) : (
              <span className="font-medium text-gray-900">USD {formatAmount(totalPoolLiquidity)}</span>
            )}
          </div>
          
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-900 font-medium">Your Contribution:</span>
            {isLoading ? (
              <span className="font-medium text-gray-900">Loading...</span>
            ) : (
              <span className="font-medium text-gray-900">USD {formatAmount(userLiquidity)}</span>
            )}
          </div>
          
          {userLiquidity && totalPoolLiquidity && (
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-900 font-medium">Your Share:</span>
              <span className="font-medium text-gray-900">
                {totalPoolLiquidity > BigInt(0)
                  ? `${((Number(userLiquidity) / Number(totalPoolLiquidity)) * 100).toFixed(2)}%`
                  : '0%'}
              </span>
            </div>
          )}

          <div className="pt-2">
            <button 
              onClick={fetchContractData}
              className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
      
      {/* Add/Remove Liquidity Form */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
        <div className="flex mb-4 border-b">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'add'
                ? 'border-b-2 border-blue-500 text-blue-700'
                : 'text-gray-900 hover:text-black'
            }`}
            onClick={() => setActiveTab('add')}
          >
            Add Liquidity
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'remove'
                ? 'border-b-2 border-blue-500 text-blue-700'
                : 'text-gray-900 hover:text-black'
            }`}
            onClick={() => setActiveTab('remove')}
          >
            Remove Liquidity
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-1">
              Amount (USD)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-900 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="amount"
                id="amount"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md text-gray-900 font-medium"
                placeholder="0.00"
                aria-describedby="amount-currency"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="0.01"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-800 sm:text-sm" id="amount-currency">
                  USDC
                </span>
              </div>
            </div>
            
            {activeTab === 'remove' && userLiquidity && (
              <div className="text-sm text-gray-700 mt-1">
                <button
                  type="button"
                  onClick={() => setAmount(formatAmount(userLiquidity))}
                  className="text-blue-700 hover:text-blue-900 font-medium"
                >
                  Max: {formatAmount(userLiquidity)}
                </button>
              </div>
            )}
          </div>
          
          {(error || errorMessage) && (
            <div className="text-red-600 text-sm font-medium">
              {error?.message || errorMessage}
            </div>
          )}
          
          {isSuccess && (transactionType === TransactionType.ADD_LIQUIDITY || transactionType === TransactionType.REMOVE_LIQUIDITY) && (
            <div className="text-green-700 text-sm font-medium">
              Transaction completed successfully!
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isPending || isConfirming || !amount || parseFloat(amount) <= 0}
              className={`w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                ${isPending || isConfirming ? 'bg-gray-400' : activeTab === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 ${activeTab === 'add' ? 'focus:ring-blue-500' : 'focus:ring-red-500'}`}
            >
              {isPending || isConfirming ? getTransactionStatusMessage() : activeTab === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}